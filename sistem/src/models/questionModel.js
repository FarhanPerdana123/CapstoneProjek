/**
 * Model soal (bank pertanyaan tes skrining kognitif).
 * Tabel: `questions`
 *
 * Kolom penting:
 *   id, questionCode, level (SD/SMP), categoryKey, category,
 *   difficulty (EASY/MEDIUM/HARD), questionText, optionsJson,
 *   correctAnswer, explanation, scoreWeight, createdAt, updatedAt
 */

const { db } = require("../database/db");
const { COGNITIVE_CATEGORIES, LEVELS } = require("../config/constants");

class QuestionModel {
  /**
   * Ubah baris database menjadi objek JavaScript yang siap dikonsumsi API.
   * Parsing `optionsJson` dari string JSON ke array.
   * @param {object|null} row
   * @returns {object|null}
   */
  static formatRow(row) {
    if (!row) return null;

    let parsedOptions = [];
    try {
      parsedOptions =
        typeof row.optionsJson === "string"
          ? JSON.parse(row.optionsJson)
          : row.options || [];
    } catch {
      parsedOptions = [];
    }

    return {
      id: row.id,
      questionCode: row.questionCode,
      level: row.level,
      categoryKey: row.categoryKey,
      category: row.category,
      difficulty: row.difficulty,
      questionText: row.questionText,
      options: parsedOptions,
      correctAnswer: row.correctAnswer,
      explanation: row.explanation || "",
      scoreWeight: row.scoreWeight || 1,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Ambil semua soal dengan filter opsional.
   * @param {{ level?, categoryKey?, difficulty?, search? }} filters
   * @returns {object[]}
   */
  static async getAll(filters = {}) {
    let query = "SELECT * FROM questions WHERE 1=1";
    const params = [];

    if (filters.level) {
      query += " AND level = ?";
      params.push(filters.level.toUpperCase().trim());
    }
    if (filters.categoryKey) {
      query += " AND categoryKey = ?";
      params.push(filters.categoryKey.toUpperCase().trim());
    }
    if (filters.difficulty) {
      query += " AND difficulty = ?";
      params.push(filters.difficulty.toUpperCase().trim());
    }
    if (filters.search) {
      query += " AND (questionText LIKE ? OR questionCode LIKE ? OR category LIKE ?)";
      const term = `%${filters.search.trim()}%`;
      params.push(term, term, term);
    }

    query += " ORDER BY level ASC, id ASC";

    const rows = await db.all(query, params);
    return rows.map(this.formatRow);
  }

  /** Ambil satu soal berdasarkan ID. */
  static async getById(id) {
    const row = await db.get("SELECT * FROM questions WHERE id = ?", [id]);
    return this.formatRow(row);
  }

  /** Ambil satu soal berdasarkan kode uniknya. */
  static async getByCode(questionCode) {
    if (!questionCode) return null;
    const row = await db.get(
      "SELECT * FROM questions WHERE questionCode = ?",
      [questionCode.trim()]
    );
    return this.formatRow(row);
  }

  /**
   * Dapatkan prefix kode soal berdasarkan kategori kognitif.
   * Contoh: LOGICAL → "LOG", SPATIAL → "SPA"
   */
  static getCategoryCodePrefix(categoryKey) {
    const key = (categoryKey || "").toUpperCase().trim();
    if (COGNITIVE_CATEGORIES[key]) {
      return COGNITIVE_CATEGORIES[key].prefix;
    }
    return key.length >= 3 ? key.slice(0, 3) : "GEN";
  }

  /**
   * Generate kode soal berikutnya secara otomatis.
   * Format: `{LEVEL}-{PREFIX}-{nomor_urut_2digit}` (contoh: "SD-LOG-05")
   */
  static async getNextQuestionCode(level = LEVELS.SD, categoryKey = "LOGICAL") {
    const jenjang = String(level).toUpperCase().trim() === LEVELS.SMP ? LEVELS.SMP : LEVELS.SD;
    const catCode = this.getCategoryCodePrefix(categoryKey);
    const prefix = `${jenjang}-${catCode}-`;

    const rows = await db.all(
      "SELECT questionCode FROM questions WHERE questionCode LIKE ? ORDER BY questionCode ASC",
      [`${prefix}%`]
    );

    let maxNum = 0;
    const existingNums = new Set();

    for (const r of rows) {
      if (!r.questionCode) continue;
      const match = r.questionCode.match(/(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num)) {
          existingNums.add(num);
          if (num > maxNum) maxNum = num;
        }
      }
    }

    // Cari nomor berikutnya yang belum dipakai
    let nextNum = maxNum + 1;
    while (existingNums.has(nextNum)) nextNum++;

    return `${prefix}${String(nextNum).padStart(2, "0")}`;
  }

  /**
   * Ambil semua soal aktif sesuai jenjang untuk keperluan pelaksanaan tes.
   * Soal yang dinonaktifkan tidak disertakan.
   */
  static async getByLevelForTest(level = LEVELS.SD) {
    const jenjang = String(level).toUpperCase().trim() === LEVELS.SMP ? LEVELS.SMP : LEVELS.SD;
    const rows = await db.all(
      "SELECT * FROM questions WHERE level = ? ORDER BY id ASC",
      [jenjang]
    );
    return rows.map(this.formatRow);
  }

  /** Buat soal baru. */
  static async create(data) {
    const now = new Date().toISOString();
    const optionsJson = JSON.stringify(data.options || []);

    const result = await db.run(
      `INSERT INTO questions
       (questionCode, level, categoryKey, category, difficulty, questionText,
        optionsJson, correctAnswer, explanation, scoreWeight, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.questionCode.trim(),
        data.level.toUpperCase().trim(),
        data.categoryKey.toUpperCase().trim(),
        data.category.trim(),
        data.difficulty.toUpperCase().trim(),
        data.questionText.trim(),
        optionsJson,
        data.correctAnswer.toUpperCase().trim(),
        (data.explanation || "").trim(),
        data.scoreWeight || 1,
        now,
        now
      ]
    );

    return this.getById(result.lastID);
  }

  /** Perbarui soal yang sudah ada. Field yang tidak dikirim tetap menggunakan nilai lama. */
  static async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();

    await db.run(
      `UPDATE questions
       SET questionCode = ?, level = ?, categoryKey = ?, category = ?,
           difficulty = ?, questionText = ?, optionsJson = ?,
           correctAnswer = ?, explanation = ?, scoreWeight = ?, updatedAt = ?
       WHERE id = ?`,
      [
        data.questionCode ? data.questionCode.trim() : existing.questionCode,
        data.level ? data.level.toUpperCase().trim() : existing.level,
        data.categoryKey ? data.categoryKey.toUpperCase().trim() : existing.categoryKey,
        data.category ? data.category.trim() : existing.category,
        data.difficulty ? data.difficulty.toUpperCase().trim() : existing.difficulty,
        data.questionText ? data.questionText.trim() : existing.questionText,
        data.options ? JSON.stringify(data.options) : JSON.stringify(existing.options),
        data.correctAnswer ? data.correctAnswer.toUpperCase().trim() : existing.correctAnswer,
        data.explanation !== undefined ? data.explanation.trim() : existing.explanation,
        data.scoreWeight !== undefined ? Number(data.scoreWeight) : existing.scoreWeight,
        now,
        id
      ]
    );

    return this.getById(id);
  }

  /** Hapus soal secara permanen (hard delete). */
  static async delete(id) {
    const existing = await this.getById(id);
    if (!existing) return false;

    await db.run("DELETE FROM questions WHERE id = ?", [id]);
    return true;
  }

  /** Hitung jumlah total soal di bank soal. */
  static async count() {
    const res = await db.get("SELECT COUNT(*) as count FROM questions");
    return res ? res.count : 0;
  }
}

module.exports = QuestionModel;
