import React, { createContext, useState, useContext, useEffect } from 'react';
import * as authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const response = await authService.getMe();
        const u = response.user;
        const userData = {
          id: u._id,
          name: u.name,
          email: u.email,
          avatar: u.avatar,
          bio: u.bio,
          jobTitle: u.jobTitle,
          phone: u.phone,
          timezone: u.timezone,
        };
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
      } catch {
        // FIXED: Both access token and refresh cookie are invalid or missing.
        // We just wipe the local state silently instead of calling the backend logout.
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken'); 
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Register function
  const register = async (userData) => {
    const response = await authService.register(userData);
    setUser(response.user);
    return response;
  };

  // Login function
  const login = async (credentials) => {
    const response = await authService.login(credentials);
    setUser(response.user);
    return response;
  };

  // Google login function
  const googleLogin = async (credential) => {
    const response = await authService.googleLogin(credential);
    setUser(response.user);
    return response;
  };

  // Logout function
  const logout = async () => {
    await authService.logout(); // Tells backend to destroy the HTTP-only cookie
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken'); // Ensure everything is wiped on the frontend
  };

  // Update user
  const updateUser = (updatedUser) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    loading,
    register,
    login,
    googleLogin,
    logout,
    updateUser,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};