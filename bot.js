const { Client, GatewayIntentBits, ActivityType, AttachmentBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = process.env.CONFIG_PATH || path.join(
  process.env.APPDATA || (process.platform === 'darwin'
    ? process.env.HOME + '/Library/Application Support'
    : process.env.HOME + '/.config'),
  'discord-manager', 'config.json'
);

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {}
  return {};
}

function getSettings(guildId) {
  const config = loadConfig();
  return config.botSettings?.[guildId] || {};
}

console.log('[BOT] Starting Discord Manager Bot...');
console.log('[BOT] Config path:', CONFIG_PATH);

const config = loadConfig();
const token = process.env.BOT_TOKEN || config.botToken;
if (!token) {
  console.log('[BOT] No bot token found. Set BOT_TOKEN env var or run app first.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates,
  ],
  presence: { activities: [{ name: 'Discord Manager', type: ActivityType.Watching }], status: 'online' },
});

client.on('error', (e) => console.log('[ERROR]', e.message));
client.on('warn', (w) => console.log('[WARN]', w));

client.on('ready', () => {
  console.log(`[BOT] Connected as ${client.user?.tag}`);
  console.log(`[BOT] On ${client.guilds.cache.size} servers`);
});

client.on('guildCreate', (g) => console.log('[BOT] Added to:', g.name));
client.on('guildDelete', (g) => console.log('[BOT] Removed from:', g.name || g.id));

client.on('guildMemberAdd', async (member) => {
  const s = getSettings(member.guild.id);
  if (s.autoRole) {
    try { await member.roles.add(s.autoRole); console.log(`[AUTO-ROLE] ${member.user.tag}`); }
    catch (e) { console.log('[AUTO-ROLE ERROR]', e.message); }
  }
  if (s.welcomeChannel) {
    try {
      const channel = member.guild.channels.cache.get(s.welcomeChannel);
      if (channel && 'send' in channel) {
        const msg = (s.welcomeMessage || 'Welcome {mention}!')
          .replace(/\{name\}/g, member.user.username)
          .replace(/\{mention\}/g, `<@${member.user.id}>`)
          .replace(/\{server\}/g, member.guild.name)
          .replace(/\{count\}/g, String(member.guild.memberCount || member.guild.members.cache.size))
          .replace(/\{tag\}/g, member.user.tag)
          .replace(/\{channel:([^}]+)\}/g, (_, n) => {
            const ch = member.guild.channels.cache.find(c => c.name?.toLowerCase() === n.toLowerCase() || c.name?.toLowerCase().includes(n.toLowerCase()));
            return ch ? `<#${ch.id}>` : `#${n}`;
          });
        let imgUrl = (s.welcomeImage || '').replace(/\{name\}/g, member.user.username);
        const files = [];
        let embedImg = '';
        if (imgUrl.startsWith('data:')) {
          const m = imgUrl.match(/^data:image\/(\w+);base64,(.+)$/);
          if (m) {
            const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
            files.push(new AttachmentBuilder(Buffer.from(m[2], 'base64'), { name: `welcome.${ext}` }));
            embedImg = `attachment://welcome.${ext}`;
          }
        } else if (imgUrl) embedImg = imgUrl;
        if (s.welcomeType === 'embed') {
          const embed = { description: msg, color: parseInt((s.embedColor || '#7c3aed').replace('#', ''), 16) };
          if (s.embedTitle) embed.title = s.embedTitle.replace(/\{name\}/g, member.user.username);
          if (s.embedFooter) embed.footer = { text: s.embedFooter.replace(/\{name\}/g, member.user.username) };
          if (embedImg) {
            if (s.imagePosition === 'thumbnail') embed.thumbnail = { url: embedImg };
            else embed.image = { url: embedImg };
          }
          await channel.send({ embeds: [embed], files });
        } else {
          let content = msg;
          if (embedImg && !embedImg.startsWith('attachment://')) content = embedImg + '\n' + content;
          await channel.send({ content, files });
        }
        console.log(`[WELCOME] Sent to ${member.user.tag} in #${channel.name}`);
      }
    } catch (e) { console.log('[WELCOME ERROR]', e.message); }
  }
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('.')) return;

  const args = message.content.slice(1).trim().split(/\s+/);
  const cmd = args[0].toLowerCase();

  if (cmd === '\u043E\u0447\u0438\u0441\u0442\u0438\u0442\u044C' || cmd === 'clear' || cmd === 'purge') {
    if (!message.member?.permissions.has('Administrator') && !message.member?.permissions.has('ManageMessages')) {
      return message.reply('\u274C \u041D\u0443\u0436\u043D\u044B \u043F\u0440\u0430\u0432\u0430 \u0430\u0434\u043C\u0438\u043D\u0438\u0441\u0442\u0440\u0430\u0442\u043E\u0440\u0430').then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    }

    const amount = args[1]?.toLowerCase() === 'all' ? 9999 : parseInt(args[1]);
    if (!amount || amount < 1 || (amount > 100 && amount !== 9999)) {
      return message.reply('\u274C \u0423\u043A\u0430\u0436\u0438 \u0447\u0438\u0441\u043B\u043E \u043E\u0442 1 \u0434\u043E 100 \u0438\u043B\u0438 "all"').then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    }

    try {
      await message.delete();
      let total = 0;

      if (amount === 9999) {
        let fetched;
        do {
          fetched = await message.channel.messages.fetch({ limit: 100 });
          if (fetched.size > 0) {
            const deleted = await message.channel.bulkDelete(fetched, true);
            total += deleted.size;
          }
        } while (fetched.size >= 100);
        const reply = await message.channel.send('\u2705 \u041E\u0447\u0438\u0449\u0435\u043D\u043E ' + total + ' \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439');
        setTimeout(() => reply.delete().catch(() => {}), 3000);
        console.log('[PURGE] Purged all (' + total + ') by ' + message.author.tag);
      } else {
        const deleted = await message.channel.bulkDelete(amount, true);
        total = deleted.size;
        const reply = await message.channel.send('\u2705 \u0423\u0434\u0430\u043B\u0435\u043D\u043E ' + total + ' \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439');
        setTimeout(() => reply.delete().catch(() => {}), 3000);
        console.log('[PURGE] Deleted ' + total + ' by ' + message.author.tag);
      }
    } catch (e) {
      message.reply('\u274C ' + e.message).then(m => setTimeout(() => m.delete().catch(() => {}), 5000));
    }
  }
});

client.login(token).catch(e => {
  console.log('[BOT] Login failed:', e.message);
  process.exit(1);
});

process.on('SIGINT', () => { console.log('[BOT] Shutting down...'); client.destroy(); process.exit(0); });
