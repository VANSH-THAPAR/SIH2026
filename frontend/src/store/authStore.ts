import { create } from 'zustand';
import type { User, UserRole, LoginCredentials, RegisterCredentials } from '@/types';
import { loginApi, registerApi, fetchMeApi } from '@/services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (credentials: LoginCredentials) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  quickLogin: (role: UserRole) => Promise<void>;
  logout: () => void;
  initAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: true,
  error: null,

  clearError: () => set({ error: null }),

  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const authRes = await loginApi(credentials);
      localStorage.setItem('token', authRes.access_token);
      set({ token: authRes.access_token });

      const currentUser = await fetchMeApi();
      localStorage.setItem('user', JSON.stringify(currentUser));
      set({
        user: currentUser,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      const message =
        err.response?.data?.detail || 'Invalid email or password. Please try again.';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  register: async (credentials: RegisterCredentials) => {
    set({ isLoading: true, error: null });
    try {
      await registerApi(credentials);
      set({ isLoading: false });
    } catch (err: any) {
      const message =
        err.response?.data?.detail || 'Failed to register account. Please try again.';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  quickLogin: async (role: UserRole) => {
    set({ isLoading: true, error: null });
    const creds =
      role === 'hse'
        ? { email: 'hse@test.com', password: 'password123', role: 'hse' as UserRole }
        : { email: 'reporter@test.com', password: 'password123', role: 'reporter' as UserRole };

    try {
      // First attempt to log in
      await get().login({ email: creds.email, password: creds.password });
    } catch (err: any) {
      // If login fails (user does not exist yet), auto-register and retry
      try {
        await registerApi(creds);
        await get().login({ email: creds.email, password: creds.password });
      } catch (regErr: any) {
        set({
          error: regErr.response?.data?.detail || 'Failed to authenticate with demo user.',
          isLoading: false,
        });
      }
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  initAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      return;
    }

    try {
      const user = await fetchMeApi();
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
