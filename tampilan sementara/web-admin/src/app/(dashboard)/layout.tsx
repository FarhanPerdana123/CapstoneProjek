"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { MENU } from "@/lib/menu";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { admin, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Proteksi rute: belum login -> ke /login.
  useEffect(() => {
    if (!loading && !admin) router.replace("/login");
  }, [admin, loading, router]);

  if (loading) {
    return (
      <div className="login-wrap">
        <p className="muted">Memuat sesi...</p>
      </div>
    );
  }

  if (!admin) return null;

  const aktif = MENU.find((m) => pathname === m.href || pathname.startsWith(m.href + "/"));

  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? " open" : ""}`}>
        <div className="brand">
          <div className="brand-icon">SK</div>
          <div>
            <div className="brand-title">Skrining Kognitif</div>
            <div className="brand-sub">Panel Super Admin</div>
          </div>
        </div>

        <nav className="nav">
          <div className="nav-label">Menu Utama</div>
          {MENU.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`nav-item${aktif?.key === item.key ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="nav-icon" aria-hidden>
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div style={{ fontWeight: 600, color: "var(--ink)" }}>{admin.username}</div>
          <div>{admin.email}</div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <h1>{aktif?.label ?? "Dashboard"}</h1>
            <p className="topbar-sub">Sistem Skrining Kognitif Anak</p>
          </div>

          <div className="topbar-user">
            <div className="avatar">{admin.username.slice(0, 1).toUpperCase()}</div>
            <button className="btn btn-outline btn-sm" onClick={logout}>
              Keluar
            </button>
          </div>
        </header>

        <div className="content">{children}</div>
      </div>
    </div>
  );
}
