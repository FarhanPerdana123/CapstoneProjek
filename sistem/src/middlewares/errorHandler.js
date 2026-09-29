/**
 * Centralized Error Handler Middleware
 * 
 * Menangkap semua error yang tidak tertangani atau dilempar melalui next(err).
 * Memberikan pesan error yang jelas dan log stack trace untuk kemudahan debugging.
 */
const logger = require("../utils/logger");
const config = require("../config");

function notFoundHandler(req, res, next) {
  if (req.path.startsWith("/api")) {
    return res.status(404).json({
      success: false,
      message: `Endpoint API '${req.method} ${req.originalUrl}' tidak ditemukan.`
    });
  }
  next();
}

function globalErrorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500);
  const isOperational = err.isOperational !== undefined ? err.isOperational : false;

  logger.error(`[${req.method} ${req.originalUrl}] Terjadi error: ${err.message}`, err);

  const responsePayload = {
    success: false,
    message: err.message || "Terjadi kesalahan internal pada server."
  };

  if (err.details) {
    responsePayload.details = err.details;
  }

  // Tampilkan stack trace hanya pada mode development untuk membantu pengguna kode berikutnya
  if (config.isDevelopment && !isOperational) {
    responsePayload.stack = err.stack;
  }

  return res.status(statusCode).json(responsePayload);
}

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
