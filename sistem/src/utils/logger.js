
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

function formatTimestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

const logger = {
  info(message, meta = "") {
    const metaStr = meta ? ` ${typeof meta === "object" ? JSON.stringify(meta) : meta}` : "";
    console.log(`${colors.cyan}[INFO]${colors.reset} [${formatTimestamp()}] ${message}${metaStr}`);
  },

  success(message, meta = "") {
    const metaStr = meta ? ` ${typeof meta === "object" ? JSON.stringify(meta) : meta}` : "";
    console.log(`${colors.green}[SUCCESS]${colors.reset} [${formatTimestamp()}] ${message}${metaStr}`);
  },

  warn(message, meta = "") {
    const metaStr = meta ? ` ${typeof meta === "object" ? JSON.stringify(meta) : meta}` : "";
    console.warn(`${colors.yellow}[WARN]${colors.reset} [${formatTimestamp()}] ${message}${metaStr}`);
  },

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

  debug(message, meta = "") {
    if (process.env.DEBUG || process.env.NODE_ENV === "development") {
      const metaStr = meta ? ` ${typeof meta === "object" ? JSON.stringify(meta) : meta}` : "";
      console.log(`${colors.magenta}[DEBUG]${colors.reset} [${formatTimestamp()}] ${message}${metaStr}`);
    }
  }
};

module.exports = logger;
