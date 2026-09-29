
const logger = require("../utils/logger");

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
