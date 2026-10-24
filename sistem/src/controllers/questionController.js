/**
 * Controller manajemen bank soal (CRUD soal tes skrining).
 * Endpoint ini dikelola oleh /api/questions.
 *
 * Aturan akses:
 *   - Baca (getAll, getById, generateCode): publik tanpa autentikasi
 *   - Tulis (create, update, delete): hanya superadmin yang terautentikasi
 *     (validasi dilakukan di dalam controller, bukan di route,
 *      karena endpoint menggunakan optionalAuth)
 */

const QuestionModel = require("../models/questionModel");
const SystemLogsService = require("../services/systemLogsService");
const ApiResponse = require("../utils/apiResponse");
const logger = require("../utils/logger");
const { LEVELS, DIFFICULTIES } = require("../config/constants");

class QuestionController {
  /**
   * GET /api/questions/
   * Ambil semua soal dengan filter opsional: level, categoryKey, difficulty, search.
   */
  static async getAll(req, res, next) {
    try {
      const { level, categoryKey, difficulty, search } = req.query;
      const questions = await QuestionModel.getAll({ level, categoryKey, difficulty, search });

      return res.json({
        success: true,
        count: questions.length,
        data: questions
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/questions/generate-code
   * Generate kode soal berikutnya berdasarkan jenjang dan kategori.
   * Query param: ?level=SD&categoryKey=LOGICAL
   */
  static async generateCode(req, res, next) {
    try {
      const { level = LEVELS.SD, categoryKey = "LOGICAL" } = req.query;
      const jenjang = String(level).toUpperCase().trim() === LEVELS.SMP ? LEVELS.SMP : LEVELS.SD;
      const catKey = String(categoryKey || "LOGICAL").toUpperCase().trim();
      const code = await QuestionModel.getNextQuestionCode(jenjang, catKey);

      return res.json({
        success: true,
        data: { code, level: jenjang, categoryKey: catKey }
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/questions/:id
   * Ambil detail satu soal berdasarkan ID.
   */
  static async getById(req, res, next) {
    try {
      const question = await QuestionModel.getById(req.params.id);

      if (!question) {
        return ApiResponse.error(res, {
          statusCode: 404,
          message: `Soal dengan ID ${req.params.id} tidak ditemukan.`
        });
      }

      return res.json({ success: true, data: question });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/questions/
   * Tambah soal baru. Hanya superadmin yang dapat melakukan ini.
   */
  static async create(req, res, next) {
    try {
      if (req.user && req.user.role !== "superadmin") {
        return ApiResponse.error(res, {
          statusCode: 403,
          message: "Hanya superadmin yang dapat menambah soal baru."
        });
      }

      const {
        questionCode,
        level,
        categoryKey,
        category,
        difficulty,
        questionText,
        options,
        correctAnswer,
        explanation,
        scoreWeight = 1
      } = req.body || {};

      if (!questionCode || !level || !categoryKey || !category || !difficulty || !questionText || !options || !correctAnswer) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Field wajib: questionCode, level (SD/SMP), categoryKey, category, difficulty (EASY/MEDIUM/HARD), questionText, options, correctAnswer."
        });
      }

      const jenjang = level.toUpperCase().trim();
      if (![LEVELS.SD, LEVELS.SMP].includes(jenjang)) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Jenjang tidak valid. Pilihan: 'SD' atau 'SMP'."
        });
      }

      const tingkatKesulitan = difficulty.toUpperCase().trim();
      if (!DIFFICULTIES.includes(tingkatKesulitan)) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: `Tingkat kesulitan tidak valid. Pilihan: ${DIFFICULTIES.join(", ")}.`
        });
      }

      if (!Array.isArray(options) || options.length < 2) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Options harus berupa array dengan minimal 2 pilihan jawaban."
        });
      }

      if (await QuestionModel.getByCode(questionCode.trim())) {
        return ApiResponse.error(res, {
          statusCode: 409,
          message: `Kode soal '${questionCode}' sudah terdaftar. Gunakan kode yang unik.`
        });
      }

      const created = await QuestionModel.create({
        questionCode: questionCode.trim(),
        level: jenjang,
        categoryKey: categoryKey.toUpperCase().trim(),
        category: category.trim(),
        difficulty: tingkatKesulitan,
        questionText: questionText.trim(),
        options,
        correctAnswer: correctAnswer.toUpperCase().trim(),
        explanation: (explanation || "").trim(),
        scoreWeight: Number(scoreWeight) || 1
      });

      const actorId = req.user ? req.user.id : "SYSTEM";
      await SystemLogsService.logAction(
        "CREATE_QUESTION",
        `Soal baru: ${created.questionCode} (${jenjang} - ${categoryKey})`,
        actorId
      );

      logger.info(`Soal baru dibuat: [${created.questionCode}] ID ${created.id}`);

      return res.status(201).json({
        success: true,
        message: "Soal baru berhasil ditambahkan.",
        data: created
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * PUT /api/questions/:id
   * Perbarui soal. Hanya superadmin yang dapat melakukan ini.
   */
  static async update(req, res, next) {
    try {
      if (req.user && req.user.role !== "superadmin") {
        return ApiResponse.error(res, {
          statusCode: 403,
          message: "Hanya superadmin yang dapat mengubah soal."
        });
      }

      const { id } = req.params;
      const existing = await QuestionModel.getById(id);

      if (!existing) {
        return ApiResponse.error(res, {
          statusCode: 404,
          message: `Soal dengan ID ${id} tidak ditemukan.`
        });
      }

      const { level, difficulty, options, questionCode } = req.body || {};

      if (level && ![LEVELS.SD, LEVELS.SMP].includes(level.toUpperCase().trim())) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Jenjang tidak valid. Pilihan: 'SD' atau 'SMP'."
        });
      }

      if (difficulty && !DIFFICULTIES.includes(difficulty.toUpperCase().trim())) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: `Tingkat kesulitan tidak valid. Pilihan: ${DIFFICULTIES.join(", ")}.`
        });
      }

      if (options && (!Array.isArray(options) || options.length < 2)) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Options harus berupa array dengan minimal 2 pilihan jawaban."
        });
      }

      // Pastikan kode baru tidak bentrok dengan soal lain
      if (questionCode && questionCode.trim() !== existing.questionCode) {
        const duplicate = await QuestionModel.getByCode(questionCode.trim());
        if (duplicate && duplicate.id !== Number(id)) {
          return ApiResponse.error(res, {
            statusCode: 409,
            message: `Kode soal '${questionCode}' sudah digunakan soal lain.`
          });
        }
      }

      const updated = await QuestionModel.update(id, req.body);
      const actorId = req.user ? req.user.id : "SYSTEM";

      await SystemLogsService.logAction(
        "UPDATE_QUESTION",
        `Soal diperbarui: ${existing.questionCode} → ${updated.questionCode}`,
        actorId
      );

      logger.info(`Soal ID ${id} diperbarui: [${updated.questionCode}]`);

      return res.json({
        success: true,
        message: "Soal berhasil diperbarui.",
        data: updated
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * DELETE /api/questions/:id
   * Hapus soal secara permanen. Hanya superadmin yang dapat melakukan ini.
   */
  static async delete(req, res, next) {
    try {
      if (req.user && req.user.role !== "superadmin") {
        return ApiResponse.error(res, {
          statusCode: 403,
          message: "Hanya superadmin yang dapat menghapus soal."
        });
      }

      const { id } = req.params;
      const existing = await QuestionModel.getById(id);

      if (!existing) {
        return ApiResponse.error(res, {
          statusCode: 404,
          message: `Soal dengan ID ${id} tidak ditemukan.`
        });
      }

      const deleted = await QuestionModel.delete(id);

      if (!deleted) {
        return ApiResponse.error(res, {
          statusCode: 500,
          message: "Gagal menghapus soal dari database."
        });
      }

      const actorId = req.user ? req.user.id : "SYSTEM";
      await SystemLogsService.logAction(
        "DELETE_QUESTION",
        `Soal dihapus: ${existing.questionCode} (ID ${id})`,
        actorId
      );

      logger.info(`Soal ID ${id} (${existing.questionCode}) berhasil dihapus.`);

      return res.json({
        success: true,
        message: `Soal '${existing.questionCode}' berhasil dihapus.`,
        deletedId: Number(id)
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = QuestionController;
