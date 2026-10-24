/**
 * Routes autentikasi user umum — dipasang di /api/auth.
 *
 * Endpoint:
 *   POST /api/auth/register   → Daftar akun baru
 *   POST /api/auth/login      → Login dan dapatkan token JWT
 *   GET  /api/auth/me         → Ambil profil user yang sedang login (perlu token)
 */

const express = require("express");
const { AuthController } = require("../controllers/authController");
const { requireAuth } = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/register", AuthController.register);
router.post("/login", AuthController.login);
router.get("/me", requireAuth, AuthController.getProfile);

module.exports = router;
