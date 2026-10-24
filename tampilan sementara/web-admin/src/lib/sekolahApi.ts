"use client";

/**
 * Klien API khusus akun sekolah.
 * Token disimpan di localStorage terpisah dari sesi Super Admin
 * agar kedua jenis sesi tidak saling menimpa.
 */
import { API_BASE, ApiError, apiFetch } from "@/lib/api";
import type { SekolahAkun, SekolahLoginResponse } from "@/lib/sekolahAuth";

export const SEKOLAH_TOKEN_KEY = "skrining.sekolah.token";
export const SEKOLAH_PROFILE_KEY = "skrining.sekolah.profile";

export function getSekolahToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SEKOLAH_TOKEN_KEY);
}

export function setSekolahToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEKOLAH_TOKEN_KEY, token);
}

export function getSekolahProfile(): SekolahAkun | null {
  if (typeof window === "undefined") return null;
  const cached = window.localStorage.getItem(SEKOLAH_PROFILE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as SekolahAkun;
  } catch {
    return null;
  }
}

export function setSekolahProfile(profil: SekolahAkun) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SEKOLAH_PROFILE_KEY, JSON.stringify(profil));
}

export function clearSekolahSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SEKOLAH_TOKEN_KEY);
  window.localStorage.removeItem(SEKOLAH_PROFILE_KEY);
}

type Options = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
};

export async function sekolahApiFetch<T>(
  path: string,
  options: Options = {}
): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getSekolahToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store"
    });
  } catch {
    throw new ApiError(
      `Tidak dapat terhubung ke server API (${API_BASE}). Pastikan backend Node sudah berjalan.`,
      0
    );
  }

  let payload: any = null;
  const text = await res.text();
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = { message: text };
    }
  }

  if (!res.ok || payload?.success === false) {
    const message =
      payload?.message || payload?.error || `Permintaan gagal (HTTP ${res.status}).`;
    if (res.status === 401) clearSekolahSession();
    throw new ApiError(message, res.status);
  }

  return payload as T;
}

/** Login akun sekolah via endpoint terpadu /api/admin/login. */
export async function loginSekolah(
  email: string,
  password: string
): Promise<SekolahAkun> {
  const res = await apiFetch<{
    data: {
      role: "super_admin" | "sekolah";
      token: string;
      sekolah?: SekolahAkun;
    };
  }>("/api/admin/login", {
    method: "POST",
    auth: false,
    body: { email, password }
  });

  if (res.data.role !== "sekolah" || !res.data.sekolah) {
    throw new ApiError("Akun ini bukan akun sekolah.", 0);
  }

  setSekolahToken(res.data.token);
  setSekolahProfile(res.data.sekolah);
  return res.data.sekolah;
}

/** Ambil profil sekolah dari server (untuk memvalidasi sesi). */
export async function meSekolah(): Promise<SekolahAkun> {
  const res = await sekolahApiFetch<{ data: SekolahAkun }>("/api/sekolah/me");
  setSekolahProfile(res.data);
  return res.data;
}
