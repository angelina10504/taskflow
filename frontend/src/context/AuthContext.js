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

  // Check if user is logged in on mount — fetch fresh data from DB
  useEffect(() => {
    const initAuth = async () => {
      const token = authService.getAccessToken();
      if (token) {
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
          // Token invalid — clear and treat as logged out
          authService.logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Register function - removed navigate, let components handle it
  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Login function - removed navigate, let components handle it
  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Google login function
  const googleLogin = async (credential) => {
    try {
      const response = await authService.googleLogin(credential);
      setUser(response.user);
      return response;
    } catch (error) {
      throw error;
    }
  };

  // Logout function - removed navigate, let components handle it
  const logout = async () => {
    await authService.logout();
    setUser(null);
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