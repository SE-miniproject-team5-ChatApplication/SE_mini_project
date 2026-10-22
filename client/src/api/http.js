// REST client. Adds "Authorization: Bearer <token>" to every request (SRS 3.3)
// and turns server errors into { code, message, field }.
import axios from 'axios';
import { tokenStore } from './tokenStore.js';

export const http = axios.create({ baseURL: '/api' });

http.interceptors.request.use((cfg) => {
  const token = tokenStore.getToken();
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    // An expired or revoked token logs the user out everywhere in the app.
    if (err.response?.status === 401 && tokenStore.getToken()) {
      window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(err);
  }
);

export function apiError(err) {
  const e = err?.response?.data?.error;
  if (e) return { code: e.code, message: e.message, field: e.field };
  return { code: 'NETWORK_ERROR', message: 'Cannot reach the server. Check your connection.' };
}
