import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

const API = axios.create({
  baseURL,
});

// Request Interceptor: Attach JWT Token
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('pepsi_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => Promise.reject(error));

// Response Interceptor: Handle 401 Unauthorized
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const msg = error.response.data?.message;
      if (msg) {
        try {
          sessionStorage.setItem('pepsi_logout_reason', msg);
        } catch (e) {}
      }
      localStorage.removeItem('pepsi_token');
      localStorage.removeItem('pepsi_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;
