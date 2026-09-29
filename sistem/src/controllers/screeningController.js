
const QuestionModel = require("../models/questionModel");
const SessionModel = require("../models/sessionModel");
const ScoringService = require("../services/scoringService");
const ApiResponse = require("../utils/apiResponse");
const logger = require("../utils/logger");
const config = require("../config");
const { LEVELS, LEVEL_LABELS } = require("../config/constants");

class ScreeningController {
  static async getQuestions(req, res, next) {
    try {
      const jenjangParam = (req.query.level || LEVELS.SD).toUpperCase().trim();
      const jenjang = jenjangParam === LEVELS.SMP ? LEVELS.SMP : LEVELS.SD;

      const bankSoal = await QuestionModel.getByLevelForTest(jenjang);

      if (!bankSoal || bankSoal.length === 0) {
        return ApiResponse.error(res, {
          statusCode: 404,
          message: `Tidak ada soal untuk jenjang ${jenjang} di dalam database.`
        });
      }

      const soalTersaring = bankSoal.map((q) => ({
        id: q.id,
        questionCode: q.questionCode,
        categoryKey: q.categoryKey,
        category: q.category,
        difficulty: q.difficulty,
        questionText: q.questionText,
        options: q.options
      }));

      return res.status(200).json({
        success: true,
        level: jenjang,
        levelLabel: LEVEL_LABELS[jenjang] || jenjang,
        totalQuestions: soalTersaring.length,
        durationMinutes: config.test.durationMinutes,
        questions: soalTersaring
      });
    } catch (err) {
      next(err);
    }
  }

  static async startSession(req, res, next) {
    try {
      const { name, age, grade, school, level = LEVELS.SD } = req.body || {};
      const currentUserId = req.user ? req.user.id : (req.body.userId || "GUEST");
      const jenjang = String(level).toUpperCase().trim() === LEVELS.SMP ? LEVELS.SMP : LEVELS.SD;

      if (!name || name.trim() === "") {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Nama siswa wajib diisi."
        });
      }

      const bankSoal = await QuestionModel.getByLevelForTest(jenjang);
      if (!bankSoal || bankSoal.length === 0) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: `Tidak dapat memulai sesi: bank soal jenjang ${jenjang} di database masih kosong.`
        });
      }

      const sessionId = null;

      const sessionBaru = {
        sessionId,
        userId: currentUserId,
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

      const savedSession = await SessionModel.save(sessionBaru);
      logger.info(`Sesi tes baru dimulai: [${savedSession.sessionId}] untuk ${name} (Jenjang: ${jenjang})`);

      return res.status(201).json({
        success: true,
        message: `Sesi tes tingkat ${jenjang} berhasil dimulai.`,
        sessionId: savedSession.sessionId,
        userId: currentUserId,
        level: jenjang,
        student: sessionBaru.student,
        startedAt: sessionBaru.startedAt,
        totalQuestions: sessionBaru.totalQuestions
      });
    } catch (err) {
      next(err);
    }
  }

  static async submitScreening(req, res, next) {
    try {
      const { sessionId } = req.params;
      const { answers = [], studentInfo = {}, level, roomId } = req.body;
      const currentUserId = req.user ? req.user.id : (req.body.userId || "GUEST");

      let session = sessionId ? await SessionModel.findById(sessionId) : null;
      const activeLevel = (session && session.level) || level || studentInfo.level || LEVELS.SD;

      if (!session) {
        session = {
          sessionId: sessionId || null,
          userId: currentUserId,
          level: activeLevel,
          student: studentInfo,
          status: "IN_PROGRESS",
          startedAt: new Date().toISOString(),
          roomId: roomId || null
        };
      } else if (req.user && session.userId === "GUEST") {
        session.userId = req.user.id;
      }

      const dataSiswa = {
        ...session.student,
        ...studentInfo,
        level: activeLevel
      };

      const fullBankSoal = await QuestionModel.getByLevelForTest(activeLevel);
      const hasilEvaluasi = ScoringService.evaluateTest(answers, dataSiswa, activeLevel, fullBankSoal);

      session.status = "COMPLETED";
      session.completedAt = new Date().toISOString();
      session.answers = answers;
      session.result = hasilEvaluasi;
      session.roomId = roomId || session.roomId;

      const savedSession = await SessionModel.save(session);
      logger.info(`Sesi tes selesai dinilai: [${savedSession.sessionId}] IQ: ${hasilEvaluasi.cognitiveScore.estimatedIQ}`);

      return res.status(200).json({
        success: true,
        message: "Jawaban berhasil dinilai.",
        sessionId: savedSession.sessionId,
        userId: savedSession.userId,
        level: activeLevel,
        result: hasilEvaluasi
      });
    } catch (err) {
      next(err);
    }
  }

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

      // Verifikasi isolasi privasi: Pengguna tidak boleh melihat hasil tes pengguna lain
      if (req.user && session.userId !== "GUEST" && session.userId !== req.user.id && req.user.role !== "admin") {
        return ApiResponse.error(res, {
          statusCode: 403,
          message: "Akses ditolak. Anda tidak memiliki izin untuk melihat hasil tes pengguna lain."
        });
      }

      return res.status(200).json({
        success: true,
        sessionId,
        userId: session.userId,
        level: session.level || LEVELS.SD,
        status: session.status,
        result: session.result
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllSessions(req, res, next) {
    try {
      const currentUserId = req.user ? req.user.id : null;

      if (!currentUserId) {
        return ApiResponse.error(res, {
          statusCode: 401,
          message: "Silakan login untuk melihat riwayat tes Anda."
        });
      }

      const sessions = await SessionModel.findByUserId(currentUserId);

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

      return res.status(200).json({
        success: true,
        count: riwayat.length,
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email
        },
        data: riwayat
      });
    } catch (err) {
      next(err);
    }
  }

  static async getResults(req, res, next) {
    try {
      if (!req.user || req.user.role !== "admin_sekolah") {
        return ApiResponse.error(res, {
          statusCode: 403,
          message: "Hanya admin sekolah yang dapat mengakses hasil tes"
        });
      }

      // Get all completed sessions for this school
      const { db } = require("../database/db");
      const results = await db.all(
        `SELECT * FROM screening_sessions 
         WHERE status = 'COMPLETED' AND roomId IN 
         (SELECT id FROM test_rooms WHERE schoolId IN 
           (SELECT id FROM schools WHERE id = ?))
         ORDER BY completedAt DESC`,
        [req.user.schoolId]
      );

      const formattedResults = results.map(r => ({
        sessionId: r.sessionId,
        roomId: r.roomId,
        level: r.level,
        studentName: r.studentName,
        studentGrade: r.studentGrade,
        completedAt: r.completedAt,
        resultJson: r.resultJson ? JSON.parse(r.resultJson) : null
      }));

      return res.status(200).json({
        success: true,
        count: formattedResults.length,
        data: formattedResults
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ScreeningController;
