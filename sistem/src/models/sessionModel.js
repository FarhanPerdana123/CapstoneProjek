/**
 * Model sesi tes skrining kognitif.
 * Tabel: `screening_sessions`
 *
 * Kolom penting:
 *   sessionId (AUTO_INCREMENT), userId, roomId, level (SD/SMP),
 *   studentName, studentAge, studentGrade, studentSchool,
 *   status (IN_PROGRESS | COMPLETED), startedAt, completedAt,
 *   answersJson (JSON), resultJson (JSON)
 */

const { db } = require("../database/db");
const { LEVELS } = require("../config/constants");

class SessionModel {
  /**
   * Ubah baris database menjadi objek sesi yang siap dikonsumsi API.
   * `answersJson` dan `resultJson` diparse dari string ke objek JavaScript.
   * @param {object|null} row
   * @returns {object|null}
   */
  static formatRow(row) {
    if (!row) return null;

    let answers = [];
    let result = null;

    try {
      answers = row.answersJson ? JSON.parse(row.answersJson) : [];
    } catch {
      answers = [];
    }

    try {
      result = row.resultJson ? JSON.parse(row.resultJson) : null;
    } catch {
      result = null;
    }

    return {
      sessionId: row.sessionId,
      userId: row.userId,
      level: row.level,
      student: {
        name: row.studentName,
        age: row.studentAge,
        grade: row.studentGrade,
        school: row.studentSchool,
        level: row.level
      },
      status: row.status,
      startedAt: row.startedAt,
      completedAt: row.completedAt,
      answers,
      result
    };
  }

  /** Cari sesi berdasarkan ID. Mengembalikan null jika tidak ada. */
  static async findById(sessionId) {
    if (!sessionId) return null;
    const row = await db.get(
      "SELECT * FROM screening_sessions WHERE sessionId = ?",
      [sessionId]
    );
    return this.formatRow(row);
  }

  /**
   * Simpan sesi (INSERT baru atau UPDATE yang sudah ada).
   * Jika `session.sessionId` ada dan terdapat di database, baris akan di-UPDATE.
   * Jika tidak ada, baris baru akan di-INSERT dan `session.sessionId` diperbarui.
   * @returns {object} Sesi yang sudah tersimpan
   */
  static async save(session) {
    const existing = session.sessionId
      ? await db.get(
          "SELECT sessionId FROM screening_sessions WHERE sessionId = ?",
          [session.sessionId]
        )
      : null;

    const answersJson = JSON.stringify(session.answers || []);
    const resultJson = session.result ? JSON.stringify(session.result) : null;
    const student = session.student || {};

    if (existing) {
      await db.run(
        `UPDATE screening_sessions
         SET userId = ?, roomId = ?, level = ?,
             studentName = ?, studentAge = ?, studentGrade = ?, studentSchool = ?,
             status = ?, completedAt = ?, answersJson = ?, resultJson = ?
         WHERE sessionId = ?`,
        [
          session.userId || "GUEST",
          session.roomId || null,
          session.level || LEVELS.SD,
          student.name || "-",
          student.age || "-",
          student.grade || "-",
          student.school || "-",
          session.status || "IN_PROGRESS",
          session.completedAt || null,
          answersJson,
          resultJson,
          session.sessionId
        ]
      );
    } else {
      const result = await db.run(
        `INSERT INTO screening_sessions
         (userId, roomId, level, studentName, studentAge, studentGrade, studentSchool,
          status, completedAt, answersJson, resultJson)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.userId || "GUEST",
          session.roomId || null,
          session.level || LEVELS.SD,
          student.name || "-",
          student.age || "-",
          student.grade || "-",
          student.school || "-",
          session.status || "IN_PROGRESS",
          session.completedAt || null,
          answersJson,
          resultJson
        ]
      );
      session.sessionId = result.insertId;
    }

    return this.findById(session.sessionId);
  }

  /**
   * Ambil semua sesi yang sudah selesai (COMPLETED) milik user tertentu,
   * diurutkan dari yang terbaru.
   */
  static async findByUserId(userId) {
    if (!userId) return [];
    const rows = await db.all(
      `SELECT * FROM screening_sessions
       WHERE userId = ? AND status = 'COMPLETED'
       ORDER BY completedAt DESC`,
      [userId]
    );
    return rows.map(this.formatRow);
  }
}

module.exports = SessionModel;
