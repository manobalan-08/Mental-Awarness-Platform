import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Offline fallback — return cached data if available
api.interceptors.response.use(
  (response) => {
    // Cache successful GET responses
    if (response.config.method === 'get') {
      try { localStorage.setItem(`cache_${response.config.url}`, JSON.stringify(response.data)); } catch {}
    }
    return response;
  },
  (error) => {
    if (!navigator.onLine) {
      const cached = localStorage.getItem(`cache_${error.config?.url}`);
      if (cached) return Promise.resolve({ data: JSON.parse(cached), offline: true });
    }
    return Promise.reject(error);
  }
);

export default api;
