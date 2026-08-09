import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: any) => {
  const token = localStorage.getItem('accessToken');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response: any) => response,
  async (error: any) => {
    const originalRequest = error.config;
    // Handle 401 Unauthorized globally for token refresh (if implemented on frontend)
    if (error.response?.status === 401 && !originalRequest._retry) {
        // TODO: Handle token refresh logic
    }
    return Promise.reject(error);
  }
);

export default apiClient;
