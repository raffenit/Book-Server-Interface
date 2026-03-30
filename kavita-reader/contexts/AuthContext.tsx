import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { kavitaAPI } from '../services/kavitaAPI';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (serverUrl: string, apiKey: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  serverUrl: string;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  login: async () => ({ success: false }),
  logout: async () => {},
  serverUrl: '',
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverUrl, setServerUrl] = useState('');

  useEffect(() => {
    initializeAuth();
  }, []);

  async function initializeAuth() {
    try {
      await kavitaAPI.initialize();
      if (kavitaAPI.hasCredentials()) {
        // Try to re-authenticate with stored credentials
        const success = await kavitaAPI.login();
        setIsAuthenticated(success);
        if (success) setServerUrl(kavitaAPI.getServerUrl());
      }
    } catch (e) {
      console.error('Auth init failed', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(url: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      await kavitaAPI.saveCredentials(url, apiKey);
      const success = await kavitaAPI.login();
      if (success) {
        setIsAuthenticated(true);
        setServerUrl(kavitaAPI.getServerUrl());
        return { success: true };
      } else {
        return { success: false, error: 'Invalid server URL or API key. Check your Kavita settings.' };
      }
    } catch (e: any) {
      return {
        success: false,
        error: e?.message?.includes('Network') ? 'Could not reach server. Check the URL.' : 'Login failed.',
      };
    }
  }

  async function logout() {
    await kavitaAPI.logout();
    setIsAuthenticated(false);
    setServerUrl('');
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, login, logout, serverUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
