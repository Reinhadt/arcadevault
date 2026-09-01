"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export interface SessionUser {
  name: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  signIn: (user: SessionUser | null) => void;
  signOut: () => void;
}

const STORAGE_KEY = "av_user";

const AuthContext = createContext<AuthContextValue | null>(null);

type Listener = () => void;
const listeners = new Set<Listener>();

function readUser(): SessionUser | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function getServerSnapshot(): SessionUser | null {
  return null;
}

function writeUser(user: SessionUser | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable — session still works in-memory for this tab
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const user = useSyncExternalStore(subscribe, readUser, getServerSnapshot);

  const signIn = useCallback((next: SessionUser | null) => writeUser(next), []);
  const signOut = useCallback(() => writeUser(null), []);

  const value = useMemo(
    () => ({ user, signIn, signOut }),
    [user, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
