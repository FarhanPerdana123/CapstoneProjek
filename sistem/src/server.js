/**
 * Server Utama Aplikasi Skrining Kognitif (Node.js & Express).
 * Titik masuk backend REST API.
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
const adminApiRoutes = require("./routes/adminApiRoutes");
const sekolahAuthRoutes = require("./routes/sekolahAuthRoutes");

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : true,
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

/* Berkas unggahan (dipakai endpoint upload gambar butir pertanyaan). */
const UPLOAD_DIR = path.join(__dirname, "../public/uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_DIR));

/* Registrasi Endpoint REST API */
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminApiRoutes);
app.use("/api/sekolah", sekolahAuthRoutes);
app.use("/api/screenings", screeningRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/settings", requireAuth, settingsRoutes);

/* Health check endpoint untuk monitoring server */
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    environment: config.env,
    timestamp: new Date().toISOString()
  });
});

/* Penanganan rute tidak ditemukan & error global */
app.use(notFoundHandler);
app.use(globalErrorHandler);

/* Menjalankan HTTP Server */
const server = app.listen(config.port, () => {
  logger.success("=================================================");
  logger.success("API Skrining Kognitif Aktif!");
  logger.success(`URL Server: http://localhost:${config.port}`);
  logger.success(`Lingkungan: ${config.env}`);
  logger.success(`Database  : MySQL Docker (${config.db.mysql.host}:${config.db.mysql.port}/${config.db.mysql.database})`);
  logger.success("Frontend  : Next.js (folder web-admin)");
  logger.success("=================================================");
});

/* Penanganan Graceful Shutdown */
process.on("SIGTERM", () => {
  logger.info("Menerima sinyal SIGTERM, menutup server dengan aman...");
  server.close(() => {
    logger.info("Server Express berhasil dihentikan.");
    process.exit(0);
  });
});

module.exports = { app, server };
