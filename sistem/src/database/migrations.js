
const { db, client } = require("./db");
const logger = require("../utils/logger");

async function runMigrations() {
  try {
    logger.info(`Memulai migrasi database (MYSQL)...`);

        try {
      await db.exec("ALTER TABLE users ADD COLUMN schoolId INT NULL;");
      logger.info("✓ Kolom schoolId ditambahkan ke tabel users");
    } catch (e) {
      if (
        e.code === "ER_DUP_FIELDNAME" ||
        (e.message && e.message.toLowerCase().includes("duplicate column"))
      ) {
        logger.info("✓ Kolom schoolId sudah ada di tabel users");
      } else {
        logger.warn("Info ALTER users:", e.message);
      }
    }

        await db.exec(`
      CREATE TABLE IF NOT EXISTS schools (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schoolName VARCHAR(255) NOT NULL,
        address TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    logger.info("✓ Tabel schools dibuat/sudah ada");

        await db.exec(`
      CREATE TABLE IF NOT EXISTS test_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schoolId INT NOT NULL,
        pinCode VARCHAR(20) UNIQUE NOT NULL,
        level VARCHAR(10) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_test_rooms_pin (pinCode),
        INDEX idx_test_rooms_school (schoolId),
        INDEX idx_test_rooms_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    logger.info("✓ Tabel test_rooms dibuat/sudah ada");

        await db.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        \`key\` VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    logger.info("✓ Tabel system_settings dibuat/sudah ada");

        await db.exec(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        userId INT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_system_logs_action (action),
        INDEX idx_system_logs_created (createdAt),
        INDEX idx_system_logs_user (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    logger.info("✓ Tabel system_logs dibuat/sudah ada");

        try {
      await db.exec("ALTER TABLE screening_sessions ADD COLUMN roomId INT NULL;");
      logger.info("✓ Kolom roomId ditambahkan ke screening_sessions");
    } catch (e) {
      if (
        e.code === "ER_DUP_FIELDNAME" ||
        (e.message && e.message.toLowerCase().includes("duplicate column"))
      ) {
        logger.info("✓ Kolom roomId sudah ada di screening_sessions");
      } else {
        logger.warn("Info ALTER screening_sessions:", e.message);
      }
    }

        const existingMinScore = await db.get(
      "SELECT value FROM system_settings WHERE `key` = 'minimum_score'"
    );
    if (!existingMinScore) {
      const now = new Date().toISOString();
      await db.run(
        "INSERT INTO system_settings (`key`, value, updatedAt) VALUES (?, ?, ?)",
        ["minimum_score", "75", now]
      );
      logger.info("✓ Default minimum_score setting dibuat (75)");
    } else {
      logger.info("✓ Setting minimum_score sudah ada");
    }

    logger.success("Migrasi database berhasil!");
  } catch (err) {
    logger.error("Gagal menjalankan migrasi database:", err);
    throw err;
  }
}

module.exports = { runMigrations };
