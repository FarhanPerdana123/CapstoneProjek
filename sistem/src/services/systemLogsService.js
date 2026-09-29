/**
 * System Logs Service
 * 
 * Mengelola audit trail untuk perubahan sistem penting:
 * - Perubahan soal (CREATE, UPDATE, DELETE)
 * - Perubahan setting minimum score
 * - Perubahan akun admin
 */

const { db } = require("../database/db");
const crypto = require("crypto");

class SystemLogsService {
  /**
   * Log aksi ke system_logs
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
   * Ambil logs berdasarkan action tertentu
   */
  static async getLogsByAction(action, limit = 50) {
    return await db.all(
      `SELECT * FROM system_logs WHERE action = ? ORDER BY createdAt DESC LIMIT ?`,
      [action, limit]
    );
  }

  /**
   * Ambil semua logs
   */
  static async getAllLogs(limit = 100) {
    return await db.all(
      "SELECT * FROM system_logs ORDER BY createdAt DESC LIMIT ?",
      [limit]
    );
  }

  /**
   * Ambil logs untuk user tertentu
   */
  static async getLogsByUser(userId, limit = 50) {
    return await db.all(
      `SELECT * FROM system_logs WHERE userId = ? ORDER BY createdAt DESC LIMIT ?`,
      [userId, limit]
    );
  }
}

module.exports = SystemLogsService;
