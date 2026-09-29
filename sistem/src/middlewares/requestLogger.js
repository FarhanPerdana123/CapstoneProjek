/**
 * HTTP Request Logger Middleware
 * 
 * Mencatat setiap request yang masuk beserta waktu eksekusi dan kode status HTTP.
 * Membantu developer berikutnya melacak alur API dan mempermudah investigasi request yang gagal.
 */
const logger = require("../utils/logger");

function requestLogger(req, res, next) {
  // Lewati static assets atau icon untuk menjaga log tetap bersih
  if (req.path.startsWith("/favicon") || req.path.endsWith(".css") || req.path.endsWith(".js") || req.path.endsWith(".png")) {
    return next();
  }

  const startTime = Date.now();
  const { method, originalUrl } = req;

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const status = res.statusCode;
    const logMsg = `${method} ${originalUrl} -> ${status} (${duration}ms)`;

    if (status >= 500) {
      logger.error(logMsg);
    } else if (status >= 400) {
      logger.warn(logMsg);
    } else {
      logger.info(logMsg);
    }
  });

  next();
}

module.exports = requestLogger;
