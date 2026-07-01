import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { DiscordGuildFull, DiscordBan } from '../types';

export default function ServerSettings() {
  const { selectedGuild } = useAuth();
  const [guildInfo, setGuildInfo] = useState<DiscordGuildFull | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'bans'>('general');
  const [bans, setBans] = useState<DiscordBan[]>([]);

  const loadGuild = useCallback(async () => {
    if (!selectedGuild) return;
    const res = await window.api.getGuild(selectedGuild.id);
    if (res.success && res.data) {
      setGuildInfo(res.data);
      setForm({ name: res.data.name, description: res.data.description || '' });
    }
  }, [selectedGuild]);

  useEffect(() => { loadGuild(); }, [loadGuild]);

  const loadBans = useCallback(async () => {
    if (!selectedGuild) return;
    const res = await window.api.getBans(selectedGuild.id);
    if (res.success && res.data) setBans(res.data);
  }, [selectedGuild]);

  useEffect(() => { if (activeTab === 'bans') loadBans(); }, [activeTab, loadBans]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuild) return;
    const data: any = {};
    if (form.name !== guildInfo?.name) data.name = form.name;
    if (form.description !== (guildInfo?.description || '')) data.description = form.description || null;
    if (Object.keys(data).length === 0) { setMessage({ text: 'No changes', error: true }); return; }
    const res = await window.api.editGuild(selectedGuild.id, data);
    setMessage({ text: res.success ? 'Server updated!' : res.error || 'Failed', error: !res.success });
    if (res.success) loadGuild();
  };

  const handleUnban = async (userId: string) => {
    if (!selectedGuild) return;
    const res = await window.api.unbanMember(selectedGuild.id, userId);
    setMessage({ text: res.success ? 'User unbanned' : res.error || 'Failed', error: !res.success });
    if (res.success) loadBans();
  };

  if (!selectedGuild || !guildInfo) return null;

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Server Settings</h2>
      </div>

      {message && <div className={`toast ${message.error ? 'error' : 'success'}`}>{message.text}<button onClick={() => setMessage(null)}>✕</button></div>}

      <div className="tabs">
        <button className={`tab ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>General</button>
        <button className={`tab ${activeTab === 'bans' ? 'active' : ''}`} onClick={() => setActiveTab('bans')}>Bans ({bans.length})</button>
      </div>

      {activeTab === 'general' && (
        <form onSubmit={handleSave} className="settings-form">
          <div className="settings-avatar">
            {guildInfo.icon ? <img src={guildInfo.icon} alt="" /> :
              <div className="avatar-placeholder big">{guildInfo.name.charAt(0)}</div>}
            <div>
              <h3>{guildInfo.name}</h3>
              <p className="text-muted">ID: {guildInfo.id}</p>
            </div>
          </div>
          <div className="form-group">
            <label>Server Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} maxLength={500} />
            <span className="char-count">{form.description.length}/500</span>
          </div>
          <div className="settings-info">
            <div className="info-row"><span>Verification Level</span><span>{['None', 'Low', 'Medium', 'High', 'Very High'][guildInfo.verificationLevel]}</span></div>
            <div className="info-row"><span>Content Filter</span><span>{['Disabled', 'Scan Media', 'Scan All'][guildInfo.explicitContentFilter]}</span></div>
            <div className="info-row"><span>Boost Tier</span><span>Tier {guildInfo.premiumTier}</span></div>
            <div className="info-row"><span>Boosts</span><span>{guildInfo.premiumSubscriberCount}</span></div>
            <div className="info-row"><span>Owner ID</span><span>{guildInfo.ownerId}</span></div>
          </div>
          <button type="submit" className="btn btn-primary">Save Changes</button>
        </form>
      )}

      {activeTab === 'bans' && (
        <div className="bans-list">
          {bans.length === 0 ? (
            <div className="empty-state">No banned users</div>
          ) : (
            bans.map(ban => (
              <div key={ban.user.id} className="ban-item">
                <div className="ban-avatar">
                  {ban.user.avatar ? <img src={ban.user.avatar} alt="" /> :
                    <div className="avatar-placeholder">{ban.user.username.charAt(0)}</div>}
                </div>
                <div className="ban-info">
                  <span className="ban-name">{ban.user.username}</span>
                  {ban.reason && <span className="ban-reason">Reason: {ban.reason}</span>}
                </div>
                <button className="btn btn-sm" onClick={() => handleUnban(ban.user.id)}>Unban</button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
