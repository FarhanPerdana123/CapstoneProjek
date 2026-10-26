"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api";
import type { Pertanyaan, PertanyaanDetail, Konfigurasi, TesDetailData } from "@/lib/types";
import { Alert, Badge, Empty, Modal, Pagination, Skeleton } from "@/components/ui";

const TABS = [
  { key: "ringkasan", label: "Ringkasan" },
  { key: "pertanyaan", label: "Pertanyaan" },
  { key: "penilaian", label: "Penilaian" },
  { key: "interpretasi", label: "Interpretasi" }
] as const;

type TabKey = (typeof TABS)[number]["key"];

type FormPertanyaan = {
  id_pertanyaan: number;
  kategori_id: number;
  teks_pertanyaan: string;
  url_gambar: string;
  jawaban_benar: string;
  skor: number;
  status_aktif: boolean;
  opsi: Record<string, { teks: string; url_gambar: string }>;
};

type FormKonfigurasi = {
  id_konfigurasi: number;
  skor_min: number;
  skor_max: number;
  kategori_hasil: string;
  warna: string;
  deskripsi: string;
  rekomendasi: string;
};

const OPSI_KOSONG = {
  A: { teks: "", url_gambar: "" },
  B: { teks: "", url_gambar: "" },
  C: { teks: "", url_gambar: "" },
  D: { teks: "", url_gambar: "" }
};

export default function TesDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const testId = Number(params.id);

  const [data, setData] = useState<TesDetailData | null>(null);
  const [tab, setTab] = useState<TabKey>("ringkasan");
  const [kategori, setKategori] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [qOpen, setQOpen] = useState(false);
  const [qForm, setQForm] = useState<FormPertanyaan | null>(null);
  const [qError, setQError] = useState<string | null>(null);
  const [savingQ, setSavingQ] = useState(false);

  const [kOpen, setKOpen] = useState(false);
  const [kForm, setKForm] = useState<FormKonfigurasi | null>(null);
  const [kError, setKError] = useState<string | null>(null);
  const [savingK, setSavingK] = useState(false);

  const muat = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ tab, page: String(page) });
      if (kategori) qs.set("kategori", kategori);
      const res = await apiFetch<{ data: TesDetailData }>(`/api/admin/tes/${testId}?${qs}`);
      setData(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat detail tes.");
    } finally {
      setLoading(false);
    }
  }, [testId, tab, page, kategori]);

  useEffect(() => {
    if (Number.isFinite(testId)) muat();
  }, [muat, testId]);

  /* ----------------------------- Pertanyaan ---------------------------- */

  async function bukaPertanyaan(q?: Pertanyaan) {
    setQError(null);

    if (q) {
      try {
        const res = await apiFetch<{ data: PertanyaanDetail }>(
          `/api/admin/tes/${testId}/pertanyaan/${q.id_pertanyaan}`
        );
        setQForm({
          id_pertanyaan: res.data.id_pertanyaan,
          kategori_id: res.data.kategori_id,
          teks_pertanyaan: res.data.teks_pertanyaan,
          url_gambar: res.data.url_gambar,
          jawaban_benar: res.data.jawaban_benar,
          skor: Number(res.data.skor),
          status_aktif: res.data.status_aktif,
          opsi: { ...OPSI_KOSONG, ...res.data.opsi }
        });
      } catch (err) {
        setFlash({ type: "error", text: err instanceof ApiError ? err.message : "Gagal memuat pertanyaan." });
        return;
      }
    } else {
      setQForm({
        id_pertanyaan: 0,
        kategori_id: data?.semuaKategori[0]?.id_kategori ?? 0,
        teks_pertanyaan: "",
        url_gambar: "",
        jawaban_benar: "A",
        skor: 1,
        status_aktif: true,
        opsi: { ...OPSI_KOSONG }
      });
    }

    setQOpen(true);
  }

  async function simpanPertanyaan(e: React.FormEvent) {
    e.preventDefault();
    if (!qForm) return;

    setSavingQ(true);
    setQError(null);

    try {
      const body = {
        id_pertanyaan: qForm.id_pertanyaan,
        kategori_id: qForm.kategori_id,
        teks_pertanyaan: qForm.teks_pertanyaan,
        url_gambar: qForm.url_gambar,
        jawaban_benar: qForm.jawaban_benar,
        skor: qForm.skor,
        status_aktif: qForm.status_aktif,
        opsi_A: qForm.opsi.A.teks,
        opsi_A_gambar: qForm.opsi.A.url_gambar,
        opsi_B: qForm.opsi.B.teks,
        opsi_B_gambar: qForm.opsi.B.url_gambar,
        opsi_C: qForm.opsi.C.teks,
        opsi_C_gambar: qForm.opsi.C.url_gambar,
        opsi_D: qForm.opsi.D.teks,
        opsi_D_gambar: qForm.opsi.D.url_gambar
      };

      const res = await apiFetch<{ message: string }>(`/api/admin/tes/${testId}/pertanyaan`, {
        method: "POST",
        body
      });

      setQOpen(false);
      setFlash({ type: "success", text: res.message });
      await muat();
    } catch (err) {
      setQError(err instanceof ApiError ? err.message : "Gagal menyimpan pertanyaan.");
    } finally {
      setSavingQ(false);
    }
  }

  async function togglePertanyaan(q: Pertanyaan) {
    try {
      const res = await apiFetch<{ message: string }>(
        `/api/admin/tes/${testId}/pertanyaan/${q.id_pertanyaan}/toggle`,
        { method: "PATCH" }
      );
      setFlash({ type: "success", text: res.message });
      await muat();
    } catch (err) {
      setFlash({ type: "error", text: err instanceof ApiError ? err.message : "Gagal mengubah status." });
    }
  }

  async function hapusPertanyaan(q: Pertanyaan) {
    if (!window.confirm("Hapus pertanyaan ini?")) return;

    try {
      const res = await apiFetch<{ message: string }>(
        `/api/admin/tes/${testId}/pertanyaan/${q.id_pertanyaan}`,
        { method: "DELETE" }
      );
      setFlash({ type: "success", text: res.message });
      await muat();
    } catch (err) {
      setFlash({ type: "error", text: err instanceof ApiError ? err.message : "Gagal menghapus pertanyaan." });
    }
  }

  /* ---------------------------- Konfigurasi --------------------------- */

  async function bukaKonfigurasi(k?: Konfigurasi) {
    setKError(null);

    if (k) {
      setKForm({
        id_konfigurasi: k.id_konfigurasiPenilaian,
        skor_min: Number(k.skor_min),
        skor_max: Number(k.skor_max),
        kategori_hasil: k.kategori_hasil,
        warna: k.warna_key,
        deskripsi: k.deskripsi || "",
        rekomendasi: k.rekomendasi || ""
      });
    } else {
      setKForm({
        id_konfigurasi: 0,
        skor_min: 0,
        skor_max: 100,
        kategori_hasil: "",
        warna: "biru",
        deskripsi: "",
        rekomendasi: ""
      });
    }

    setKOpen(true);
  }

  async function simpanKonfigurasi(e: React.FormEvent) {
    e.preventDefault();
    if (!kForm) return;

    setSavingK(true);
    setKError(null);

    try {
      const res = await apiFetch<{ message: string }>(`/api/admin/tes/${testId}/konfigurasi`, {
        method: "POST",
        body: kForm
      });
      setKOpen(false);
      setFlash({ type: "success", text: res.message });
      await muat();
    } catch (err) {
      setKError(err instanceof ApiError ? err.message : "Gagal menyimpan rentang nilai.");
    } finally {
      setSavingK(false);
    }
  }

  async function hapusKonfigurasi(k: Konfigurasi) {
    if (!window.confirm(`Hapus rentang "${k.kategori_hasil}"?`)) return;

    try {
      const res = await apiFetch<{ message: string }>(
        `/api/admin/tes/${testId}/konfigurasi/${k.id_konfigurasiPenilaian}`,
        { method: "DELETE" }
      );
      setFlash({ type: "success", text: res.message });
      await muat();
    } catch (err) {
      setFlash({ type: "error", text: err instanceof ApiError ? err.message : "Gagal menghapus rentang." });
    }
  }

  /* -------------------------------- Render ----------------------------- */

  if (loading && !data) {
    return (
      <div className="card">
        <div className="card-body">
          <Skeleton rows={6} />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="card">
        <div className="card-body">
          <Alert type="error">{error}</Alert>
          <button className="btn btn-outline" style={{ marginTop: 12 }} onClick={() => router.push("/tes")}>
            Kembali ke daftar tes
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      {flash && <Alert type={flash.type}>{flash.text}</Alert>}

      <div className="card">
        <div className="card-head">
          <div>
            <h2>{data.test.nama_tes}</h2>
            <div className="cell-sub">
              Jenjang {data.test.jenjang} • {data.test.jumlah_pertanyaan ?? 0} soal
            </div>
          </div>
          <div className="btn-group">
            <Badge tone={Number(data.test.status_aktif) === 1 ? "green" : "grey"}>
              {Number(data.test.status_aktif) === 1 ? "Aktif" : "Nonaktif"}
            </Badge>
            <button className="btn btn-outline btn-sm" onClick={() => router.push("/tes")}>
              Kembali
            </button>
          </div>
        </div>

        <div className="card-body" style={{ paddingBottom: 0 }}>
          <div className="btn-group">
            {TABS.map((t) => (
              <button
                key={t.key}
                className={`btn btn-sm ${tab === t.key ? "btn-primary" : "btn-outline"}`}
                onClick={() => {
                  setTab(t.key);
                  setPage(1);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="card-body">
          {/* ----------------------------- Ringkasan ---------------------------- */}
          {tab === "ringkasan" && (
            <>
              {data.test.deskripsi && <p className="muted">{data.test.deskripsi}</p>}
              <div className="grid-stats">
                {data.kategori.map((k) => (
                  <div key={k.id_kategori} className="stat">
                    <div className="stat-label">{k.nama_kategori}</div>
                    <div className="stat-value">{k.jumlah_soal}</div>
                    <div className="stat-hint">
                      {k.jumlah_aktif} aktif • {k.persentase}% dari total
                    </div>
                  </div>
                ))}
              </div>
              {data.kategori.length === 0 && <Empty>Belum ada kategori asesmen pada tes ini.</Empty>}
            </>
          )}

          {/* ---------------------------- Pertanyaan ---------------------------- */}
          {tab === "pertanyaan" && (
            <>
              <div className="row-between" style={{ marginBottom: 14 }}>
                <select
                  className="btn btn-outline btn-sm"
                  value={kategori}
                  onChange={(e) => {
                    setPage(1);
                    setKategori(e.target.value);
                  }}
                >
                  <option value="">Semua kategori</option>
                  {data.semuaKategori.map((k) => (
                    <option key={k.id_kategori} value={k.id_kategori}>
                      {k.nama_kategori}
                    </option>
                  ))}
                </select>

                <button className="btn btn-primary btn-sm" onClick={() => bukaPertanyaan()}>
                  + Tambah Pertanyaan
                </button>
              </div>

              {data.pertanyaan.items.length === 0 ? (
                <Empty>Belum ada pertanyaan.</Empty>
              ) : (
                <>
                  <div className="table-wrap">
                    <table className="data">
                      <thead>
                        <tr>
                          <th>No</th>
                          <th>Pertanyaan</th>
                          <th>Kategori</th>
                          <th>Kunci</th>
                          <th>Skor</th>
                          <th>Status</th>
                          <th>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.pertanyaan.items.map((q, i) => (
                          <tr key={q.id_pertanyaan}>
                            <td className="muted">
                              {(data.pertanyaan.page - 1) * data.pertanyaan.perPage + i + 1}
                            </td>
                            <td>
                              <div className="cell-title">{q.teks_pertanyaan}</div>
                              <div className="cell-sub">{(q.opsi || []).length} pilihan jawaban</div>
                            </td>
                            <td className="muted">{q.nama_kategori || "-"}</td>
                            <td>
                              <Badge tone="blue">{q.jawaban_benar}</Badge>
                            </td>
                            <td>{q.skor}</td>
                            <td>
                              {Number(q.status_aktif) === 1 ? (
                                <Badge tone="green">Aktif</Badge>
                              ) : (
                                <Badge tone="grey">Nonaktif</Badge>
                              )}
                            </td>
                            <td>
                              <div className="btn-group">
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => bukaPertanyaan(q)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-outline btn-sm"
                                  onClick={() => togglePertanyaan(q)}
                                >
                                  {Number(q.status_aktif) === 1 ? "Matikan" : "Aktifkan"}
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => hapusPertanyaan(q)}
                                >
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
                    page={data.pertanyaan.page}
                    totalPages={data.pertanyaan.totalPages}
                    from={data.pertanyaan.from}
                    to={data.pertanyaan.to}
                    total={data.pertanyaan.total}
                    onChange={setPage}
                  />
                </>
              )}
            </>
          )}

          {/* ----------------------------- Penilaian ---------------------------- */}
          {tab === "penilaian" && (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Kategori Asesmen</th>
                    <th>Jumlah Soal</th>
                    <th>Soal Aktif</th>
                    <th>Porsi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.kategori.map((k) => (
                    <tr key={k.id_kategori}>
                      <td>
                        <span
                          style={{
                            display: "inline-block",
                            width: 9,
                            height: 9,
                            borderRadius: "50%",
                            background: k.warna,
                            marginRight: 8
                          }}
                        />
                        <span className="cell-title">{k.nama_kategori}</span>
                      </td>
                      <td>{k.jumlah_soal}</td>
                      <td>{k.jumlah_aktif}</td>
                      <td className="muted">{k.persentase}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ---------------------------- Interpretasi -------------------------- */}
          {tab === "interpretasi" && (
            <>
              <div className="row-between" style={{ marginBottom: 14 }}>
                <span className="muted" style={{ fontSize: "0.82rem" }}>
                  Rentang skor menentukan kategori hasil skrining.
                </span>
                <button className="btn btn-primary btn-sm" onClick={() => bukaKonfigurasi()}>
                  + Tambah Rentang
                </button>
              </div>

              {data.konfigurasi.length === 0 ? (
                <Empty>Belum ada rentang penilaian.</Empty>
              ) : (
                <div className="table-wrap">
                  <table className="data">
                    <thead>
                      <tr>
                        <th>Kategori Hasil</th>
                        <th>Rentang Skor</th>
                        <th>Deskripsi</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.konfigurasi.map((k) => (
                        <tr key={k.id_konfigurasiPenilaian}>
                          <td>
                            <span
                              className="badge"
                              style={{ background: k.warna_soft, color: k.warna_hex }}
                            >
                              {k.kategori_hasil}
                            </span>
                          </td>
                          <td>
                            {k.skor_min} – {k.skor_max}
                          </td>
                          <td className="muted">{k.deskripsi || "-"}</td>
                          <td>
                            <div className="btn-group">
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => bukaKonfigurasi(k)}
                              >
                                Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => hapusKonfigurasi(k)}
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* --------------------- Modal Pertanyaan --------------------- */}
      <Modal
        open={qOpen}
        title={qForm?.id_pertanyaan ? "Edit Pertanyaan" : "Tambah Pertanyaan"}
        onClose={() => setQOpen(false)}
      >
        {qForm && (
          <form onSubmit={simpanPertanyaan}>
            {qError && <Alert type="error">{qError}</Alert>}

            <div className="field">
              <label htmlFor="teks_pertanyaan">Teks Pertanyaan</label>
              <textarea
                id="teks_pertanyaan"
                value={qForm.teks_pertanyaan}
                onChange={(e) => setQForm({ ...qForm, teks_pertanyaan: e.target.value })}
                required
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="kategori_id">Kategori Asesmen</label>
                <select
                  id="kategori_id"
                  value={qForm.kategori_id}
                  onChange={(e) => setQForm({ ...qForm, kategori_id: Number(e.target.value) })}
                  required
                >
                  <option value={0}>Pilih kategori</option>
                  {data.semuaKategori.map((k) => (
                    <option key={k.id_kategori} value={k.id_kategori}>
                      {k.nama_kategori}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="skor">Skor</label>
                <input
                  id="skor"
                  type="number"
                  min={1}
                  value={qForm.skor}
                  onChange={(e) => setQForm({ ...qForm, skor: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="url_gambar">URL Gambar (opsional)</label>
              <input
                id="url_gambar"
                value={qForm.url_gambar}
                onChange={(e) => setQForm({ ...qForm, url_gambar: e.target.value })}
                placeholder="/uploads/..."
              />
            </div>

            <div className="field">
              <label>Pilihan Jawaban (minimal 2 terisi)</label>
              {(["A", "B", "C", "D"] as const).map((label) => (
                <div key={label} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <span
                    style={{
                      width: 34,
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 700,
                      color: "var(--muted)",
                      fontSize: "0.8rem"
                    }}
                  >
                    {label}
                  </span>
                  <input
                    style={{ flex: 1 }}
                    value={qForm.opsi[label]?.teks || ""}
                    onChange={(e) =>
                      setQForm({
                        ...qForm,
                        opsi: {
                          ...qForm.opsi,
                          [label]: { ...qForm.opsi[label], teks: e.target.value }
                        }
                      })
                    }
                  />
                </div>
              ))}
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="jawaban_benar">Kunci Jawaban</label>
                <select
                  id="jawaban_benar"
                  value={qForm.jawaban_benar}
                  onChange={(e) => setQForm({ ...qForm, jawaban_benar: e.target.value })}
                >
                  {(["A", "B", "C", "D"] as const).map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={qForm.status_aktif}
                onChange={(e) => setQForm({ ...qForm, status_aktif: e.target.checked })}
              />
              Pertanyaan aktif
            </label>

            <div className="btn-group" style={{ marginTop: 18, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" onClick={() => setQOpen(false)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingQ}>
                {savingQ ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* -------------------- Modal Konfigurasi -------------------- */}
      <Modal
        open={kOpen}
        title={kForm?.id_konfigurasi ? "Edit Rentang Nilai" : "Tambah Rentang Nilai"}
        onClose={() => setKOpen(false)}
      >
        {kForm && (
          <form onSubmit={simpanKonfigurasi}>
            {kError && <Alert type="error">{kError}</Alert>}

            <div className="field">
              <label htmlFor="kategori_hasil">Nama Kategori Hasil</label>
              <input
                id="kategori_hasil"
                value={kForm.kategori_hasil}
                onChange={(e) => setKForm({ ...kForm, kategori_hasil: e.target.value })}
                placeholder="Contoh: Perlu Pendampingan"
                required
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label htmlFor="skor_min">Skor Minimal</label>
                <input
                  id="skor_min"
                  type="number"
                  value={kForm.skor_min}
                  onChange={(e) => setKForm({ ...kForm, skor_min: Number(e.target.value) })}
                  required
                />
              </div>

              <div className="field">
                <label htmlFor="skor_max">Skor Maksimal</label>
                <input
                  id="skor_max"
                  type="number"
                  value={kForm.skor_max}
                  onChange={(e) => setKForm({ ...kForm, skor_max: Number(e.target.value) })}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="warna">Warna Kategori</label>
              <select
                id="warna"
                value={kForm.warna}
                onChange={(e) => setKForm({ ...kForm, warna: e.target.value })}
              >
                {data.warnaPilihan.map((w) => (
                  <option key={w.key} value={w.key}>
                    {w.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="deskripsi">Deskripsi</label>
              <textarea
                id="deskripsi"
                value={kForm.deskripsi}
                onChange={(e) => setKForm({ ...kForm, deskripsi: e.target.value })}
              />
            </div>

            <div className="field">
              <label htmlFor="rekomendasi">Rekomendasi</label>
              <textarea
                id="rekomendasi"
                value={kForm.rekomendasi}
                onChange={(e) => setKForm({ ...kForm, rekomendasi: e.target.value })}
              />
            </div>

            <div className="btn-group" style={{ marginTop: 18, justifyContent: "flex-end" }}>
              <button type="button" className="btn btn-outline" onClick={() => setKOpen(false)}>
                Batal
              </button>
              <button type="submit" className="btn btn-primary" disabled={savingK}>
                {savingK ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}




