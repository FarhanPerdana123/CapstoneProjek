/**
 * Routes untuk System Settings & Admin Management
 * 
 * Superadmin only:
 *   POST /api/settings/min-score - Update minimum score global
 *   GET  /api/settings/min-score - Get current minimum score
 *   GET  /api/logs - Ambil system logs
 *   POST /api/admin/create - Create admin_sekolah account
 *   GET  /api/admin/list - List semua admin accounts
 */

const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { requireRole, requireOwnSchool } = require("../middlewares/rbacMiddleware");
const SystemLogsService = require("../services/systemLogsService");
const UserModel = require("../models/userModel");
const SchoolModel = require("../models/schoolModel");
const { db } = require("../database/db");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * POST /api/settings/min-score
 * Superadmin: Update global minimum score
 */
router.post("/min-score", requireRole("superadmin"), async (req, res) => {
  try {
    const { minimumScore } = req.body;

    // Validasi input
    if (minimumScore === undefined || minimumScore === null) {
      return res.status(400).json({
        status: "error",
        message: "minimumScore harus diisi"
      });
    }

    const score = parseInt(minimumScore, 10);
    if (isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({
        status: "error",
        message: "minimumScore harus angka 0-100"
      });
    }

    const now = new Date().toISOString();

    // Update atau insert setting
    const existing = await db.get(
      "SELECT * FROM system_settings WHERE `key` = 'minimum_score'"
    );

    if (existing) {
      await db.run(
        "UPDATE system_settings SET value = ?, updatedAt = ? WHERE `key` = 'minimum_score'",
        [score.toString(), now]
      );
    } else {
      await db.run(
        "INSERT INTO system_settings (`key`, value, updatedAt) VALUES (?, ?, ?)",
        ["minimum_score", score.toString(), now]
      );
    }

    // Log aksi
    await SystemLogsService.logAction(
      "UPDATE_MIN_SCORE",
      `Skor minimum diubah menjadi ${score}`,
      req.user.id
    );

    logger.info(`Minimum score updated to ${score} by ${req.user.email}`);

    res.json({
      status: "success",
      message: "Skor minimum berhasil diupdate",
      data: {
        key: "minimum_score",
        value: score,
        updatedAt: now
      }
    });
  } catch (err) {
    logger.error("Error di POST /settings/min-score:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Gagal update skor minimum"
    });
  }
});

/**
 * GET /api/settings/min-score
 * Public: Get current minimum score
 */
router.get("/min-score", async (req, res) => {
  try {
    const setting = await db.get(
      "SELECT value FROM system_settings WHERE `key` = 'minimum_score'"
    );

    const value = setting ? parseInt(setting.value, 10) : 75; // Default 75

    res.json({
      status: "success",
      data: {
        minimumScore: value
      }
    });
  } catch (err) {
    logger.error("Error di GET /settings/min-score:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Gagal mengambil skor minimum"
    });
  }
});

/**
 * POST /api/admin/create
 * Superadmin: Buat akun admin_sekolah untuk sekolah tertentu
 */
router.post("/admin/create", requireRole("superadmin"), async (req, res) => {
  try {
    const { name, email, password, schoolId } = req.body;

    // Validasi input
    if (!name || !email || !password || !schoolId) {
      return res.status(400).json({
        status: "error",
        message: "name, email, password, dan schoolId harus diisi"
      });
    }

    // Cek apakah sekolah ada
    const school = await SchoolModel.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        status: "error",
        message: "Sekolah tidak ditemukan"
      });
    }

    // Cek apakah email sudah terdaftar
    const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(400).json({
        status: "error",
        message: "Email sudah terdaftar"
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Buat user dengan role admin_sekolah
    const newUser = await UserModel.create({
      name,
      email,
      passwordHash,
      role: "admin_sekolah",
      schoolId
    });

    // Log aksi
    await SystemLogsService.logAction(
      "CREATE_ADMIN_SEKOLAH",
      `Admin sekolah dibuat: ${email} untuk sekolah ${school.schoolName}`,
      req.user.id
    );

    logger.info(`Admin sekolah created: ${email} for school ${schoolId}`);

    res.status(201).json({
      status: "success",
      message: "Admin sekolah berhasil dibuat",
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        schoolId: newUser.schoolId
      }
    });
  } catch (err) {
    logger.error("Error di POST /admin/create:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Gagal membuat admin sekolah"
    });
  }
});

/**
 * GET /api/admin/list
 * Superadmin: List semua admin accounts
 */
router.get("/admin/list", requireRole("superadmin"), async (req, res) => {
  try {
    const admins = await db.all(
      `SELECT id, name, email, role, schoolId, createdAt 
       FROM users 
       WHERE role = 'admin_sekolah'
       ORDER BY createdAt DESC`
    );

    res.json({
      status: "success",
      data: admins
    });
  } catch (err) {
    logger.error("Error di GET /admin/list:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Gagal mengambil daftar admin"
    });
  }
});

/**
 * GET /api/logs
 * Superadmin: Get system logs
 */
router.get("/logs", requireRole("superadmin"), async (req, res) => {
  try {
    const { action, limit = 100 } = req.query;

    let logs;
    if (action) {
      logs = await SystemLogsService.getLogsByAction(action, parseInt(limit, 10));
    } else {
      logs = await SystemLogsService.getAllLogs(parseInt(limit, 10));
    }

    res.json({
      status: "success",
      data: logs
    });
  } catch (err) {
    logger.error("Error di GET /logs:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Gagal mengambil logs"
    });
  }
});

module.exports = router;
