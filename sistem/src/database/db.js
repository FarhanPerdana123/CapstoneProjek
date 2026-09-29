/**
 * Database Layer (MySQL)
 * 
 * Mengelola koneksi database MySQL (Docker),
 * inisialisasi skema tabel & indeks secara otomatis,
 * serta menyediakan antarmuka Promise yang seragam untuk query DML & DQL.
 */

const path = require("path");
const fs = require("fs");
const config = require("../config");
const logger = require("../utils/logger");

const client = "mysql";

const mysql = require("mysql2/promise");

const pool = mysql.createPool(config.db.mysql);

// Wrapper Promise untuk MySQL dengan format seragam
const db = {
  /**
   * Menjalankan query DML (INSERT, UPDATE, DELETE)
   * @param {string} sql
   * @param {Array} params
   * @returns {Promise<{lastID: number, insertId: number, changes: number, affectedRows: number}>}
   */
  async run(sql, params = []) {
    const normalizedParams = params.map(p => (p === undefined ? null : p));
    const [result] = await pool.query(sql, normalizedParams);
    return {
      lastID: result.insertId,
      insertId: result.insertId,
      changes: result.affectedRows,
      affectedRows: result.affectedRows
    };
  },

  /**
   * Mengambil 1 baris hasil query (SELECT single)
   * @param {string} sql
   * @param {Array} params
   * @returns {Promise<any>}
   */
  async get(sql, params = []) {
    const normalizedParams = params.map(p => (p === undefined ? null : p));
    const [rows] = await pool.query(sql, normalizedParams);
    return rows && rows.length > 0 ? rows[0] : null;
  },

  /**
   * Mengambil semua baris hasil query (SELECT multi)
   * @param {string} sql
   * @param {Array} params
   * @returns {Promise<Array<any>>}
   */
  async all(sql, params = []) {
    const normalizedParams = params.map(p => (p === undefined ? null : p));
    const [rows] = await pool.query(sql, normalizedParams);
    return rows || [];
  },

  /**
   * Menjalankan statement SQL mentah
   * @param {string} sql
   * @returns {Promise<void>}
   */
  async exec(sql) {
    await pool.query(sql);
  }
};

const rawDb = pool;

/**
 * Inisialisasi skema tabel & indeks database
 */
async function initDatabase() {
  // Retry loop saat MySQL container baru booting
  let retries = 12;
  while (retries > 0) {
    try {
      const connection = await pool.getConnection();
      connection.release();
      logger.info(`Koneksi database MySQL siap di ${config.db.mysql.host}:${config.db.mysql.port} [DB: ${config.db.mysql.database}]`);
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        logger.error("Gagal terhubung ke MySQL:", err.message);
        return;
      }
      logger.warn(`Menunggu database MySQL siap... (${retries} percobaan tersisa)`);
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  try {
    // 1. Schools
    await db.exec(`
      CREATE TABLE IF NOT EXISTS schools (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schoolName VARCHAR(255) NOT NULL,
        address TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 2. Users
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        passwordHash VARCHAR(255) NOT NULL,
        role ENUM('user', 'admin_sekolah', 'superadmin') DEFAULT 'user',
        schoolId INT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 3. Questions
    await db.exec(`
      CREATE TABLE IF NOT EXISTS questions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        questionCode VARCHAR(64) UNIQUE NOT NULL,
        level VARCHAR(10) NOT NULL,
        categoryKey VARCHAR(50) NOT NULL,
        category VARCHAR(100) NOT NULL,
        difficulty VARCHAR(20) NOT NULL,
        questionText TEXT NOT NULL,
        optionsJson LONGTEXT NOT NULL,
        correctAnswer VARCHAR(20) NOT NULL,
        explanation TEXT,
        scoreWeight INT DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 4. Test Rooms
    await db.exec(`
      CREATE TABLE IF NOT EXISTS test_rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        schoolId INT NOT NULL,
        pinCode VARCHAR(20) UNIQUE NOT NULL,
        level VARCHAR(10) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 5. Screening Sessions
    await db.exec(`
      CREATE TABLE IF NOT EXISTS screening_sessions (
        sessionId INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NULL,
        roomId INT NULL,
        level VARCHAR(10) NOT NULL,
        studentName VARCHAR(255) NOT NULL,
        studentAge VARCHAR(50) NULL,
        studentGrade VARCHAR(50) NULL,
        studentSchool VARCHAR(255) NULL,
        status VARCHAR(50) NOT NULL,
        startedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        completedAt DATETIME NULL,
        answersJson LONGTEXT NULL,
        resultJson LONGTEXT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 6. System Settings
    await db.exec(`
      CREATE TABLE IF NOT EXISTS system_settings (
        \`key\` VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // 7. System Logs
    await db.exec(`
      CREATE TABLE IF NOT EXISTS system_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        userId INT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);

    // Indeks Helper
    const ensureIndex = async (tableName, indexName, columns) => {
      try {
        const rows = await db.all(
          `SHOW INDEX FROM \`${tableName}\` WHERE Key_name = ?`,
          [indexName]
        );
        if (!rows || rows.length === 0) {
          await db.exec(`CREATE INDEX \`${indexName}\` ON \`${tableName}\` (${columns})`);
        }
      } catch (e) {
        // ignore duplicate
      }
    };

    await ensureIndex("questions", "idx_questions_level_cat", "level, categoryKey");
    await ensureIndex("questions", "idx_questions_code", "questionCode");
    await ensureIndex("test_rooms", "idx_test_rooms_pin", "pinCode");
    await ensureIndex("test_rooms", "idx_test_rooms_school", "schoolId");
    await ensureIndex("test_rooms", "idx_test_rooms_status", "status");
    await ensureIndex("screening_sessions", "idx_sessions_user", "userId");
    await ensureIndex("screening_sessions", "idx_sessions_status", "status");
    await ensureIndex("screening_sessions", "idx_screening_sessions_room", "roomId");
    await ensureIndex("system_logs", "idx_system_logs_action", "action");
    await ensureIndex("system_logs", "idx_system_logs_created", "createdAt");
    await ensureIndex("system_logs", "idx_system_logs_user", "userId");

    logger.info("Inisialisasi tabel dan indeks database MySQL berhasil.");
  } catch (err) {
    logger.error("Gagal melakukan inisialisasi database MySQL:", err);
  }
}

// Inisialisasi tabel segera saat modul pertama kali di-load
initDatabase();

// Import dan jalankan migrasi (lazy-load untuk hindari circular dependency)
setImmediate(async () => {
  try {
    const { runMigrations } = require("./migrations");
    await runMigrations();
  } catch (err) {
    logger.error("Migrasi gagal, aplikasi tetap berjalan:", err);
  }
});

module.exports = { db, rawDb, pool, initDatabase, client };
