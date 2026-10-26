/**
 * Klien HTTP tipis untuk backend Express.
 * Semua request menyertakan JWT dari localStorage bila ada.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export const TOKEN_KEY = "skrining.admin.token";
export const ADMIN_KEY = "skrining.admin.profile";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(ADMIN_KEY);
}

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  auth?: boolean;
  raw?: boolean;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = true } = options;

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = getToken();
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
      payload?.message ||
      payload?.error ||
      `Permintaan gagal (HTTP ${res.status}).`;

    if (res.status === 401) clearSession();
    throw new ApiError(message, res.status);
  }

  return payload as T;
}

/** Unggah gambar (multipart) — tidak memakai JSON. */
export async function apiUpload(file: File): Promise<{ url: string }> {
  const token = getToken();
  const form = new FormData();
  form.append("gambar", file);

  const res = await fetch(`${API_BASE}/api/admin/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload?.success === false) {
    throw new ApiError(payload?.message || "Gagal mengunggah gambar.", res.status);
  }

  return payload.data;
}
