/**
 * Custom Application Error Class
 * 
 * Digunakan untuk membedakan kesalahan operasional yang diharapkan
 * (seperti validasi gagal, 404, 401) dari bug sistem tak terduga (500).
 */
class AppError extends Error {
  /**
   * @param {string} message Pesan error ramah pengguna
   * @param {number} statusCode HTTP Status code (misal: 400, 401, 403, 404, 409, 500)
   * @param {any} details Detail teknis tambahan / field error
   */
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details = null) {
    return new AppError(message, 400, details);
  }

  static unauthorized(message = "Akses ditolak. Silakan login terlebih dahulu.") {
    return new AppError(message, 401);
  }

  static forbidden(message = "Akses ditolak. Anda tidak memiliki izin.") {
    return new AppError(message, 403);
  }

  static notFound(message = "Data yang dicari tidak ditemukan.") {
    return new AppError(message, 404);
  }

  static conflict(message) {
    return new AppError(message, 409);
  }

  static internal(message = "Terjadi kesalahan internal server.", details = null) {
    const err = new AppError(message, 500, details);
    err.isOperational = false;
    return err;
  }
}

module.exports = AppError;
