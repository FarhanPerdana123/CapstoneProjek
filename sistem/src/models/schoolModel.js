/**
 * School Model
 * 
 * Mengelola data sekolah pada tabel 'schools'.
 * Digunakan oleh superadmin untuk mengelola data sekolah dan admin_sekolah.
 */

const { db } = require("../database/db");
const crypto = require("crypto");

class SchoolModel {
  /**
   * Mencari sekolah berdasarkan ID
   */
  static async findById(id) {
    if (!id) return null;
    return await db.get("SELECT * FROM schools WHERE id = ?", [id]);
  }

  /**
   * Mendapatkan semua sekolah
   */
  static async findAll() {
    return await db.all("SELECT * FROM schools ORDER BY schoolName ASC");
  }

  /**
   * Membuat sekolah baru
   */
  static async create(schoolData) {
    const { schoolName, address } = schoolData;

    const result = await db.run(
      "INSERT INTO schools (schoolName, address) VALUES (?, ?)",
      [schoolName, address || ""]
    );

    return this.findById(result.insertId);
  }

  /**
   * Update sekolah
   */
  static async update(id, schoolData) {
    const { schoolName, address } = schoolData;
    await db.run(
      "UPDATE schools SET schoolName = ?, address = ? WHERE id = ?",
      [schoolName, address || "", id]
    );
    return this.findById(id);
  }

  /**
   * Hapus sekolah (cascade delete related admin_sekolah users)
   */
  static async delete(id) {
    await db.run("DELETE FROM schools WHERE id = ?", [id]);
  }
}

module.exports = SchoolModel;
