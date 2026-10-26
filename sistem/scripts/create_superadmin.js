/**
 * Script utilitas: Membuat akun Super Admin pertama.
 * Jalankan sekali dengan: node scripts/create_superadmin.js (atau npm run create-superadmin)
 *
 * Akun Super Admin disimpan di tabel `super_admin` (bukan `users`).
 * Username, email, dan password dapat diubah sesuai kebutuhan sebelum dijalankan.
 */

const { db } = require("../src/database/db");
const bcrypt = require("bcryptjs");

async function createSuperAdmin() {
  const username = "superadmin";
  const email = "superadmin@skrining.com";
  const password = "password123";

  try {
    // Periksa apakah akun sudah ada
    const existing = await db.get(
      "SELECT id_admin FROM super_admin WHERE LOWER(email) = ?",
      [email.toLowerCase()]
    );

    if (existing) {
      console.log(`❌ Super Admin dengan email "${email}" sudah ada.`);
      process.exit(0);
    }

    // Hash password sebelum disimpan
    const passwordHash = await bcrypt.hash(password, 10);

    await db.run(
      "INSERT INTO super_admin (username, email, password) VALUES (?, ?, ?)",
      [username, email, passwordHash]
    );

    console.log("✅ Super Admin berhasil dibuat!");
    console.log(`   Username : ${username}`);
    console.log(`   Email    : ${email}`);
    console.log(`   Password : ${password}  ← Segera ganti setelah login pertama!`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Gagal membuat Super Admin:", err.message);
    process.exit(1);
  }
}

createSuperAdmin();
