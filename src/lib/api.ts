import axios, { type AxiosError } from 'axios';

const baseURL = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/v1`;

// timeout : sur une connexion instable, on échoue vite (→ mise en file / repli sur le cache)
// plutôt que de laisser l'interface bloquée indéfiniment.
export const api = axios.create({ baseURL, withCredentials: true, timeout: 20000 });

const ACCESS_KEY = 'fasi.access';

export function setAccessToken(token: string | null) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(ACCESS_KEY, token);
  else localStorage.removeItem(ACCESS_KEY);
}
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_KEY);
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error: AxiosError<{ error?: string; code?: string }>) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (!path.startsWith('/login')) {
        setAccessToken(null);
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  },
);

/** Extrait un message d'erreur lisible d'une réponse Axios. */
export function apiError(err: unknown): string {
  const e = err as AxiosError<{ error?: string }>;
  return e?.response?.data?.error || e?.message || 'Une erreur est survenue.';
}
