"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import type { TesListData } from "@/lib/types";
import { Alert, Badge, Empty, Modal, Skeleton, Stat } from "@/components/ui";

type FormTes = {
  id_test: number;
  nama_tes: string;
  jenjang: string;
  deskripsi: string;
  status_aktif: boolean;
};

const FORM_KOSONG: FormTes = {
  id_test: 0,
  nama_tes: "",
  jenjang: "SD",
  deskripsi: "",
  status_aktif: true
};

export default function TesPage() {
  const [data, setData] = useState<TesListData | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormTes>(FORM_KOSONG);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      const res = await apiFetch<{ data: TesListData }>(`/api/admin/tes?${qs}`);
      setData(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat daftar tes.");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    muat();
  }, [muat]);

  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const res = await apiFetch<{ message: string }>("/api/admin/tes", {
        method: "POST",
        body: form
      });
      setFormOpen(false);
      setFlash({ type: "success", text: res.message });
      await muat();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Gagal menyimpan tes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {flash && <Alert type={flash.type}>{flash.text}</Alert>}
      {error && <Alert type="error">{error}</Alert>}

      <div className="grid-stats">
        <Stat label="Total Tes" value={data?.total ?? 0} />
        <Stat label="Tes Aktif" value={data?.aktif ?? 0} />
        <Stat label="Total Soal" value={data?.totalSoal ?? 0} />
        <Stat label="Jenjang" value={data?.jenjang ?? 0} />
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Tes Skrining</h2>
          <div className="btn-group">
            <input
              className="btn btn-outline btn-sm"
              style={{ minWidth: 190, textAlign: "left" }}
              placeholder="Cari nama tes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                setForm(FORM_KOSONG);
                setFormError(null);
                setFormOpen(true);
              }}
            >
              + Tes Baru
            </button>
          </div>
        </div>

        {loading && !data ? (
          <div className="card-body">
            <Skeleton rows={5} />
          </div>
        ) : !data || data.items.length === 0 ? (
          <Empty>Belum ada tes skrining.</Empty>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Nama Tes</th>
                  <th>Jenjang</th>
                  <th>Soal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((t) => (
                  <tr key={t.id_test}>
                    <td>
                      <div className="cell-title">{t.nama_tes}</div>
                      <div className="cell-sub">{t.deskripsi || "Tanpa deskripsi"}</div>
                    </td>
                    <td>
                      <Badge tone="blue">{t.jenjang}</Badge>
                    </td>
                    <td>{t.jumlah_pertanyaan ?? 0}</td>
                    <td>
                      {Number(t.status_aktif) === 1 ? (
                        <Badge tone="green">Aktif</Badge>
                      ) : (
                        <Badge tone="grey">Nonaktif</Badge>
                      )}
                    </td>
                    <td>
                      <Link className="btn btn-outline btn-sm" href={`/tes/${t.id_test}`}>
                        Kelola
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={formOpen} title="Tes Skrining Baru" onClose={() => setFormOpen(false)}>
        <form onSubmit={simpan}>
          {formError && <Alert type="error">{formError}</Alert>}

          <div className="field">
            <label htmlFor="nama_tes">Nama Tes</label>
            <input
              id="nama_tes"
              value={form.nama_tes}
              onChange={(e) => setForm({ ...form, nama_tes: e.target.value })}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="jenjang">Jenjang</label>
            <select
              id="jenjang"
              value={form.jenjang}
              onChange={(e) => setForm({ ...form, jenjang: e.target.value })}
            >
              <option value="SD">SD</option>
              <option value="SMP">SMP</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="deskripsi">Deskripsi</label>
            <textarea
              id="deskripsi"
              value={form.deskripsi}
              onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
            />
          </div>

          <label className="checkbox">
            <input
              type="checkbox"
              checked={form.status_aktif}
              onChange={(e) => setForm({ ...form, status_aktif: e.target.checked })}
            />
            Tes aktif
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
