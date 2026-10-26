"use client";

/** Komponen kecil yang dipakai lintas halaman. */

export function Alert({ type, children }: { type: "success" | "error"; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className={`alert ${type}`} role={type === "error" ? "alert" : "status"}>
      {children}
    </div>
  );
}

export function Badge({ tone = "grey", children }: { tone?: "green" | "grey" | "amber" | "red" | "blue"; children: React.ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Skeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  from,
  to,
  total,
  onChange
}: {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="pagination">
      <span>
        Menampilkan {from}–{to} dari {total} data
      </span>

      <div className="pagination-controls">
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          Sebelumnya
        </button>
        <button
          className="btn btn-outline btn-sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15,23,42,0.45)",
        display: "grid",
        placeItems: "center",
        padding: 20,
        zIndex: 100
      }}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 560, maxHeight: "90vh", overflowY: "auto" }}
      >
        <div className="card-head">
          <h2>{title}</h2>
          <button className="btn btn-outline btn-sm" onClick={onClose} type="button">
            Tutup
          </button>
        </div>
        <div className="card-body">{children}</div>
        {footer && <div className="card-head" style={{ borderTop: "1px solid var(--line)", borderBottom: "none" }}>{footer}</div>}
      </div>
    </div>
  );
}
