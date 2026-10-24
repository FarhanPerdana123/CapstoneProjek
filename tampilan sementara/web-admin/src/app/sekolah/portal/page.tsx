"use client";

/**
 * Portal sederhana sebagai bukti sesi sekolah berfungsi.
 * Panel lengkap (kelola siswa, sesi skrining) menyusul kemudian.
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "@/lib/api";
import {
  clearSekolahSession,
  getSekolahProfile,
  getSekolahToken,
  meSekolah
} from "@/lib/sekolahApi";
import type { SekolahAkun } from "@/lib/sekolahAuth";

export default function PortalSekolahPage() {
  const router = useRouter();
  const [profil, setProfil] = useState<SekolahAkun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!getSekolahToken()) {
      router.replace("/login");
      return;
    }

    // Validasi token ke server; jatuh ke cache bila gagal jaringan ringan.
    meSekolah()
      .then((data) => setProfil(data))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 0) {
          setProfil(getSekolahProfile());
        } else {
          setError(err instanceof ApiError ? err.message : "Sesi tidak valid.");
          clearSekolahSession();
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  function handleLogout() {
    clearSekolahSession();
    router.replace("/login");
  }

  if (loading) {
    return (
      <main className="login-wrap">
        <p className="muted">Memuat...</p>
      </main>
    );
  }

  if (!profil) {
    return (
      <main className="login-wrap">
        <div className="login-card">
          <h1>Sesi berakhir</h1>
          <p className="sub">{error || "Silakan login kembali."}</p>
          <button className="btn btn-primary" onClick={() => router.replace("/login")}>
            Ke Halaman Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="login-wrap">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-icon">SK</div>
          <div>
            <div className="brand-title">Skrining Kognitif</div>
            <div className="brand-sub">Portal Sekolah</div>
          </div>
        </div>

        <h1>Selamat Datang</h1>
        <p className="sub">Anda masuk sebagai akun sekolah.</p>

        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <div><strong>{profil.schoolName}</strong></div>
          <div className="muted" style={{ fontSize: "0.85rem" }}>{profil.email}</div>
          {profil.alamat && (
            <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
              {profil.alamat}
            </div>
          )}
        </div>

        <p className="muted" style={{ fontSize: "0.85rem" }}>
          Panel kelola siswa dan sesi skrining akan tersedia pada pengembangan berikutnya.
        </p>

        <button
          className="btn btn-primary"
          onClick={handleLogout}
          style={{ width: "100%", marginTop: 12 }}
        >
          Keluar
        </button>
      </div>
    </main>
  );
}
