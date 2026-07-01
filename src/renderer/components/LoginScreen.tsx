import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const BOT_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1521850566316392520&permissions=8&integration_type=0&scope=bot';

export default function LoginScreen() {
  const [token, setToken] = useState('');
  const [isBot, setIsBot] = useState(true);
  const { login, connecting, error } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (token.trim()) login(token.trim(), isBot);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">
          <div className="logo-icon">⚙️</div>
          <h1>Discord Manager</h1>
          <p>Professional Server Management Tool</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Токен {isBot ? 'бота' : 'пользователя'}</label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder={isBot ? 'Вставьте токен бота...' : 'Вставьте токен пользователя...'}
              autoFocus
            />
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <label className="checkbox-wrap" style={{ width: 'auto' }}>
              <input type="checkbox" checked={isBot} onChange={e => setIsBot(e.target.checked)} />
              <span className="checkmark" />
              <span style={{ marginLeft: 8, fontSize: 14 }}>🤖 Это бот</span>
            </label>
            <a href={BOT_INVITE_URL} target="_blank" className="btn btn-sm" style={{ marginLeft: 'auto' }}>
              ➕ Добавить бота на сервер
            </a>
          </div>

          {error && <div className="error-message">{error}</div>}
          <button type="submit" className="btn btn-primary btn-block" disabled={connecting}>
            {connecting ? 'Подключение...' : '🔌 Подключиться'}
          </button>
        </form>
        <div className="login-footer">
          <p>🤖 Режим бота (рекомендуется):</p>
          <ol>
            <li>Нажми «➕ Добавить бота на сервер»</li>
            <li>Выбери сервер и подтверди</li>
            <li>Скопируй токен бота из <a href="https://discord.com/developers/applications" target="_blank">Developer Portal</a></li>
            <li>Вставь токен выше и нажми «Подключиться»</li>
          </ol>
          <p style={{ marginTop: 8, fontSize: 11, color: '#6b6e92' }}>
            👤 Режим пользователя — если хочешь использовать свой личный токен (нестабильно)
          </p>
        </div>
      </div>
    </div>
  );
}
