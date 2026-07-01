import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginScreen from './components/LoginScreen';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ChannelManager from './components/ChannelManager';
import RoleManager from './components/RoleManager';
import MemberManager from './components/MemberManager';
import ServerSettings from './components/ServerSettings';
import BotSettings from './components/BotSettings';
import { ViewType } from './types';


function AppContent() {
  const { connected, selectedGuild } = useAuth();
  const [view, setView] = useState<ViewType>('dashboard');

  useEffect(() => {
    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      setView(custom.detail as ViewType);
    };
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  useEffect(() => {
    setView('dashboard');
  }, [selectedGuild]);

  if (!connected) return <LoginScreen />;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {!selectedGuild ? (
          <div className="welcome-screen">
            <div className="welcome-icon">⚙️</div>
            <h1>Discord Manager</h1>
            <p>Select a server from the sidebar to start managing</p>
          </div>
        ) : (
          <>
            <div className="view-tabs">
              <button className={`view-tab ${view === 'dashboard' ? 'active' : ''}`} onClick={() => setView('dashboard')}>Dashboard</button>
              <button className={`view-tab ${view === 'channels' ? 'active' : ''}`} onClick={() => setView('channels')}>Channels</button>
              <button className={`view-tab ${view === 'roles' ? 'active' : ''}`} onClick={() => setView('roles')}>Roles</button>
              <button className={`view-tab ${view === 'members' ? 'active' : ''}`} onClick={() => setView('members')}>Members</button>
              <button className={`view-tab ${view === 'settings' ? 'active' : ''}`} onClick={() => setView('settings')}>Settings</button>
              <button className={`view-tab ${view === 'bot' ? 'active' : ''}`} onClick={() => setView('bot')}>🤖 Bot</button>
            </div>
            <div className="view-content">
              {view === 'dashboard' && <Dashboard />}
              {view === 'channels' && <ChannelManager />}
              {view === 'roles' && <RoleManager />}
              {view === 'members' && <MemberManager />}
              {view === 'settings' && <ServerSettings />}
              {view === 'bot' && <BotSettings />}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
