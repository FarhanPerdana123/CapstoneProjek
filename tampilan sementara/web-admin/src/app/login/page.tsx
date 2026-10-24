"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError, apiFetch, setToken } from "@/lib/api";
import { setSekolahToken } from "@/lib/sekolahApi";
import { useAuth } from "@/lib/auth";
import { getSekolahToken } from "@/lib/sekolahApi";

type LoginResponse = {
  role: "super_admin" | "sekolah";
  token: string;
  admin?: { id: number; username: string; email: string; createdAt?: string };
  sekolah?: {
    id: number;
    schoolName: string;
    email: string;
    alamat: string | null;
    createdAt?: string;
  };
};

export default function LoginPage() {
  const { admin, loading, setAdmin } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Sudah punya sesi -> arahkan sesuai jenis akunnya.
  useEffect(() => {
    if (loading) return;
    if (admin) router.replace("/dashboard");
    else if (getSekolahToken()) router.replace("/sekolah/portal");
  }, [admin, loading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiFetch<{ data: LoginResponse }>("/api/admin/login", {
        method: "POST",
        auth: false,
        body: { email, password }
      });

      const { role, token } = res.data;

      if (role === "super_admin" && res.data.admin) {
        setToken(token);
        setAdmin(res.data.admin);
        router.replace("/dashboard");
      } else if (role === "sekolah" && res.data.sekolah) {
        setSekolahToken(token);
        window.localStorage.setItem(
          "skrining.sekolah.profile",
          JSON.stringify(res.data.sekolah)
        );
        router.replace("/sekolah/portal");
      } else {
        throw new ApiError("Respons login tidak dikenali.", 0);
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Terjadi kesalahan tak terduga.";
      setError(message);
      setSubmitting(false);
    }
  }

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon">SK</div>
          <div>
            <div className="brand-title">Skrining Kognitif</div>
            <div className="brand-sub">Panel Admin</div>
          </div>
        </div>

        <h1>Masuk</h1>
        <p className="sub">
          Gunakan akun Super Admin atau akun sekolah Anda.
        </p>

        {error && (
          <div className="alert error" style={{ marginBottom: 16 }} role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="email@skriningkognitif.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit" disabled={submitting} style={{ width: "100%" }}>
            {submitting ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <p className="muted" style={{ fontSize: "0.76rem", marginTop: 18, textAlign: "center" }}>
          API: {process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}
        </p>
      </div>
    </main>
  );
}
