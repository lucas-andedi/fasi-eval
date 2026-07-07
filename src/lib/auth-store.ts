'use client';
import { create } from 'zustand';
import { api, setAccessToken } from './api';
import type { AuthUser } from './types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  login: async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    setAccessToken(data.accessToken);
    set({ user: data.user, loading: false });
    return data.user as AuthUser;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    setAccessToken(null);
    set({ user: null });
  },
  refresh: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data, loading: false });
    } catch {
      set({ user: null, loading: false });
    }
  },
}));
