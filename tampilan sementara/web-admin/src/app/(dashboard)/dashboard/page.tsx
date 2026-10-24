"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import type { DashboardData } from "@/lib/types";
import { Alert, Badge, Empty, Pagination, Skeleton, Stat } from "@/components/ui";
import { formatTanggal } from "@/lib/format";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const muat = useCallback(async (halaman: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: DashboardData }>(`/api/admin/dashboard?page=${halaman}`);
      setData(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Gagal memuat dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    muat(page);
  }, [muat, page]);

  if (loading && !data) {
    return (
      <div className="card">
        <div className="card-body">
          <Skeleton rows={6} />
        </div>
      </div>
    );
  }

  return (
    <>
      {error && <Alert type="error">{error}</Alert>}

      <div className="grid-stats">
        <Stat label="Total Sekolah" value={data?.stats.totalSekolah ?? 0} hint="Terdaftar di platform" />
        <Stat label="Sekolah Aktif" value={data?.stats.sekolahAktif ?? 0} hint="Status aktif" />
        <Stat label="Sesi Aktif" value={data?.stats.sesiAktif ?? 0} hint="Sedang berlangsung" />
        <Stat label="Total Siswa" value={data?.stats.totalSiswa ?? 0} hint="Pernah mengikuti skrining" />
      </div>

      <div className="card">
        <div className="card-head">
          <h2>Aktivitas Platform</h2>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {data?.aktivitas.total ?? 0} aktivitas
          </span>
        </div>

        {!data || data.aktivitas.items.length === 0 ? (
          <Empty>Belum ada aktivitas tercatat.</Empty>
        ) : (
          <>
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Aktivitas</th>
                    <th>Detail</th>
                    <th>Tanggal</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.aktivitas.items.map((item, i) => (
                    <tr key={`${item.aktivitas}-${i}`}>
                      <td className="cell-title">{item.aktivitas}</td>
                      <td className="muted">{item.detail}</td>
                      <td className="muted">{formatTanggal(item.tanggal)}</td>
                      <td>
                        <Badge tone={item.status === "Baru" ? "green" : "blue"}>{item.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={data.aktivitas.page}
              totalPages={data.aktivitas.totalPages}
              from={data.aktivitas.from}
              to={data.aktivitas.to}
              total={data.aktivitas.total}
              onChange={setPage}
            />
          </>
        )}
      </div>
    </>
  );
}
