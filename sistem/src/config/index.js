const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const constants = require("./constants");

const env = process.env.NODE_ENV || "development";

const config = {
  env,
  isProduction: env === "production",
  isDevelopment: env === "development",
  
  // Port server
  port: parseInt(process.env.PORT, 10) || 5000,
  
  // JWT Auth Secret
  jwt: {
    secret: process.env.JWT_SECRET || "capstone-secret-screening-key-2026",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d"
  },
  
  // Database Configuration (MySQL / SQLite)
  db: {
    client: process.env.DB_CLIENT || "mysql",
    // MySQL (Docker Container)
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
    },
    // SQLite Fallback
    sqlite: {
      directory: path.join(__dirname, "../data"),
      filename: "screening.sqlite"
    }
  },
  
  // Frontend Static Paths
  paths: {
    staticTampilan: path.join(__dirname, "../../../tampilan sementara"),
    staticFrontend: path.join(__dirname, "../../../frontend")
  },
  
  // Tes skrining default
  test: {
    durationMinutes: 20
  },
  
  // Re-export constants
  constants
};

module.exports = config;
