
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

router.post("/min-score", requireRole("superadmin"), async (req, res) => {
  try {
    const { minimumScore } = req.body;

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

router.post("/admin/create", requireRole("superadmin"), async (req, res) => {
  try {
    const { name, email, password, schoolId } = req.body;

        if (!name || !email || !password || !schoolId) {
      return res.status(400).json({
        status: "error",
        message: "name, email, password, dan schoolId harus diisi"
      });
    }

        const school = await SchoolModel.findById(schoolId);
    if (!school) {
      return res.status(404).json({
        status: "error",
        message: "Sekolah tidak ditemukan"
      });
    }

        const existingAdmin = await db.get("SELECT id FROM users WHERE schoolId = ?", [schoolId]);
    if (existingAdmin) {
      return res.status(400).json({
        status: "error",
        message: "Sekolah ini sudah memiliki akun admin. Satu sekolah hanya boleh memiliki maksimal 1 admin."
      });
    }

        const existing = await UserModel.findByEmail(email);
    if (existing) {
      return res.status(400).json({
        status: "error",
        message: "Email sudah terdaftar"
      });
    }

        const passwordHash = await bcrypt.hash(password, 10);

    // Buat user dengan role admin_sekolah
    const newUser = await UserModel.create({
      name,
      email,
      passwordHash,
      role: "admin_sekolah",
      schoolId
    });

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
