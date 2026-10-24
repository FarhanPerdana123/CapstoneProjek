/**
 * Middleware RBAC (Role-Based Access Control) berbasis token JWT.
 * Dipakai oleh roomRoutes dan settingsRoutes untuk membatasi akses berdasarkan role.
 *
 * CATATAN: Endpoint Panel Super Admin (/api/admin/*) dan Sekolah (/api/sekolah/*)
 * menggunakan middleware terpisah (adminAuthMiddleware & sekolahAuthMiddleware)
 * yang sudah menyertakan validasi peran di dalamnya.
 *
 * Ekspor:
 *   - requireRole(...roles)  : Batasi akses berdasarkan role
 *   - requireOwnSchool       : Pastikan admin_sekolah hanya akses data sekolahnya sendiri
 */

const logger = require("../utils/logger");

/**
 * Factory middleware: izinkan hanya role tertentu.
 * Harus digunakan setelah requireAuth (req.user sudah terisi).
 * @param {...string} allowedRoles - Daftar role yang diizinkan (contoh: "admin_sekolah")
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Autentikasi diperlukan."
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(
        `Akses ditolak: user ${req.user.id} (role: ${req.user.role}) mencoba mengakses ${req.path}`
      );
      return res.status(403).json({
        success: false,
        message: `Akses ditolak. Diperlukan salah satu role: ${allowedRoles.join(", ")}.`
      });
    }

    return next();
  };
}

/**
 * Middleware: pastikan admin sekolah hanya dapat mengakses data sekolahnya sendiri.
 * Superadmin diizinkan mengakses semua data tanpa batasan.
 * Harus digunakan setelah requireAuth dan requireRole("admin_sekolah").
 */
function requireOwnSchool(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Autentikasi diperlukan."
    });
  }

  // Superadmin dapat mengakses data sekolah mana pun
  if (req.user.role === "superadmin") {
    return next();
  }

  if (req.user.role === "admin_sekolah" && !req.user.schoolId) {
    return res.status(403).json({
      success: false,
      message: "Akun admin sekolah tidak memiliki schoolId yang valid."
    });
  }

  return next();
}

module.exports = { requireRole, requireOwnSchool };
