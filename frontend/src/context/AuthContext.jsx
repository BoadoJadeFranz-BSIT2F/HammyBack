import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';
import { clearArchiveCache, syncArchiveFromServer } from '../services/archive';

const AuthContext = createContext(null);
const STARTUP_TIMEOUT_MS = 5000;

const withTimeout = (promise, timeoutMs, message) => {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    if (token) {
      verifyToken();
    } else {
      setLoading(false);
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await withTimeout(
        authAPI.verify(),
        STARTUP_TIMEOUT_MS,
        'Auth verification timed out'
      );
      setUser(response.data.user);
      await withTimeout(
        syncArchiveFromServer(),
        STARTUP_TIMEOUT_MS,
        'Archive sync timed out'
      );
    } catch (error) {
      localStorage.removeItem('token');
      clearArchiveCache();
    } finally {
      setLoading(false);
    }
  };

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    await syncArchiveFromServer();
    return response.data;
  };

  const signup = async (userData) => {
    const response = await authAPI.signup(userData);
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    await syncArchiveFromServer();
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    clearArchiveCache();
    setUser(null);
  };

  const googleLogin = async (credentialResponse) => {
    const response = await authAPI.googleLogin(credentialResponse.credential);
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    await syncArchiveFromServer();
    return response.data;
  };

  useEffect(() => {
    if (!user) return;

    const syncInterval = setInterval(() => {
      syncArchiveFromServer();
    }, 15000);

    return () => clearInterval(syncInterval);
  }, [user]);

  const completeProfile = async (profileData) => {
    const response = await authAPI.completeProfile(profileData);
    setUser(response.data.user);
    return response.data;
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, googleLogin, completeProfile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
