/**
 * Routes autentikasi akun sekolah — dipasang di /api/sekolah.
 *
 * Endpoint:
 *   POST /api/sekolah/login   → Login dengan email & password sekolah
 *   GET  /api/sekolah/me      → Profil sekolah yang sedang login (perlu token)
 */

const express = require("express");
const { login, me } = require("../controllers/sekolahAuthController");
const { sekolahAuth } = require("../middlewares/sekolahAuthMiddleware");

const router = express.Router();

router.post("/login", login);
router.get("/me", sekolahAuth, me);

module.exports = router;
