/**
 * Middleware autentikasi umum menggunakan JWT Bearer.
 * Dipakai oleh endpoint yang dapat diakses user maupun admin sekolah
 * (berbeda dari adminAuthMiddleware dan sekolahAuthMiddleware yang role-spesifik).
 *
 * Dua fungsi yang diekspor:
 *   - requireAuth   : Wajib login; menolak request tanpa token valid.
 *   - optionalAuth  : Login opsional; mengisi req.user jika token ada, null jika tidak.
 */

const jwt = require("jsonwebtoken");
const config = require("../config");
const ApiResponse = require("../utils/apiResponse");

/**
 * Middleware wajib autentikasi.
 * Mengisi `req.user` dari payload JWT jika token valid.
 * Menolak request dengan 401 jika token tidak ada atau kedaluwarsa.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return ApiResponse.error(res, {
      message: "Silakan login terlebih dahulu untuk mengakses data ini.",
      statusCode: 401
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    req.user = jwt.verify(token, config.jwt.secret);
    return next();
  } catch (err) {
    return ApiResponse.error(res, {
      message: "Sesi login telah berakhir atau token tidak valid. Silakan login kembali.",
      statusCode: 401,
      error: err.message
    });
  }
}

/**
 * Middleware autentikasi opsional.
 * Mengisi `req.user` dari payload JWT jika token valid; tidak menolak request jika tidak ada.
 * Berguna untuk endpoint publik yang menampilkan data berbeda untuk user yang sudah login.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      req.user = jwt.verify(token, config.jwt.secret);
    } catch {
      req.user = null;
    }
  } else {
    req.user = null;
  }

  return next();
}

module.exports = { requireAuth, optionalAuth };
