/**
 * Controller autentikasi user umum.
 * Menangani registrasi, login, dan pengambilan profil untuk akun di tabel `users`.
 *
 * Catatan: Super Admin menggunakan endpoint /api/admin/login (adminApiController),
 * dan akun Sekolah menggunakan /api/sekolah/login (sekolahAuthController).
 */

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const UserModel = require("../models/userModel");
const ApiResponse = require("../utils/apiResponse");
const logger = require("../utils/logger");

class AuthController {
  /**
   * POST /api/auth/register
   * Daftar akun baru. Role default adalah "user".
   */
  static async register(req, res, next) {
    try {
      const { name, email, password, role = "user" } = req.body || {};

      if (!name || !email || !password) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Nama lengkap, email, dan password wajib diisi."
        });
      }

      const emailBersih = email.trim().toLowerCase();

      if (await UserModel.findByEmail(emailBersih)) {
        return ApiResponse.error(res, {
          statusCode: 409,
          message: "Email sudah digunakan. Silakan gunakan email lain atau langsung login."
        });
      }

      if (password.length < 6) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Password minimal harus 6 karakter."
        });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const userBaru = await UserModel.create({
        name: name.trim(),
        email: emailBersih,
        passwordHash,
        role
      });

      const token = jwt.sign(
        { id: userBaru.id, name: userBaru.name, email: userBaru.email, role: userBaru.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      logger.info(`Pengguna baru terdaftar: ${userBaru.email} (ID: ${userBaru.id})`);

      return res.status(201).json({
        success: true,
        message: "Akun berhasil didaftarkan.",
        token,
        user: {
          id: userBaru.id,
          name: userBaru.name,
          email: userBaru.email,
          role: userBaru.role,
          createdAt: userBaru.createdAt
        }
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /api/auth/login
   * Login dengan email & password. Mengembalikan token JWT.
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Email dan password wajib diisi."
        });
      }

      const user = await UserModel.findByEmail(email.trim().toLowerCase());

      // Gunakan pesan error generik untuk keamanan (tidak bocorkan apakah email ada)
      const authFailed = !user || !(await bcrypt.compare(password, user.passwordHash));
      if (authFailed) {
        return ApiResponse.error(res, {
          statusCode: 401,
          message: "Email atau password yang Anda masukkan salah."
        });
      }

      const token = jwt.sign(
        { id: user.id, name: user.name, email: user.email, role: user.role },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      logger.info(`Login sukses: ${user.email} (ID: ${user.id})`);

      return res.json({
        success: true,
        message: "Login berhasil.",
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * GET /api/auth/me
   * Kembalikan payload token JWT sebagai profil user yang sedang login.
   * Data lengkap bisa diambil dari database jika diperlukan.
   */
  static getProfile(req, res) {
    return ApiResponse.success(res, {
      message: "Profil user berhasil diambil.",
      data: req.user
    });
  }
}

module.exports = { AuthController };
