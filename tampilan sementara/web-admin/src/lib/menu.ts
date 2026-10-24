import type { MenuItem } from "@/lib/types";

/** Menu sidebar — sepadan dengan MENU_ADMIN pada backend. */
export const MENU: (MenuItem & { icon: string })[] = [
  { key: "dashboard", label: "Dashboard", icon: "▦", href: "/dashboard" },
  { key: "sekolah", label: "Kelola Sekolah", icon: "▤", href: "/sekolah" },
  { key: "tes", label: "Tes Skrining", icon: "◫", href: "/tes" },
  { key: "pengaturan", label: "Pengaturan", icon: "⚙", href: "/pengaturan" }
];
