/**
 * API Response Formatter Utility
 * 
 * Memastikan seluruh respons JSON memiliki struktur yang konsisten:
 * Success: { success: true, message, data, ...meta }
 * Error:   { success: false, message, error, details }
 */

class ApiResponse {
  /**
   * Mengirim respons sukses standar
   */
  static success(res, { data = null, message = "Sukses", statusCode = 200, meta = {} } = {}) {
    const payload = {
      success: true,
      message,
      ...(meta || {})
    };

    if (data !== null && data !== undefined) {
      payload.data = data;
    }

    return res.status(statusCode).json(payload);
  }

  /**
   * Mengirim respons error standar
   */
  static error(res, { message = "Terjadi kesalahan", statusCode = 500, error = null, details = null } = {}) {
    const payload = {
      success: false,
      message
    };

    if (error) {
      payload.error = typeof error === "object" ? error.message : error;
    }

    if (details) {
      payload.details = details;
    }

    return res.status(statusCode).json(payload);
  }
}

module.exports = ApiResponse;
