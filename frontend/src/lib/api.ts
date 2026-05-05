import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://dash-ai-backend.onrender.com/api/v1',
  timeout: 180000, // 3 minutes for deep AI analysis
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor for Auth tokens later
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
