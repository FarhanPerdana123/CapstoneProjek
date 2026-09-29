/**
 * Routes untuk Test Rooms (Kahoot-like PIN System)
 * 
 * Admin Sekolah:
 *   POST /api/rooms/generate - Generate PIN baru
 *   GET  /api/rooms - List rooms milik sekolah
 *   POST /api/rooms/:id/close - Tutup room
 * 
 * Siswa (Public):
 *   POST /api/rooms/validate-pin - Validasi PIN dan ambil room details
 */

const express = require("express");
const { requireRole, requireOwnSchool } = require("../middlewares/rbacMiddleware");
const TestRoomModel = require("../models/testRoomModel");
const SessionModel = require("../models/sessionModel");
const logger = require("../utils/logger");

const router = express.Router();

/**
 * POST /api/rooms/generate
 * Admin Sekolah: Generate PIN baru untuk sesi tes
 */
router.post("/generate", requireRole("admin_sekolah"), requireOwnSchool, async (req, res) => {
  try {
    const { level } = req.body;
    const schoolId = req.user.schoolId;

    // Validasi input
    if (!level || !["SD", "SMP"].includes(level)) {
      return res.status(400).json({
        status: "error",
        message: "Level harus 'SD' atau 'SMP'"
      });
    }

    // Generate PIN unik (retry sampai dapat yang belum ada)
    let pinCode;
    let attempts = 0;
    let existingRoom;
    do {
      pinCode = TestRoomModel.generateRandomPin();
      existingRoom = await TestRoomModel.findByPin(pinCode);
      attempts++;
    } while (existingRoom && attempts < 10);

    if (attempts >= 10) {
      return res.status(500).json({
        status: "error",
        message: "Gagal generate PIN unik setelah 10 percobaan"
      });
    }

    // Buat room baru
    const newRoom = await TestRoomModel.create({
      schoolId,
      pinCode,
      level
    });

    logger.info(`Room baru dibuat: PIN=${pinCode}, Level=${level}, School=${schoolId}`);

    res.json({
      status: "success",
      message: "PIN sesi berhasil dibuat",
      data: {
        roomId: newRoom.id,
        pinCode: newRoom.pinCode,
        level: newRoom.level,
        status: newRoom.status,
        createdAt: newRoom.createdAt
      }
    });
  } catch (err) {
    logger.error("Error di POST /rooms/generate:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Gagal membuat sesi PIN"
    });
  }
});

/**
 * GET /api/rooms
 * Admin Sekolah: List semua test rooms milik sekolah mereka
 */
router.get("/", requireRole("admin_sekolah"), requireOwnSchool, async (req, res) => {
  try {
    const schoolId = req.user.schoolId;
    const rooms = await TestRoomModel.findBySchoolId(schoolId);

    res.json({
      status: "success",
      data: rooms
    });
  } catch (err) {
    logger.error("Error di GET /rooms:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Gagal mengambil daftar rooms"
    });
  }
});

/**
 * POST /api/rooms/validate-pin
 * Public: Siswa validasi PIN dan ambil room details
 * Respon: { roomId, level, schoolId } atau error jika PIN invalid/closed
 */
router.post("/validate-pin", async (req, res) => {
  try {
    const { pinCode } = req.body;

    if (!pinCode) {
      return res.status(400).json({
        status: "error",
        message: "PIN harus diisi"
      });
    }

    const room = await TestRoomModel.findByPin(pinCode.toUpperCase());

    if (!room) {
      return res.status(404).json({
        status: "error",
        message: "PIN tidak ditemukan atau tidak valid"
      });
    }

    if (room.status !== "active") {
      return res.status(400).json({
        status: "error",
        message: "Sesi sudah ditutup atau tidak lagi aktif"
      });
    }

    // Return room details untuk siswa (tanpa schoolId, hanya yang perlu)
    res.json({
      status: "success",
      data: {
        roomId: room.id,
        level: room.level,
        pinCode: room.pinCode,
        status: room.status
      }
    });
  } catch (err) {
    logger.error("Error di POST /rooms/validate-pin:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Gagal validasi PIN"
    });
  }
});

/**
 * POST /api/rooms/:id/close
 * Admin Sekolah: Tutup test room
 */
router.post("/:id/close", requireRole("admin_sekolah"), requireOwnSchool, async (req, res) => {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const room = await TestRoomModel.findById(id);
    if (!room) {
      return res.status(404).json({
        status: "error",
        message: "Room tidak ditemukan"
      });
    }

    // Verifikasi room milik sekolah user
    if (room.schoolId !== schoolId) {
      return res.status(403).json({
        status: "error",
        message: "Anda tidak memiliki akses ke room ini"
      });
    }

    const updated = await TestRoomModel.close(id);

    logger.info(`Room ditutup: ID=${id}, PIN=${room.pinCode}`);

    res.json({
      status: "success",
      message: "Room berhasil ditutup",
      data: updated
    });
  } catch (err) {
    logger.error("Error di POST /rooms/:id/close:", err);
    res.status(500).json({
      status: "error",
      message: err.message || "Gagal menutup room"
    });
  }
});

module.exports = router;
