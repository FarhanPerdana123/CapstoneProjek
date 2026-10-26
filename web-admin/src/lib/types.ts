/** Tipe data bersama untuk seluruh halaman admin. */

export type Admin = {
  id: number;
  username: string;
  email: string;
  createdAt?: string;
};

export type Stats = {
  totalSekolah: number;
  sekolahAktif: number;
  sesiAktif: number;
  totalSiswa: number;
  totalTes?: number;
};

export type Aktivitas = {
  aktivitas: string;
  detail: string;
  tanggal: string;
  tanggal_format?: string;
  status: string;
  ikon: string;
};

export type Sekolah = {
  id_school: number;
  school_name: string;
  email: string;
  alamat: string | null;
  kontak_telepon: string | null;
  status_aktif: number;
  created_at: string;
  updated_at: string;
  total_sesi: number;
  tanggal_format: string;
  /** Nomor urut baris yang dihitung backend. */
  no: number;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
  from: number;
  to: number;
};

export type Tes = {
  id_test: number;
  nama_tes: string;
  jenjang: string;
  deskripsi: string | null;
  status_aktif: number;
  jumlah_pertanyaan?: number;
  created_at?: string;
};

export type Kategori = {
  id_kategori: number;
  nama_kategori: string;
  jumlah_soal: number;
  jumlah_aktif: number;
  persentase: number;
  warna_key: string;
  warna_label: string;
  warna: string;
};

export type Opsi = {
  id_jawaban?: number;
  label_opsi: string;
  teks_opsi: string;
  url_gambar?: string | null;
};

export type Pertanyaan = {
  id_pertanyaan: number;
  teks_pertanyaan: string;
  url_gambar: string | null;
  jawaban_benar: string;
  skor: number;
  status_aktif: number;
  kategori_id: number;
  nama_kategori?: string;
  opsi?: Opsi[];
};

export type PertanyaanDetail = {
  id_pertanyaan: number;
  kategori_id: number;
  teks_pertanyaan: string;
  url_gambar: string;
  jawaban_benar: string;
  skor: number;
  status_aktif: boolean;
  opsi: Record<"A" | "B" | "C" | "D", { teks: string; url_gambar: string }>;
};

export type Konfigurasi = {
  id_konfigurasiPenilaian: number;
  test_id: number;
  skor_min: number;
  skor_max: number;
  kategori_hasil: string;
  warna_key: string;
  warna_label: string;
  warna_hex: string;
  warna_soft: string;
  deskripsi: string | null;
  rekomendasi: string | null;
};

export type Warna = {
  key: string;
  label: string;
  hex: string;
  soft: string;
};

export type MenuItem = {
  key: string;
  label: string;
  icon: string;
  href: string;
};

export type DashboardData = {
  stats: Stats;
  aktivitas: Paginated<Aktivitas>;
  menu: MenuItem[];
};

export type TesListData = {
  items: Tes[];
  total: number;
  aktif: number;
  totalSoal: number;
  jenjang: number;
};

export type TesDetailData = {
  test: Tes;
  tab: string;
  kategori: Kategori[];
  pertanyaan: Paginated<Pertanyaan>;
  konfigurasi: Konfigurasi[];
  semuaKategori: { id_kategori: number; nama_kategori: string }[];
  filter: { kategori: string };
  warnaPilihan: Warna[];
};

export type PengaturanData = {
  profil: Admin;
  info: { totalSekolah: number; totalTes: number };
};
