import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const baseURL = API_URL ? `${API_URL.replace(/\/$/, '')}/api` : '/api';

/** Em produção (Render), VITE_API_URL precisa estar definida. Senão o front chama /api no próprio domínio e falha. */
export const hasConfiguredApiUrl = !!API_URL;
export const apiBaseURL = baseURL;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 25000,
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
