const { Client, GatewayIntentBits, ActivityType, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');
const http = require('http');
const url = require('url');

const CONFIG_PATH = process.env.CONFIG_PATH || path.join(process.env.RAILWAY_VOLUME || '', 'config.json');
const PORT = process.env.PORT || 3000;

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {}
  return {};
}

function saveConfig(data) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const existing = loadConfig();
    const merged = { ...existing, ...data };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(merged, null, 2), 'utf-8');
  } catch (e) { console.log('[CONFIG] Save error:', e.message); }
}

// HTTP API server for remote config
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.end(); return; }

  const parsed = url.parse(req.url, true);
  const parts = parsed.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && parts[0] === 'api' && parts[1] === 'config' && parts[2]) {
    const config = loadConfig();
    const guildId = parts[2];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ settings: config.botSettings?.[guildId] || {} }));
    return;
  }

  if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'config' && parts[2]) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const config = loadConfig();
        if (!config.botSettings) config.botSettings = {};
        const guildId = parts[2];
        config.botSettings[guildId] = { ...(config.botSettings[guildId] || {}), ...data };
        Object.keys(config.botSettings[guildId]).forEach(k => {
          if (config.botSettings[guildId][k] === null) delete config.botSettings[guildId][k];
        });
        if (Object.keys(config.botSettings[guildId]).length === 0) delete config.botSettings[guildId];
        saveConfig({ botSettings: config.botSettings });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
        console.log('[API] Config updated for', guildId, data);
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404); res.end();
});

server.listen(PORT, () => {
  console.log(`[API] Server listening on port ${PORT}`);
});

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
  console.log('[GUILD_MEMBER_ADD] ' + member.user.tag + ' on ' + member.guild.name);
  const s = getSettings(member.guild.id);
  console.log('[AUTO-ROLE] Checking config for ' + member.guild.id + ': autoRole=' + (s.autoRole || 'none'));
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

    if (cmd === 'tsetup' || cmd === 'ticketsetup') {
    if (!message.member?.permissions.has('Administrator')) return;
    const gs = message.guild.channels.cache.filter(c => c.type === 0 || c.type === 5);
    const kw = { support: ['support', 'поддержк', 'помощ'], donat: ['donat', 'донат', 'привиле'], ideas: ['idea', 'иде', 'предлож'], complaint: ['complaint', 'жалоб', 'репорт'] };
        const texts = {
      support: '**Приветствуем Вас в канале поддержки Discord сервера HideRealm**\nЧтобы задать свой вопрос, нажмите на кнопку под данным сообщением!\n\n**ВАЖНАЯ ИНФОРМАЦИЯ:**\n— В данном канале действуют все правила, прописанные в #правила',
      donat: 'Как получить роль, соответствующую вашей привилегии?\n1. Нажмите на кнопку под данным сообщением.\n2. Следуйте указаниям бота в новом созданном канале.\n\n@IMMORTAL\n@CRUSADER\n@DESTROYER\n@PALADIN\n@ELITE\n@GUARDIAN\n@LORD',
      ideas: 'В данном канале можно отправить идею\nлибо для Гриферского режима, либо для Discord сервера.',
      complaint: '**Жалобы на нарушения на Discord сервере**\nВ данном канале Вы можете отправить жалобу на нарушение, которое произошло на Discord сервере.\nМы не принимаем жалобы на нарушения, произошедшие на Minecraft сервере!'
    };
    const btns = { support: '🛠️ Создать тикет', donat: '🏆 Получить роль', ideas: '💡 Отправить идею', complaint: '👮 Подать жалобу' };
    let cnt = 0;
    for (const [t, words] of Object.entries(kw)) {
      const ch = gs.find(c => words.some(w => c.name.toLowerCase().includes(w)));
      if (ch) {
        let msg = texts[t];
        // Replace @ROLENAME with actual role mentions
        msg = msg.replace(/@(\w+)/g, (match, name) => {
          const role = message.guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase());
          return role ? role.toString() : match;
        });
        // Replace #channelname with actual channel mentions (partial match)
        msg = msg.replace(/#([\wа-яА-ЯёЁ\d_-]+)/g, (match, name) => {
          const clean = name.replace(/[.,!?;:)]+$/, '');
          const ch = message.guild.channels.cache.find(c => c.name.toLowerCase().includes(clean.toLowerCase()));
          return ch ? ch.toString() : match;
        });
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ticket_' + t).setLabel(btns[t]).setStyle(ButtonStyle.Primary));
        await ch.send({ content: msg, components: [row] });
        cnt++;
      }
    }
    message.reply('✅ Настроено ' + cnt + ' тикет-панелей');
    return;
  }
});

// Ticket button handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId.startsWith('close_')) {
    if (!interaction.member?.permissions.has('Administrator') && !interaction.member?.permissions.has('ManageThreads')) {
      return interaction.reply({ content: '❌ Only admins can close tickets', ephemeral: true });
    }
    const thread = interaction.channel;
    await interaction.reply({ content: '🔒 Closing ticket...', ephemeral: true });
    await thread.send('🔒 Ticket closed by ' + interaction.user.username);
    await thread.setArchived(true);
    return;
  }

  if (!interaction.customId.startsWith('ticket_')) return;
  const type = interaction.customId.slice(7);
  const typeNames = { support: 'Support', donat: 'Donat', ideas: 'Ideas', complaint: 'Complaint' };

  // Ideas opens a modal
  if (type === 'ideas') {
    const modal = new ModalBuilder().setCustomId('idea_modal').setTitle('💡 Idea');
    const input = new TextInputBuilder().setCustomId('idea_text').setLabel('Your idea').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000);
    modal.addComponents(new ActionRowBuilder().addComponents(input));
    await interaction.showModal(modal);
    return;
  }

  const msgs = {
    support: 'Support ticket from ' + interaction.user.username + '\nWrite your question here.\nAuthor: @' + interaction.user.username + '\nID: ' + interaction.user.id,
    donat: 'To get your role, send:\n1) Your nickname\n2) Your privilege\n3) Screenshot proof',
    complaint: 'Report form:\n1. Offender [Mention/ID/Tag]\n2. What rule was broken?\n3. Evidence [Screenshot/Link]'
  };

  await interaction.reply({ content: '⏳ Creating ticket...', ephemeral: true });
  try {
    const thread = await interaction.channel.threads.create({ name: typeNames[type] + ' - ' + interaction.user.username, type: ChannelType.PrivateThread });
    await thread.members.add(interaction.user.id);
    const closeBtn = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_' + thread.id).setLabel('🔒 Close ticket').setStyle(ButtonStyle.Danger));
    await thread.send({ content: msgs[type] || 'Ticket created!', components: [closeBtn] });
    await interaction.editReply({ content: '✅ Ticket: ' + thread.toString() });
    console.log('[TICKET] ' + type + ' by ' + interaction.user.tag);
  } catch (e) { await interaction.editReply({ content: '❌ ' + e.message }); }
});
// Modal submit handler for ideas
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isModalSubmit()) return;
  if (interaction.customId !== 'idea_modal') return;

  const idea = interaction.fields.getTextInputValue('idea_text');
  await interaction.reply({ content: '✅ Идея отправлена на рассмотрение!', ephemeral: true });

  try {
    // Find admin channel or create thread
    const adminChan = interaction.guild.channels.cache.find(c => c.name.toLowerCase().includes('admin') || c.name.toLowerCase().includes('staff'));
    const target = adminChan || interaction.channel;
    const thread = await target.threads.create({
      name: '💡 Идея от ' + interaction.user.username,
      type: ChannelType.PrivateThread,
    });
    await thread.members.add(interaction.user.id);
    await thread.send('**💡 Новая идея от ' + interaction.user.username + '**\n' + idea);
    console.log('[IDEA] from ' + interaction.user.tag);
  } catch (e) {
    console.log('[IDEA ERROR]', e.message);
  }
});

client.login(token).catch(e => {
  console.log('[BOT] Login failed:', e.message);
  process.exit(1);
});

process.on('SIGINT', () => { console.log('[BOT] Shutting down...'); client.destroy(); process.exit(0); });
