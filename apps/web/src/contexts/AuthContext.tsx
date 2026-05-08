import React, { createContext, useContext, useMemo, useState } from "react";
import { apiClient, clearAuthToken, getAuthToken, setAuthToken } from "../api/client";
import type { AuthPayload, User } from "../api/types";

interface AuthContextValue {
  user: Pick<User, "id" | "username"> | null;
  token: string;
  isAuthenticated: boolean;
  login: (payload: AuthPayload) => Promise<void>;
  register: (payload: AuthPayload) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function decodeUser(token: string): Pick<User, "id" | "username"> | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? "")) as { sub?: string; username?: string };
    if (!payload.sub || !payload.username) return null;
    return { id: payload.sub, username: payload.username };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(() => getAuthToken());
  const [user, setUser] = useState<Pick<User, "id" | "username"> | null>(() => decodeUser(getAuthToken()));

  async function login(payload: AuthPayload) {
    const response = await apiClient.login(payload);
    setAuthToken(response.access_token);
    setToken(response.access_token);
    setUser(decodeUser(response.access_token));
  }

  async function register(payload: AuthPayload) {
    return apiClient.register(payload);
  }

  function logout() {
    clearAuthToken();
    setToken("");
    setUser(null);
  }

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    isAuthenticated: Boolean(token && user),
    login,
    register,
    logout,
  }), [token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
