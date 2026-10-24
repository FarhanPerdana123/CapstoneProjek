/**
 * Routes manajemen ruang tes (PIN sesi) — dipasang di /api/rooms.
 *
 * Endpoint:
 *   POST /api/rooms/generate       → Buat PIN sesi baru (admin_sekolah saja)
 *   GET  /api/rooms/               → Daftar PIN milik sekolah (admin_sekolah saja)
 *   POST /api/rooms/validate-pin   → Validasi PIN (publik)
 *   POST /api/rooms/:id/close      → Tutup sesi PIN (admin_sekolah saja)
 */

const express = require("express");
const { requireAuth } = require("../middlewares/authMiddleware");
const { requireRole, requireOwnSchool } = require("../middlewares/rbacMiddleware");
const {
  generatePin,
  listRooms,
  validatePin,
  closeRoom
} = require("../controllers/roomController");

const router = express.Router();

/* Endpoint publik — tidak perlu login */
router.post("/validate-pin", validatePin);

/* Endpoint untuk admin sekolah saja */
router.use(requireAuth, requireRole("admin_sekolah"), requireOwnSchool);
router.post("/generate", generatePin);
router.get("/", listRooms);
router.post("/:id/close", closeRoom);

module.exports = router;
