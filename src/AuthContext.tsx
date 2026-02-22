"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { setTokenProvider } from "@/lib/api";

// ============================================================================
// TYPES
// ============================================================================

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: string;
}

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  logout: () => void;
  getAccessToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// STORAGE KEYS
// ============================================================================

const STORAGE_KEYS = {
  accessToken: "kartixa_access_token",
  refreshToken: "kartixa_refresh_token",
  expiresAt: "kartixa_expires_at",
  user: "kartixa_user",
} as const;

// ============================================================================
// HELPERS
// ============================================================================

function saveTokens(tokens: AuthTokens) {
  const expiresAt = Date.now() + tokens.expiresIn * 1000;
  localStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken);
  localStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken);
  localStorage.setItem(STORAGE_KEYS.expiresAt, String(expiresAt));
}

function saveUser(user: AuthUser) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.expiresAt);
  localStorage.removeItem(STORAGE_KEYS.user);
}

function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getStoredAccessToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

function getStoredRefreshToken(): string | null {
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

function getStoredExpiresAt(): number {
  const raw = localStorage.getItem(STORAGE_KEYS.expiresAt);
  return raw ? Number(raw) : 0;
}

/** Check if the access token expires in less than 60 seconds */
function isTokenExpiringSoon(): boolean {
  const expiresAt = getStoredExpiresAt();
  return Date.now() > expiresAt - 60_000;
}

// ============================================================================
// API CALLS
// ============================================================================

async function apiLogin(email: string, password: string) {
  const res = await fetch("/api/v1/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? "Login failed");
  }
  return json.data as { user: AuthUser; tokens: AuthTokens };
}

async function apiRegister(
  email: string,
  password: string,
  displayName: string,
) {
  const res = await fetch("/api/v1/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message ?? "Registration failed");
  }
  return json.data as { user: AuthUser; tokens: AuthTokens };
}

async function apiRefresh(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number } | null> {
  try {
    const res = await fetch("/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) return null;
    return json.data as { accessToken: string; expiresIn: number };
  } catch {
    return null;
  }
}

// ============================================================================
// PROVIDER
// ============================================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearStorage();
    setUser(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiLogin(email, password);
    saveTokens(result.tokens);
    saveUser(result.user);
    setUser(result.user);
  }, []);

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const result = await apiRegister(email, password, displayName);
      saveTokens(result.tokens);
      saveUser(result.user);
      setUser(result.user);
    },
    [],
  );

  /**
   * Get a valid access token, refreshing if needed.
   * Returns null if no session exists (user must re-login).
   */
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const token = getStoredAccessToken();
    if (!token) return null;

    // Token still fresh — return it
    if (!isTokenExpiringSoon()) return token;

    // Try to refresh
    const refreshToken = getStoredRefreshToken();
    if (!refreshToken) {
      logout();
      return null;
    }

    const result = await apiRefresh(refreshToken);
    if (!result) {
      logout();
      return null;
    }

    // Save the new access token
    const expiresAt = Date.now() + result.expiresIn * 1000;
    localStorage.setItem(STORAGE_KEYS.accessToken, result.accessToken);
    localStorage.setItem(STORAGE_KEYS.expiresAt, String(expiresAt));

    return result.accessToken;
  }, [logout]);

  // On mount: restore user from localStorage
  useEffect(() => {
    const storedUser = getStoredUser();
    const token = getStoredAccessToken();
    if (storedUser && token) {
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  // Register the token provider so the API client includes Bearer tokens
  useEffect(() => {
    setTokenProvider(getAccessToken);
  }, [getAccessToken]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        getAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
