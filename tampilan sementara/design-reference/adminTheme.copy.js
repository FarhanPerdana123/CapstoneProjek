/**
 * Tema & konstanta Panel Super Admin "Skrining ABK".
 * Warna dipakai oleh EJS (server) maupun CSS custom (client).
 */
const WARNA_KATEGORI = {
  hijau: { key: "hijau", label: "Hijau", hex: "#16A34A", soft: "#DCFCE7" },
  biru: { key: "biru", label: "Biru", hex: "#2563EB", soft: "#DBEAFE" },
  jingga: { key: "jingga", label: "Jingga", hex: "#F59E0B", soft: "#FEF3C7" },
  merah: { key: "merah", label: "Merah", hex: "#DC2626", soft: "#FEE2E2" },
  ungu: { key: "ungu", label: "Ungu", hex: "#7C3AED", soft: "#EDE9FE" },
  toska: { key: "toska", label: "Toska", hex: "#0D9488", soft: "#CCFBF1" }
};

// Urutan pilihan warna pada modal rentang penilaian
const PILIHAN_WARNA = ["hijau", "biru", "jingga", "merah", "ungu", "toska"];

// Palet warna teks/progress bar untuk daftar kategori asesmen
const PALET_KATEGORI = ["#2563EB", "#16A34A", "#F59E0B", "#0F172A", "#7C3AED", "#0D9488"];

const MENU_ADMIN = [
  { key: "dashboard", label: "Dashboard", icon: "bi-grid-1x2", href: "/admin/dashboard" },
  { key: "sekolah", label: "Kelola Sekolah", icon: "bi-buildings", href: "/admin/kelola-sekolah" },
  { key: "tes", label: "Tes Skrining", icon: "bi-ui-checks-grid", href: "/admin/tes-skrining" },
  { key: "pengaturan", label: "Pengaturan", icon: "bi-gear", href: "/admin/pengaturan" }
];

function ambilWarna(key, fallback = "biru") {
  const normalized = String(key || "").toLowerCase().trim();
  return WARNA_KATEGORI[normalized] || WARNA_KATEGORI[fallback] || WARNA_KATEGORI.biru;
}

function warnaKategoriByIndex(index) {
  return PALET_KATEGORI[index % PALET_KATEGORI.length];
}

module.exports = {
  WARNA_KATEGORI,
  PILIHAN_WARNA,
  PALET_KATEGORI,
  MENU_ADMIN,
  ambilWarna,
  warnaKategoriByIndex
};
