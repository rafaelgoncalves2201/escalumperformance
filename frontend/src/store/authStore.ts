import { create } from 'zustand';
import api from '../lib/api';

interface Business {
  id: string;
  name: string;
  email: string;
  slug: string;
  active: boolean;
}

interface AuthState {
  business: Business | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  business: null,
  token: localStorage.getItem('token'),
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { business, token } = response.data;
      
      localStorage.setItem('token', token);
      set({ business, token, isLoading: false });
    } catch (error: any) {
      set({ isLoading: false });
      const msg = error.response?.data?.error
        || (error.code === 'ERR_NETWORK' && 'Verifique se o backend está rodando e a URL da API.')
        || error.message
        || 'Erro ao fazer login';
      throw new Error(msg);
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ business: null, token: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      set({ business: null, token: null });
      return;
    }

    try {
      const response = await api.get('/auth/me');
      set({ business: response.data.business, token });
    } catch (error) {
      localStorage.removeItem('token');
      set({ business: null, token: null });
    }
  },
}));
