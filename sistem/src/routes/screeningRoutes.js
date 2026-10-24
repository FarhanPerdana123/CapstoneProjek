/**
 * Routes skrining kognitif — dipasang di /api/screenings.
 *
 * Endpoint publik (opsional auth):
 *   GET  /api/screenings/questions              → Ambil bank soal sesuai jenjang
 *   POST /api/screenings/start                  → Mulai sesi tes
 *   POST /api/screenings/:sessionId/submit      → Kirim jawaban dengan sessionId
 *   POST /api/screenings/submit                 → Kirim jawaban tanpa sessionId
 *   GET  /api/screenings/:sessionId/result      → Lihat hasil sesi
 *
 * Endpoint terproteksi (wajib login):
 *   GET  /api/screenings/history                → Riwayat tes user yang login
 *   GET  /api/screenings/results                → Semua hasil tes sekolah (admin_sekolah)
 */

const express = require("express");
const ScreeningController = require("../controllers/screeningController");
const { requireAuth, optionalAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

/* Endpoint publik (auth opsional) */
router.get("/questions", ScreeningController.getQuestions);
router.post("/start", optionalAuth, ScreeningController.startSession);
router.post("/:sessionId/submit", optionalAuth, ScreeningController.submitScreening);
router.post("/submit", optionalAuth, ScreeningController.submitScreening);
router.get("/:sessionId/result", optionalAuth, ScreeningController.getResult);

/* Endpoint terproteksi */
router.get("/history", requireAuth, ScreeningController.getAllSessions);
router.get("/results", requireAuth, ScreeningController.getResults);

module.exports = router;
