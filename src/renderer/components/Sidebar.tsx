import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const GLYPHS = ['🌍', '🎮', '🖥', '📷', '🎵', '📚', '🏀', '🔮', '🎨', '🚀'];
const BOT_INVITE = 'https://discord.com/oauth2/authorize?client_id=1521850566316392520&permissions=8&integration_type=0&scope=bot';

function guildGlyph(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = ((hash << 5) - hash) + id.charCodeAt(i);
  return GLYPHS[Math.abs(hash) % GLYPHS.length];
}

export default function Sidebar() {
  const { guilds, adminGuilds, selectedGuild, selectGuild, logout } = useAuth();
  const [search, setSearch] = useState('');
  const [showAdminOnly, setShowAdminOnly] = useState(true);
  const [pinned, setPinned] = useState<string[]>([]);
  const [botGuilds, setBotGuilds] = useState<Set<string>>(new Set());

  useEffect(() => {
    window.api.getPinned().then(r => setPinned(r.pinned));
  }, []);

  useEffect(() => {
    if (guilds.length > 0) {
      setBotGuilds(new Set(guilds.map(g => g.id)));
    }
  }, [guilds]);

  const togglePin = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const r = await window.api.togglePin(id);
    setPinned(r.pinned);
  }, []);

  const sortedGuilds = useMemo(() => {
    const list = showAdminOnly ? adminGuilds : guilds;
    const q = search.toLowerCase().trim();
    const filtered = q ? list.filter(g => g.name.toLowerCase().includes(q)) : list;
    const pinnedSet = new Set(pinned);
    const pinnedG = filtered.filter(g => pinnedSet.has(g.id));
    const unpinnedG = filtered.filter(g => !pinnedSet.has(g.id));
    return [...pinnedG, ...unpinnedG];
  }, [guilds, adminGuilds, search, showAdminOnly, pinned]);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-header-top">
          <span className="sidebar-title">🌐 Мои сервера</span>
          <span className="guild-count">{adminGuilds.length}</span>
        </div>
        <div className="sidebar-search">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Поиск сервера..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="sidebar-filter">
          <button className={`filter-btn ${showAdminOnly ? 'active' : ''}`} onClick={() => setShowAdminOnly(!showAdminOnly)}>
            {showAdminOnly ? '🔑' : '🌐'} {showAdminOnly ? 'Админ' : 'Все'}
          </button>
          {!showAdminOnly && <span className="filter-count">{guilds.length}</span>}
          {showAdminOnly && <span className="filter-count">{adminGuilds.length}/{guilds.length}</span>}
        </div>
      </div>

      <div className="guild-list">
        {sortedGuilds.length === 0 && search && <div className="empty-state">🔍 Ничего не найдено</div>}
        {sortedGuilds.length === 0 && !search && (
          <div className="empty-state">{showAdminOnly ? '🔒 Нет прав администратора' : '🌐 Нет серверов'}</div>
        )}
        {sortedGuilds.map(guild => {
          const isAdmin = guild.owner || (BigInt(guild.permissions) & 8n) === 8n;
          const isPinned = pinned.includes(guild.id);
          const hasBot = botGuilds.has(guild.id);
          return (
            <div
              key={guild.id}
              className={`guild-item ${selectedGuild?.id === guild.id ? 'active' : ''} ${isPinned ? 'pinned-guild' : ''}`}
              onClick={() => selectGuild(guild)}
            >
              <div className="guild-icon">
                {guild.icon ? <img src={guild.icon} alt="" /> : <span className="guild-icon-text">{guildGlyph(guild.id)}</span>}
              </div>
              <div className="guild-info">
                <div className="guild-name-row">
                  <span className="guild-name">{guild.name}</span>
                  {guild.owner && <span className="badge-owner">👑</span>}
                  {isAdmin && !guild.owner && <span className="badge-admin">🔑</span>}
                  <span className={`bot-status ${hasBot ? 'installed' : ''}`} title={hasBot ? 'Бот установлен' : 'Бота нет'}>
                    {hasBot ? '✅' : '❌'}
                  </span>
                </div>
                <div className="guild-meta">
                  <span>👥 {guild.memberCount > 0 ? guild.memberCount : '--'}</span>
                </div>
              </div>
              <button className={`pin-btn ${isPinned ? 'pinned' : ''}`} onClick={e => togglePin(e, guild.id)}>
                {isPinned ? '⭐' : '☆'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <a href={BOT_INVITE} target="_blank" className="btn btn-primary btn-sm sidebar-invite" onClick={e => e.stopPropagation()}>
          ➕ Добавить бота на сервер
        </a>
        <button className="btn btn-secondary btn-sm sidebar-logout" onClick={logout}>🔌 Выйти</button>
      </div>
    </div>
  );
}
