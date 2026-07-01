const API_BASE = 'https://discord.com/api/v10';

let token: string | null = null;
let cachedUser: any = null;

type StatusListener = (status: 'disconnected' | 'connecting' | 'connected' | 'error', error?: string) => void;
const statusListeners: StatusListener[] = [];

export function onStatusChange(listener: StatusListener) {
  statusListeners.push(listener);
  return () => {
    const idx = statusListeners.indexOf(listener);
    if (idx >= 0) statusListeners.splice(idx, 1);
  };
}

function notify(status: 'disconnected' | 'connecting' | 'connected' | 'error', error?: string) {
  statusListeners.forEach(l => l(status, error));
}

async function api<T = any>(method: string, path: string, body?: any): Promise<T> {
  if (!token) throw new Error('Not authenticated');
  const options: RequestInit = {
    method,
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
      'User-Agent': 'DiscordManager/1.0',
    },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord API ${res.status}: ${text}`);
  }
  if (res.status === 204 || res.status === 201) {
    if (method === 'DELETE' || method === 'PUT') return undefined as unknown as T;
    if (method === 'PATCH') {
      const text = await res.text();
      return text ? JSON.parse(text) as T : undefined as unknown as T;
    }
  }
  return res.json() as Promise<T>;
}

export function isConnected(): boolean {
  return !!token;
}

export async function connect(userToken: string, isBot = false): Promise<void> {
  token = isBot ? `Bot ${userToken}` : userToken;
  cachedUser = null;
  notify('connecting');

  try {
    const user = await api<any>('GET', '/users/@me');
    if (!user.id) throw new Error('Invalid token');
    cachedUser = user;
    notify('connected');
  } catch (e: any) {
    token = null;
    notify('error', e.message);
    throw e;
  }
}

export async function disconnect(): Promise<void> {
  token = null;
  cachedUser = null;
  notify('disconnected');
}

export async function getUser(): Promise<any> {
  if (cachedUser) return cachedUser;
  const user = await api<any>('GET', '/users/@me');
  cachedUser = user;
  return user;
}

export async function getGuilds(): Promise<Array<{ id: string; name: string; icon: string | null; memberCount: number; permissions: string; owner: boolean }>> {
  const guilds = await api<any[]>('GET', '/users/@me/guilds');
  return guilds.map(g => ({
    id: g.id,
    name: g.name,
    icon: g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png` : null,
    memberCount: g.approximate_member_count || 0,
    permissions: g.permissions || '0',
    owner: g.owner || false,
  }));
}

export async function fillMemberCounts(list: Array<{ id: string; memberCount: number }>): Promise<Map<string, number>> {
  const details = await Promise.allSettled(
    list.map(g => api<any>('GET', `/guilds/${g.id}`).then(full => ({ id: g.id, count: full.member_count || full.approximate_member_count || 0 })))
  );
  const map = new Map<string, number>();
  for (const d of details) {
    if (d.status === 'fulfilled') map.set(d.value.id, d.value.count);
  }
  return map;
}

export async function getGuild(guildId: string): Promise<any> {
  return api('GET', `/guilds/${guildId}`);
}

export async function getChannels(guildId: string): Promise<any[]> {
  return api('GET', `/guilds/${guildId}/channels`);
}

export async function createChannel(guildId: string, name: string, type: number, options?: any): Promise<any> {
  const body: any = { name, type };
  if (options?.topic) body.topic = options.topic;
  if (options?.parentId) body.parent_id = options.parentId;
  if (options?.nsfw !== undefined) body.nsfw = options.nsfw;
  if (options?.bitrate) body.bitrate = options.bitrate;
  if (options?.userLimit) body.user_limit = options.userLimit;
  if (options?.rateLimitPerUser) body.rate_limit_per_user = options.rateLimitPerUser;
  return api('POST', `/guilds/${guildId}/channels`, body);
}

export async function editChannel(channelId: string, data: any): Promise<any> {
  const body: any = {};
  if (data.name) body.name = data.name;
  if (data.topic !== undefined) body.topic = data.topic;
  if (data.parentId !== undefined) body.parent_id = data.parentId || null;
  if (data.position !== undefined) body.position = data.position;
  if (data.nsfw !== undefined) body.nsfw = data.nsfw;
  if (data.bitrate !== undefined) body.bitrate = data.bitrate;
  if (data.userLimit !== undefined) body.user_limit = data.userLimit;
  if (data.rateLimitPerUser !== undefined) body.rate_limit_per_user = data.rateLimitPerUser;
  return api('PATCH', `/channels/${channelId}`, body);
}

export async function deleteChannel(channelId: string): Promise<void> {
  await api('DELETE', `/channels/${channelId}`);
}

export async function deleteChannels(channelIds: string[]): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
  const result: { success: string[]; failed: { id: string; error: string }[] } = { success: [], failed: [] };
  for (const id of channelIds) {
    try { await deleteChannel(id); result.success.push(id); }
    catch (e: any) { result.failed.push({ id, error: e.message }); }
  }
  return result;
}

export async function bulkEditChannels(channelIds: string[], data: any): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
  const result: { success: string[]; failed: { id: string; error: string }[] } = { success: [], failed: [] };
  for (const id of channelIds) {
    try { await editChannel(id, data); result.success.push(id); }
    catch (e: any) { result.failed.push({ id, error: e.message }); }
  }
  return result;
}

export async function getRoles(guildId: string): Promise<any[]> {
  return api('GET', `/guilds/${guildId}/roles`);
}

export async function createRole(guildId: string, data: { name: string; color?: number; hoist?: boolean; mentionable?: boolean; permissions?: string }): Promise<any> {
  const body: any = { name: data.name };
  if (data.color !== undefined) body.color = data.color;
  if (data.hoist !== undefined) body.hoist = data.hoist;
  if (data.mentionable !== undefined) body.mentionable = data.mentionable;
  if (data.permissions !== undefined) body.permissions = data.permissions;
  return api('POST', `/guilds/${guildId}/roles`, body);
}

export async function editRole(guildId: string, roleId: string, data: any): Promise<any> {
  const body: any = {};
  if (data.name !== undefined) body.name = data.name;
  if (data.color !== undefined) body.color = data.color;
  if (data.hoist !== undefined) body.hoist = data.hoist;
  if (data.mentionable !== undefined) body.mentionable = data.mentionable;
  if (data.permissions !== undefined) body.permissions = data.permissions;
  return api('PATCH', `/guilds/${guildId}/roles/${roleId}`, body);
}

export async function deleteRole(guildId: string, roleId: string): Promise<void> {
  await api('DELETE', `/guilds/${guildId}/roles/${roleId}`);
}

export async function deleteRoles(guildId: string, roleIds: string[]): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
  const result: { success: string[]; failed: { id: string; error: string }[] } = { success: [], failed: [] };
  for (const id of roleIds) {
    try { await deleteRole(guildId, id); result.success.push(id); }
    catch (e: any) { result.failed.push({ id, error: e.message }); }
  }
  return result;
}

export async function bulkEditRoles(guildId: string, roleIds: string[], data: any): Promise<{ success: string[]; failed: { id: string; error: string }[] }> {
  const result: { success: string[]; failed: { id: string; error: string }[] } = { success: [], failed: [] };
  for (const id of roleIds) {
    try { await editRole(guildId, id, data); result.success.push(id); }
    catch (e: any) { result.failed.push({ id, error: e.message }); }
  }
  return result;
}

export async function getMembers(guildId: string): Promise<any[]> {
  const members: any[] = [];
  let after = '';
  while (true) {
    const batch = await api<any[]>('GET', `/guilds/${guildId}/members?limit=1000${after ? `&after=${after}` : ''}`);
    if (batch.length === 0) break;
    members.push(...batch);
    after = batch[batch.length - 1].user.id;
  }
  return members;
}

export async function kickMember(guildId: string, userId: string, reason?: string): Promise<void> {
  const headers: any = {};
  if (reason) headers['X-Audit-Log-Reason'] = reason;
  await api('DELETE', `/guilds/${guildId}/members/${userId}`);
}

export async function banMember(guildId: string, userId: string, reason?: string, deleteMessageDays?: number): Promise<void> {
  const body: any = {};
  if (reason) body.reason = reason;
  if (deleteMessageDays) body.delete_message_seconds = deleteMessageDays * 86400;
  await api('PUT', `/guilds/${guildId}/bans/${userId}`, body);
}

export async function unbanMember(guildId: string, userId: string): Promise<void> {
  await api('DELETE', `/guilds/${guildId}/bans/${userId}`);
}

export async function getBans(guildId: string): Promise<any[]> {
  return api('GET', `/guilds/${guildId}/bans`);
}

export async function setMemberRoles(guildId: string, userId: string, roleIds: string[]): Promise<void> {
  await api('PUT', `/guilds/${guildId}/members/${userId}`, { roles: roleIds });
}

export async function addMemberRole(guildId: string, userId: string, roleId: string): Promise<void> {
  await api('PUT', `/guilds/${guildId}/members/${userId}/roles/${roleId}`);
}

export async function removeMemberRole(guildId: string, userId: string, roleId: string): Promise<void> {
  await api('DELETE', `/guilds/${guildId}/members/${userId}/roles/${roleId}`);
}

export async function editGuild(guildId: string, data: { name?: string; description?: string }): Promise<any> {
  return api('PATCH', `/guilds/${guildId}`, data);
}

export const ALL_PERMISSIONS: { key: string; bit: string; label: string }[] = [
  { key: 'CREATE_INSTANT_INVITE', bit: '1', label: 'Create Invite' },
  { key: 'KICK_MEMBERS', bit: '2', label: 'Kick Members' },
  { key: 'BAN_MEMBERS', bit: '4', label: 'Ban Members' },
  { key: 'ADMINISTRATOR', bit: '8', label: 'Administrator' },
  { key: 'MANAGE_CHANNELS', bit: '16', label: 'Manage Channels' },
  { key: 'MANAGE_GUILD', bit: '32', label: 'Manage Server' },
  { key: 'ADD_REACTIONS', bit: '64', label: 'Add Reactions' },
  { key: 'VIEW_AUDIT_LOG', bit: '128', label: 'View Audit Log' },
  { key: 'PRIORITY_SPEAKER', bit: '256', label: 'Priority Speaker' },
  { key: 'STREAM', bit: '512', label: 'Video' },
  { key: 'VIEW_CHANNEL', bit: '1024', label: 'View Channels' },
  { key: 'SEND_MESSAGES', bit: '2048', label: 'Send Messages' },
  { key: 'SEND_TTS_MESSAGES', bit: '4096', label: 'Send TTS Messages' },
  { key: 'MANAGE_MESSAGES', bit: '8192', label: 'Manage Messages' },
  { key: 'EMBED_LINKS', bit: '16384', label: 'Embed Links' },
  { key: 'ATTACH_FILES', bit: '32768', label: 'Attach Files' },
  { key: 'READ_MESSAGE_HISTORY', bit: '65536', label: 'Read Message History' },
  { key: 'MENTION_EVERYONE', bit: '131072', label: 'Mention @everyone' },
  { key: 'USE_EXTERNAL_EMOJIS', bit: '262144', label: 'Use External Emoji' },
  { key: 'USE_EXTERNAL_STICKERS', bit: '137438953472', label: 'Use External Stickers' },
  { key: 'CONNECT', bit: '1048576', label: 'Connect (Voice)' },
  { key: 'SPEAK', bit: '2097152', label: 'Speak (Voice)' },
  { key: 'MUTE_MEMBERS', bit: '4194304', label: 'Mute Members' },
  { key: 'DEAFEN_MEMBERS', bit: '8388608', label: 'Deafen Members' },
  { key: 'MOVE_MEMBERS', bit: '16777216', label: 'Move Members' },
  { key: 'USE_VAD', bit: '33554432', label: 'Use Voice Activity' },
  { key: 'CHANGE_NICKNAME', bit: '67108864', label: 'Change Nickname' },
  { key: 'MANAGE_NICKNAMES', bit: '134217728', label: 'Manage Nicknames' },
  { key: 'MANAGE_ROLES', bit: '268435456', label: 'Manage Roles' },
  { key: 'MANAGE_WEBHOOKS', bit: '536870912', label: 'Manage Webhooks' },
  { key: 'MANAGE_GUILD_EXPRESSIONS', bit: '274877906944', label: 'Manage Expressions' },
  { key: 'USE_APPLICATION_COMMANDS', bit: '2147483648', label: 'Use Commands' },
  { key: 'REQUEST_TO_SPEAK', bit: '4294967296', label: 'Request to Speak' },
  { key: 'MANAGE_EVENTS', bit: '8589934592', label: 'Manage Events' },
  { key: 'MODERATE_MEMBERS', bit: '1099511627776', label: 'Moderate Members' },
  { key: 'USE_EXTERNAL_SOUNDS', bit: '549755813888', label: 'Use External Sounds' },
  { key: 'SEND_VOICE_MESSAGES', bit: '70368744177664', label: 'Send Voice Messages' },
];

export async function sendChannelMessage(channelId: string, content: string, options?: { embed?: any; fileBase64?: string; fileName?: string }): Promise<any> {
  if (options?.fileBase64) {
    const matches = options.fileBase64.match(/^data:image\/(\w+);base64,(.+)$/);
    if (matches) {
      const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
      let body = '';
      const fileName = options.fileName || `image.${ext}`;
      const crlf = '\r\n';
      if (options?.embed) {
        body += `--${boundary}${crlf}`;
        body += `Content-Disposition: form-data; name="payload_json"${crlf}`;
        body += `Content-Type: application/json${crlf}${crlf}`;
        const payload: any = {};
        if (content) payload.content = content;
        payload.embeds = [{ ...options.embed, image: { url: `attachment://${fileName}` } }];
        body += JSON.stringify(payload) + crlf;
      } else {
        body += `--${boundary}${crlf}`;
        body += `Content-Disposition: form-data; name="payload_json"${crlf}`;
        body += `Content-Type: application/json${crlf}${crlf}`;
        body += JSON.stringify({ content: content || '' }) + crlf;
      }
      body += `--${boundary}${crlf}`;
      body += `Content-Disposition: form-data; name="files[0]"; filename="${fileName}"${crlf}`;
      body += `Content-Type: image/${ext}${crlf}${crlf}`;
      const bodyBuffer = Buffer.concat([
        Buffer.from(body, 'utf-8'),
        buffer,
        Buffer.from(`${crlf}--${boundary}--${crlf}`, 'utf-8'),
      ]);
      if (!token) throw new Error('Not authenticated');
      const res = await fetch(`${API_BASE}/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: token,
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'User-Agent': 'DiscordManager/1.0',
        },
        body: bodyBuffer,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Discord API ${res.status}: ${text}`);
      }
      return res.json();
    }
  }
  const body: any = {};
  if (options?.embed) {
    body.embeds = [options.embed];
    if (content && !options.embed.description) options.embed.description = content;
  } else {
    body.content = content || '';
  }
  return api('POST', `/channels/${channelId}/messages`, body);
}
