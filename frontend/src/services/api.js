import axios from 'axios';
import { getAccessToken, refreshAccessToken } from './authService'; // Removed logout import

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  withCredentials: true, // sends the refreshToken HTTP-only cookie automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If error is 401, we haven't tried to refresh yet, AND the failed request WAS NOT the refresh endpoint itself
    if (
      error.response?.status === 401 && 
      !originalRequest._retry &&
      !originalRequest.url.includes('/refresh-token')
    ) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // 🛑 THE FIX: No more window.location.href or backend logout() calls here!
        // We just quietly wipe local storage so the frontend knows the session is dead.
        // AuthContext will catch this rejection and let React Router handle the redirect smoothly.
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Test function
export const testConnection = async () => {
  try {
    const response = await api.get('/');
    return response.data;
  } catch (error) {
    console.error('Connection test failed:', error);
    throw error;
  }
};

export default api;