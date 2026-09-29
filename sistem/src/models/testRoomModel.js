/**
 * Test Room Model
 * 
 * Mengelola tabel 'test_rooms' - ruang tes dengan PIN unik (Kahoot-like).
 * Digunakan oleh admin_sekolah untuk membuat sesi tes baru.
 */

const { db } = require("../database/db");
const crypto = require("crypto");

class TestRoomModel {
  /**
   * Mencari test room berdasarkan ID
   */
  static async findById(id) {
    if (!id) return null;
    return await db.get("SELECT * FROM test_rooms WHERE id = ?", [id]);
  }

  /**
   * Mencari test room berdasarkan PIN code
   */
  static async findByPin(pinCode) {
    if (!pinCode) return null;
    return await db.get("SELECT * FROM test_rooms WHERE pinCode = ?", [pinCode.toUpperCase()]);
  }

  /**
   * Mendapatkan semua test rooms milik sekolah tertentu
   */
  static async findBySchoolId(schoolId) {
    if (!schoolId) return [];
    return await db.all(
      "SELECT * FROM test_rooms WHERE schoolId = ? ORDER BY createdAt DESC",
      [schoolId]
    );
  }

  /**
   * Membuat test room baru dengan PIN unik
   */
  static async create(roomData) {
    const { schoolId, pinCode, level } = roomData;
    const upperPin = pinCode.toUpperCase();

    // Validasi PIN sudah unik (double-check)
    const existing = await this.findByPin(upperPin);
    if (existing) {
      throw new Error("PIN code sudah digunakan");
    }

    const result = await db.run(
      `INSERT INTO test_rooms (schoolId, pinCode, level, status)
       VALUES (?, ?, ?, ?)`,
      [schoolId, upperPin, level, "active"]
    );

    return this.findById(result.insertId);
  }

  /**
   * Tutup test room (status menjadi closed)
   */
  static async close(id) {
    await db.run("UPDATE test_rooms SET status = 'closed' WHERE id = ?", [id]);
    return this.findById(id);
  }

  /**
   * Ubah status test room
   */
  static async updateStatus(id, status) {
    await db.run("UPDATE test_rooms SET status = ? WHERE id = ?", [status, id]);
    return this.findById(id);
  }

  /**
   * Generate PIN unik random (6 karakter alphanumeric)
   */
  static generateRandomPin() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let pin = "";
    for (let i = 0; i < 6; i++) {
      pin += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pin;
  }
}

module.exports = TestRoomModel;
