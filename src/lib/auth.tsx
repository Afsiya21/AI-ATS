import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser } from "./api";

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage on the client only — avoids SSR mismatches.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("user");
      if (saved) setUser(JSON.parse(saved) as AuthUser);
    } catch {
      // ignore parse errors
    }
    setReady(true);
  }, []);

  const login = useCallback((nextUser: AuthUser, token: string) => {
    window.localStorage.setItem("token", token);
    window.localStorage.setItem("user", JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("user");
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout }),
    [user, ready, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
