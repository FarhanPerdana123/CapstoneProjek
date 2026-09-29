/**
 * Question Controller
 * 
 * Mengelola endpoint RESTful API untuk bank soal:
 * - Mengambil daftar soal & filter
 * - Generator otomatis kode soal berurutan (SD-LOG-01, SMP-NUM-02, dll)
 * - Detail soal by ID
 * - Tambah soal baru (Create) - Superadmin only
 * - Perbarui soal (Update) - Superadmin only
 * - Hapus soal (Delete) - Superadmin only
 */

const QuestionModel = require("../models/questionModel");
const SystemLogsService = require("../services/systemLogsService");
const ApiResponse = require("../utils/apiResponse");
const logger = require("../utils/logger");
const { LEVELS, DIFFICULTIES, COGNITIVE_CATEGORIES } = require("../config/constants");

class QuestionController {
  /**
   * GET /api/questions
   * Mengambil semua daftar soal dengan dukungan filter jenjang, dimensi, kesulitan, dan pencarian
   */
  static async getAll(req, res, next) {
    try {
      const { level, categoryKey, difficulty, search } = req.query;
      const questions = await QuestionModel.getAll({ level, categoryKey, difficulty, search });

      return res.status(200).json({
        success: true,
        count: questions.length,
        data: questions
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/questions/generate-code?level=SD&categoryKey=LOGICAL
   * Menghasilkan kode soal unik berikutnya secara deterministik
   */
  static async generateCode(req, res, next) {
    try {
      const { level = LEVELS.SD, categoryKey = "LOGICAL" } = req.query;
      const jenjang = String(level).toUpperCase().trim() === LEVELS.SMP ? LEVELS.SMP : LEVELS.SD;
      const catKey = (categoryKey || "LOGICAL").toUpperCase().trim();
      const code = await QuestionModel.getNextQuestionCode(jenjang, catKey);

      return res.status(200).json({
        success: true,
        data: {
          code,
          level: jenjang,
          categoryKey: catKey
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /api/questions/:id
   * Mengambil detail satu soal berdasarkan ID
   */
  static async getById(req, res, next) {
    try {
      const { id } = req.params;
      const question = await QuestionModel.getById(id);

      if (!question) {
        return ApiResponse.error(res, {
          statusCode: 404,
          message: `Soal dengan ID ${id} tidak ditemukan.`
        });
      }

      return res.status(200).json({
        success: true,
        data: question
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /api/questions
   * Menyimpan soal baru ke dalam bank soal (Superadmin only)
   */
  static async create(req, res, next) {
    try {
      // RBAC: Jika request membawa autentikasi, hanya superadmin yang dapat menambah soal baru
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

      // 1. Validasi keberadaan input wajib
      if (!questionCode || !level || !categoryKey || !category || !difficulty || !questionText || !options || !correctAnswer) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Field wajib: questionCode, level (SD/SMP), categoryKey, category, difficulty (EASY/MEDIUM/HARD), questionText, options, correctAnswer."
        });
      }

      // 2. Validasi Jenjang
      const jenjang = level.toUpperCase().trim();
      if (![LEVELS.SD, LEVELS.SMP].includes(jenjang)) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Jenjang tidak valid. Pilihan jenjang yang diterima: 'SD' atau 'SMP'."
        });
      }

      // 3. Validasi Tingkat Kesulitan
      const tingkatKesulitan = difficulty.toUpperCase().trim();
      if (!DIFFICULTIES.includes(tingkatKesulitan)) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: `Tingkat kesulitan tidak valid. Pilihan yang diterima: ${DIFFICULTIES.join(", ")}.`
        });
      }

      // 4. Validasi Array Pilihan Jawaban
      if (!Array.isArray(options) || options.length < 2) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Options harus berupa array pilihan jawaban dengan minimal 2 item pilihan."
        });
      }

      // 5. Cek duplikasi questionCode
      const existing = await QuestionModel.getByCode(questionCode.trim());
      if (existing) {
        return ApiResponse.error(res, {
          statusCode: 409,
          message: `Kode soal '${questionCode}' sudah terdaftar dalam database. Gunakan kode unik lain.`
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
      const actorEmail = req.user ? req.user.email : "system";

      // Log ke system_logs
      await SystemLogsService.logAction(
        "CREATE_QUESTION",
        `Soal baru dibuat: ${created.questionCode} (${jenjang} - ${categoryKey})`,
        actorId
      );

      logger.info(`Soal baru berhasil dibuat: [${created.questionCode}] ID ${created.id} oleh ${actorEmail}`);

      return res.status(201).json({
        success: true,
        message: "Soal baru berhasil ditambahkan ke database.",
        data: created
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * PUT /api/questions/:id
   * Memperbarui data soal yang sudah ada (Superadmin only)
   */
  static async update(req, res, next) {
    try {
      // RBAC: Jika request membawa autentikasi, hanya superadmin yang dapat mengubah soal
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

      const {
        questionCode,
        level,
        difficulty,
        options
      } = req.body || {};

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
          message: "Options harus berupa array pilihan jawaban dengan minimal 2 item."
        });
      }

      if (questionCode && questionCode.trim() !== existing.questionCode) {
        const duplicate = await QuestionModel.getByCode(questionCode.trim());
        if (duplicate && duplicate.id !== Number(id)) {
          return ApiResponse.error(res, {
            statusCode: 409,
            message: `Kode soal '${questionCode}' sudah digunakan oleh soal lain.`
          });
        }
      }

      const updated = await QuestionModel.update(id, req.body);

      const actorId = req.user ? req.user.id : "SYSTEM";
      const actorEmail = req.user ? req.user.email : "system";

      // Log ke system_logs
      await SystemLogsService.logAction(
        "UPDATE_QUESTION",
        `Soal diperbarui: ${existing.questionCode} → ${updated.questionCode}`,
        actorId
      );

      logger.info(`Soal ID ${id} diperbarui: [${updated.questionCode}] oleh ${actorEmail}`);

      return res.status(200).json({
        success: true,
        message: "Soal berhasil diperbarui di database.",
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * DELETE /api/questions/:id
   * Menghapus soal dari database (Superadmin only)
   */
  static async delete(req, res, next) {
    try {
      // RBAC: Jika request membawa autentikasi, hanya superadmin yang dapat menghapus soal
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

      const success = await QuestionModel.delete(id);

      if (success) {
        const actorId = req.user ? req.user.id : "SYSTEM";
        const actorEmail = req.user ? req.user.email : "system";

        // Log ke system_logs
        await SystemLogsService.logAction(
          "DELETE_QUESTION",
          `Soal dihapus: ${existing.questionCode} (ID ${id})`,
          actorId
        );

        logger.info(`Soal ID ${id} (${existing.questionCode}) berhasil dihapus oleh ${actorEmail}.`);
        return res.status(200).json({
          success: true,
          message: `Soal ID ${id} (${existing.questionCode}) berhasil dihapus dari database.`,
          deletedId: Number(id)
        });
      } else {
        return ApiResponse.error(res, {
          statusCode: 500,
          message: "Gagal menghapus soal dari database."
        });
      }
    } catch (err) {
      next(err);
    }
  }
}

module.exports = QuestionController;
