/**
 * Routes pengaturan sistem — dipasang di /api/settings.
 * Seluruh route di sini membutuhkan autentikasi (requireAuth dipasang di server.js).
 *
 * Endpoint:
 *   GET  /api/settings/min-score          → Baca nilai minimum score (semua role)
 *   POST /api/settings/min-score          → Simpan minimum score (superadmin)
 *   POST /api/settings/admin/create       → Buat admin sekolah baru (superadmin)
 *   GET  /api/settings/admin/list         → Daftar admin sekolah (superadmin)
 *   GET  /api/settings/logs               → Riwayat system logs (superadmin)
 */

const express = require("express");
const { requireRole } = require("../middlewares/rbacMiddleware");
const {
  getMinScore,
  setMinScore,
  createAdminSekolah,
  listAdminSekolah,
  getLogs
} = require("../controllers/settingsController");

const router = express.Router();

/* Semua role yang sudah login dapat membaca nilai minimum score */
router.get("/min-score", getMinScore);

/* Endpoint berikut hanya untuk superadmin */
router.post("/min-score", requireRole("superadmin"), setMinScore);
router.post("/admin/create", requireRole("superadmin"), createAdminSekolah);
router.get("/admin/list", requireRole("superadmin"), listAdminSekolah);
router.get("/logs", requireRole("superadmin"), getLogs);

module.exports = router;
