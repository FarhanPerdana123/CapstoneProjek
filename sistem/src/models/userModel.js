/**
 * Model user umum (tabel `users`).
 * Dipakai untuk autentikasi `admin_sekolah` dan `user` biasa via /api/auth.
 * Akun Super Admin menggunakan tabel terpisah: `super_admin`.
 *
 * Kolom penting:
 *   id (AUTO_INCREMENT), name, email, passwordHash,
 *   role (superadmin | admin_sekolah | user), schoolId, createdAt
 */

const { db } = require("../database/db");

/** Role yang valid di tabel users. */
const VALID_ROLES = ["superadmin", "admin_sekolah", "user"];

class UserModel {
  /** Cari user berdasarkan email (case-insensitive). */
  static async findByEmail(email) {
    if (!email) return null;
    const row = await db.get(
      "SELECT * FROM users WHERE email = ?",
      [email.trim().toLowerCase()]
    );
    return row || null;
  }

  /** Cari user berdasarkan ID. */
  static async findById(id) {
    if (!id) return null;
    const row = await db.get("SELECT * FROM users WHERE id = ?", [id]);
    return row || null;
  }

  /** Ambil semua admin sekolah yang terkait dengan sekolah tertentu. */
  static async findBySchoolId(schoolId) {
    if (!schoolId) return [];
    return db.all(
      "SELECT * FROM users WHERE schoolId = ? AND role = 'admin_sekolah' ORDER BY name ASC",
      [schoolId]
    );
  }

  /** Ambil semua akun superadmin (dari tabel users, bukan super_admin). */
  static async findAllSuperadmins() {
    return db.all(
      "SELECT * FROM users WHERE role = 'superadmin' ORDER BY name ASC"
    );
  }

  /**
   * Buat user baru.
   * @param {{ name, email, passwordHash, role?, schoolId? }} userData
   * @throws {Error} Jika role tidak valid atau admin_sekolah tidak memiliki schoolId di production
   */
  static async create(userData) {
    const { name, email, passwordHash, role = "admin_sekolah", schoolId = null } = userData;

    if (!VALID_ROLES.includes(role)) {
      throw new Error(`Role tidak valid. Pilihan: ${VALID_ROLES.join(", ")}`);
    }

    if (role === "admin_sekolah" && !schoolId && process.env.NODE_ENV === "production") {
      throw new Error("admin_sekolah harus memiliki schoolId di lingkungan production.");
    }

    const result = await db.run(
      "INSERT INTO users (name, email, passwordHash, role, schoolId) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), email.trim().toLowerCase(), passwordHash, role, schoolId]
    );

    return this.findById(result.insertId);
  }

  /**
   * Perbarui data user. Hanya field yang dikirim yang akan diubah.
   * @param {number} id
   * @param {{ name?, role?, schoolId? }} updates
   */
  static async update(id, updates) {
    const { name, role, schoolId } = updates;
    const fields = [];
    const values = [];

    if (name) {
      fields.push("name = ?");
      values.push(name.trim());
    }
    if (role) {
      if (!VALID_ROLES.includes(role)) {
        throw new Error(`Role tidak valid. Pilihan: ${VALID_ROLES.join(", ")}`);
      }
      fields.push("role = ?");
      values.push(role);
    }
    if (schoolId !== undefined) {
      fields.push("schoolId = ?");
      values.push(schoolId);
    }

    if (fields.length === 0) return this.findById(id);

    values.push(id);
    await db.run(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
    return this.findById(id);
  }
}

module.exports = UserModel;
