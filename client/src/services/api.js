import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token');
    const activeTenantStr = sessionStorage.getItem('activeTenant');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    if (activeTenantStr) {
      try {
        const activeTenant = JSON.parse(activeTenantStr);
        if (activeTenant && activeTenant.id) {
          config.headers['x-tenant-id'] = activeTenant.id;
        }
      } catch (e) {
        console.error('Failed to parse activeTenant from storage', e);
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
