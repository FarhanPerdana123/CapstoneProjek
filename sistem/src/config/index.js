/**
 * Konfigurasi terpusat aplikasi.
 * Semua nilai dibaca dari environment variables (.env) dengan fallback default.
 *
 * Penggunaan:
 *   const config = require("./config");
 *   config.port          // Port HTTP server
 *   config.jwt.secret    // Kunci rahasia JWT
 *   config.db.mysql.*    // Konfigurasi koneksi MySQL
 *   config.constants     // Re-export konstanta domain (LEVELS, DIFFICULTIES, dst.)
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const constants = require("./constants");

const env = process.env.NODE_ENV || "development";

const config = {
  /** Mode lingkungan: "development" | "production" | "test" */
  env,
  isProduction: env === "production",
  isDevelopment: env === "development",

  /** Port HTTP server */
  port: parseInt(process.env.PORT, 10) || 5000,

  /** Konfigurasi JWT */
  jwt: {
    secret: process.env.JWT_SECRET || "capstone-secret-screening-key-2026",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  },

  /** Konfigurasi database MySQL (via Docker) */
  db: {
    mysql: {
      host: process.env.DB_HOST || "127.0.0.1",
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USER || "skrining_user",
      password: process.env.DB_PASSWORD || "skrining_password123",
      database: process.env.DB_NAME || "skrining_kognitif",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
      charset: "utf8mb4"
    }
  },

  /** Parameter tes skrining default */
  test: {
    durationMinutes: 20
  },

  /** Re-export konstanta domain agar bisa diakses via `config.constants` */
  constants
};

module.exports = config;
