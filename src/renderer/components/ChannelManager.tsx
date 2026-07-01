import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { DiscordChannel, CHANNEL_TYPES, channelIcon } from '../types';
import { useShiftSelect } from '../hooks/useShiftSelect';

function ChannelRow({ ch, selected, onToggle, onEdit, onDelete }: {
  ch: DiscordChannel;
  selected: boolean;
  onToggle: (id: string, shift: boolean) => void;
  onEdit: (ch: DiscordChannel) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className={`channel-item ${selected ? 'selected' : ''}`} onClick={e => onToggle(ch.id, e.shiftKey)}>
      <label className="checkbox-wrap" onClick={e => e.stopPropagation()}>
        <input type="checkbox" checked={selected} onChange={() => onToggle(ch.id, false)} />
        <span className="checkmark" />
      </label>
      <span className="channel-icon">{channelIcon(ch.type)}</span>
      <span className="channel-name">{ch.name}</span>
      <span className="channel-type">{CHANNEL_TYPES[ch.type] || 'Unknown'}</span>
      {ch.topic && <span className="channel-topic" title={ch.topic}>{ch.topic}</span>}
      {ch.nsfw && <span className="nsfw-badge">NSFW</span>}
      <div className="channel-actions" onClick={e => e.stopPropagation()}>
        <button className="btn-icon" onClick={() => onEdit(ch)} title="Edit">✏️</button>
        <button className="btn-icon" onClick={() => onDelete(ch.id)} title="Delete">🗑️</button>
      </div>
    </div>
  );
}

export default function ChannelManager() {
  const { selectedGuild } = useAuth();
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editChannelId, setEditChannelId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 0, topic: '', parentId: '', nsfw: false });
  const [bulkForm, setBulkForm] = useState({ topic: '', nsfw: null as boolean | null });
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<number | null>(null);

  const { toggle, selectAll } = useShiftSelect(channels, selected, setSelected);

  const loadChannels = useCallback(async () => {
    if (!selectedGuild) return;
    setLoading(true);
    const res = await window.api.getChannels(selectedGuild.id);
    if (res.success && res.data) {
      setChannels(res.data.sort((a, b) => (a.position || 0) - (b.position || 0)));
    }
    setLoading(false);
  }, [selectedGuild]);

  useEffect(() => { loadChannels(); }, [loadChannels]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGuild || !form.name) return;
    const res = await window.api.createChannel(selectedGuild.id, form.name, form.type, {
      topic: form.topic || undefined, parentId: form.parentId || undefined, nsfw: form.nsfw,
    });
    if (res.success) {
      setMessage({ text: 'Channel created!', error: false });
      setShowCreate(false);
      setForm({ name: '', type: 0, topic: '', parentId: '', nsfw: false });
      loadChannels();
    } else {
      setMessage({ text: res.error || 'Failed', error: true });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editChannelId || !form.name) return;
    const res = await window.api.editChannel(editChannelId, { name: form.name, topic: form.topic || undefined, nsfw: form.nsfw });
    if (res.success) {
      setMessage({ text: 'Channel updated!', error: false });
      setEditChannelId(null);
      loadChannels();
    } else {
      setMessage({ text: res.error || 'Failed', error: true });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this channel?')) return;
    const res = await window.api.deleteChannel(id);
    if (res.success) { setMessage({ text: 'Channel deleted', error: false }); loadChannels(); }
    else { setMessage({ text: res.error || 'Failed', error: true }); }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} channels?`)) return;
    const res = await window.api.deleteChannels([...selected]);
    setMessage({ text: `Deleted ${res.success.length} channels${res.failed.length ? `, ${res.failed.length} failed` : ''}`, error: res.failed.length > 0 });
    setSelected(new Set());
    loadChannels();
  };

  const handleBulkEdit = async () => {
    if (selected.size === 0) return;
    const data: any = {};
    if (bulkForm.topic !== '') data.topic = bulkForm.topic;
    if (bulkForm.nsfw !== null) data.nsfw = bulkForm.nsfw;
    if (Object.keys(data).length === 0) return;
    const res = await window.api.bulkEditChannels([...selected], data);
    setMessage({ text: `Updated ${res.success.length} channels${res.failed.length ? `, ${res.failed.length} failed` : ''}`, error: res.failed.length > 0 });
    setSelected(new Set());
    loadChannels();
  };

  const openEdit = (ch: DiscordChannel) => {
    setEditChannelId(ch.id);
    setForm({ name: ch.name, type: ch.type, topic: ch.topic, parentId: ch.parentId || '', nsfw: ch.nsfw });
  };

  const categories = channels.filter(c => c.type === 4);
  const parents = channels.filter(c => c.type === 4);

  const filteredChannels = channels.filter(ch => {
    if (filterType !== null && ch.type !== filterType) return false;
    if (searchQuery && !ch.name.toLowerCase().includes(searchQuery.toLowerCase()) && !(ch.topic || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const orphanChannels = filteredChannels.filter(ch => !ch.parentId && ch.type !== 4);

  let channelContent: React.ReactNode;
  if (loading) {
    channelContent = <div className="loading">Loading channels...</div>;
  } else {
    const items: React.ReactNode[] = [];
    for (const cat of categories) {
      const catChannels = filteredChannels.filter(ch => ch.parentId === cat.id && ch.type !== 4);
      if (catChannels.length === 0 && !searchQuery && filterType === null) {
        items.push(
          <div key={`cat-${cat.id}`} className="channel-category">
            <span className="cat-name">📁 {cat.name}</span>
            <div className="cat-actions">
              <button className="btn-icon" onClick={() => openEdit(cat)} title="Edit">✏️</button>
              <button className="btn-icon" onClick={() => handleDelete(cat.id)} title="Delete">🗑️</button>
            </div>
          </div>
        );
      }
      if (catChannels.length > 0) {
        items.push(
          <div key={`cat-${cat.id}`} className="channel-category">
            <span className="cat-name">📁 {cat.name}</span>
            <div className="cat-actions">
              <button className="btn-icon" onClick={() => openEdit(cat)} title="Edit">✏️</button>
              <button className="btn-icon" onClick={() => handleDelete(cat.id)} title="Delete">🗑️</button>
            </div>
          </div>
        );
        for (const ch of catChannels) {
          items.push(<ChannelRow key={ch.id} ch={ch} selected={selected.has(ch.id)} onToggle={toggle} onEdit={openEdit} onDelete={handleDelete} />);
        }
      }
    }
    for (const ch of orphanChannels) {
      items.push(<ChannelRow key={ch.id} ch={ch} selected={selected.has(ch.id)} onToggle={toggle} onEdit={openEdit} onDelete={handleDelete} />);
    }
    channelContent = items;
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>Channel Manager</h2>
        <div className="panel-actions">
          <button className="btn btn-primary btn-sm" onClick={() => { setEditChannelId(null); setForm({ name: '', type: 0, topic: '', parentId: '', nsfw: false }); setShowCreate(true); }}>+ Create</button>
          <button className="btn btn-sm" onClick={selectAll}>{selected.size === channels.length ? 'Deselect All' : 'Select All'}</button>
          {selected.size > 0 && (
            <>
              <span className="badge">{selected.size} selected</span>
              <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>Delete</button>
              <button className="btn btn-warning btn-sm" onClick={handleBulkEdit}>Apply</button>
            </>
          )}
        </div>
      </div>

      {message && <div className={`toast ${message.error ? 'error' : 'success'}`}>{message.text}<button onClick={() => setMessage(null)}>✕</button></div>}

      <div className="channel-filter-bar">
        <div className="channel-search">
          <span>🔍</span>
          <input type="text" placeholder="Поиск каналов..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        <div className="channel-type-filters">
          <button className={`filter-chip ${filterType === null ? 'active' : ''}`} onClick={() => setFilterType(null)}>Все</button>
          <button className={`filter-chip ${filterType === 0 ? 'active' : ''}`} onClick={() => setFilterType(0)}>💬 Текст</button>
          <button className={`filter-chip ${filterType === 2 ? 'active' : ''}`} onClick={() => setFilterType(2)}>🔊 Голос</button>
          <button className={`filter-chip ${filterType === 4 ? 'active' : ''}`} onClick={() => setFilterType(4)}>📁 Категории</button>
          <button className={`filter-chip ${filterType === 5 ? 'active' : ''}`} onClick={() => setFilterType(5)}>📢 Анонсы</button>
          <button className={`filter-chip ${filterType === 15 ? 'active' : ''}`} onClick={() => setFilterType(15)}>💬 Форум</button>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="bulk-edit-bar">
          <input placeholder="Set topic..." value={bulkForm.topic} onChange={e => setBulkForm(f => ({ ...f, topic: e.target.value }))} />
          <select value={bulkForm.nsfw === null ? '' : bulkForm.nsfw ? 'true' : 'false'} onChange={e => setBulkForm(f => ({ ...f, nsfw: e.target.value === '' ? null : e.target.value === 'true' }))}>
            <option value="">— Keep NSFW —</option>
            <option value="true">NSFW On</option>
            <option value="false">NSFW Off</option>
          </select>
        </div>
      )}

      <div className="channel-list">{channelContent}</div>

      {selected.size > 0 && (
        <div className="bottom-bar">
          <span className="bottom-bar-count">{selected.size} каналов выбрано</span>
          <div className="bottom-bar-actions">
            <button className="btn btn-warning btn-sm" onClick={handleBulkEdit}>Применить правки</button>
            <button className="btn btn-danger btn-sm" onClick={handleBulkDelete}>🗑️ Удалить выбранные</button>
          </div>
        </div>
      )}

      {(showCreate || editChannelId) && (
        <div className="modal-overlay" onClick={() => { setShowCreate(false); setEditChannelId(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{editChannelId ? 'Edit Channel' : 'Create Channel'}</h3>
            <form onSubmit={editChannelId ? handleEdit : handleCreate}>
              <div className="form-group">
                <label>Name</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required autoFocus />
              </div>
              {!editChannelId && (
                <div className="form-group">
                  <label>Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: Number(e.target.value) }))}>
                    <option value={0}>Text</option>
                    <option value={2}>Voice</option>
                    <option value={4}>Category</option>
                    <option value={5}>Announcement</option>
                    <option value={15}>Forum</option>
                  </select>
                </div>
              )}
              <div className="form-group">
                <label>Topic</label>
                <input value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
              </div>
              {form.type !== 2 && form.type !== 4 && (
                <div className="form-group">
                  <label>Parent Category</label>
                  <select value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value }))}>
                    <option value="">— None —</option>
                    {parents.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}
              <div className="form-group">
                <label className="checkbox-wrap">
                  <input type="checkbox" checked={form.nsfw} onChange={e => setForm(f => ({ ...f, nsfw: e.target.checked }))} />
                  <span className="checkmark" />
                  <span style={{ marginLeft: 8 }}>NSFW</span>
                </label>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">{editChannelId ? 'Save' : 'Create'}</button>
                <button type="button" className="btn" onClick={() => { setShowCreate(false); setEditChannelId(null); }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
