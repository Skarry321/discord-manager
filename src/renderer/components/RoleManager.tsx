import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { DiscordRole, PermissionInfo } from '../types';
import { useShiftSelect } from '../hooks/useShiftSelect';

const ALL_PERMISSIONS_LIST: PermissionInfo[] = [
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
  { key: 'USE_APPLICATION_COMMANDS', bit: '4294967296', label: 'Use Commands' },
  { key: 'REQUEST_TO_SPEAK', bit: '4294967296', label: 'Request to Speak' },
  { key: 'MANAGE_EVENTS', bit: '8589934592', label: 'Manage Events' },
  { key: 'MODERATE_MEMBERS', bit: '1099511627776', label: 'Moderate Members' },
  { key: 'USE_EXTERNAL_SOUNDS', bit: '549755813888', label: 'Use External Sounds' },
  { key: 'SEND_VOICE_MESSAGES', bit: '70368744177664', label: 'Send Voice Messages' },
];

function hasPermission(permBitfield: string, bit: string): boolean { return (BigInt(permBitfield) & BigInt(bit)) === BigInt(bit); }
function togglePermission(permBitfield: string, bit: string, enable: boolean): string {
  let perms = BigInt(permBitfield); const b = BigInt(bit);
  if (enable) perms |= b; else perms &= ~b;
  return perms.toString();
}

export default function RoleManager() {
  const { selectedGuild } = useAuth();
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [editRoleId, setEditRoleId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', color: '#000000', hoist: false, mentionable: false, permissions: '0' });
  const [bulkForm, setBulkForm] = useState({ hoist: null as boolean | null, mentionable: null as boolean | null });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [search, setSearch] = useState('');

  const { toggle } = useShiftSelect(roles, selectedRoles, setSelectedRoles);

  const loadRoles = useCallback(async () => {
    if (!selectedGuild) return;
    setLoading(true);
    const res = await window.api.getRoles(selectedGuild.id);
    if (res.success && res.data) setRoles(res.data.sort((a, b) => b.position - a.position));
    setLoading(false);
  }, [selectedGuild]);

  useEffect(() => { loadRoles(); }, [loadRoles]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuild || !form.name) return;
    const colorInt = parseInt(form.color.replace('#', ''), 16);
    const res = await window.api.createRole(selectedGuild.id, {
      name: form.name, color: colorInt || undefined, hoist: form.hoist, mentionable: form.mentionable, permissions: form.permissions,
    });
    if (res.success) { setMessage({ text: 'Role created!', error: false }); setShowCreate(false); loadRoles(); }
    else { setMessage({ text: res.error || 'Failed', error: true }); }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuild || !editRoleId || !form.name) return;
    const colorInt = parseInt(form.color.replace('#', ''), 16);
    const res = await window.api.editRole(selectedGuild.id, editRoleId, {
      name: form.name, color: colorInt || undefined, hoist: form.hoist, mentionable: form.mentionable, permissions: form.permissions,
    });
    if (res.success) { setMessage({ text: 'Role updated!', error: false }); setEditRoleId(null); loadRoles(); }
    else { setMessage({ text: res.error || 'Failed', error: true }); }
  };

  const handleDelete = async (id: string) => {
    if (!selectedGuild || !confirm('Delete this role?')) return;
    const res = await window.api.deleteRole(selectedGuild.id, id);
    if (res.success) { setMessage({ text: 'Role deleted', error: false }); loadRoles(); }
    else { setMessage({ text: res.error || 'Failed', error: true }); }
  };

  const handleBulkDelete = async () => {
    if (!selectedGuild || selectedRoles.size === 0) return;
    if (!confirm(`Delete ${selectedRoles.size} roles?`)) return;
    const res = await window.api.deleteRoles(selectedGuild.id, [...selectedRoles]);
    setMessage({ text: `Deleted ${res.success.length} roles${res.failed.length ? `, ${res.failed.length} failed` : ''}`, error: res.failed.length > 0 });
    setSelectedRoles(new Set());
    loadRoles();
  };

  const handleBulkEdit = async () => {
    if (!selectedGuild || selectedRoles.size === 0) return;
    const data: any = {};
    if (bulkForm.hoist !== null) data.hoist = bulkForm.hoist;
    if (bulkForm.mentionable !== null) data.mentionable = bulkForm.mentionable;
    if (Object.keys(data).length === 0) return;
    const res = await window.api.bulkEditRoles(selectedGuild.id, [...selectedRoles], data);
    setMessage({ text: `Updated ${res.success.length} roles${res.failed.length ? `, ${res.failed.length} failed` : ''}`, error: res.failed.length > 0 });
    setSelectedRoles(new Set());
    loadRoles();
  };

  const openEdit = (role: DiscordRole) => {
    setEditRoleId(role.id);
    setForm({ name: role.name, color: '#' + role.color.toString(16).padStart(6, '0'), hoist: role.hoist, mentionable: role.mentionable, permissions: role.permissions });
  };

  const togglePerm = (bit: string) => setForm(f => ({ ...f, permissions: togglePermission(f.permissions, bit, !hasPermission(f.permissions, bit)) }));

  const filteredRoles = roles.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) && !r.managed);

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Role Manager</h2>
        <div className="panel-actions">
          <input className="search-input" placeholder="Search roles..." value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary btn-sm" onClick={() => { setEditRoleId(null); setForm({ name: '', color: '#000000', hoist: false, mentionable: false, permissions: '0' }); setShowCreate(true); }}>
            + Create
          </button>
        </div>
      </div>

      <div className="role-templates">
        <span className="templates-label">📋 Шаблоны:</span>
        {[
          { name: 'Модератор', color: '#ed8796', perms: ['KICK_MEMBERS', 'BAN_MEMBERS', 'MANAGE_MESSAGES', 'MODERATE_MEMBERS', 'VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'] },
          { name: 'VIP', color: '#f5d742', perms: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'ATTACH_FILES', 'USE_EXTERNAL_EMOJIS', 'STREAM'] },
          { name: 'Новичок', color: '#a6adc8', perms: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'] },
          { name: 'Стример', color: '#fabb6b', perms: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'STREAM', 'CONNECT', 'SPEAK', 'USE_EXTERNAL_EMOJIS'] },
        ].map(t => (
          <button key={t.name} className="template-chip" onClick={() => {
            let permBits = 0n;
            t.perms.forEach(k => {
              const p = ALL_PERMISSIONS_LIST.find(x => x.key === k);
              if (p) permBits |= BigInt(p.bit);
            });
            setForm({ name: t.name, color: t.color, hoist: false, mentionable: false, permissions: permBits.toString() });
            setShowCreate(true);
          }}>
            <span className="template-dot" style={{ background: t.color }} />
            {t.name}
          </button>
        ))}
      </div>

      {message && <div className={`toast ${message.error ? 'error' : 'success'}`}>{message.text}<button onClick={() => setMessage(null)}>✕</button></div>}

      {selectedRoles.size > 0 && (
        <div className="bulk-edit-bar">
          <span style={{ fontWeight: 600 }}>{selectedRoles.size} selected</span>
          <label className="checkbox-wrap">
            <input type="checkbox" checked={bulkForm.hoist === true} onChange={e => setBulkForm(f => ({ ...f, hoist: e.target.checked ? true : null }))} />
            <span className="checkmark" />
            <span style={{ marginLeft: 8, fontSize: 13 }}>Display separately</span>
          </label>
          <label className="checkbox-wrap">
            <input type="checkbox" checked={bulkForm.mentionable === true} onChange={e => setBulkForm(f => ({ ...f, mentionable: e.target.checked ? true : null }))} />
            <span className="checkmark" />
            <span style={{ marginLeft: 8, fontSize: 13 }}>Mentionable</span>
          </label>
          <button className="btn btn-warning btn-sm" onClick={handleBulkEdit}>Apply</button>
        </div>
      )}

      <div className="role-list">
        {loading ? <div className="loading">Loading roles...</div> :
          filteredRoles.map(role => {
            const isSelected = selectedRoles.has(role.id);
            const colorHex = '#' + role.color.toString(16).padStart(6, '0');
            return (
              <div key={role.id} className={`role-item ${isSelected ? 'selected' : ''} ${role.managed ? 'managed' : ''}`} onClick={e => toggle(role.id, e.shiftKey)}>
                <label className="checkbox-wrap" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={isSelected} onChange={() => toggle(role.id, false)} />
                  <span className="checkmark" />
                </label>
                <span className="role-color" style={{ background: role.color ? colorHex : '#99aab5' }} />
                <span className="role-name">{role.name}</span>
                {role.managed && <span className="badge">Managed</span>}
                <span className="role-meta">{role.hoist ? '📌' : ''} {role.mentionable ? '@' : ''}</span>
                <div className="role-actions" onClick={e => e.stopPropagation()}>
                  <button className="btn-icon" onClick={() => openEdit(role)} title="Permissions">🔑</button>
                  {!role.managed && <button className="btn-icon" onClick={() => handleDelete(role.id)} title="Delete">🗑️</button>}
                </div>
              </div>
            );
          })}
      </div>

      {selectedRoles.size > 0 && (
        <div className="bottom-bar">
          <span className="bottom-bar-count">{selectedRoles.size} ролей выбрано</span>
          <div className="bottom-bar-actions">
            <button className="btn btn-warning btn-sm" onClick={handleBulkEdit}>Применить правки</button>
            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>🗑️ Удалить выбранные</button>
          </div>
        </div>
      )}

      {(showCreate || editRoleId) && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); setEditRoleId(null); }}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <h3>{editRoleId ? 'Edit Role' : 'Create Role'}</h3>
            <form onSubmit={editRoleId ? handleEdit : handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input type="color" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                </div>
              </div>
              <div className="form-row" style={{ marginBottom: 16 }}>
                <label className="checkbox-wrap">
                  <input type="checkbox" checked={form.hoist} onChange={e => setForm(f => ({ ...f, hoist: e.target.checked }))} />
                  <span className="checkmark" />
                  <span style={{ marginLeft: 8 }}>Display members separately</span>
                </label>
                <label className="checkbox-wrap">
                  <input type="checkbox" checked={form.mentionable} onChange={e => setForm(f => ({ ...f, mentionable: e.target.checked }))} />
                  <span className="checkmark" />
                  <span style={{ marginLeft: 8 }}>Allow anyone to @mention</span>
                </label>
              </div>
              <div className="permissions-grid">
                <h4>Permissions</h4>
                {ALL_PERMISSIONS_LIST.map(p => (
                  <label key={p.key} className={`perm-toggle ${hasPermission(form.permissions, p.bit) ? 'enabled' : ''}`}>
                    <label className="checkbox-wrap" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={hasPermission(form.permissions, p.bit)} onChange={() => togglePerm(p.bit)} />
                      <span className="checkmark" />
                    </label>
                    <span>{p.label}</span>
                  </label>
                ))}
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">{editRoleId ? 'Save' : 'Create'}</button>
                <button type="button" className="btn" onClick={() => { setShowCreate(false); setEditRoleId(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
