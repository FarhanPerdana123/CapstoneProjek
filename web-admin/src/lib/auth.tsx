"use client";

/**
 * Konteks autentikasi Super Admin.
 * Menyimpan token di localStorage dan menyediakan status login
 * untuk seluruh halaman di dalam app/(dashboard).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, clearSession, getToken, setToken, ADMIN_KEY } from "@/lib/api";
import type { Admin } from "@/lib/types";

type AuthState = {
  admin: Admin | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setAdmin: (admin: Admin) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdminState] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const setAdmin = useCallback((next: Admin) => {
    setAdminState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADMIN_KEY, JSON.stringify(next));
    }
  }, []);

  // Pulihkan sesi saat halaman dimuat.
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    const cached = window.localStorage.getItem(ADMIN_KEY);
    if (cached) {
      try {
        setAdminState(JSON.parse(cached));
      } catch {
        /* abaikan cache rusak */
      }
    }

    apiFetch<{ data: Admin }>("/api/admin/me")
      .then((res) => setAdmin(res.data))
      .catch(() => {
        clearSession();
        setAdminState(null);
      })
      .finally(() => setLoading(false));
  }, [setAdmin]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<{ data: { token: string; admin: Admin } }>("/api/admin/login", {
        method: "POST",
        auth: false,
        body: { email, password }
      });

      setToken(res.data.token);
      setAdmin(res.data.admin);
      router.push("/dashboard");
    },
    [router, setAdmin]
  );

  const logout = useCallback(() => {
    clearSession();
    setAdminState(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ admin, loading, login, logout, setAdmin }),
    [admin, loading, login, logout, setAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>.");
  return ctx;
}
