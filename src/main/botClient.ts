import { Client, GatewayIntentBits, ActivityType, AttachmentBuilder } from 'discord.js';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

function getConfigPath(): string {
  try { return path.join(app.getPath('userData'), 'config.json'); } catch { return ''; }
}

function getConfig(): any {
  try {
    const p = getConfigPath();
    if (p && fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch {}
  return {};
}

let client: Client | null = null;
let statsInterval: NodeJS.Timeout | null = null;
let logs: Array<{ time: string; type: string; msg: string }> = [];
let lastError: string | null = null;
let autoRoles = new Map<string, string>();
let welcomeConfigs = new Map<string, { channelId: string; message: string; type: string; imageUrl: string; embedColor?: string; embedTitle?: string; embedFooter?: string; imagePosition?: string }>();
const statsCache = new Map<string, any>();

function addLog(type: string, msg: string) {
  const time = new Date().toLocaleTimeString();
  logs.push({ time, type, msg });
  if (logs.length > 500) logs = logs.slice(-500);
  console.log(`[${time}][${type}] ${msg}`);
}

export function getLogs() { return logs; }
export function getLastError() { return lastError; }
export function isRunning(): boolean { return client !== null && client.isReady(); }

export function updateAutoRoles(settings: Record<string, { autoRole?: string; welcomeChannel?: string; welcomeMessage?: string; welcomeType?: string; welcomeImage?: string; embedColor?: string; embedTitle?: string; embedFooter?: string; imagePosition?: string }>) {
  autoRoles.clear();
  welcomeConfigs.clear();
  for (const [guildId, s] of Object.entries(settings)) {
    if (s.autoRole) autoRoles.set(guildId, s.autoRole);
    if (s.welcomeChannel) {
      welcomeConfigs.set(guildId, {
        channelId: s.welcomeChannel,
        message: s.welcomeMessage || 'Welcome {name} to {server}!',
        type: s.welcomeType || 'text',
        imageUrl: s.welcomeImage || '',
        embedColor: s.embedColor,
        embedTitle: s.embedTitle,
        embedFooter: s.embedFooter,
        imagePosition: s.imagePosition || 'large',
      });
    }
  }
}

export async function startBot(token: string): Promise<void> {
  if (client) await stopBot();
  logs = [];
  lastError = null;
  addLog('INFO', 'Starting bot...');

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
    presence: { activities: [{ name: 'Discord Manager', type: ActivityType.Watching }], status: 'online' },
  });

  client.on('error', (e) => addLog('ERROR', `Socket: ${e.message}`));
  client.on('warn', (w) => addLog('WARN', w));

  try {
    await client.login(token);
    addLog('INFO', `Connected as ${client.user?.tag}`);
    addLog('INFO', `On ${client.guilds.cache.size} servers`);
    const configPath = getConfigPath();
    try {
      const raw = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(raw);
      if (config.botSettings) updateAutoRoles(config.botSettings);
    } catch {}
    setupListeners();
    buildStats();
    statsInterval = setInterval(buildStats, 60000);
  } catch (e: any) {
    const msg = e.message || String(e);
    lastError = msg;
    if (msg.includes('TOKEN_INVALID')) addLog('ERROR', 'Токен недействителен! Сбрось в Developer Portal');
    else if (msg.includes('DISALLOWED_INTENTS')) addLog('ERROR', 'Интенты не включены! Включи в Developer Portal > Bot');
    else addLog('ERROR', `Ошибка: ${msg}`);
    client.destroy();
    client = null;
    throw e;
  }
}

export async function stopBot(): Promise<void> {
  if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
  if (client) { client.destroy(); client = null; }
  addLog('INFO', 'Bot stopped');
}

function setupListeners() {
  if (!client) return;
  client.on('guildCreate', (g) => addLog('INFO', `Added to: ${g.name}`));
  client.on('guildDelete', (g) => addLog('WARN', `Removed from: ${g.name || g.id}`));

  client.on('guildMemberAdd', async (member) => {
    addLog('INFO', `Member joined: ${member.user.tag} on ${member.guild.name}`);

    const roleId = autoRoles.get(member.guild.id);
    if (roleId) {
      try {
        await member.roles.add(roleId);
        addLog('INFO', `Auto-role ${roleId} assigned to ${member.user.tag}`);
      } catch (e: any) {
        addLog('ERROR', `Auto-role failed for ${member.user.tag}: ${e.message}`);
      }
    }

    const welcome = welcomeConfigs.get(member.guild.id);
    if (welcome) {
      try {
        await sendWelcomeMessage(member.guild, member.user, welcome);
      } catch (e: any) {
        addLog('ERROR', `Welcome failed for ${member.user.tag}: ${e.message}`);
      }
    }

    buildStats();
  });

  client.on('guildMemberRemove', (member) => {
    addLog('INFO', `Member left: ${member.user.tag}`);
    buildStats();
  });

  client.on('presenceUpdate', () => buildStats());
  client.on('voiceStateUpdate', () => buildStats());

  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('.')) return;

    const args = message.content.slice(1).trim().split(/\s+/);
    const cmd = args[0].toLowerCase();

    if (cmd === 'очистить' || cmd === 'clear') {
      if (!(message.member?.permissions as any).has('Administrator') && !(message.member?.permissions as any).has('ManageMessages')) {
        await message.reply('❌ Нужны права администратора или управления сообщениями').then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        return;
      }

      const amount = parseInt(args[1]);
      if (!amount || amount < 1 || amount > 100) {
        await message.reply('❌ Укажи число от 1 до 100. Пример: `.очистить 50`').then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
        return;
      }

      try {
        await message.delete();
        const deleted = await (message.channel as any).bulkDelete(amount, true);
        const reply = await message.channel.send(`✅ Удалено ${deleted.size} сообщений`);
        setTimeout(() => reply.delete().catch(() => {}), 3000);
        addLog('INFO', `Purged ${deleted.size} messages in #${(message.channel as any).name} by ${message.author.tag}`);
      } catch (e: any) {
        await message.reply(`❌ Ошибка: ${e.message}`).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
      }
    }
  });
}

function computeStats(guildId: string): any | null {
  if (!client) return null;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return null;
  let online = 0, idle = 0, dnd = 0, offline = 0, bots = 0, voice = 0;
  for (const m of guild.members.cache.values()) {
    if (m.user.bot) bots++;
    const st = m.presence?.status;
    if (st === 'online') online++;
    else if (st === 'idle') idle++;
    else if (st === 'dnd') dnd++;
    else offline++;
  }
  for (const ch of guild.channels.cache.values()) {
    if ('members' in ch && ch.members && typeof ch.members === 'object' && 'size' in (ch.members as any)) {
      try { voice += (ch.members as any).size; } catch {}
    }
  }
  return {
    memberCount: guild.memberCount || guild.members.cache.size,
    botCount: bots, onlineCount: online, idleCount: idle,
    dndCount: dnd, offlineCount: offline, voiceCount: voice,
    totalChannels: guild.channels.cache.size, totalRoles: guild.roles.cache.size,
    lastUpdated: Date.now(),
  };
}

export function buildStats() {
  if (!client) return;
  for (const g of client.guilds.cache.values()) {
    const s = computeStats(g.id);
    if (s) statsCache.set(g.id, s);
  }
}

export function getGuildStats(guildId: string): any { return statsCache.get(guildId) || null; }
export function getAllStats(): Record<string, any> { buildStats(); return Object.fromEntries(statsCache); }
export function getBotGuilds(): string[] { return client ? [...client.guilds.cache.keys()] : []; }

function replaceVars(text: string, username: string, userId: string, serverName: string, memberCount: number, tag: string, guild?: any): string {
  let result = text
    .replace(/\{name\}/g, username)
    .replace(/\{mention\}/g, `<@${userId}>`)
    .replace(/\{server\}/g, serverName)
    .replace(/\{count\}/g, String(memberCount))
    .replace(/\{tag\}/g, tag);
  if (guild) {
    result = result.replace(/\{channel:([^}]+)\}/g, (match, name) => {
      const channels = guild.channels?.cache;
      if (!channels) return match;
      const q = name.toLowerCase();
      let ch = channels.find((c: any) => c.name?.toLowerCase() === q);
      if (!ch) ch = channels.find((c: any) => c.name?.toLowerCase().includes(q));
      if (ch) {
        addLog('INFO', `Channel tag: ${name} → #${ch.name} (${ch.id})`);
        return `<#${ch.id}>`;
      }
      addLog('WARN', `Channel not found: ${name}`);
      return `#${name}`;
    });
  }
  return result;
}

async function sendWelcomeMessage(guild: any, user: any, config: any) {
  const channel = guild.channels.cache.get(config.channelId);
  if (!channel || !('send' in channel)) return;

  const msgText = replaceVars(config.message, user.username, user.id, guild.name, guild.memberCount || guild.members.cache.size, user.tag, guild);
  const imgRaw = config.imageUrl || '';
  const imgUrl = imgRaw ? replaceVars(imgRaw, user.username, user.id, guild.name, guild.memberCount || guild.members.cache.size, user.tag, guild) : '';

  const files: any[] = [];
  let imageUrl = imgUrl;
  let attachmentName = '';

  if (imgUrl && imgUrl.startsWith('data:')) {
    const matches = imgUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (matches) {
      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      attachmentName = `welcome.${ext}`;
      const attachment = new AttachmentBuilder(buffer, { name: attachmentName });
      files.push(attachment);
      imageUrl = `attachment://${attachmentName}`;
    }
  }

  if (config.type === 'embed') {
    const embed: any = { description: msgText };
    if (config.embedColor) embed.color = parseInt(config.embedColor.replace('#', ''), 16) || 0x7c3aed;
    else embed.color = 0x7c3aed;
    if (config.embedTitle) embed.title = replaceVars(config.embedTitle, user.username, user.id, guild.name, guild.memberCount || guild.members.cache.size, user.tag, guild);
    if (config.embedFooter) embed.footer = { text: replaceVars(config.embedFooter, user.username, user.id, guild.name, guild.memberCount || guild.members.cache.size, user.tag, guild) };
    if (imageUrl) {
      const pos = config.imagePosition || 'large';
      if (pos === 'thumbnail') embed.thumbnail = { url: imageUrl };
      else embed.image = { url: imageUrl };
    }
    await (channel as any).send({ embeds: [embed], files });
  } else {
    let content = msgText;
    if (imageUrl && !imageUrl.startsWith('attachment://')) content = `${imageUrl}\n${content}`;
    await (channel as any).send({ content, files });
  }
  addLog('INFO', `Welcome sent to ${user.tag} in #${(channel as any).name}`);
}

export async function sendTestWelcome(guildId: string, channelId: string, settings: any) {
  if (!client) throw new Error('Bot not connected');
  const guild = client.guilds.cache.get(guildId);
  if (!guild) throw new Error('Guild not found');
  await guild.channels.fetch();
  const botMember = guild.members.cache.get(client.user!.id);
  if (!botMember) throw new Error('Bot not on server');
  const config = {
    channelId,
    message: settings.welcomeMessage || 'Welcome {name} to {server}!',
    type: settings.welcomeType || 'text',
    imageUrl: settings.welcomeImage || '',
    embedColor: settings.embedColor,
    embedTitle: settings.embedTitle,
    embedFooter: settings.embedFooter,
    imagePosition: settings.imagePosition || 'large',
  };
  await sendWelcomeMessage(guild, botMember.user, config);
}
