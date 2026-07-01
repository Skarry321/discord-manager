import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { DiscordGuildFull, DiscordChannel, DiscordMember, DiscordRole } from '../types';

function navigate(view: string) {
  window.dispatchEvent(new CustomEvent('navigate', { detail: view }));
}

export default function Dashboard() {
  const { selectedGuild } = useAuth();
  const [guild, setGuild] = useState<DiscordGuildFull | null>(null);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [members, setMembers] = useState<DiscordMember[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [notifications, setNotifications] = useState<Array<{ text: string; time: string; type: string }>>([]);
  const [botStats, setBotStats] = useState<any>(null);
  const [botRunning, setBotRunning] = useState(false);

  useEffect(() => {
    if (!selectedGuild) return;
    Promise.all([
      window.api.getGuild(selectedGuild.id).then(r => r.success && r.data && setGuild(r.data)),
      window.api.getChannels(selectedGuild.id).then(r => r.success && r.data && setChannels(r.data)),
      window.api.getMembers(selectedGuild.id).then(r => r.success && r.data && setMembers(r.data)),
      window.api.getRoles(selectedGuild.id).then(r => r.success && r.data && setRoles(r.data)),
    ]);
    window.api.isBotRunning().then(r => {
      setBotRunning(r.running);
      if (r.running) {
        window.api.getBotStats(selectedGuild.id).then(s => s.success && s.data && setBotStats(s.data));
      }
    });
    const n: Array<{ text: string; time: string; type: string }> = [];
    const now = new Date();
    n.push({ text: `${selectedGuild.name} загружен`, time: now.toLocaleTimeString(), type: 'info' });
    setNotifications(n);
  }, [selectedGuild]);

  if (!selectedGuild || !guild) {
    return (
      <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div className="loading">Загрузка статистики...</div>
      </div>
    );
  }

  const textChannels = channels.filter(c => [0, 5, 15].includes(c.type));
  const voiceChannels = channels.filter(c => c.type === 2);
  const adminCount = members.filter(m => m.roles.some(r => r.name === 'Admin' || r.name === 'Administrator')).length;
  const botCount = members.filter(m => m.user.bot).length;
  const onlineNow = botStats ? botStats.onlineCount : Math.round(members.length * 0.35);
  const voiceOnline = botStats ? botStats.voiceCount : 0;

  const sortedMembers = [...members].sort((a, b) => b.roles.length - a.roles.length).slice(0, 5);
  const popularChannels = [...textChannels].sort((a, b) => (a.position || 0) - (b.position || 0)).slice(0, 5);

  return (
    <div className="panel dashboard-page">
      {/* Header */}
      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-icon">
            {guild.icon ? <img src={guild.icon} alt="" /> : selectedGuild.name.charAt(0)}
          </div>
          <div>
            <h1 className="dash-title">{selectedGuild.name}</h1>
            <span className="dash-subtitle">ID: {selectedGuild.id} {guild.premiumTier > 0 ? '• Boost Tier ' + guild.premiumTier : ''}</span>
          </div>
        </div>
        <div className="dash-header-right">
          <div className="dash-status">
            {botRunning ? <><span className="status-dot green" /> Бот онлайн</> : <><span className="status-dot yellow" /> REST режим</>}
            {onlineNow > 0 && <span style={{ marginLeft: 12 }}>🟢 {onlineNow} онлайн</span>}
            {voiceOnline > 0 && <span>🔊 {voiceOnline} в голосе</span>}
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div className="dash-notif">
          {notifications.map((n, i) => (
            <span key={i}>✅ {n.text}</span>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="dash-stats">
        <div className="stat-card"><span className="stat-icon">👥</span><div><span className="stat-value">{guild.memberCount}</span><span className="stat-label">Участников</span></div></div>
        <div className="stat-card"><span className="stat-icon">💬</span><div><span className="stat-value">{textChannels.length}</span><span className="stat-label">Текстовых</span></div></div>
        <div className="stat-card"><span className="stat-icon">🔊</span><div><span className="stat-value">{voiceChannels.length}</span><span className="stat-label">Голосовых</span></div></div>
        <div className="stat-card"><span className="stat-icon">🛡️</span><div><span className="stat-value">{roles.length}</span><span className="stat-label">Ролей</span></div></div>
        <div className="stat-card"><span className="stat-icon">🤖</span><div><span className="stat-value">{botStats ? botStats.botCount : botCount}</span><span className="stat-label">Ботов</span></div></div>
        <div className="stat-card"><span className="stat-icon">👑</span><div><span className="stat-value">{adminCount}</span><span className="stat-label">Админов</span></div></div>
        {botStats && (
          <>
            <div className="stat-card"><span className="stat-icon">🟢</span><div><span className="stat-value">{botStats.onlineCount}</span><span className="stat-label">Онлайн</span></div></div>
            <div className="stat-card"><span className="stat-icon">🌙</span><div><span className="stat-value">{botStats.idleCount}</span><span className="stat-label">Отошли</span></div></div>
            <div className="stat-card"><span className="stat-icon">🔴</span><div><span className="stat-value">{botStats.dndCount}</span><span className="stat-label">Не беспокоить</span></div></div>
            <div className="stat-card"><span className="stat-icon">⚫</span><div><span className="stat-value">{botStats.offlineCount}</span><span className="stat-label">Офлайн</span></div></div>
            <div className="stat-card"><span className="stat-icon">🔊</span><div><span className="stat-value">{botStats.voiceCount}</span><span className="stat-label">В голосе</span></div></div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="dash-section">
        <h3>⚡ Быстрые действия</h3>
        <div className="dash-actions">
          <button className="btn btn-primary" onClick={() => navigate('channels')}>📋 Создать канал</button>
          <button className="btn btn-primary" onClick={() => navigate('roles')}>🛡️ Новая роль</button>
          <button className="btn" onClick={() => navigate('members')}>👥 Участники</button>
          <button className="btn" onClick={() => navigate('settings')}>⚙️ Настройки</button>
          <button className="btn" onClick={() => navigate('channels')}>📁 Управление каналами</button>
        </div>
      </div>

      {/* Two columns */}
      <div className="dash-cols">
        {/* Top Members */}
        <div className="dash-col">
          <div className="dash-section">
            <h3>🏆 Топ участников</h3>
            <div className="dash-members-list">
              {sortedMembers.map((m, i) => (
                <div key={m.id} className="dash-member-row">
                  <span className="dash-rank">{i + 1}</span>
                  <div className="dash-member-avatar">
                    {m.user.avatar ? <img src={m.user.avatar} alt="" /> : <span>{m.user.username.charAt(0)}</span>}
                  </div>
                  <div className="dash-member-info">
                    <span className="dash-member-name">{m.nickname || m.user.username}</span>
                    <span className="dash-member-roles">{m.roles.length} ролей</span>
                  </div>
                </div>
              ))}
              {sortedMembers.length === 0 && <div className="empty-state">Нет данных</div>}
            </div>
          </div>
        </div>

        {/* Popular Channels */}
        <div className="dash-col">
          <div className="dash-section">
            <h3>📊 Популярные каналы</h3>
            <div className="dash-channels-list">
              {popularChannels.map((ch, i) => (
                <div key={ch.id} className="dash-channel-row">
                  <span className="dash-rank">{i + 1}</span>
                  <span className="dash-channel-icon">{ch.type === 2 ? '🔊' : ch.type === 5 ? '📢' : '💬'}</span>
                  <span className="dash-channel-name">{ch.name}</span>
                  <span className="dash-channel-type">{ch.topic ? ch.topic.slice(0, 30) : '—'}</span>
                </div>
              ))}
              {popularChannels.length === 0 && <div className="empty-state">Нет каналов</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Activity graph placeholder */}
      <div className="dash-section">
        <h3>📈 Активность</h3>
        <div className="dash-activity">
          <div className="activity-bar-wrap">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, i) => (
              <div key={day} className="activity-bar-col">
                <span className="activity-bar" style={{ height: `${30 + Math.random() * 60}%` }} />
                <span className="activity-label">{day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Server Info */}
      <div className="dash-section">
        <h3>ℹ️ Информация о сервере</h3>
        <div className="dash-info-grid">
          <div className="dash-info-item"><span>Владелец</span><span>{guild.ownerId}</span></div>
          <div className="dash-info-item"><span>Уровень верификации</span><span>{['Нет', 'Низкий', 'Средний', 'Высокий', 'Очень высокий'][guild.verificationLevel]}</span></div>
          <div className="dash-info-item"><span>Фильтр контента</span><span>{['Отключён', 'Сканировать медиа', 'Сканировать всё'][guild.explicitContentFilter]}</span></div>
          {guild.description && <div className="dash-info-item"><span>Описание</span><span>{guild.description}</span></div>}
        </div>
      </div>

      {botRunning && <BotLogViewer />}
    </div>
  );
}

function BotLogViewer() {
  const [logs, setLogs] = useState<Array<{ time: string; type: string; msg: string }>>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      window.api.getBotLogs().then(r => setLogs(r.logs));
      const iv = setInterval(() => window.api.getBotLogs().then(r => setLogs(r.logs)), 3000);
      return () => clearInterval(iv);
    }
  }, [open]);

  return (
    <div className="dash-section">
      <button className="btn btn-sm" onClick={() => setOpen(!open)} style={{ marginBottom: 8 }}>
        📋 {open ? 'Скрыть логи бота' : 'Показать логи бота'} ({logs.length})
      </button>
      {open && (
        <div className="bot-logs">
          {logs.length === 0 && <div className="empty-state">Логов нет</div>}
          {logs.map((l, i) => (
            <div key={i} className={`log-line ${l.type.toLowerCase()}`}>
              <span className="log-time">{l.time}</span>
              <span className={`log-type ${l.type.toLowerCase()}`}>[{l.type}]</span>
              <span className="log-msg">{l.msg}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
