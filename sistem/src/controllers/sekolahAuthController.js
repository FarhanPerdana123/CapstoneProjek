/**
 * Controller autentikasi akun sekolah.
 * Akun sekolah dibuat oleh Super Admin melalui /api/admin/sekolah,
 * bukan melalui registrasi mandiri.
 *
 * Endpoint:
 *   POST /api/sekolah/login   → Login (ditangani oleh fungsi `login`)
 *   GET  /api/sekolah/me      → Profil sekolah (ditangani oleh fungsi `me`)
 */

const jwt = require("jsonwebtoken");
const config = require("../config");
const sekolahService = require("../services/sekolahAuthService");

/** Format data sekolah yang aman untuk dikembalikan ke client. */
function formatProfil(s) {
  return {
    id: s.id_school,
    schoolName: s.school_name,
    email: s.email,
    alamat: s.alamat,
    createdAt: s.created_at
  };
}

/**
 * POST /api/sekolah/login
 * Login dengan email & password sekolah. Mengembalikan token JWT.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email dan password wajib diisi." });
    }

    const hasil = await sekolahService.verifySekolah(email, password);

    if (!hasil) {
      return res.status(401).json({ success: false, message: "Email atau password salah." });
    }

    if (hasil.dinonaktifkan) {
      return res.status(403).json({
        success: false,
        message: "Akun sekolah Anda sedang dinonaktifkan. Silakan hubungi Super Admin."
      });
    }

    const sekolah = hasil.sekolah;
    const token = jwt.sign(
      { id: sekolah.id_school, role: "sekolah", schoolName: sekolah.school_name },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    return res.json({
      success: true,
      message: `Selamat datang, ${sekolah.school_name}.`,
      data: { token, sekolah: formatProfil(sekolah) }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/sekolah/me
 * Ambil profil sekolah yang sedang login. Memerlukan token valid (sekolahAuth).
 */
async function me(req, res, next) {
  try {
    const sekolah = await sekolahService.getSekolahById(req.sekolah.id_school);
    if (!sekolah) {
      return res.status(401).json({ success: false, message: "Akun sekolah tidak ditemukan." });
    }

    return res.json({ success: true, data: formatProfil(sekolah) });
  } catch (err) {
    return next(err);
  }
}

module.exports = { login, me };
