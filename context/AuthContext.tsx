import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, User } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setupUser: (username: string) => Promise<void>;
  updateUsername: (username: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'acestep_token';
const USER_KEY = 'acestep_user';

/* ── Demo mode detection (matches App.tsx) ── */
const IS_DEMO = typeof window !== 'undefined' && (
  window.location.pathname.startsWith('/stepstudio') ||
  window.parent !== window
);

/** Create a local-only demo user when the API is unreachable */
function createDemoUser(username: string): { user: User; token: string } {
  const demoUser: User = {
    id: `demo-${Date.now()}`,
    username,
    createdAt: new Date().toISOString(),
  };
  return { user: demoUser, token: 'demo-token-offline' };
}

export function AuthProvider({ children }: { children: ReactNode }): React.ReactElement {
  // Start with null - we'll auto-login from database on mount
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;

  // Auto-login on mount: Try to get existing user from database
  useEffect(() => {
    async function initAuth(): Promise<void> {
      // DEMO MODE: Never auto-login from the real server — we don't want
      // demo visitors seeing the local user's account & songs.
      // Check localStorage for a returning demo visitor, otherwise show the modal.
      if (IS_DEMO) {
        // Demo mode: restore a previous demo session from localStorage
        // (could be a real server user or an offline demo user).
        // We skip auto-login from the SERVER to prevent inheriting the
        // local admin account — but we DO restore from localStorage.
        const savedUser = localStorage.getItem(USER_KEY);
        const savedToken = localStorage.getItem(TOKEN_KEY);
        if (savedUser && savedToken) {
          try {
            const parsed = JSON.parse(savedUser);
            if (parsed.id && parsed.username) {
              setUser(parsed);
              setToken(savedToken);
              console.log('Demo mode: restored session from localStorage');
              setIsLoading(false);
              return;
            }
          } catch { /* fall through */ }
        }
        // No saved session — show username modal
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setIsLoading(false);
        return;
      }

      // LOCAL MODE: Auto-login from the real server
      try {
        const { user: userData, token: newToken } = await authApi.auto();
        setUser(userData);
        setToken(newToken);
        localStorage.setItem(TOKEN_KEY, newToken);
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
      } catch (error: unknown) {
        const err = error as { message?: string };
        if (err.message?.startsWith('404:')) {
          console.log('No user in database, need to set up username');
        } else {
          console.warn('Auto-login failed:', error);
        }
        setToken(null);
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      } finally {
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const setupUser = useCallback(async (username: string): Promise<void> => {
    // Both local and demo mode: create a real user on the server so they
    // get a valid token for generation. Demo mode only skips AUTO-LOGIN
    // (to prevent inheriting the local admin account), not user creation.
    try {
      const { user: userData, token: newToken } = await authApi.setup(username);
      setUser(userData);
      setToken(newToken);
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      if (IS_DEMO) {
        // API unreachable — fall back to local demo user (browsing only, no generation)
        console.warn('Demo mode: API unreachable, creating offline demo user');
        const { user: demoUserData, token: demoToken } = createDemoUser(username);
        setUser(demoUserData);
        setToken(demoToken);
        localStorage.setItem(TOKEN_KEY, demoToken);
        localStorage.setItem(USER_KEY, JSON.stringify(demoUserData));
      } else {
        throw error;
      }
    }
  }, []);

  const updateUsername = useCallback(async (username: string): Promise<void> => {
    if (!token) throw new Error('Not authenticated');
    const { user: userData, token: newToken } = await authApi.updateUsername(username, token);
    setUser(userData);
    setToken(newToken);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
  }, [token]);

  const logout = useCallback((): void => {
    authApi.logout().catch(() => {});
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!token) return;
    try {
      const { user: userData } = await authApi.me(token);
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [token]);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    setupUser,
    updateUsername,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
