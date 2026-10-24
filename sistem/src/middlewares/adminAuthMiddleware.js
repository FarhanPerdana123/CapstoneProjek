/**
 * Middleware autentikasi API Super Admin (JWT Bearer).
 * Melindungi seluruh endpoint /api/admin/* yang dikonsumsi frontend Next.js.
 *
 * Alur verifikasi:
 *   1. Periksa header Authorization: Bearer <token>
 *   2. Verifikasi JWT dan pastikan role = "super_admin"
 *   3. Pastikan akun masih ada di tabel super_admin (belum dihapus)
 *   4. Isi req.admin dengan data admin yang terautentikasi
 */

const jwt = require("jsonwebtoken");
const config = require("../config");
const adminService = require("../services/adminService");

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
async function adminAuth(req, res, next) {
  const header = req.headers.authorization || req.headers.Authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Token tidak ditemukan. Silakan login terlebih dahulu."
    });
  }

  try {
    const decoded = jwt.verify(header.split(" ")[1], config.jwt.secret);

    if (decoded.role !== "super_admin") {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Endpoint ini hanya untuk Super Admin."
      });
    }

    const admin = await adminService.getSuperAdmin(decoded.id);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Akun tidak ditemukan atau sudah dihapus."
      });
    }

    req.admin = admin;
    return next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Sesi login telah berakhir atau token tidak valid."
    });
  }
}

module.exports = { adminAuth };
