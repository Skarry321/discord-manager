import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { DiscordMember, DiscordRole } from '../types';

export default function MemberManager() {
  const { selectedGuild } = useAuth();
  const [members, setMembers] = useState<DiscordMember[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [detailMember, setDetailMember] = useState<DiscordMember | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'kick' | 'ban'; userId: string; name: string } | null>(null);
  const [tab, setTab] = useState<'members' | 'bans'>('members');
  const [bans, setBans] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    if (!selectedGuild) return;
    setLoading(true);
    try {
      const [memRes, roleRes] = await Promise.all([
        window.api.getMembers(selectedGuild.id),
        window.api.getRoles(selectedGuild.id),
      ]);
      if (memRes.success && memRes.data) setMembers(memRes.data);
      if (roleRes.success && roleRes.data) setRoles(roleRes.data.sort((a: any, b: any) => b.position - a.position));
    } catch {}
    setLoading(false);
  }, [selectedGuild]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadBans = useCallback(async () => {
    if (!selectedGuild) return;
    const res = await window.api.getBans(selectedGuild.id);
    if (res.success && res.data) setBans(res.data);
  }, [selectedGuild]);

  useEffect(() => { if (tab === 'bans') loadBans(); }, [tab, loadBans]);

  const handleKick = async () => {
    if (!selectedGuild || !confirmAction) return;
    const res = await window.api.kickMember(selectedGuild.id, confirmAction.userId);
    setMessage({ text: res.success ? `Kicked ${confirmAction.name}` : res.error || 'Failed', error: !res.success });
    setConfirmAction(null);
    setDetailMember(null);
    loadData();
  };

  const handleBan = async () => {
    if (!selectedGuild || !confirmAction) return;
    const res = await window.api.banMember(selectedGuild.id, confirmAction.userId);
    setMessage({ text: res.success ? `Banned ${confirmAction.name}` : res.error || 'Failed', error: !res.success });
    setConfirmAction(null);
    setDetailMember(null);
    loadData();
  };

  const handleUnban = async (userId: string) => {
    if (!selectedGuild) return;
    const res = await window.api.unbanMember(selectedGuild.id, userId);
    setMessage({ text: res.success ? 'Unbanned' : res.error || 'Failed', error: !res.success });
    if (res.success) loadBans();
  };

  const toggleRole = async (member: DiscordMember, roleId: string) => {
    if (!selectedGuild) return;
    const hasRole = member.roles.some(r => r.id === roleId);
    const res = hasRole
      ? await window.api.removeMemberRole(selectedGuild.id, member.id, roleId)
      : await window.api.addMemberRole(selectedGuild.id, member.id, roleId);
    if (res.success) {
      loadData();
      if (detailMember) {
        setDetailMember(prev => prev ? {
          ...prev,
          roles: hasRole
            ? prev.roles.filter(r => r.id !== roleId)
            : [...prev.roles, { id: roleId, name: roles.find(r => r.id === roleId)?.name || roleId, color: roles.find(r => r.id === roleId)?.color || 0 }]
        } : prev);
      }
    } else {
      setMessage({ text: res.error || 'Failed', error: true });
    }
  };

  const filtered = members.filter(m =>
    m.user.username.toLowerCase().includes(search.toLowerCase()) ||
    (m.nickname && m.nickname.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>👥 Участники</h2>
        <div className="panel-actions">
          <input className="search-input" placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} />
          <span className="badge">{members.length}</span>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 12 }}>
        <button className={`tab ${tab === 'members' ? 'active' : ''}`} onClick={() => setTab('members')}>Участники ({members.length})</button>
        <button className={`tab ${tab === 'bans' ? 'active' : ''}`} onClick={() => setTab('bans')}>Банлист ({bans.length})</button>
      </div>

      {message && <div className={`toast ${message.error ? 'error' : 'success'}`}>{message.text}<button onClick={() => setMessage(null)}>✕</button></div>}

      {tab === 'members' && (
        <div className="member-list">
          {loading ? <div className="loading">Загрузка...</div> : filtered.length === 0 && search
            ? <div className="empty-state">Никого не найдено</div>
            : filtered.map(member => (
              <div key={member.id} className="member-item" onClick={() => setDetailMember(member)}>
                <div className="member-avatar">
                  {member.user.avatar ? <img src={member.user.avatar} alt="" /> :
                    <div className="avatar-placeholder">{member.user.username.charAt(0).toUpperCase()}</div>}
                </div>
                <div className="member-info">
                  <div className="member-name">
                    {member.nickname || member.user.username}
                    <span className="member-tag">@{member.user.username}</span>
                    {member.user.bot && <span className="badge">BOT</span>}
                  </div>
                  <div className="member-roles-mini">
                    {member.roles.filter(r => r.name !== '@everyone').slice(0, 4).map(r => (
                      <span key={r.id} className="role-pill" style={{ background: r.color ? '#' + r.color.toString(16).padStart(6, '0') : 'var(--bg-surface)' }}>
                        {r.name}
                      </span>
                    ))}
                    {member.roles.filter(r => r.name !== '@everyone').length > 4 &&
                      <span className="role-pill" style={{ background: 'var(--bg-surface)' }}>+{member.roles.length - 4}</span>}
                  </div>
                </div>
                {member.joinedAt && <span className="member-joined">{new Date(member.joinedAt).toLocaleDateString()}</span>}
              </div>
            ))}
        </div>
      )}

      {tab === 'bans' && (
        <div className="bans-list">
          {bans.length === 0 ? <div className="empty-state">Нет забаненных</div> : bans.map(b => (
            <div key={b.user.id} className="ban-item">
              <div className="ban-avatar">
                {b.user.avatar ? <img src={b.user.avatar} alt="" /> :
                  <div className="avatar-placeholder" style={{ width: 36, height: 36, fontSize: 14 }}>{b.user.username.charAt(0)}</div>}
              </div>
              <div className="ban-info">
                <span className="ban-name">{b.user.username}</span>
                {b.reason && <span className="ban-reason">Причина: {b.reason}</span>}
              </div>
              <button className="btn btn-sm" onClick={() => handleUnban(b.user.id)}>Разбанить</button>
            </div>
          ))}
        </div>
      )}

      {detailMember && (
        <div className="modal-overlay" onClick={() => setDetailMember(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="member-detail-header">
              <div className="member-avatar large">
                {detailMember.user.avatar ? <img src={detailMember.user.avatar} alt="" /> :
                  <div className="avatar-placeholder" style={{ fontSize: 24 }}>{detailMember.user.username.charAt(0)}</div>}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{detailMember.nickname || detailMember.user.username}</h3>
                <p className="text-muted" style={{ margin: '2px 0 0' }}>{detailMember.user.username}</p>
              </div>
            </div>

            <div className="member-detail-section">
              <h4>Роли ({detailMember.roles.filter(r => r.name !== '@everyone').length})</h4>
              <div className="member-roles-edit">
                {roles.filter(r => !r.managed && r.name !== '@everyone').map(role => {
                  const has = detailMember.roles.some(r => r.id === role.id);
                  return (
                    <label key={role.id} className={`role-checkbox ${has ? 'checked' : ''}`}
                      style={{ borderColor: role.color ? '#' + role.color.toString(16).padStart(6, '0') : 'var(--border)' }}>
                      <span className="role-dot" style={{ background: role.color ? '#' + role.color.toString(16).padStart(6, '0') : '#99aab5' }} />
                      <input type="checkbox" checked={has} onChange={() => toggleRole(detailMember, role.id)} />
                      <span>{role.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="member-detail-section">
              <h4>Действия</h4>
              <div className="member-actions">
                {detailMember.kickable && (
                  <button className="btn btn-warning" onClick={() => setConfirmAction({ type: 'kick', userId: detailMember.id, name: detailMember.user.username })}>
                    🔨 Кикнуть
                  </button>
                )}
                {detailMember.bannable && (
                  <button className="btn btn-danger" onClick={() => setConfirmAction({ type: 'ban', userId: detailMember.id, name: detailMember.user.username })}>
                    🚫 Забанить
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h3>Подтверждение</h3>
            <p>{confirmAction.type === 'kick' ? 'Кикнуть' : 'Забанить'} <strong>{confirmAction.name}</strong>?</p>
            <div className="modal-actions">
              <button className="btn btn-danger" onClick={confirmAction.type === 'kick' ? handleKick : handleBan}>
                {confirmAction.type === 'kick' ? '🔨 Кикнуть' : '🚫 Забанить'}
              </button>
              <button className="btn" onClick={() => setConfirmAction(null)}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
