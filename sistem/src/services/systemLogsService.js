/**
 * Service Pencatatan & Riwayat Aktivitas Sistem (tabel `system_logs`).
 * Digunakan untuk audit log tindakan penting pengguna dan sistem.
 */

const { db } = require("../database/db");

class SystemLogsService {
  /**
   * Mencatat satu entri aksi ke log sistem.
   *
   * @param {string} action Nama aksi (contoh: "USER_LOGIN", "TEST_COMPLETED")
   * @param {string} description Detail deskripsi aktivitas
   * @param {number|null} [userId=null] ID pengguna yang melakukan aksi
   * @returns {Promise<void>}
   */
  static async logAction(action, description, userId = null) {
    try {
      await db.run(
        `INSERT INTO system_logs (action, description, userId)
         VALUES (?, ?, ?)`,
        [action, description, userId]
      );
    } catch (err) {
      console.error("Gagal mencatat system log:", err);
    }
  }

  /**
   * Mengambil riwayat log berdasarkan jenis aksi tertentu.
   *
   * @param {string} action
   * @param {number} [limit=50]
   * @returns {Promise<Array<object>>}
   */
  static async getLogsByAction(action, limit = 50) {
    return db.all(
      `SELECT * FROM system_logs WHERE action = ? ORDER BY createdAt DESC LIMIT ?`,
      [action, limit]
    );
  }

  /**
   * Mengambil semua log sistem terbaru.
   *
   * @param {number} [limit=100]
   * @returns {Promise<Array<object>>}
   */
  static async getAllLogs(limit = 100) {
    return db.all(
      "SELECT * FROM system_logs ORDER BY createdAt DESC LIMIT ?",
      [limit]
    );
  }

  /**
   * Mengambil riwayat log berdasarkan pengguna tertentu.
   *
   * @param {number} userId
   * @param {number} [limit=50]
   * @returns {Promise<Array<object>>}
   */
  static async getLogsByUser(userId, limit = 50) {
    return db.all(
      `SELECT * FROM system_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT ?`,
      [userId, limit]
    );
  }
}

module.exports = SystemLogsService;
