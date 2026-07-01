import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { DiscordGuild } from '../types';

const ADMIN_BIT = 8n;
function hasAdmin(permissions: string): boolean {
  return (BigInt(permissions) & ADMIN_BIT) === ADMIN_BIT;
}

interface AuthState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  guilds: DiscordGuild[];
  selectedGuild: DiscordGuild | null;
  adminGuilds: DiscordGuild[];
}

interface AuthContextType extends AuthState {
  login: (token: string, isBot?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  selectGuild: (guild: DiscordGuild | null) => void;
  refreshGuilds: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    connected: false,
    connecting: true,
    error: null,
    guilds: [],
    selectedGuild: null,
    adminGuilds: [],
  });

  const updateGuilds = useCallback((guilds: DiscordGuild[]) => {
    setState(s => ({
      ...s,
      guilds,
      adminGuilds: guilds.filter(g => hasAdmin(g.permissions) || g.owner),
    }));
  }, []);

  const doLogin = useCallback(async (token: string, isBot = false) => {
    const result = await window.api.connect(token, isBot);
    if (result.success) {
      const guildsRes = await window.api.getGuilds();
      const guilds = guildsRes.data || [];
      setState(s => ({
        ...s,
        connected: true,
        connecting: false,
        error: null,
        guilds,
        adminGuilds: guilds.filter(g => hasAdmin(g.permissions) || g.owner),
        selectedGuild: null,
      }));
      window.api.onMemberCounts((updates) => {
        setState(s => {
          const updated = s.guilds.map(g => ({
            ...g,
            memberCount: updates[g.id] || g.memberCount,
          }));
          return {
            ...s,
            guilds: updated,
            adminGuilds: updated.filter(g => hasAdmin(g.permissions) || g.owner),
          };
        });
      });
    } else {
      setState(s => ({
        ...s,
        connected: false,
        connecting: false,
        error: result.error || 'Connection failed',
        guilds: [],
        adminGuilds: [],
        selectedGuild: null,
      }));
    }
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await window.api.getSavedToken();
      if (saved.token) {
        await doLogin(saved.token, saved.isBot);
      } else {
        setState(s => ({ ...s, connecting: false }));
      }
    })();
  }, [doLogin]);

  const login = useCallback(async (token: string, isBot?: boolean) => {
    setState(s => ({ ...s, connecting: true, error: null }));
    await doLogin(token, isBot);
  }, [doLogin]);

  const logout = useCallback(async () => {
    await window.api.disconnect();
    setState({
      connected: false,
      connecting: false,
      error: null,
      guilds: [],
      adminGuilds: [],
      selectedGuild: null,
    });
  }, []);

  const selectGuild = useCallback((guild: DiscordGuild | null) => {
    setState(s => ({ ...s, selectedGuild: guild }));
  }, []);

  const refreshGuilds = useCallback(async () => {
    const res = await window.api.getGuilds();
    if (res.success && res.data) {
      updateGuilds(res.data);
    }
  }, [updateGuilds]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, selectGuild, refreshGuilds }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
