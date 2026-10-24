/**
 * Controller skrining kognitif — menangani sesi tes siswa dari awal hingga hasil.
 *
 * Alur tes:
 *   1. GET  /questions   → Ambil bank soal sesuai jenjang
 *   2. POST /start       → Mulai sesi (opsional, bisa langsung ke submit)
 *   3. POST /submit      → Kirim jawaban, hitung & simpan hasil
 *   4. GET  /:id/result  → Lihat hasil sesi
 */

const QuestionModel = require("../models/questionModel");
const SessionModel = require("../models/sessionModel");
const ScoringService = require("../services/scoringService");
const ApiResponse = require("../utils/apiResponse");
const logger = require("../utils/logger");
const config = require("../config");
const { LEVELS, LEVEL_LABELS } = require("../config/constants");

class ScreeningController {
  /**
   * GET /api/screenings/questions
   * Kembalikan bank soal berdasarkan jenjang (default: SD).
   * Query param: ?level=SD|SMP
   */
  static async getQuestions(req, res, next) {
    try {
      const jenjangParam = String(req.query.level || LEVELS.SD).toUpperCase().trim();
      const jenjang = jenjangParam === LEVELS.SMP ? LEVELS.SMP : LEVELS.SD;

      const bankSoal = await QuestionModel.getByLevelForTest(jenjang);

      if (!bankSoal || bankSoal.length === 0) {
        return ApiResponse.error(res, {
          statusCode: 404,
          message: `Tidak ada soal untuk jenjang ${jenjang} di dalam database.`
        });
      }

      // Hanya kirim field yang diperlukan ke client (sembunyikan correctAnswer)
      const soal = bankSoal.map((q) => ({
        id: q.id,
        questionCode: q.questionCode,
        categoryKey: q.categoryKey,
        category: q.category,
        difficulty: q.difficulty,
        questionText: q.questionText,
        options: q.options
      }));

      return res.json({
        success: true,
        level: jenjang,
        levelLabel: LEVEL_LABELS[jenjang] || jenjang,
        totalQuestions: soal.length,
        durationMinutes: config.test.durationMinutes,
        questions: soal
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/screenings/start
   * Mulai sesi tes baru dan simpan data awal siswa ke database.
   * Body: { name, age?, grade?, school?, level? }
   */
  static async startSession(req, res, next) {
    try {
      const { name, age, grade, school, level = LEVELS.SD } = req.body || {};
      const userId = req.user ? req.user.id : (req.body.userId || "GUEST");
      const jenjang = String(level).toUpperCase().trim() === LEVELS.SMP ? LEVELS.SMP : LEVELS.SD;

      if (!name || !name.trim()) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Nama siswa wajib diisi."
        });
      }

      const bankSoal = await QuestionModel.getByLevelForTest(jenjang);
      if (!bankSoal || bankSoal.length === 0) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: `Bank soal jenjang ${jenjang} masih kosong. Hubungi Super Admin.`
        });
      }

      const sesi = {
        sessionId: null,
        userId,
        level: jenjang,
        student: {
          name: name.trim(),
          age: age || "-",
          grade: grade || "-",
          school: school || "-",
          level: jenjang
        },
        status: "IN_PROGRESS",
        startedAt: new Date().toISOString(),
        totalQuestions: bankSoal.length,
        answers: [],
        result: null
      };

      const savedSession = await SessionModel.save(sesi);
      logger.info(`Sesi tes dimulai: [${savedSession.sessionId}] — ${name} (${jenjang})`);

      return res.status(201).json({
        success: true,
        message: `Sesi tes tingkat ${jenjang} berhasil dimulai.`,
        sessionId: savedSession.sessionId,
        userId,
        level: jenjang,
        student: sesi.student,
        startedAt: sesi.startedAt,
        totalQuestions: sesi.totalQuestions
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/screenings/:sessionId/submit  (atau /submit tanpa sessionId)
   * Terima jawaban siswa, hitung skor, simpan hasil ke database.
   * Body: { answers, studentInfo?, level?, roomId? }
   */
  static async submitScreening(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { answers = [], studentInfo = {}, level, roomId } = req.body;
      const userId = req.user ? req.user.id : (req.body.userId || "GUEST");

      // Muat sesi lama jika sessionId tersedia
      let session = sessionId ? await SessionModel.findById(sessionId) : null;
      const activeLevel = (session && session.level) || level || studentInfo.level || LEVELS.SD;

      if (!session) {
        // Submit tanpa sesi sebelumnya: buat sesi baru secara inline
        session = {
          sessionId: sessionId || null,
          userId,
          level: activeLevel,
          student: studentInfo,
          status: "IN_PROGRESS",
          startedAt: new Date().toISOString(),
          roomId: roomId || null
        };
      } else if (req.user && session.userId === "GUEST") {
        // Kaitkan sesi guest ke user yang sudah login
        session.userId = req.user.id;
      }

      const dataSiswa = { ...session.student, ...studentInfo, level: activeLevel };
      const bankSoal = await QuestionModel.getByLevelForTest(activeLevel);
      const hasilEvaluasi = ScoringService.evaluateTest(answers, dataSiswa, activeLevel, bankSoal);

      session.status = "COMPLETED";
      session.completedAt = new Date().toISOString();
      session.answers = answers;
      session.result = hasilEvaluasi;
      session.roomId = roomId || session.roomId;

      const savedSession = await SessionModel.save(session);
      logger.info(
        `Sesi tes selesai: [${savedSession.sessionId}] IQ estimasi: ${hasilEvaluasi.cognitiveScore.estimatedIQ}`
      );

      return res.json({
        success: true,
        message: "Jawaban berhasil dinilai.",
        sessionId: savedSession.sessionId,
        userId: savedSession.userId,
        level: activeLevel,
        result: hasilEvaluasi
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/screenings/:sessionId/result
   * Ambil hasil sesi tes. User hanya bisa melihat hasil miliknya sendiri.
   */
  static async getResult(req, res, next) {
    try {
      const { sessionId } = req.params;
      const session = await SessionModel.findById(sessionId);

      if (!session || !session.result) {
        return ApiResponse.error(res, {
          statusCode: 404,
          message: "Hasil tes tidak ditemukan."
        });
      }

      // Isolasi privasi: user tidak boleh melihat hasil user lain (kecuali admin)
      const isOwner = !req.user || session.userId === "GUEST" || session.userId === req.user.id;
      const isAdmin = req.user && req.user.role === "admin";
      if (!isOwner && !isAdmin) {
        return ApiResponse.error(res, {
          statusCode: 403,
          message: "Akses ditolak. Anda tidak memiliki izin melihat hasil tes ini."
        });
      }

      return res.json({
        success: true,
        sessionId,
        userId: session.userId,
        level: session.level || LEVELS.SD,
        status: session.status,
        result: session.result
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/screenings/history
   * Riwayat semua tes yang sudah selesai milik user yang sedang login.
   */
  static async getAllSessions(req, res, next) {
    try {
      const userId = req.user ? req.user.id : null;

      if (!userId) {
        return ApiResponse.error(res, {
          statusCode: 401,
          message: "Silakan login untuk melihat riwayat tes Anda."
        });
      }

      const sessions = await SessionModel.findByUserId(userId);

      const riwayat = sessions
        .filter((s) => s.result && s.result.summary)
        .map((s) => ({
          sessionId: s.sessionId,
          userId: s.userId,
          level: s.level || LEVELS.SD,
          student: s.student,
          completedAt: s.completedAt,
          scoreSummary: {
            rawScore: s.result.summary.rawScore,
            percentage: s.result.summary.percentage,
            estimatedIQ: s.result.cognitiveScore.estimatedIQ,
            category: s.result.cognitiveScore.category,
            dsm5Status: s.result.dsm5Screening ? s.result.dsm5Screening.badge : "-"
          }
        }));

      return res.json({
        success: true,
        count: riwayat.length,
        user: { id: req.user.id, name: req.user.name, email: req.user.email },
        data: riwayat
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/screenings/results
   * Semua hasil tes siswa dalam ruang tes milik sekolah yang sedang login.
   * Hanya untuk admin sekolah.
   */
  static async getResults(req, res, next) {
    try {
      if (!req.user || req.user.role !== "admin_sekolah") {
        return ApiResponse.error(res, {
          statusCode: 403,
          message: "Hanya admin sekolah yang dapat mengakses hasil tes."
        });
      }

      const { db } = require("../database/db");
      const results = await db.all(
        `SELECT * FROM screening_sessions
         WHERE status = 'COMPLETED'
           AND roomId IN (
             SELECT id FROM test_rooms WHERE schoolId = ?
           )
         ORDER BY completedAt DESC`,
        [req.user.schoolId]
      );

      const data = results.map((r) => ({
        sessionId: r.sessionId,
        roomId: r.roomId,
        level: r.level,
        studentName: r.studentName,
        studentGrade: r.studentGrade,
        completedAt: r.completedAt,
        result: r.resultJson ? JSON.parse(r.resultJson) : null
      }));

      return res.json({ success: true, count: data.length, data });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = ScreeningController;
