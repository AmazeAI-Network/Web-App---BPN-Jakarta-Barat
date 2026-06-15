import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  getCurrentSession,
  logoutDemoSession,
  verifyDemoLogin,
} from "@/lib/demo-accounts.functions";

export type UserRole = "admin" | "petugas_loket" | "verifikator" | "verifikasi";

export type DemoUser = {
  username: string;
  name: string;
  nip: string;
  unitKerja: string;
  role: UserRole;
  roleLabel: string;
  email: string;
};

type AuthContextValue = {
  user: DemoUser | null;
  isReady: boolean;
  login: (username: string, password: string) => Promise<DemoUser>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = "bpn_demo_session_v1";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [isReady, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let cached: DemoUser | null = null;
      try {
        const raw =
          typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
        if (raw) cached = JSON.parse(raw) as DemoUser;
      } catch {
        // ignore
      }
      // The cached object is non-authoritative — the server cookie is. Re-validate
      // and overwrite role/username so tampering with localStorage cannot grant
      // privileges in the UI.
      try {
        const sess = await getCurrentSession();
        if (cancelled) return;
        if (!sess.authenticated) {
          try {
            window.localStorage.removeItem(STORAGE_KEY);
          } catch {
            // ignore
          }
          setUser(null);
        } else if (cached) {
          setUser({ ...cached, username: sess.username, role: sess.role });
        }
      } catch {
        // network/server hiccup: keep cached user, server fns still enforce role
        if (!cancelled && cached) setUser(cached);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (username: string, password: string) => {
    const account = await verifyDemoLogin({ data: { username, password } });
    const userObj: DemoUser = {
      username: account.username,
      name: account.name,
      nip: account.nip,
      unitKerja: account.unitKerja,
      role: account.role,
      roleLabel: account.roleLabel,
      email: account.email,
    };
    setUser(userObj);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(userObj));
    } catch {
      // ignore
    }
    return userObj;
  };

  const logout = () => {
    setUser(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    void logoutDemoSession().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, isReady, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
