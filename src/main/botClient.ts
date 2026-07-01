import { Client, GatewayIntentBits, ActivityType } from 'discord.js';

let client: Client | null = null;
let statsInterval: NodeJS.Timeout | null = null;
let logs: Array<{ time: string; type: string; msg: string }> = [];

function addLog(type: string, msg: string) {
  const time = new Date().toLocaleTimeString();
  logs.push({ time, type, msg });
  if (logs.length > 200) logs = logs.slice(-200);
  console.log(`[${time}][${type}] ${msg}`);
}

export function getLogs() { return logs; }

interface GuildStats {
  memberCount: number;
  botCount: number;
  onlineCount: number;
  idleCount: number;
  dndCount: number;
  offlineCount: number;
  voiceCount: number;
  totalChannels: number;
  totalRoles: number;
  lastUpdated: number;
}

const statsCache = new Map<string, GuildStats>();

export function isRunning(): boolean {
  return client !== null && client.isReady();
}

export async function startBot(token: string): Promise<void> {
  if (client) await stopBot();

  client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildPresences,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates,
    ],
    presence: {
      activities: [{ name: 'Discord Manager', type: ActivityType.Watching }],
      status: 'online',
    },
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      addLog('ERROR', 'Bot connection timeout (30s). Check token and intents.');
      reject(new Error('Bot connection timeout'));
    }, 30000);

    client!.once('ready', () => {
      clearTimeout(timeout);
      addLog('INFO', `Bot connected as ${client!.user?.tag} (ID: ${client!.user?.id})`);
      addLog('INFO', `On ${client!.guilds.cache.size} servers`);
      setupListeners();
      buildStats();
      statsInterval = setInterval(buildStats, 60000);
      resolve();
    });

    client!.on('error', (e) => {
      addLog('ERROR', `Client error: ${e.message}`);
    });

    client!.on('warn', (w) => addLog('WARN', w));

    client!.on('shardError', (e) => {
      addLog('ERROR', `Shard error: ${e.message}`);
    });

    client!.login(token).then(() => {
      addLog('INFO', 'Login successful, waiting for ready...');
    }).catch((e: any) => {
      clearTimeout(timeout);
      const msg = e.message || String(e);
      if (msg.includes('TOKEN_INVALID')) {
        addLog('ERROR', 'Invalid bot token! Reset it in Developer Portal and update the app.');
      } else if (msg.includes('DISALLOWED_INTENTS')) {
        addLog('ERROR', 'Intents not enabled! Enable Privileged Gateway Intents in Developer Portal > Bot.');
      } else if (msg.includes('connection')) {
        addLog('ERROR', 'Connection refused. Check your internet/firewall.');
      } else {
        addLog('ERROR', `Login failed: ${msg}`);
      }
      reject(e);
    });
  });
}

export async function stopBot(): Promise<void> {
  if (statsInterval) { clearInterval(statsInterval); statsInterval = null; }
  if (client) { client.destroy(); client = null; }
  statsCache.clear();
}

function setupListeners() {
  if (!client) return;
  client.on('guildCreate', (guild) => addLog('INFO', `Added to server: ${guild.name} (${guild.id})`));
  client.on('guildDelete', (guild) => addLog('WARN', `Removed from server: ${guild.name || guild.id}`));
  client.on('guildMemberAdd', (member) => {
    const existing = statsCache.get(member.guild.id);
    if (existing) {
      existing.memberCount = member.guild.memberCount || existing.memberCount + 1;
      if (member.user.bot) existing.botCount++;
      existing.lastUpdated = Date.now();
    }
  });
  client.on('guildMemberRemove', (member) => {
    const existing = statsCache.get(member.guild.id);
    if (existing) {
      existing.memberCount = Math.max(0, (member.guild.memberCount || existing.memberCount) - 1);
      if (member.user.bot) existing.botCount = Math.max(0, existing.botCount - 1);
      existing.lastUpdated = Date.now();
    }
  });
  client.on('presenceUpdate', (_oldPresence, newPresence) => {
    const guildId = newPresence.guild?.id;
    if (!guildId) return;
    const existing = statsCache.get(guildId);
    if (!existing) return;
    const status = newPresence.status;
    if (status === 'online') existing.onlineCount++;
    else if (status === 'idle') existing.idleCount++;
    else if (status === 'dnd') existing.dndCount++;
    else existing.offlineCount++;
    existing.lastUpdated = Date.now();
  });
}

function computeGuildStats(guildId: string): GuildStats | null {
  if (!client) return null;
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return null;

  const members = guild.members.cache;
  let online = 0, idle = 0, dnd = 0, offline = 0, bots = 0;

  for (const m of members.values()) {
    if (m.user.bot) bots++;
    const status = m.presence?.status;
    if (status === 'online') online++;
    else if (status === 'idle') idle++;
    else if (status === 'dnd') dnd++;
    else offline++;
  }

  const voiceCount = guild.channels.cache
    .filter((c): c is any => c.isVoiceBased())
    .reduce((acc, c) => {
      try { return acc + (c.members?.size || 0); } catch { return acc; }
    }, 0);

  return {
    memberCount: guild.memberCount || members.size,
    botCount: bots,
    onlineCount: online,
    idleCount: idle,
    dndCount: dnd,
    offlineCount: offline,
    voiceCount,
    totalChannels: guild.channels.cache.size,
    totalRoles: guild.roles.cache.size,
    lastUpdated: Date.now(),
  };
}

export function buildStats() {
  if (!client) return;
  for (const guild of client.guilds.cache.values()) {
    const stats = computeGuildStats(guild.id);
    if (stats) statsCache.set(guild.id, stats);
  }
}

export function getGuildStats(guildId: string): GuildStats | null {
  if (statsCache.has(guildId)) return statsCache.get(guildId)!;
  const stats = computeGuildStats(guildId);
  if (stats) statsCache.set(guildId, stats);
  return stats;
}

export function getAllStats(): Record<string, GuildStats> {
  buildStats();
  return Object.fromEntries(statsCache);
}

export function getBotGuilds(): string[] {
  if (!client) return [];
  return [...client.guilds.cache.keys()];
}
