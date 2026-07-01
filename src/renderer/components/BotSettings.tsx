import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { DiscordRole, DiscordChannel } from '../types';

function Preview({ settings, textChannels }: { settings: any; textChannels: DiscordChannel[] }) {
  const msg = (settings.welcomeMessage || 'Добро пожаловать, {mention}!')
    .replace(/\{name\}/g, 'TestUser')
    .replace(/\{mention\}/g, '@TestUser')
    .replace(/\{server\}/g, settings.serverName || 'Сервер')
    .replace(/\{count\}/g, '42')
    .replace(/\{tag\}/g, 'TestUser#0000');
  const img = (settings.welcomeImage || '').replace(/\{name\}/g, 'TestUser').replace(/\{server\}/g, 'Сервер');
  const title = (settings.embedTitle || '').replace(/\{name\}/g, 'TestUser');
  const footer = (settings.embedFooter || '').replace(/\{name\}/g, 'TestUser');

  if (!settings.welcomeChannel) return null;

  return (
    <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginTop: 12 }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>👁️ Предпросмотр</div>
      <div style={{ background: 'var(--bg-deep)', borderRadius: 8, padding: 14, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#5865f2' }} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>BOT · Today at {new Date().toLocaleTimeString()}</span>
        </div>
        {(!settings.welcomeType || settings.welcomeType === 'text') ? (
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>
            {img && !img.startsWith('data:') && <div style={{ marginBottom: 6 }}>🖼️ <a style={{ color: 'var(--accent)', fontSize: 11 }}>{img.slice(0, 50)}...</a></div>}
            {img && img.startsWith('data:') && <div style={{ marginBottom: 6, padding: 6, background: 'var(--bg-surface)', borderRadius: 6, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>🖼️ Изображение загружено</div>}
            <div>{msg}</div>
          </div>
        ) : (
          <div style={{ borderLeft: '4px solid ' + (settings.embedColor || '#7c3aed'), paddingLeft: 12 }}>
            {title && <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{title}</div>}
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>{msg}</div>
            {img && settings.imagePosition === 'thumbnail' && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>🔲 Превью справа</div>}
            {img && (!settings.imagePosition || settings.imagePosition === 'large') && <div style={{ marginTop: 8 }}>🖼️ Изображение внизу</div>}
            {footer && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 4 }}>{footer}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BotSettings() {
  const { selectedGuild } = useAuth();
  const [roles, setRoles] = useState<DiscordRole[]>([]);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [msgForm, setMsgForm] = useState({ channel: '', text: '', type: 'text', color: '#7c3aed', title: '', footer: '', image: '' });

  useEffect(() => {
    if (!selectedGuild) return;
    setLoading(true);
    Promise.all([
      window.api.getRoles(selectedGuild.id),
      window.api.getChannels(selectedGuild.id),
      window.api.getBotSettings(selectedGuild.id),
    ]).then(([rRoles, rChannels, rSettings]) => {
      if (rRoles.success && rRoles.data) setRoles(rRoles.data.sort((a: any, b: any) => b.position - a.position));
      if (rChannels.success && rChannels.data) setChannels(rChannels.data.filter((c: any) => c.type === 0 || c.type === 5));
      if (rSettings.settings) setSettings(rSettings.settings);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedGuild]);

  const update = useCallback(async (key: string, value: any) => {
    if (!selectedGuild) return;
    const res = await window.api.setBotSettings(selectedGuild.id, { [key]: value === '' || value === null || value === undefined ? null : value });
    if (res.success) {
      setSettings((prev: any) => {
        const next = { ...prev };
        if (value === '' || value === null || value === undefined) delete next[key];
        else next[key] = value;
        return next;
      });
    }
  }, [selectedGuild]);

  const handleUpload = async () => {
    const res = await window.api.uploadWelcomeImage();
    if (res.success && res.data) {
      update('welcomeImage', res.data);
      setMessage({ text: `Загружено: ${res.fileName}`, error: false });
    }
  };

  const handleTest = async () => {
    if (!selectedGuild || !settings.welcomeChannel) return;
    setSending(true);
    const ch = channels.find(c => c.id === settings.welcomeChannel);
    try {
      const res = await window.api.sendTestWelcome(selectedGuild.id, settings.welcomeChannel, {
        ...settings,
        serverName: selectedGuild.name,
      });
      setMessage({ text: res.success ? `✅ Тест отправлен в #${ch?.name || '?'}` : `❌ ${res.error}`, error: !res.success });
    } catch (e: any) {
      setMessage({ text: `❌ ${e.message}`, error: true });
    }
    setSending(false);
  };

  const handleSendMsg = async () => {
    if (!msgForm.channel || !msgForm.text) return;
    setSending(true);
    try {
      const options: any = {};
      const isBase64 = msgForm.image && msgForm.image.startsWith('data:');
      if (msgForm.type === 'embed') {
        options.embed = { description: msgForm.text, color: parseInt(msgForm.color.replace('#', ''), 16) || 0x7c3aed };
        if (msgForm.title) options.embed.title = msgForm.title;
        if (msgForm.footer) options.embed.footer = { text: msgForm.footer };
        if (msgForm.image && !isBase64) options.embed.image = { url: msgForm.image };
      }
      if (isBase64) {
        options.fileBase64 = msgForm.image;
        options.fileName = 'image.png';
      }
      const res = await window.api.sendChannelMessage(msgForm.channel, msgForm.type === 'text' ? msgForm.text : '', options);
      setMessage({ text: res.success ? '✅ Сообщение отправлено' : '❌ ' + (res.error || 'Ошибка'), error: !res.success });
    } catch (e: any) {
      setMessage({ text: '❌ ' + e.message, error: true });
    }
    setSending(false);
  };

  if (!selectedGuild) return <div className="panel"><div className="empty-state">Выберите сервер</div></div>;
  if (loading) return <div className="panel"><div className="loading">Загрузка...</div></div>;

  const textChannels = channels || [];
  const filteredRoles = (roles || []).filter(r => !r.managed && r.name !== '@everyone' && r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="panel" style={{ maxWidth: 640 }}>
      <div className="panel-header">
        <h2>🤖 Настройки бота</h2>
        <span className="badge">{selectedGuild.name}</span>
      </div>

      {message && <div className={`toast ${message.error ? 'error' : 'success'}`}>{message.text}<button onClick={() => setMessage(null)}>✕</button></div>}

      {/* AUTO ROLE */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>🎯 Автороль</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Автоматическая выдача роли новым участникам</p>
        {settings.autoRole && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 10px', background: 'var(--accent-subtle)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-xs)', marginBottom: 10, fontSize: 12 }}>
            ✅ <strong>{(roles || []).find((r: any) => r.id === settings.autoRole)?.name || '?'}</strong>
            <button className="btn-icon" onClick={() => update('autoRole', null)}>✕</button>
          </div>
        )}
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <input placeholder="🔍 Поиск роли..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 28, fontSize: 12 }} />
        </div>
        <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
          {filteredRoles.map((role: any) => (
            <div key={role.id} onClick={() => update('autoRole', role.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 'var(--radius-xs)', cursor: 'pointer', fontSize: 12, background: settings.autoRole === role.id ? 'var(--accent-subtle)' : 'transparent', border: settings.autoRole === role.id ? '1px solid var(--accent)' : '1px solid transparent' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: role.color ? '#' + role.color.toString(16).padStart(6, '0') : '#58587a' }} />
              <span style={{ flex: 1 }}>{role.name}</span>
              {settings.autoRole === role.id && <span style={{ color: 'var(--green)' }}>✅</span>}
            </div>
          ))}
        </div>
      </div>

      {/* WELCOME */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>👋 Приветствие</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Сообщение при входе нового участника</p>

        <div className="form-group">
          <label>Канал</label>
          <select value={settings.welcomeChannel || ''} onChange={e => update('welcomeChannel', e.target.value || null)}>
            <option value="">— Не выбран —</option>
            {textChannels.map((ch: any) => <option key={ch.id} value={ch.id}># {ch.name}</option>)}
          </select>
        </div>

        {settings.welcomeChannel && (
          <>
            <div className="form-group">
              <label>Тип сообщения</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className={`btn btn-sm ${(!settings.welcomeType || settings.welcomeType === 'text') ? 'btn-primary' : ''}`} onClick={() => update('welcomeType', 'text')}>💬 Текст</button>
                <button className={`btn btn-sm ${settings.welcomeType === 'embed' ? 'btn-primary' : ''}`} onClick={() => update('welcomeType', 'embed')}>📦 Embed</button>
              </div>
            </div>

            <div className="form-group">
              <label>Текст сообщения</label>
              <textarea value={settings.welcomeMessage || 'Добро пожаловать, {mention}!'} onChange={e => update('welcomeMessage', e.target.value)} rows={3} style={{ fontSize: 13, fontFamily: 'monospace' }} />
            </div>

            {settings.welcomeType === 'embed' && (
              <>
                <div className="form-group">
                  <label>Цвет embed</label>
                  <input type="color" value={settings.embedColor || '#7c3aed'} onChange={e => update('embedColor', e.target.value)} style={{ width: 48, height: 36 }} />
                </div>
                <div className="form-group">
                  <label>Заголовок (необязательно)</label>
                  <input type="text" value={settings.embedTitle || ''} onChange={e => update('embedTitle', e.target.value || null)} placeholder={`Добро пожаловать, {name}!`} style={{ fontSize: 12 }} />
                </div>
                <div className="form-group">
                  <label>Подвал (необязательно)</label>
                  <input type="text" value={settings.embedFooter || ''} onChange={e => update('embedFooter', e.target.value || null)} placeholder={`Сервер {server}`} style={{ fontSize: 12 }} />
                </div>
                {settings.welcomeImage && (
                  <div className="form-group">
                    <label>Расположение изображения</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className={`btn btn-sm ${(!settings.imagePosition || settings.imagePosition === 'large') ? 'btn-primary' : ''}`} onClick={() => update('imagePosition', 'large')}>🖼️ Большое</button>
                      <button className={`btn btn-sm ${settings.imagePosition === 'thumbnail' ? 'btn-primary' : ''}`} onClick={() => update('imagePosition', 'thumbnail')}>🔲 Превью</button>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="form-group">
              <label>Изображение / GIF</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="text" value={settings.welcomeImage || ''} onChange={e => update('welcomeImage', e.target.value || null)} placeholder="https://example.com/image.gif" style={{ flex: 1, fontSize: 12 }} />
                <button className="btn btn-sm" onClick={handleUpload}>📁 Загрузить</button>
              </div>
              {settings.welcomeImage && settings.welcomeImage.startsWith('data:') && (
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--green)' }}>✅ Изображение загружено (base64)</div>
              )}
            </div>

            {/* Preview */}
            <Preview settings={{ ...settings, serverName: selectedGuild.name }} textChannels={textChannels} />

            {/* Test button */}
            <button className="btn btn-primary btn-block" onClick={handleTest} disabled={sending} style={{ marginTop: 12 }}>
              {sending ? '⏳ Отправка...' : '🚀 Отправить тестовое сообщение'}
            </button>
          </>
        )}
      </div>

      {/* VARIABLES */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📋 Доступные переменные</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 12 }}>
          {[
            ['{name}', 'Имя участника'],
            ['{tag}', 'Имя#0000'],
            ['{mention}', '@упоминание'],
            ['{server}', 'Название сервера'],
            ['{count}', 'Кол-во участников'],
            ['{channel:название}', 'Тег канала (например {channel:general})'],
          ].map(([code, desc]) => (
            <div key={code} style={{ padding: '4px 8px', background: 'var(--bg-tertiary)', borderRadius: 4 }}>
              <code style={{ color: 'var(--accent)' }}>{code}</code>
              <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>{desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SEND MESSAGE */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>💬 Отправить сообщение от бота</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Напиши текст и выбери канал — бот отправит сообщение</p>

        <div className="form-group">
          <label>Канал</label>
          <select value={msgForm.channel} onChange={e => setMsgForm(f => ({ ...f, channel: e.target.value }))}>
            <option value="">— Выбери канал —</option>
            {textChannels.map((ch: any) => <option key={ch.id} value={ch.id}># {ch.name}</option>)}
          </select>
        </div>

        {msgForm.channel && (
          <>
            <div className="form-group">
              <label>Тип</label>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className={`btn btn-sm ${msgForm.type === 'text' ? 'btn-primary' : ''}`} onClick={() => setMsgForm(f => ({ ...f, type: 'text' }))}>💬 Текст</button>
                <button className={`btn btn-sm ${msgForm.type === 'embed' ? 'btn-primary' : ''}`} onClick={() => setMsgForm(f => ({ ...f, type: 'embed' }))}>📦 Embed</button>
              </div>
            </div>
            <div className="form-group">
              <label>Текст</label>
              <textarea value={msgForm.text} onChange={e => setMsgForm(f => ({ ...f, text: e.target.value }))} rows={3} style={{ fontSize: 13 }} placeholder="Введите текст сообщения..." />
            </div>
            {msgForm.type === 'embed' && (
              <>
                <div className="form-group">
                  <label>Цвет</label>
                  <input type="color" value={msgForm.color || '#7c3aed'} onChange={e => setMsgForm(f => ({ ...f, color: e.target.value }))} style={{ width: 48, height: 36 }} />
                </div>
                <div className="form-group">
                  <label>Заголовок</label>
                  <input type="text" value={msgForm.title} onChange={e => setMsgForm(f => ({ ...f, title: e.target.value }))} style={{ fontSize: 12 }} />
                </div>
                <div className="form-group">
                  <label>Подвал</label>
                  <input type="text" value={msgForm.footer} onChange={e => setMsgForm(f => ({ ...f, footer: e.target.value }))} style={{ fontSize: 12 }} />
                </div>
              </>
            )}
            <div className="form-group">
              <label>Изображение / GIF</label>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input type="text" value={msgForm.image} onChange={e => setMsgForm(f => ({ ...f, image: e.target.value }))} placeholder="https://example.com/image.png" style={{ flex: 1, fontSize: 12 }} />
                <button className="btn btn-sm" onClick={async () => { const r = await window.api.uploadWelcomeImage(); if (r.success && r.data) { setMsgForm(f => ({ ...f, image: r.data || '' })); setMessage({ text: '✅ Изображение загружено', error: false }); } }}>📁 Загрузить</button>
              </div>
              {msgForm.image && msgForm.image.startsWith('data:') && <div style={{ marginTop: 4, fontSize: 11, color: 'var(--green)' }}>✅ Файл загружен</div>}
            </div>
            <button className="btn btn-primary btn-block" onClick={handleSendMsg} disabled={sending}>
              {sending ? '⏳ Отправка...' : '🚀 Отправить'}
            </button>
          </>
        )}
      </div>

      {/* REQUIREMENTS */}
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>📋 Требования</h3>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
          • Бот должен быть на сервере и онлайн<br />
          • Для автороли: роль ниже роли бота + права "Управлять ролями"<br />
          • Для приветствий: бот должен иметь доступ к каналу
        </div>
      </div>
    </div>
  );
}
