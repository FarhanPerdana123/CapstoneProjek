/**
 * Controller pengaturan sistem — menangani endpoint /api/settings/*.
 *
 * Endpoint yang ditangani:
 *   GET  /api/settings/min-score              → Baca nilai minimum score
 *   POST /api/settings/min-score              → Simpan nilai minimum score
 *   POST /api/settings/admin/create           → Buat akun admin sekolah baru
 *   GET  /api/settings/admin/list             → Daftar semua admin sekolah
 *   GET  /api/settings/logs                   → Riwayat system logs
 */

const bcrypt = require("bcryptjs");
const SystemLogsService = require("../services/systemLogsService");
const UserModel = require("../models/userModel");
const SchoolModel = require("../models/schoolModel");
const { db } = require("../database/db");
const logger = require("../utils/logger");

/** Skor minimum default jika belum pernah diatur. */
const DEFAULT_MINIMUM_SCORE = 75;

/**
 * POST /api/settings/min-score
 * Simpan nilai skor minimum tes (0–100). Hanya untuk role superadmin.
 */
async function setMinScore(req, res, next) {
  try {
    const { minimumScore } = req.body;

    if (minimumScore === undefined || minimumScore === null) {
      return res.status(400).json({ success: false, message: "minimumScore harus diisi." });
    }

    const score = parseInt(minimumScore, 10);
    if (isNaN(score) || score < 0 || score > 100) {
      return res.status(400).json({
        success: false,
        message: "minimumScore harus berupa angka antara 0 hingga 100."
      });
    }

    const now = new Date().toISOString();
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

    logger.info(`Skor minimum diperbarui menjadi ${score} oleh ${req.user.email}`);

    return res.json({
      success: true,
      message: "Skor minimum berhasil diperbarui.",
      data: { key: "minimum_score", value: score, updatedAt: now }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/settings/min-score
 * Baca nilai skor minimum saat ini. Endpoint publik (tidak butuh auth).
 */
async function getMinScore(req, res, next) {
  try {
    const setting = await db.get(
      "SELECT value FROM system_settings WHERE `key` = 'minimum_score'"
    );
    const value = setting ? parseInt(setting.value, 10) : DEFAULT_MINIMUM_SCORE;

    return res.json({
      success: true,
      data: { minimumScore: value }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/settings/admin/create
 * Buat akun admin sekolah baru. Satu sekolah hanya boleh punya satu admin.
 * Hanya untuk role superadmin.
 */
async function createAdminSekolah(req, res, next) {
  try {
    const { name, email, password, schoolId } = req.body;

    if (!name || !email || !password || !schoolId) {
      return res.status(400).json({
        success: false,
        message: "name, email, password, dan schoolId wajib diisi."
      });
    }

    const school = await SchoolModel.findById(schoolId);
    if (!school) {
      return res.status(404).json({ success: false, message: "Sekolah tidak ditemukan." });
    }

    // Pastikan sekolah belum memiliki admin
    const existingAdmin = await db.get(
      "SELECT id FROM users WHERE schoolId = ?",
      [schoolId]
    );
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Sekolah ini sudah memiliki akun admin (maks. 1 admin per sekolah)."
      });
    }

    // Pastikan email belum dipakai
    const existingEmail = await UserModel.findByEmail(email);
    if (existingEmail) {
      return res.status(400).json({ success: false, message: "Email sudah terdaftar." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser = await UserModel.create({ name, email, passwordHash, role: "admin_sekolah", schoolId });

    await SystemLogsService.logAction(
      "CREATE_ADMIN_SEKOLAH",
      `Admin sekolah dibuat: ${email} untuk sekolah ${school.schoolName}`,
      req.user.id
    );

    logger.info(`Admin sekolah baru: ${email} (sekolah: ${schoolId})`);

    return res.status(201).json({
      success: true,
      message: "Admin sekolah berhasil dibuat.",
      data: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        schoolId: newUser.schoolId
      }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/settings/admin/list
 * Daftar semua akun admin sekolah. Hanya untuk role superadmin.
 */
async function listAdminSekolah(req, res, next) {
  try {
    const admins = await db.all(
      `SELECT id, name, email, role, schoolId, createdAt
       FROM users
       WHERE role = 'admin_sekolah'
       ORDER BY createdAt DESC`
    );
    return res.json({ success: true, data: admins });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/settings/logs
 * Riwayat aktivitas sistem. Hanya untuk role superadmin.
 * Query param: ?action=<aksi>&limit=<jumlah>
 */
async function getLogs(req, res, next) {
  try {
    const { action, limit = 100 } = req.query;
    const limitNum = parseInt(limit, 10) || 100;

    const logs = action
      ? await SystemLogsService.getLogsByAction(action, limitNum)
      : await SystemLogsService.getAllLogs(limitNum);

    return res.json({ success: true, data: logs });
  } catch (err) {
    return next(err);
  }
}

module.exports = { setMinScore, getMinScore, createAdminSekolah, listAdminSekolah, getLogs };
