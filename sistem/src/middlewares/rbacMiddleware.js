/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * Validasi role pengguna sebelum akses endpoint tertentu.
 */

const logger = require("../utils/logger");

/**
 * Middleware untuk verifikasi role
 * @param  {...string} allowedRoles - Role yang diizinkan
 * @returns {Function} Express middleware
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    // Asumsikan req.user sudah di-set oleh middleware auth sebelumnya
    if (!req.user) {
      return res.status(401).json({
        status: "error",
        message: "Autentikasi diperlukan"
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} to ${req.path}. Role: ${req.user.role}`);
      return res.status(403).json({
        status: "error",
        message: `Akses ditolak. Diperlukan role: ${allowedRoles.join(", ")}`
      });
    }

    next();
  };
}

/**
 * Middleware untuk memastikan admin_sekolah hanya akses data milik sekolah mereka
 */
function requireOwnSchool(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      status: "error",
      message: "Autentikasi diperlukan"
    });
  }

  if (req.user.role === "superadmin") {
    // Superadmin akses semua
    return next();
  }

  if (req.user.role === "admin_sekolah" && !req.user.schoolId) {
    return res.status(403).json({
      status: "error",
      message: "Admin sekolah harus memiliki schoolId"
    });
  }

  next();
}

module.exports = { requireRole, requireOwnSchool };
