import api from './api';

// Register new user
export const register = async (userData) => {
  try {
    const response = await api.post('/api/auth/register', userData);
    
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Registration failed' };
  }
};

// Login user
export const login = async (credentials) => {
  try {
    const response = await api.post('/api/auth/login', credentials);
    
    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Login failed' };
  }
};

// Google OAuth login
export const googleLogin = async (credential) => {
  try {
    const response = await api.post('/api/auth/google', { credential });

    if (response.data.accessToken) {
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Google login failed' };
  }
};

// Logout user — clears local storage and asks backend to clear the cookie
export const logout = async () => {
  try {
    await api.post('/api/auth/logout');
  } catch {
    // Best-effort — clear local state regardless
  }
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
};

// Get current user from localStorage
export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

// Get access token
export const getAccessToken = () => {
  return localStorage.getItem('accessToken');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!getAccessToken();
};

// Get current user from DB
export const getMe = async () => {
  try {
    const response = await api.get('/api/auth/me');
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Failed to fetch user' };
  }
};

// Update profile
export const updateProfile = async (data) => {
  try {
    const response = await api.put('/api/auth/me', data);
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Profile update failed' };
  }
};

// Upload avatar
export const uploadAvatar = async (file) => {
  try {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await api.post('/api/auth/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  } catch (error) {
    throw error.response?.data || { message: 'Avatar upload failed' };
  }
};

// Refresh access token — cookie is sent automatically via withCredentials
export const refreshAccessToken = async () => {
  // 🛑 FIX APPLIED: Removed try/catch block and the logout() call.
  // The error will now be caught and handled gracefully by api.js!
  const response = await api.post('/api/auth/refresh-token');

  if (response.data.accessToken) {
    localStorage.setItem('accessToken', response.data.accessToken);
  }

  return response.data.accessToken;
};