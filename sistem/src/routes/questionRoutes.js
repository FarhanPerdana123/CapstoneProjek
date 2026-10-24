/**
 * Routes manajemen bank soal — dipasang di /api/questions.
 *
 * Endpoint baca (publik):
 *   GET  /api/questions/generate-code   → Generate kode soal otomatis
 *   GET  /api/questions/                → Daftar semua soal (dengan filter)
 *   GET  /api/questions/:id             → Detail satu soal
 *
 * Endpoint tulis (hanya superadmin — divalidasi di controller):
 *   POST   /api/questions/              → Tambah soal baru
 *   PUT    /api/questions/:id           → Perbarui soal
 *   DELETE /api/questions/:id           → Hapus soal
 */

const express = require("express");
const QuestionController = require("../controllers/questionController");
const { optionalAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

/* Endpoint baca — publik tanpa login */
router.get("/generate-code", QuestionController.generateCode);
router.get("/", QuestionController.getAll);
router.get("/:id", QuestionController.getById);

/* Endpoint tulis — auth opsional; validasi role dilakukan di dalam controller */
router.post("/", optionalAuth, QuestionController.create);
router.put("/:id", optionalAuth, QuestionController.update);
router.delete("/:id", optionalAuth, QuestionController.delete);

module.exports = router;
