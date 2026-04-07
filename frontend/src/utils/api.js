import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://project-exhibition-2-production.up.railway.app/api/',
  withCredentials: true,
});

// Automatic Header injection
api.interceptors.request.use((config) => {
  const secret = localStorage.getItem('sessionSecret');
  if (secret) {
    config.headers.Authorization = `Bearer ${secret}`;
  }
  return config;
});

export const login = (email, password) => api.post('auth/login', { email, password });
export const signup = (name, email, password) => api.post('auth/signup', { name, email, password });
export const logout = () => api.post('auth/logout');
export const getMe = () => api.get('auth/me');

export const predictPrice = (url) => api.post('prediction/predict', { url });
export const getHistory = () => api.get('users/history');

export default api;
