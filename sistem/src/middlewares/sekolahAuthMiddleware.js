/**
 * Middleware autentikasi API Sekolah (JWT Bearer).
 * Melindungi endpoint yang hanya boleh diakses oleh akun sekolah aktif.
 * Token diterbitkan oleh POST /api/sekolah/login.
 *
 * Alur verifikasi:
 *   1. Periksa header Authorization: Bearer <token>
 *   2. Verifikasi JWT dan pastikan role = "sekolah"
 *   3. Pastikan akun sekolah masih ada dan status_aktif = 1
 *   4. Isi req.sekolah dengan data sekolah yang terautentikasi
 */

const jwt = require("jsonwebtoken");
const config = require("../config");
const sekolahService = require("../services/sekolahAuthService");

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
async function sekolahAuth(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Token tidak ditemukan. Silakan login terlebih dahulu."
    });
  }

  try {
    const decoded = jwt.verify(header.split(" ")[1], config.jwt.secret);

    if (decoded.role !== "sekolah") {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Endpoint ini hanya untuk akun sekolah."
      });
    }

    const sekolah = await sekolahService.getSekolahById(decoded.id);
    if (!sekolah) {
      return res.status(401).json({
        success: false,
        message: "Akun sekolah tidak ditemukan atau sudah dihapus."
      });
    }

    if (!sekolah.status_aktif) {
      return res.status(403).json({
        success: false,
        message: "Akun sekolah sedang dinonaktifkan. Hubungi Super Admin."
      });
    }

    req.sekolah = sekolah;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Sesi login telah berakhir atau token tidak valid."
    });
  }
}

module.exports = { sekolahAuth };
