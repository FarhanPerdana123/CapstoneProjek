"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { Paginated, Sekolah } from "@/lib/types";
import { Alert, Badge, Empty, Modal, Pagination, Skeleton } from "@/components/ui";
import { formatTanggal } from "@/lib/format";

type FormState = {
  id_school: number;
  school_name: string;
  email: string;
  password: string;
  alamat: string;
  kontak_telepon: string;
  status_aktif: boolean;
};

const FORM_KOSONG: FormState = {
  id_school: 0,
  school_name: "",
  email: "",
  password: "",
  alamat: "",
  kontak_telepon: "",
  status_aktif: true
};

export default function SekolahPage() {
  const [data, setData] = useState<Paginated<Sekolah> | null>(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("semua");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_KOSONG);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), status });
      if (search.trim()) qs.set("search", search.trim());
      const res = await apiFetch<{ data: Paginated<Sekolah> }>(`/api/admin/sekolah?${qs}`);
      setData(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat data sekolah.");
    } finally {
      setLoading(false);
    }
  }, [page, status, search]);

  useEffect(() => {
    muat();
  }, [muat]);

  function bukaTambah() {
    setForm(FORM_KOSONG);
    setFormError(null);
    setFormOpen(true);
  }

  function bukaEdit(s: Sekolah) {
    setForm({
      id_school: s.id_school,
      school_name: s.school_name,
      email: s.email,
      password: "",
      alamat: s.alamat || "",
      kontak_telepon: s.kontak_telepon || "",
      status_aktif: Number(s.status_aktif) === 1
    });
    setFormError(null);
    setFormOpen(true);
  }

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const res = await apiFetch<{ message: string }>("/api/admin/sekolah", {
        method: "POST",
        body: form
      });
      setFormOpen(false);
      setFlash({ type: "success", text: res.message || "Data tersimpan." });
      await muat();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal menyimpan sekolah.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(s: Sekolah) {
    try {
      const res = await apiFetch<{ message: string }>(`/api/admin/sekolah/${s.id_school}/toggle`, {
        method: "PATCH"
      });
      setFlash({ type: "success", text: res.message });
      await muat();
    } catch (err) {
      setFlash({
        type: "error",
        text: err instanceof ApiError ? err.message : "Gagal mengubah status."
      });
    }
  }

  async function hapus(s: Sekolah) {
    if (!window.confirm(`Hapus sekolah "${s.school_name}"?`)) return;

    try {
      const res = await apiFetch<{ message: string }>(`/api/admin/sekolah/${s.id_school}`, {
        method: "DELETE"
      });
      setFlash({ type: "success", text: res.message });
      await muat();
    } catch (err) {
      setFlash({
        type: "error",
        text: err instanceof ApiError ? err.message : "Gagal menghapus sekolah."
      });
    }
  }

  return (
    <>
      {flash && <Alert type={flash.type}>{flash.text}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="card">
        <div className="card-head">
          <h2>Daftar Sekolah</h2>
          <div className="btn-group">
            <input
              className="btn btn-outline btn-sm"
              style={{ minWidth: 190, textAlign: "left" }}
              placeholder="Cari nama / email..."
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
            <select
              className="btn btn-outline btn-sm"
              value={status}
              onChange={(e) => {
                setPage(1);
                setStatus(e.target.value);
              }}
            >
              <option value="semua">Semua status</option>
              <option value="aktif">Aktif</option>
              <option value="nonaktif">Nonaktif</option>
            </select>
            <button className="btn btn-primary btn-sm" onClick={bukaTambah}>
              + Tambah Sekolah
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="card-body">
            <Skeleton rows={6} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <Empty>Tidak ada sekolah yang cocok dengan filter.</Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Sekolah</th>
                    <th>Kontak</th>
                    <th>Sesi</th>
                    <th>Status</th>
                    <th>Terdaftar</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((s) => (
                    <tr key={s.id_school}>
                      <td className="muted">{s.no}</td>
                      <td>
                        <div className="cell-title">{s.school_name}</div>
                        <div className="cell-sub">{s.alamat || "Alamat belum diisi"}</div>
                      </td>
                      <td>
                        <div>{s.email}</div>
                        <div className="cell-sub">{s.kontak_telepon || "-"}</div>
                      </td>
                      <td>{s.total_sesi}</td>
                      <td>
                        {Number(s.status_aktif) === 1 ? (
                          <Badge tone="green">Aktif</Badge>
                        ) : (
                          <Badge tone="grey">Nonaktif</Badge>
                        )}
                      </td>
                      <td className="muted">{formatTanggal(s.created_at)}</td>
                      <td>
                        <div className="btn-group">
                          <button className="btn btn-outline btn-sm" onClick={() => bukaEdit(s)}>
                            Edit
                          </button>
                          <button className="btn btn-outline btn-sm" onClick={() => toggle(s)}>
                            {Number(s.status_aktif) === 1 ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => hapus(s)}>
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              from={data.from}
              to={data.to}
              total={data.total}
              onChange={setPage}
            />
          </>
        )}
      </div>

      <Modal
        open={formOpen}
        title={form.id_school ? "Edit Sekolah" : "Tambah Sekolah"}
        onClose={() => setFormOpen(false)}
      >
        <form onSubmit={simpan}>
          {formError && <Alert type="error">{formError}</Alert>}

          <div className="field">
            <label htmlFor="school_name">Nama Sekolah</label>
            <input
              id="school_name"
              value={form.school_name}
              onChange={(e) => setForm({ ...form, school_name: e.target.value })}
              required
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="kontak_telepon">Kontak Telepon</label>
              <input
                id="kontak_telepon"
                value={form.kontak_telepon}
                onChange={(e) => setForm({ ...form, kontak_telepon: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="password">
              Password {form.id_school ? "(kosongkan bila tidak diubah)" : ""}
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={form.id_school ? "••••••" : "Minimal 6 karakter"}
              required={!form.id_school}
            />
          </div>

          <div className="field">
            <label htmlFor="alamat">Alamat</label>
            <textarea
              id="alamat"
              value={form.alamat}
              onChange={(e) => setForm({ ...form, alamat: e.target.value })}
            />
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.status_aktif}
              onChange={(e) => setForm({ ...form, status_aktif: e.target.checked })}
            />
            Sekolah aktif
          </label>

          <div className="btn-group" style={{ marginTop: 18, justifyContent: "flex-end" }}>
            <button type="button" className="btn btn-outline" onClick={() => setFormOpen(false)}>
              Batal
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

