/**
 * Controller manajemen ruang tes (PIN sesi) — endpoint /api/rooms/*.
 *
 * Endpoint yang ditangani:
 *   POST /api/rooms/generate           → Buat PIN sesi baru (admin_sekolah)
 *   GET  /api/rooms/                   → Daftar PIN milik sekolah (admin_sekolah)
 *   POST /api/rooms/validate-pin       → Validasi PIN sebelum siswa mulai tes (publik)
 *   POST /api/rooms/:id/close          → Tutup sesi PIN (admin_sekolah)
 */

const TestRoomModel = require("../models/testRoomModel");
const logger = require("../utils/logger");

/** Jumlah maksimum percobaan generate PIN sebelum menyerah. */
const MAX_PIN_RETRIES = 10;

/**
 * POST /api/rooms/generate
 * Generate PIN sesi unik untuk satu jenjang tes.
 * Hanya admin sekolah yang dapat memanggil endpoint ini.
 */
async function generatePin(req, res, next) {
  try {
    const { level } = req.body;
    const schoolId = req.user.schoolId;

    if (!level || !["SD", "SMP"].includes(String(level).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: "Level harus 'SD' atau 'SMP'."
      });
    }

    // Generate PIN unik — coba ulang jika PIN sudah dipakai
    let pinCode;
    let attempts = 0;
    let existingRoom;

    do {
      pinCode = TestRoomModel.generateRandomPin();
      existingRoom = await TestRoomModel.findByPin(pinCode);
      attempts++;
    } while (existingRoom && attempts < MAX_PIN_RETRIES);

    if (attempts >= MAX_PIN_RETRIES) {
      return res.status(500).json({
        success: false,
        message: `Gagal generate PIN unik setelah ${MAX_PIN_RETRIES} percobaan. Coba lagi.`
      });
    }

    const newRoom = await TestRoomModel.create({ schoolId, pinCode, level: level.toUpperCase() });
    logger.info(`Ruang tes baru: PIN=${pinCode}, Level=${level}, SekolahID=${schoolId}`);

    return res.status(201).json({
      success: true,
      message: "PIN sesi berhasil dibuat.",
      data: {
        roomId: newRoom.id,
        pinCode: newRoom.pinCode,
        level: newRoom.level,
        status: newRoom.status,
        createdAt: newRoom.createdAt
      }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/rooms/
 * Ambil semua ruang tes milik sekolah yang sedang login.
 */
async function listRooms(req, res, next) {
  try {
    const schoolId = req.user.schoolId;
    const rooms = await TestRoomModel.findBySchoolId(schoolId);
    return res.json({ success: true, data: rooms });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/rooms/validate-pin
 * Validasi PIN yang dimasukkan siswa sebelum memulai tes. Endpoint publik.
 * Body: { pinCode: string }
 */
async function validatePin(req, res, next) {
  try {
    const { pinCode } = req.body;

    if (!pinCode) {
      return res.status(400).json({ success: false, message: "PIN harus diisi." });
    }

    const room = await TestRoomModel.findByPin(String(pinCode).toUpperCase());

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "PIN tidak ditemukan atau tidak valid."
      });
    }

    if (room.status !== "active") {
      return res.status(400).json({
        success: false,
        message: "Sesi ini sudah ditutup atau tidak lagi aktif."
      });
    }

    return res.json({
      success: true,
      data: {
        roomId: room.id,
        level: room.level,
        pinCode: room.pinCode,
        status: room.status
      }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/rooms/:id/close
 * Tutup ruang tes. Hanya admin sekolah pemilik ruang yang dapat menutup.
 */
async function closeRoom(req, res, next) {
  try {
    const { id } = req.params;
    const schoolId = req.user.schoolId;

    const room = await TestRoomModel.findById(id);
    if (!room) {
      return res.status(404).json({ success: false, message: "Ruang tes tidak ditemukan." });
    }

    // Pastikan ruang tes milik sekolah yang sedang login
    if (room.schoolId !== schoolId) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak. Ruang tes ini bukan milik sekolah Anda."
      });
    }

    const updated = await TestRoomModel.close(id);
    logger.info(`Ruang tes ditutup: ID=${id}, PIN=${room.pinCode}`);

    return res.json({
      success: true,
      message: "Ruang tes berhasil ditutup.",
      data: updated
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { generatePin, listRooms, validatePin, closeRoom };
