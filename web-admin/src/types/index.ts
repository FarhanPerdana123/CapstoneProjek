/**
 * Ekspor terpusat seluruh tipe data TypeScript untuk web-admin.
 *
 * Menggabungkan tipe domain dari `@/lib/types` sehingga dapat diimpor melalui:
 *   import type { Admin, Stats, Sekolah, Tes } from "@/types";
 *
 * Sekaligus mempertahankan backward-compatibility dengan import langsung:
 *   import type { ... } from "@/lib/types";
 */

export * from "@/lib/types";
