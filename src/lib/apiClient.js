import axios from 'axios';

const TOKEN_KEY = 'scms_token';
const USER_KEY = 'scms_user';

const DEFAULT_API_BASE_URL = '/api/v1';

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL;

  if (typeof configuredBaseUrl === 'string' && configuredBaseUrl.trim()) {
    return configuredBaseUrl.trim().replace(/\/+$/, '');
  }

  return DEFAULT_API_BASE_URL;
}

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.dispatchEvent(new CustomEvent('scms:unauthorized'));

      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
