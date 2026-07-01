import React, { useEffect, useState } from 'react';
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
  const [botStats, setBotStats] = useState<any>(null);

  useEffect(() => {
    if (!selectedGuild) return;
    Promise.all([
      window.api.getGuild(selectedGuild.id).then(r => r.success && r.data && setGuild(r.data)),
      window.api.getChannels(selectedGuild.id).then(r => r.success && r.data && setChannels(r.data)),
      window.api.getMembers(selectedGuild.id).then(r => r.success && r.data && setMembers(r.data)),
      window.api.getRoles(selectedGuild.id).then(r => r.success && r.data && setRoles(r.data)),
      window.api.getBotStats(selectedGuild.id).then(r => r.success && r.data && setBotStats(r.data)).catch(() => {}),
    ]);
    const iv = setInterval(() => {
      window.api.getBotStats(selectedGuild.id).then(r => r.success && r.data && setBotStats(r.data)).catch(() => {});
    }, 10000);
    return () => clearInterval(iv);
  }, [selectedGuild]);

  if (!selectedGuild || !guild) return (
    <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div className="loading">Загрузка...</div>
    </div>
  );

  const textChannels = channels.filter(c => [0, 5, 15].includes(c.type));
  const voiceChannels = channels.filter(c => c.type === 2);
  const onlineNow = botStats ? botStats.onlineCount + botStats.idleCount : '?';

  return (
    <div className="panel dashboard-page">
      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-icon">
            {guild.icon ? <img src={guild.icon} alt="" /> : selectedGuild.name.charAt(0)}
          </div>
          <div>
            <h1 className="dash-title">{selectedGuild.name}</h1>
            <span className="dash-subtitle">
              {botStats ? `🟢 ${onlineNow} онлайн · 🔊 ${botStats.voiceCount} в голосе` : `${guild.memberCount} участников`}
            </span>
          </div>
        </div>
        <div className="dash-header-right">
          {botStats ? <span className="status-dot green" style={{ width: 10, height: 10 }} /> :
            <span className="status-dot yellow" style={{ width: 10, height: 10 }} />}
        </div>
      </div>

      <div className="dash-stats" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
        <div className="stat-card"><span className="stat-value">{guild.memberCount}</span><span className="stat-label">Участников</span></div>
        <div className="stat-card"><span className="stat-value">{textChannels.length}</span><span className="stat-label">Текстовых</span></div>
        <div className="stat-card"><span className="stat-value">{voiceChannels.length}</span><span className="stat-label">Голосовых</span></div>
        <div className="stat-card"><span className="stat-value">{roles.length}</span><span className="stat-label">Ролей</span></div>
        {botStats && (
          <>
            <div className="stat-card"><span className="stat-value">{botStats.onlineCount}</span><span className="stat-label">Онлайн</span></div>
            <div className="stat-card"><span className="stat-value">{botStats.voiceCount}</span><span className="stat-label">В голосе</span></div>
            <div className="stat-card"><span className="stat-value">{botStats.botCount}</span><span className="stat-label">Ботов</span></div>
          </>
        )}
      </div>

      <div className="dash-actions" style={{ marginBottom: 24 }}>
        <button className="btn btn-primary" onClick={() => navigate('channels')}>📋 Каналы</button>
        <button className="btn btn-primary" onClick={() => navigate('roles')}>🛡️ Роли</button>
        <button className="btn" onClick={() => navigate('members')}>👥 Участники</button>
        <button className="btn" onClick={() => navigate('settings')}>⚙️ Настройки</button>
      </div>

      <div className="dah-info" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div className="dash-section" style={{ margin: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>🏆 Топ участников</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {members.filter(m => !m.user.bot).slice(0, 5).map((m, i) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-xs)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 16 }}>{i + 1}</span>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff', overflow: 'hidden', flexShrink: 0 }}>
                  {m.user.avatar ? <img src={m.user.avatar} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.user.username.charAt(0)}
                </div>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{m.nickname || m.user.username}</span>
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>{m.roles.length} ролей</span>
              </div>
            ))}
          </div>
        </div>
        <div className="dash-section" style={{ margin: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📊 Топ каналов</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {channels.filter(c => [0, 5].includes(c.type)).slice(0, 5).map((ch, i) => (
              <div key={ch.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-xs)' }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 16 }}>{i + 1}</span>
                <span style={{ fontSize: 14 }}>{ch.type === 5 ? '📢' : '💬'}</span>
                <span style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ch.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
