class AppError extends Error {
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
