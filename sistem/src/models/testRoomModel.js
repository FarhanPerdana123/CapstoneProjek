/**
 * Model ruang tes (sesi PIN untuk siswa masuk tes).
 * Tabel: `test_rooms`
 *
 * Kolom penting:
 *   id (AUTO_INCREMENT), schoolId, pinCode (6 karakter unik, UPPERCASE),
 *   level (SD/SMP), status (active | closed), createdAt
 */

const { db } = require("../database/db");

/** Karakter yang digunakan untuk generate PIN. */
const PIN_CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const PIN_LENGTH = 6;

class TestRoomModel {
  /** Cari ruang tes berdasarkan ID. */
  static async findById(id) {
    if (!id) return null;
    return db.get("SELECT * FROM test_rooms WHERE id = ?", [id]);
  }

  /** Cari ruang tes berdasarkan PIN (case-insensitive → disimpan uppercase). */
  static async findByPin(pinCode) {
    if (!pinCode) return null;
    return db.get(
      "SELECT * FROM test_rooms WHERE pinCode = ?",
      [pinCode.toUpperCase()]
    );
  }

  /** Ambil semua ruang tes milik sekolah tertentu, diurutkan terbaru. */
  static async findBySchoolId(schoolId) {
    if (!schoolId) return [];
    return db.all(
      "SELECT * FROM test_rooms WHERE schoolId = ? ORDER BY createdAt DESC",
      [schoolId]
    );
  }

  /**
   * Buat ruang tes baru.
   * @param {{ schoolId, pinCode, level }} roomData
   * @throws {Error} Jika PIN sudah digunakan
   */
  static async create(roomData) {
    const { schoolId, pinCode, level } = roomData;
    const upperPin = pinCode.toUpperCase();

    // Verifikasi keunikan PIN (double-check sebelum insert)
    const existing = await this.findByPin(upperPin);
    if (existing) {
      throw new Error(`PIN "${upperPin}" sudah digunakan. Coba generate PIN baru.`);
    }

    const result = await db.run(
      `INSERT INTO test_rooms (schoolId, pinCode, level, status)
       VALUES (?, ?, ?, 'active')`,
      [schoolId, upperPin, level]
    );

    return this.findById(result.insertId);
  }

  /** Tutup ruang tes (ubah status menjadi 'closed'). */
  static async close(id) {
    await db.run("UPDATE test_rooms SET status = 'closed' WHERE id = ?", [id]);
    return this.findById(id);
  }

  /** Perbarui status ruang tes secara manual. */
  static async updateStatus(id, status) {
    await db.run("UPDATE test_rooms SET status = ? WHERE id = ?", [status, id]);
    return this.findById(id);
  }

  /**
   * Generate PIN acak sepanjang 6 karakter (A-Z dan 0-9).
   * PIN yang dihasilkan belum tentu unik — caller bertanggung jawab
   * untuk memeriksa ketersediaan dengan `findByPin()`.
   * @returns {string}
   */
  static generateRandomPin() {
    let pin = "";
    for (let i = 0; i < PIN_LENGTH; i++) {
      pin += PIN_CHARSET.charAt(Math.floor(Math.random() * PIN_CHARSET.length));
    }
    return pin;
  }
}

module.exports = TestRoomModel;
