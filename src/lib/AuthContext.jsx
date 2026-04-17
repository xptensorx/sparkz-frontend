import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { sparkzApi } from '@/components/services/sparkzApi';
import { clearToken, getToken } from '@/lib/authStorage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const loadSession = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoadingAuth(false);
      return;
    }
    try {
      const me = await sparkzApi.me();
      setUser(me);
      setIsAuthenticated(true);
    } catch {
      clearToken();
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    try {
      const me = await sparkzApi.me();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
      setIsAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const login = async (email, password) => {
    await sparkzApi.login(email, password);
    const me = await sparkzApi.me();
    setUser(me);
    setIsAuthenticated(true);
    return me;
  };

  const register = async (email, password) => {
    await sparkzApi.register(email, password);
    const me = await sparkzApi.me();
    setUser(me);
    setIsAuthenticated(true);
    return me;
  };

  const logout = () => {
    sparkzApi.logout();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
