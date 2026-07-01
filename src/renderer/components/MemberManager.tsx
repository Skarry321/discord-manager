import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { DiscordMember, DiscordRole } from '../types';
import { useShiftSelect } from '../hooks/useShiftSelect';

export default function MemberManager() {
  const { selectedGuild } = useAuth();
  const [members, setMembers] = useState<DiscordMember[]>([]);
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [detailMember, setDetailMember] = useState<DiscordMember | null>(null);
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ type: 'kick' | 'ban'; userId: string; name: string } | null>(null);

  const { toggle } = useShiftSelect(members, selectedMembers, setSelectedMembers);

  const loadData = useCallback(async () => {
    if (!selectedGuild) return;
    setLoading(true);
    const [memRes, roleRes] = await Promise.all([
      window.api.getMembers(selectedGuild.id),
      window.api.getRoles(selectedGuild.id),
    ]);
    if (memRes.success && memRes.data) setMembers(memRes.data);
    if (roleRes.success && roleRes.data) setRoles(roleRes.data.sort((a, b) => b.position - a.position));
    setLoading(false);
  }, [selectedGuild]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleKick = async () => {
    if (!selectedGuild || !confirmAction) return;
    const res = await window.api.kickMember(selectedGuild.id, confirmAction.userId, 'Kicked via Manager');
    setMessage({ text: res.success ? `Kicked ${confirmAction.name}` : res.error || 'Failed', error: !res.success });
    setConfirmAction(null);
    setDetailMember(null);
    loadData();
  };

  const handleBan = async () => {
    if (!selectedGuild || !confirmAction) return;
    const res = await window.api.banMember(selectedGuild.id, confirmAction.userId, 'Banned via Manager');
    setMessage({ text: res.success ? `Banned ${confirmAction.name}` : res.error || 'Failed', error: !res.success });
    setConfirmAction(null);
    setDetailMember(null);
    loadData();
  };

  const toggleRole = async (member: DiscordMember, roleId: string) => {
    if (!selectedGuild) return;
    const hasRole = member.roles.some(r => r.id === roleId);
    const res = hasRole
      ? await window.api.removeMemberRole(selectedGuild.id, member.id, roleId)
      : await window.api.addMemberRole(selectedGuild.id, member.id, roleId);
    if (res.success) {
      setMessage({ text: hasRole ? 'Role removed' : 'Role added', error: false });
      loadData();
    } else {
      setMessage({ text: res.error || 'Failed', error: true });
    }
  };

  const filteredMembers = members.filter(m =>
    m.user.username.toLowerCase().includes(search.toLowerCase()) ||
    (m.nickname && m.nickname.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Member Manager</h2>
        <div className="panel-actions">
          <input className="search-input" placeholder="Search members..." value={search} onChange={e => setSearch(e.target.value)} />
          <span className="badge">{members.length} members</span>
          {selectedMembers.size > 0 && (
            <span className="badge" style={{ background: 'var(--accent)', color: '#fff' }}>{selectedMembers.size} selected</span>
          )}
        </div>
      </div>

      {message && <div className={`toast ${message.error ? 'error' : 'success'}`}>{message.text}<button onClick={() => setMessage(null)}>✕</button></div>}

      <div className="member-list">
        {loading ? <div className="loading">Loading members...</div> :
          filteredMembers.map(member => (
            <div
              key={member.id}
              className={`member-item ${selectedMembers.has(member.id) ? 'selected' : ''}`}
              onClick={e => toggle(member.id, e.shiftKey)}
            >
              <label className="checkbox-wrap" onClick={e => e.stopPropagation()}>
                <input type="checkbox" checked={selectedMembers.has(member.id)} onChange={() => toggle(member.id, false)} />
                <span className="checkmark" />
              </label>
              <div className="member-avatar" onClick={e => { e.stopPropagation(); setDetailMember(member); }}>
                {member.user.avatar ? <img src={member.user.avatar} alt="" /> :
                  <div className="avatar-placeholder">{member.user.username.charAt(0).toUpperCase()}</div>}
              </div>
              <div className="member-info" onClick={e => { e.stopPropagation(); setDetailMember(member); }}>
                <span className="member-name">
                  {member.nickname || member.user.username}
                  <span className="member-tag">@{member.user.username}</span>
                  {member.user.bot && <span className="badge">BOT</span>}
                </span>
                <span className="member-roles-mini">
                  {member.roles.slice(0, 3).map(r => (
                    <span key={r.id} className="role-pill" style={{ background: r.color ? '#' + r.color.toString(16).padStart(6, '0') : 'var(--bg-surface)' }}>
                      {r.name}
                    </span>
                  ))}
                  {member.roles.length > 3 && <span className="role-pill" style={{ background: 'var(--bg-surface)' }}>+{member.roles.length - 3}</span>}
                </span>
              </div>
              <div className="member-joined">
                {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '-'}
              </div>
            </div>
          ))}
      </div>

      {detailMember && (
        <div className="modal-overlay" onClick={() => setDetailMember(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="member-detail-header">
              <div className="member-avatar large">
                {detailMember.user.avatar ? <img src={detailMember.user.avatar} alt="" /> :
                  <div className="avatar-placeholder">{detailMember.user.username.charAt(0)}</div>}
              </div>
              <div>
                <h3 style={{ margin: 0 }}>{detailMember.nickname || detailMember.user.username}</h3>
                <p className="text-muted" style={{ margin: 0 }}>{detailMember.user.username}#{detailMember.user.discriminator}</p>
              </div>
            </div>
            <div className="member-detail-section">
              <h4>Roles ({detailMember.roles.length})</h4>
              <div className="member-roles-edit">
                {roles.filter(r => !r.managed && r.name !== '@everyone').map(role => {
                  const hasRole = detailMember.roles.some(r => r.id === role.id);
                  const colorHex = '#' + role.color.toString(16).padStart(6, '0');
                  return (
                    <label key={role.id} className={`role-checkbox ${hasRole ? 'checked' : ''}`} style={{ borderColor: role.color ? colorHex : 'var(--border)' }}>
                      <label className="checkbox-wrap" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={hasRole} onChange={() => toggleRole(detailMember, role.id)} />
                        <span className="checkmark" />
                      </label>
                      <span style={{ color: role.color ? colorHex : 'var(--text-primary)' }}>{role.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="member-detail-section">
              <h4>Actions</h4>
              <div className="member-actions">
                {detailMember.kickable && <button className="btn btn-warning" onClick={() => setConfirmAction({ type: 'kick', userId: detailMember.id, name: detailMember.user.username })}>Kick</button>}
                {detailMember.bannable && <button className="btn btn-danger" onClick={() => setConfirmAction({ type: 'ban', userId: detailMember.id, name: detailMember.user.username })}>Ban</button>}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => { setDetailMember(null); loadData(); }}>Close</button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div className="modal-overlay" onClick={() => setConfirmAction(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <h3>Confirm {confirmAction.type === 'kick' ? 'Kick' : 'Ban'}</h3>
            <p>Are you sure you want to {confirmAction.type} <strong>{confirmAction.name}</strong>?</p>
            <div className="modal-actions">
              <button className={`btn ${confirmAction.type === 'kick' ? 'btn-warning' : 'btn-danger'}`} onClick={confirmAction.type === 'kick' ? handleKick : handleBan}>
                {confirmAction.type === 'kick' ? 'Kick' : 'Ban'}
              </button>
              <button className="btn" onClick={() => setConfirmAction(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {selectedMembers.size > 0 && (
        <div className="bottom-bar">
          <span className="bottom-bar-count">{selectedMembers.size} участников выбрано</span>
          <div className="bottom-bar-actions">
            <button className="btn btn-danger btn-sm">🗑️ Удалить выбранные</button>
          </div>
        </div>
      )}
    </div>
  );
}
