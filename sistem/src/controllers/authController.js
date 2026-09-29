
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config");
const UserModel = require("../models/userModel");
const ApiResponse = require("../utils/apiResponse");
const logger = require("../utils/logger");

class AuthController {
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

      const existingUser = await UserModel.findByEmail(emailBersih);
      if (existingUser) {
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

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

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

      logger.info(`Pengguna baru terdaftar: ${userBaru.email} (${userBaru.id})`);

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
      next(err);
    }
  }

    static async login(req, res, next) {
    try {
      const { email, password } = req.body || {};

      if (!email || !password) {
        return ApiResponse.error(res, {
          statusCode: 400,
          message: "Email dan password wajib diisi."
        });
      }

      const emailBersih = email.trim().toLowerCase();
      const user = await UserModel.findByEmail(emailBersih);

      if (!user) {
        return ApiResponse.error(res, {
          statusCode: 401,
          message: "Email atau password yang Anda masukkan salah."
        });
      }

      const passwordCocok = await bcrypt.compare(password, user.passwordHash);
      if (!passwordCocok) {
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

      logger.info(`Login sukses: ${user.email} (${user.id})`);

      return res.status(200).json({
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
      next(err);
    }
  }

    static getProfile(req, res) {
    return ApiResponse.success(res, {
      message: "Profil user berhasil diambil.",
      data: req.user
    });
  }
}

module.exports = { AuthController };
