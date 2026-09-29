
const { db } = require("../database/db");
const crypto = require("crypto");

class TestRoomModel {
    static async findById(id) {
    if (!id) return null;
    return await db.get("SELECT * FROM test_rooms WHERE id = ?", [id]);
  }

    static async findByPin(pinCode) {
    if (!pinCode) return null;
    return await db.get("SELECT * FROM test_rooms WHERE pinCode = ?", [pinCode.toUpperCase()]);
  }

    static async findBySchoolId(schoolId) {
    if (!schoolId) return [];
    return await db.all(
      "SELECT * FROM test_rooms WHERE schoolId = ? ORDER BY createdAt DESC",
      [schoolId]
    );
  }

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

    static async close(id) {
    await db.run("UPDATE test_rooms SET status = 'closed' WHERE id = ?", [id]);
    return this.findById(id);
  }

    static async updateStatus(id, status) {
    await db.run("UPDATE test_rooms SET status = ? WHERE id = ?", [status, id]);
    return this.findById(id);
  }

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
