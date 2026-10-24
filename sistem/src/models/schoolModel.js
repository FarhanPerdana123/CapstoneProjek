/**
 * Model sekolah (tabel `schools`).
 *
 * CATATAN: Model ini beroperasi pada tabel `schools` (skema lama/users-based).
 * Manajemen sekolah melalui Panel Super Admin menggunakan tabel `sekolah`
 * (lihat adminService.js). Model ini dipakai oleh `settingsRoutes.js` saja.
 */

const { db } = require("../database/db");

class SchoolModel {
  /** Cari sekolah berdasarkan ID. */
  static async findById(id) {
    if (!id) return null;
    return db.get("SELECT * FROM schools WHERE id = ?", [id]);
  }

  /** Ambil semua sekolah, diurutkan berdasarkan nama. */
  static async findAll() {
    return db.all("SELECT * FROM schools ORDER BY schoolName ASC");
  }

  /** Buat data sekolah baru. */
  static async create(schoolData) {
    const { schoolName, address } = schoolData;
    const result = await db.run(
      "INSERT INTO schools (schoolName, address) VALUES (?, ?)",
      [schoolName, address || ""]
    );
    return this.findById(result.insertId);
  }

  /** Perbarui data sekolah. */
  static async update(id, schoolData) {
    const { schoolName, address } = schoolData;
    await db.run(
      "UPDATE schools SET schoolName = ?, address = ? WHERE id = ?",
      [schoolName, address || "", id]
    );
    return this.findById(id);
  }

  /** Hapus data sekolah secara permanen (hard delete). */
  static async delete(id) {
    await db.run("DELETE FROM schools WHERE id = ?", [id]);
  }
}

module.exports = SchoolModel;
