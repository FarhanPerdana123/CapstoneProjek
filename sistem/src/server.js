/**
 * Server Utama Sistem Skrining Kognitif Awal Siswa (SD & SMP)
 * 
 * Mengintegrasikan Express, middleware keamanan CORS, parsing JSON,
 * request logging, rute API terorganisir, serta penanganan error terpusat.
 */

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const config = require("./config");
const logger = require("./utils/logger");
const requestLogger = require("./middlewares/requestLogger");
const { notFoundHandler, globalErrorHandler } = require("./middlewares/errorHandler");

const { requireAuth } = require("./middlewares/authMiddleware");
const authRoutes = require("./routes/authRoutes");
const screeningRoutes = require("./routes/screeningRoutes");
const questionRoutes = require("./routes/questionRoutes");
const roomRoutes = require("./routes/roomRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

const app = express();

// 1. Middlewares Inti
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// 2. Rute API
app.use("/api/auth", authRoutes);
app.use("/api/screenings", screeningRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/settings", requireAuth, settingsRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    environment: config.env,
    timestamp: new Date().toISOString()
  });
});

// 3. Penyajian File Statis Frontend
const staticPath = fs.existsSync(config.paths.staticTampilan)
  ? config.paths.staticTampilan
  : config.paths.staticFrontend;

app.use(express.static(staticPath));

// 4. Rute Halaman Khusus Admin
app.get("/admin", (req, res, next) => {
  const adminPath = path.join(staticPath, "admin.html");
  if (fs.existsSync(adminPath)) {
    return res.sendFile(adminPath);
  }
  next();
});

// Fallback untuk SPA (Single Page Application)
app.get("*", (req, res, next) => {
  if (!req.path.startsWith("/api")) {
    const indexPath = path.join(staticPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("File antarmuka web (index.html) belum ditemukan.");
    }
  } else {
    next();
  }
});

// 4. Error Handling Middlewares Terpusat
app.use(notFoundHandler);
app.use(globalErrorHandler);

// 5. Menjalankan Server
const server = app.listen(config.port, () => {
  logger.success(`=================================================`);
  logger.success(`Sistem Skrining Kognitif Server Aktif!`);
  logger.success(`URL Server: http://localhost:${config.port}`);
  logger.success(`Lingkungan: ${config.env}`);
  const dbInfo = (config.db.client || "mysql") === "mysql"
    ? `MySQL Docker (${config.db.mysql.host}:${config.db.mysql.port}/${config.db.mysql.database})`
    : `SQLite3 (${config.db.sqlite.filename})`;
  logger.success(`Database  : ${dbInfo}`);
  logger.success(`=================================================`);
});

// Penanganan Graceful Shutdown
process.on("SIGTERM", () => {
  logger.info("Menerima sinyal SIGTERM, menutup server dengan aman...");
  server.close(() => {
    logger.info("Server Express berhasil dihentikan.");
    process.exit(0);
  });
});

module.exports = { app, server };
