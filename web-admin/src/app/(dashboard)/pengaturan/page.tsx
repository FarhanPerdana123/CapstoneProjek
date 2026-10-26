"use client";

import { useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PengaturanData } from "@/lib/types";
import { Alert, Skeleton, Stat } from "@/components/ui";
import { formatTanggal } from "@/lib/format";

export default function PengaturanPage() {
  const { setAdmin } = useAuth();

  const [data, setData] = useState<PengaturanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch<{ data: PengaturanData }>("/api/admin/pengaturan")
      .then((res) => {
        setData(res.data);
        setUsername(res.data.profil.username);
        setEmail(res.data.profil.email);
      })
      .catch((err) => {
        setFlash({ type: "error", text: err instanceof ApiError ? err.message : "Gagal memuat pengaturan." });
      })
      .finally(() => setLoading(false));
  }, []);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFlash(null);

    try {
      const res = await apiFetch<{ data: { profil: PengaturanData["profil"]; token?: string } }>(
        "/api/admin/pengaturan",
        {
          method: "POST",
          body: { username, email, password, password_konfirmasi: konfirmasi }
        }
      );

      setAdmin(res.data.profil);
      setPassword("");
      setKonfirmasi("");
      setFlash({ type: "success", text: "Profil berhasil diperbarui." });
    } catch (err) {
      setFlash({ type: "error", text: err instanceof ApiError ? err.message : "Gagal menyimpan profil." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="card-body">
          <Skeleton rows={5} />
        </div>
      </div>
    );
  }

  return (
    <>
      {flash && <Alert type={flash.type}>{flash.text}</Alert>}

      <div className="grid-stats">
        <Stat label="Total Sekolah" value={data?.info.totalSekolah ?? 0} />
        <Stat label="Total Tes" value={data?.info.totalTes ?? 0} />
        <Stat label="Terdaftar Sejak" value={formatTanggal(data?.profil.createdAt)} />
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Profil Super Admin</h2>
        </div>
        <div className="card-body">
          <form onSubmit={simpan} style={{ maxWidth: 520 }}>
            <div className="field">
              <label htmlFor="username">Nama Pengguna</label>
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password Baru (opsional)</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Kosongkan bila tidak diubah"
              />
            </div>

            <div className="field">
              <label htmlFor="konfirmasi">Konfirmasi Password Baru</label>
              <input
                id="konfirmasi"
                type="password"
                value={konfirmasi}
                onChange={(e) => setKonfirmasi(e.target.value)}
                placeholder="Ulangi password baru"
              />
            </div>

            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
