/**
 * Session Model
 * 
 * Mengelola riwayat sesi skrining kognitif pada tabel 'screening_sessions'.
 * Menyimpan identitas siswa, status pengerjaan, jawaban, dan hasil scoring deterministik.
 */

const { db } = require("../database/db");
const { LEVELS } = require("../config/constants");

class SessionModel {
  /**
   * Format baris data SQLite menjadi objek sesi terstruktur
   * @param {Object} row 
   * @returns {Object|null}
   */
  static formatRow(row) {
    if (!row) return null;
    let answers = [];
    let result = null;

    try {
      answers = row.answersJson ? JSON.parse(row.answersJson) : [];
    } catch (e) {
      answers = [];
    }

    try {
      result = row.resultJson ? JSON.parse(row.resultJson) : null;
    } catch (e) {
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

  /**
   * Mencari sesi berdasarkan sessionId unik
   * @param {string} sessionId 
   * @returns {Promise<Object|null>}
   */
  static async findById(sessionId) {
    if (!sessionId) return null;
    const row = await db.get("SELECT * FROM screening_sessions WHERE sessionId = ?", [sessionId]);
    return this.formatRow(row);
  }

  /**
   * Menyimpan atau memperbarui data sesi skrining
   * @param {Object} session 
   * @returns {Promise<Object|null>}
   */
  static async save(session) {
    const existing = session.sessionId ? await db.get("SELECT sessionId FROM screening_sessions WHERE sessionId = ?", [session.sessionId]) : null;
    const answersJson = JSON.stringify(session.answers || []);
    const resultJson = session.result ? JSON.stringify(session.result) : null;
    const student = session.student || {};

    if (existing) {
      await db.run(
        `UPDATE screening_sessions 
         SET userId = ?, roomId = ?, level = ?, studentName = ?, studentAge = ?, studentGrade = ?, studentSchool = ?, status = ?, completedAt = ?, answersJson = ?, resultJson = ?
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
         (userId, roomId, level, studentName, studentAge, studentGrade, studentSchool, status, completedAt, answersJson, resultJson)
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
   * Mengambil semua riwayat sesi selesai berdasarkan userId
   * @param {string} userId 
   * @returns {Promise<Array<Object>>}
   */
  static async findByUserId(userId) {
    if (!userId) return [];
    const rows = await db.all(
      "SELECT * FROM screening_sessions WHERE userId = ? AND status = 'COMPLETED' ORDER BY completedAt DESC",
      [userId]
    );
    return rows.map(this.formatRow);
  }
}

module.exports = SessionModel;
