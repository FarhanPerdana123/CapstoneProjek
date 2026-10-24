/**
 * Utilitas Logging Konsol Terformat dengan Pewarnaan ANSI.
 * Membantu pemantauan server dan debugging di terminal.
 */

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m"
};

/**
 * Format timestamp saat ini ke format "YYYY-MM-DD HH:mm:ss".
 * @returns {string}
 */
function formatTimestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

const logger = {
  /**
   * Log pesan informasi umum.
   * @param {string} message
   * @param {*} [meta=""]
   */
  info(message, meta = "") {
    const metaStr = meta ? ` ${typeof meta === "object" ? JSON.stringify(meta) : meta}` : "";
    console.log(`${colors.cyan}[INFO]${colors.reset} [${formatTimestamp()}] ${message}${metaStr}`);
  },

  /**
   * Log pesan sukses (indikator status berhasil).
   * @param {string} message
   * @param {*} [meta=""]
   */
  success(message, meta = "") {
    const metaStr = meta ? ` ${typeof meta === "object" ? JSON.stringify(meta) : meta}` : "";
    console.log(`${colors.green}[SUCCESS]${colors.reset} [${formatTimestamp()}] ${message}${metaStr}`);
  },

  /**
   * Log pesan peringatan (warning).
   * @param {string} message
   * @param {*} [meta=""]
   */
  warn(message, meta = "") {
    const metaStr = meta ? ` ${typeof meta === "object" ? JSON.stringify(meta) : meta}` : "";
    console.warn(`${colors.yellow}[WARN]${colors.reset} [${formatTimestamp()}] ${message}${metaStr}`);
  },

  /**
   * Log pesan kesalahan (error) beserta stack trace jika tersedia.
   * @param {string} message
   * @param {Error|*|null} [error=null]
   */
  error(message, error = null) {
    console.error(`${colors.red}[ERROR]${colors.reset} [${formatTimestamp()}] ${message}`);
    if (error) {
      if (error.stack) {
        console.error(`${colors.dim}${error.stack}${colors.reset}`);
      } else {
        console.error(error);
      }
    }
  },

  /**
   * Log pesan debug (hanya aktif pada mode development atau jika env DEBUG disetel).
   * @param {string} message
   * @param {*} [meta=""]
   */
  debug(message, meta = "") {
    if (process.env.DEBUG || process.env.NODE_ENV === "development") {
      const metaStr = meta ? ` ${typeof meta === "object" ? JSON.stringify(meta) : meta}` : "";
      console.log(`${colors.magenta}[DEBUG]${colors.reset} [${formatTimestamp()}] ${message}${metaStr}`);
    }
  }
};

module.exports = logger;
