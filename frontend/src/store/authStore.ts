import { create } from 'zustand';
import api, { hasConfiguredApiUrl } from '../lib/api';

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

function isProduction(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h !== 'localhost' && h !== '127.0.0.1';
}

function buildLoginErrorMessage(error: any): string {
  const backendMsg = error.response?.data?.error;
  const status = error.response?.status;
  const code = error.code;
  const prod = isProduction();

  if (backendMsg) return backendMsg;
  if (status === 404) {
    return prod && !hasConfiguredApiUrl
      ? 'API não encontrada. No Render, defina VITE_API_URL (URL do backend) nas variáveis de ambiente do frontend e faça "Redeploy".'
      : 'API não encontrada. Verifique se a URL do backend está correta.';
  }
  if (code === 'ERR_NETWORK' || code === 'ECONNABORTED') {
    if (prod && !hasConfiguredApiUrl) {
      return 'Configure VITE_API_URL no Render (URL do backend) no serviço do frontend e FRONTEND_URL no backend (URL do frontend). Depois faça Redeploy nos dois.';
    }
    if (prod) {
      return 'Não foi possível conectar ao servidor. Verifique: (1) Backend está rodando no Render; (2) FRONTEND_URL no backend = URL do frontend; (3) Cold start pode demorar ~50s no free tier.';
    }
    return 'Não foi possível conectar. Verifique se o backend está rodando (npm run dev no backend).';
  }
  return error.message || 'Erro ao fazer login';
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
      throw new Error(buildLoginErrorMessage(error));
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
