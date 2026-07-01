import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import {
  connect, disconnect, getGuilds, getChannels, getRoles, getMembers,
  createChannel, editChannel, deleteChannel, deleteChannels, bulkEditChannels,
  createRole, editRole, deleteRole, deleteRoles, bulkEditRoles,
  kickMember, banMember, unbanMember, getBans,
  setMemberRoles, addMemberRole, removeMemberRole,
  editGuild, getGuild, isConnected, fillMemberCounts,
  ALL_PERMISSIONS,
} from './discordService';
import { startBot, stopBot, getGuildStats, getAllStats, getBotGuilds, isRunning as botRunning } from './botClient';

let mainWindow: BrowserWindow | null = null;
const configPath = path.join(app.getPath('userData'), 'config.json');

interface AppConfig {
  token?: string;
  botToken?: string;
  pinnedServers?: string[];
}

function loadConfig(): AppConfig {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return {};
}

function saveConfig(data: AppConfig) {
  try {
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const existing = loadConfig();
    const merged = { ...existing, ...data };
    fs.writeFileSync(configPath, JSON.stringify(merged), 'utf-8');
  } catch {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Discord Manager',
    backgroundColor: '#1e1e2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  disconnect();
  app.quit();
});

ipcMain.handle('connect', async (_event, token: string, isBot?: boolean) => {
  try {
    await connect(token, !!isBot);
    if (isBot) {
      startBot(token).catch(() => {});
    }
    saveConfig({ token: isBot ? `BOT:${token}` : token, botToken: isBot ? token : undefined });
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('disconnect', async () => {
  await stopBot();
  await disconnect();
  saveConfig({});
  return { success: true };
});

ipcMain.handle('get-saved-token', async () => {
  const config = loadConfig();
  if (config.token && config.token.startsWith('BOT:')) {
    return { token: config.token.slice(4), isBot: true, botToken: config.botToken };
  }
  return { token: config.token || null, isBot: false, botToken: config.botToken || null };
});

ipcMain.handle('save-token', async (_event, token: string, isBot?: boolean) => {
  saveConfig({ token: isBot ? `BOT:${token}` : token });
  return { success: true };
});

ipcMain.handle('get-pinned', async () => {
  const config = loadConfig();
  return { pinned: config.pinnedServers || [] };
});

ipcMain.handle('toggle-pin', async (_event, serverId: string) => {
  const config = loadConfig();
  const pinned = config.pinnedServers || [];
  const idx = pinned.indexOf(serverId);
  if (idx >= 0) pinned.splice(idx, 1);
  else pinned.push(serverId);
  saveConfig({ pinnedServers: pinned });
  return { pinned };
});

ipcMain.handle('get-status', async () => {
  return { connected: isConnected() };
});

ipcMain.handle('get-guilds', async () => {
  try {
    const guilds = await getGuilds();
    if (mainWindow) {
      const needCounts = guilds.filter(g => g.memberCount === 0);
      if (needCounts.length > 0) {
        fillMemberCounts(needCounts).then(map => {
          if (!mainWindow) return;
          const updates: Record<string, number> = {};
          for (const [id, count] of map) updates[id] = count;
          mainWindow.webContents.send('member-counts', updates);
        }).catch(() => {});
      }
    }
    return { success: true, data: guilds };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-guild', async (_event, guildId: string) => {
  try {
    const guild = await getGuild(guildId);
    return {
      success: true,
      data: {
        id: guild.id,
        name: guild.name,
        description: guild.description,
        icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null,
        banner: guild.banner ? `https://cdn.discordapp.com/banners/${guild.id}/${guild.banner}.png` : null,
        memberCount: guild.approximate_member_count || guild.member_count || 0,
        ownerId: guild.owner_id,
        verificationLevel: guild.verification_level,
        explicitContentFilter: guild.explicit_content_filter,
        premiumTier: guild.premium_tier,
        premiumSubscriberCount: guild.premium_subscription_count || 0,
      }
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-channels', async (_event, guildId: string) => {
  try {
    const channels = await getChannels(guildId);
    return {
      success: true,
      data: channels.map((c: any) => ({
        id: c.id,
        name: c.name || c.id,
        type: c.type,
        parentId: c.parent_id || null,
        position: c.position || 0,
        topic: c.topic || '',
        nsfw: c.nsfw || false,
        bitrate: c.bitrate || null,
        userLimit: c.user_limit || 0,
        rateLimitPerUser: c.rate_limit_per_user || 0,
      }))
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('create-channel', async (_event, guildId: string, name: string, type: number, options: any) => {
  try {
    const channel = await createChannel(guildId, name, type, options);
    return { success: true, data: { id: channel.id, name: channel.name } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('edit-channel', async (_event, channelId: string, data: any) => {
  try {
    await editChannel(channelId, data);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-channel', async (_event, channelId: string) => {
  try {
    await deleteChannel(channelId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-channels', async (_event, channelIds: string[]) => {
  return deleteChannels(channelIds);
});

ipcMain.handle('bulk-edit-channels', async (_event, channelIds: string[], data: any) => {
  return bulkEditChannels(channelIds, data);
});

ipcMain.handle('get-roles', async (_event, guildId: string) => {
  try {
    const roles = await getRoles(guildId);
    return {
      success: true,
      data: roles.map((r: any) => ({
        id: r.id,
        name: r.name,
        color: r.color,
        hoist: r.hoist,
        mentionable: r.mentionable,
        position: r.position,
        permissions: r.permissions.toString(),
        icon: r.icon || null,
        managed: r.managed || false,
        tags: r.tags || null,
      }))
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('create-role', async (_event, guildId: string, data: any) => {
  try {
    const role = await createRole(guildId, data);
    return { success: true, data: { id: role.id, name: role.name } };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('edit-role', async (_event, guildId: string, roleId: string, data: any) => {
  try {
    await editRole(guildId, roleId, data);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-role', async (_event, guildId: string, roleId: string) => {
  try {
    await deleteRole(guildId, roleId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('delete-roles', async (_event, guildId: string, roleIds: string[]) => {
  return deleteRoles(guildId, roleIds);
});

ipcMain.handle('bulk-edit-roles', async (_event, guildId: string, roleIds: string[], data: any) => {
  return bulkEditRoles(guildId, roleIds, data);
});

ipcMain.handle('get-members', async (_event, guildId: string) => {
  try {
    const [members, roles] = await Promise.all([getMembers(guildId), getRoles(guildId)]);
    const roleMap = new Map<string, any>();
    for (const r of roles) roleMap.set(r.id, r);
    return {
      success: true,
      data: members.map((m: any) => {
        const roleIds: string[] = m.roles || [];
        return {
          id: m.user.id,
          user: {
            id: m.user.id,
            username: m.user.username,
            discriminator: m.user.discriminator || '0',
            avatar: m.user.avatar ? `https://cdn.discordapp.com/avatars/${m.user.id}/${m.user.avatar}.png` : null,
            bot: m.user.bot || false,
          },
          nickname: m.nick || m.nickname || null,
          roles: roleIds.map(id => {
            const role = roleMap.get(id);
            return role ? { id: role.id, name: role.name, color: role.color } : { id, name: id, color: 0 };
          }),
          joinedAt: m.joined_at || null,
          premiumSince: m.premium_since || null,
          permissions: m.permissions ? m.permissions.toString() : '0',
          manageable: true,
          kickable: true,
          bannable: true,
        };
      })
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('kick-member', async (_event, guildId: string, userId: string, reason?: string) => {
  try {
    await kickMember(guildId, userId, reason);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('ban-member', async (_event, guildId: string, userId: string, reason?: string) => {
  try {
    await banMember(guildId, userId, reason);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('unban-member', async (_event, guildId: string, userId: string) => {
  try {
    await unbanMember(guildId, userId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-bans', async (_event, guildId: string) => {
  try {
    const bans = await getBans(guildId);
    return {
      success: true,
      data: bans.map((b: any) => ({
        user: {
          id: b.user.id,
          username: b.user.username,
          avatar: b.user.avatar ? `https://cdn.discordapp.com/avatars/${b.user.id}/${b.user.avatar}.png` : null,
        },
        reason: b.reason,
      }))
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('set-member-roles', async (_event, guildId: string, userId: string, roleIds: string[]) => {
  try {
    await setMemberRoles(guildId, userId, roleIds);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('add-member-role', async (_event, guildId: string, userId: string, roleId: string) => {
  try {
    await addMemberRole(guildId, userId, roleId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('remove-member-role', async (_event, guildId: string, userId: string, roleId: string) => {
  try {
    await removeMemberRole(guildId, userId, roleId);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('edit-guild', async (_event, guildId: string, data: any) => {
  try {
    await editGuild(guildId, data);
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
});

ipcMain.handle('get-permissions-list', async () => {
  return ALL_PERMISSIONS;
});

ipcMain.handle('get-bot-stats', async (_event, guildId: string) => {
  if (botRunning()) {
    const stats = getGuildStats(guildId);
    return { success: true, data: stats || null };
  }
  return { success: false, error: 'Bot not running' };
});

ipcMain.handle('get-all-bot-stats', async () => {
  if (botRunning()) {
    return { success: true, data: getAllStats() };
  }
  return { success: false, error: 'Bot not running' };
});

ipcMain.handle('is-bot-running', async () => {
  return { running: botRunning() };
});
