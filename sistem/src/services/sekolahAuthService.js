/**
 * Service Autentikasi Akun Sekolah (tabel `sekolah`).
 * Akun sekolah dibuatkan oleh Super Admin, bukan melalui registrasi mandiri.
 */

const { db } = require("../database/db");
const bcrypt = require("bcryptjs");

/**
 * Mencari data akun sekolah berdasarkan alamat email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findSekolahByEmail(email) {
  if (!email) return null;
  return db.get(
    "SELECT * FROM sekolah WHERE LOWER(email) = ? AND deleted_at IS NULL LIMIT 1",
    [String(email).trim().toLowerCase()]
  );
}

/**
 * Mengambil profil sekolah berdasarkan ID sekolah.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getSekolahById(id) {
  if (!id) return null;
  return db.get(
    "SELECT id_school, school_name, email, alamat, status_aktif, created_at FROM sekolah WHERE id_school = ? AND deleted_at IS NULL LIMIT 1",
    [id]
  );
}

/**
 * Memverifikasi kredensial login sekolah.
 *
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{dinonaktifkan: boolean, sekolah: object}|null>}
 * Mengembalikan null jika email tidak ditemukan atau password salah.
 * Mengembalikan status `{ dinonaktifkan: true, sekolah }` jika akun nonaktif.
 */
async function verifySekolah(email, password) {
  const sekolah = await findSekolahByEmail(email);
  if (!sekolah) return null;

  const stored = String(sekolah.password || "");
  let cocok = false;

  // Mendukung hash bcrypt maupun teks plain (untuk seed data awal)
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    cocok = await bcrypt.compare(String(password), stored);
  } else {
    cocok = stored === String(password);
  }

  if (!cocok) return null;
  if (!sekolah.status_aktif) return { dinonaktifkan: true, sekolah };

  return { dinonaktifkan: false, sekolah };
}

module.exports = {
  findSekolahByEmail,
  getSekolahById,
  verifySekolah
};
