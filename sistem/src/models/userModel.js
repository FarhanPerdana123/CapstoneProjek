
const { db } = require("../database/db");

class UserModel {
    static async findByEmail(email) {
    if (!email) return null;
    const cleanEmail = email.trim().toLowerCase();
    const row = await db.get("SELECT * FROM users WHERE email = ?", [cleanEmail]);
    return row || null;
  }

    static async findById(id) {
    if (!id) return null;
    const row = await db.get("SELECT * FROM users WHERE id = ?", [id]);
    return row || null;
  }

    static async findBySchoolId(schoolId) {
    if (!schoolId) return [];
    return await db.all(
      "SELECT * FROM users WHERE schoolId = ? AND role = 'admin_sekolah' ORDER BY name ASC",
      [schoolId]
    );
  }

    static async findAllSuperadmins() {
    return await db.all("SELECT * FROM users WHERE role = 'superadmin' ORDER BY name ASC");
  }

    static async create(userData) {
    const { name, email, passwordHash, role = "admin_sekolah", schoolId = null } = userData;
    const cleanEmail = email.trim().toLowerCase();

    // Validasi role: superadmin, admin_sekolah, atau user umum
    const allowedRoles = ["superadmin", "admin_sekolah", "user"];
    if (!allowedRoles.includes(role)) {
      throw new Error("Role harus 'superadmin', 'admin_sekolah', atau 'user'");
    }

    // admin_sekolah sebaiknya memiliki schoolId jika disediakan
    if (role === "admin_sekolah" && !schoolId && process.env.NODE_ENV === "production") {
      throw new Error("admin_sekolah harus memiliki schoolId");
    }

    const result = await db.run(
      "INSERT INTO users (name, email, passwordHash, role, schoolId) VALUES (?, ?, ?, ?, ?)",
      [name.trim(), cleanEmail, passwordHash, role, schoolId]
    );

    return this.findById(result.insertId);
  }

    static async update(id, updates) {
    const { name, role, schoolId } = updates;
    const fields = [];
    const values = [];

    if (name) {
      fields.push("name = ?");
      values.push(name.trim());
    }
    if (role) {
      if (!["superadmin", "admin_sekolah", "user"].includes(role)) {
        throw new Error("Role harus 'superadmin', 'admin_sekolah', atau 'user'");
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
    await db.run(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );

    return this.findById(id);
  }
}

module.exports = UserModel;
