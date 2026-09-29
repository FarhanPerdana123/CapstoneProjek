/**
 * Question Model
 * 
 * Mengelola interaksi query tabel 'questions' pada SQLite.
 * Menyediakan operasi CRUD, filter level/kategori/kesulitan, dan generator kode soal otomatis.
 */

const { db } = require("../database/db");
const { COGNITIVE_CATEGORIES, LEVELS } = require("../config/constants");

class QuestionModel {
  /**
   * Format baris data mentah dari SQLite ke objek soal yang bersih
   * @param {Object} row 
   * @returns {Object|null}
   */
  static formatRow(row) {
    if (!row) return null;
    let parsedOptions = [];
    try {
      parsedOptions = typeof row.optionsJson === "string" ? JSON.parse(row.optionsJson) : (row.options || []);
    } catch (e) {
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
   * Mengambil daftar soal dengan opsi filtering
   * @param {Object} filters
   * @param {string} [filters.level] - 'SD' atau 'SMP'
   * @param {string} [filters.categoryKey] - 'LOGICAL', 'NUMERICAL', dll
   * @param {string} [filters.difficulty] - 'EASY', 'MEDIUM', 'HARD'
   * @param {string} [filters.search] - Kata kunci pencarian
   * @returns {Promise<Array<Object>>}
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

  /**
   * Mengambil 1 soal berdasarkan ID numerik
   * @param {number|string} id 
   * @returns {Promise<Object|null>}
   */
  static async getById(id) {
    const row = await db.get("SELECT * FROM questions WHERE id = ?", [id]);
    return this.formatRow(row);
  }

  /**
   * Mengambil 1 soal berdasarkan Kode Soal unik
   * @param {string} questionCode 
   * @returns {Promise<Object|null>}
   */
  static async getByCode(questionCode) {
    if (!questionCode) return null;
    const row = await db.get("SELECT * FROM questions WHERE questionCode = ?", [questionCode.trim()]);
    return this.formatRow(row);
  }

  /**
   * Mendapatkan singkatan prefix kode dimensi kognitif (misal: LOG, NUM, VRB, SPA)
   * @param {string} categoryKey 
   * @returns {string}
   */
  static getCategoryCodePrefix(categoryKey) {
    const key = (categoryKey || "").toUpperCase().trim();
    if (COGNITIVE_CATEGORIES[key]) {
      return COGNITIVE_CATEGORIES[key].prefix;
    }
    return key.length >= 3 ? key.slice(0, 3) : "GEN";
  }

  /**
   * Menghasilkan kode soal otomatis berurutan berdasarkan jenjang & dimensi
   * Contoh hasil: SD-LOG-01, SD-LOG-02, SMP-NUM-05
   * @param {string} level - 'SD' atau 'SMP'
   * @param {string} categoryKey - 'LOGICAL', 'NUMERICAL', dll
   * @returns {Promise<string>}
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
          if (num > maxNum) {
            maxNum = num;
          }
        }
      }
    }

    let nextNum = maxNum + 1;
    while (existingNums.has(nextNum)) {
      nextNum++;
    }

    const paddedNum = String(nextNum).padStart(2, "0");
    return `${prefix}${paddedNum}`;
  }

  /**
   * Mengambil seluruh soal untuk keperluan tes skrining siswa
   * @param {string} level - 'SD' atau 'SMP'
   * @returns {Promise<Array<Object>>}
   */
  static async getByLevelForTest(level = LEVELS.SD) {
    const jenjang = String(level).toUpperCase().trim() === LEVELS.SMP ? LEVELS.SMP : LEVELS.SD;
    const rows = await db.all("SELECT * FROM questions WHERE level = ? ORDER BY id ASC", [jenjang]);
    return rows.map(this.formatRow);
  }

  /**
   * Menambahkan soal baru ke dalam database
   * @param {Object} data 
   * @returns {Promise<Object>}
   */
  static async create(data) {
    const now = new Date().toISOString();
    const optionsJson = JSON.stringify(data.options || []);

    const result = await db.run(
      `INSERT INTO questions 
       (questionCode, level, categoryKey, category, difficulty, questionText, optionsJson, correctAnswer, explanation, scoreWeight, createdAt, updatedAt)
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

  /**
   * Memperbarui soal yang sudah ada
   * @param {number|string} id 
   * @param {Object} data 
   * @returns {Promise<Object|null>}
   */
  static async update(id, data) {
    const existing = await this.getById(id);
    if (!existing) return null;

    const now = new Date().toISOString();
    const questionCode = data.questionCode ? data.questionCode.trim() : existing.questionCode;
    const level = data.level ? data.level.toUpperCase().trim() : existing.level;
    const categoryKey = data.categoryKey ? data.categoryKey.toUpperCase().trim() : existing.categoryKey;
    const category = data.category ? data.category.trim() : existing.category;
    const difficulty = data.difficulty ? data.difficulty.toUpperCase().trim() : existing.difficulty;
    const questionText = data.questionText ? data.questionText.trim() : existing.questionText;
    const optionsJson = data.options ? JSON.stringify(data.options) : JSON.stringify(existing.options);
    const correctAnswer = data.correctAnswer ? data.correctAnswer.toUpperCase().trim() : existing.correctAnswer;
    const explanation = data.explanation !== undefined ? data.explanation.trim() : existing.explanation;
    const scoreWeight = data.scoreWeight !== undefined ? Number(data.scoreWeight) : existing.scoreWeight;

    await db.run(
      `UPDATE questions 
       SET questionCode = ?, level = ?, categoryKey = ?, category = ?, difficulty = ?, questionText = ?, optionsJson = ?, correctAnswer = ?, explanation = ?, scoreWeight = ?, updatedAt = ?
       WHERE id = ?`,
      [
        questionCode,
        level,
        categoryKey,
        category,
        difficulty,
        questionText,
        optionsJson,
        correctAnswer,
        explanation,
        scoreWeight,
        now,
        id
      ]
    );

    return this.getById(id);
  }

  /**
   * Menghapus soal berdasarkan ID
   * @param {number|string} id 
   * @returns {Promise<boolean>}
   */
  static async delete(id) {
    const existing = await this.getById(id);
    if (!existing) return false;

    await db.run("DELETE FROM questions WHERE id = ?", [id]);
    return true;
  }

  /**
   * Menghitung total soal di database
   * @returns {Promise<number>}
   */
  static async count() {
    const res = await db.get("SELECT COUNT(*) as count FROM questions");
    return res ? res.count : 0;
  }
}

module.exports = QuestionModel;
