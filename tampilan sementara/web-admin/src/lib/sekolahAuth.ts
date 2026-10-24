/** Tipe data akun sekolah (dipakai halaman login & portal sekolah). */

export type SekolahAkun = {
  id: number;
  schoolName: string;
  email: string;
  alamat: string | null;
  createdAt?: string;
};

export type SekolahLoginResponse = {
  token: string;
  sekolah: SekolahAkun;
};
