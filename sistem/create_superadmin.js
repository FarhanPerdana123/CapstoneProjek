const { db } = require('./src/database/db');
const bcrypt = require('bcryptjs');

async function createSuperAdmin() {
  try {
    const name = "Super Admin Utama";
    const email = "superadmin@skrining.com";
    const password = "password123";
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Cek apakah sudah ada
    const existing = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (existing) {
      console.log(`❌ Superadmin dengan email ${email} sudah ada!`);
      process.exit(0);
    }

    // Insert ke db (auto_increment ID)
    await db.run(
      "INSERT INTO users (name, email, passwordHash, role, schoolId) VALUES (?, ?, ?, ?, ?)",
      [name, email, passwordHash, 'superadmin', null]
    );

    console.log(`✅ Superadmin berhasil dibuat!`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Password: ${password}`);
    process.exit(0);
  } catch (error) {
    console.error("Gagal membuat superadmin:", error);
    process.exit(1);
  }
}

createSuperAdmin();
