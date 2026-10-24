/**
 * Custom Error Class untuk Penanganan Kesalahan Operasional Aplikasi.
 * Membawa kode status HTTP dan flag operational untuk middleware error handler.
 */

class AppError extends Error {
  /**
   * @param {string} message Pesan kesalahan
   * @param {number} [statusCode=500] Kode status HTTP
   * @param {*} [details=null] Detail data kesalahan tambahan
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Membuat instance AppError dengan kode 400 (Bad Request).
   * @param {string} message
   * @param {*} [details=null]
   * @returns {AppError}
   */
  static badRequest(message, details = null) {
    return new AppError(message, 400, details);
  }

  /**
   * Membuat instance AppError dengan kode 401 (Unauthorized).
   * @param {string} [message="Akses ditolak. Silakan login terlebih dahulu."]
   * @returns {AppError}
   */
  static unauthorized(message = "Akses ditolak. Silakan login terlebih dahulu.") {
    return new AppError(message, 401);
  }

  /**
   * Membuat instance AppError dengan kode 403 (Forbidden).
   * @param {string} [message="Akses ditolak. Anda tidak memiliki izin."]
   * @returns {AppError}
   */
  static forbidden(message = "Akses ditolak. Anda tidak memiliki izin.") {
    return new AppError(message, 403);
  }

  /**
   * Membuat instance AppError dengan kode 404 (Not Found).
   * @param {string} [message="Data yang dicari tidak ditemukan."]
   * @returns {AppError}
   */
  static notFound(message = "Data yang dicari tidak ditemukan.") {
    return new AppError(message, 404);
  }

  /**
   * Membuat instance AppError dengan kode 409 (Conflict).
   * @param {string} message
   * @returns {AppError}
   */
  static conflict(message) {
    return new AppError(message, 409);
  }

  /**
   * Membuat instance AppError dengan kode 500 (Internal Server Error non-operasional).
   * @param {string} [message="Terjadi kesalahan internal server."]
   * @param {*} [details=null]
   * @returns {AppError}
   */
  static internal(message = "Terjadi kesalahan internal server.", details = null) {
    const err = new AppError(message, 500, details);
    err.isOperational = false;
    return err;
  }
}

module.exports = AppError;
