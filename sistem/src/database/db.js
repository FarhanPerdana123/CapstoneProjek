/**
 * Koneksi database MySQL menggunakan connection pool (mysql2/promise).
 * Ekspor objek `db` dengan empat metode abstrak:
 *   - run(sql, params)  → INSERT / UPDATE / DELETE
 *   - get(sql, params)  → SELECT satu baris
 *   - all(sql, params)  → SELECT banyak baris
 *   - exec(sql)         → perintah DDL tanpa parameter
 *
 * Inisialisasi koneksi dan migrasi schema dijalankan otomatis
 * saat modul ini pertama kali di-require.
 */

const config = require("../config");
const logger = require("../utils/logger");
const mysql = require("mysql2/promise");

const pool = mysql.createPool(config.db.mysql);

/** Normalisasi parameter: ubah `undefined` menjadi `null` agar aman untuk MySQL. */
function normalizeParams(params = []) {
  return params.map((p) => (p === undefined ? null : p));
}

const db = {
  /**
   * Eksekusi INSERT / UPDATE / DELETE.
   * @returns {{ lastID, insertId, changes, affectedRows }}
   */
  async run(sql, params = []) {
    const [result] = await pool.query(sql, normalizeParams(params));
    return {
      lastID: result.insertId,
      insertId: result.insertId,
      changes: result.affectedRows,
      affectedRows: result.affectedRows
    };
  },

  /**
   * Ambil satu baris hasil SELECT.
   * @returns {object|null}
   */
  async get(sql, params = []) {
    const [rows] = await pool.query(sql, normalizeParams(params));
    return rows && rows.length > 0 ? rows[0] : null;
  },

  /**
   * Ambil semua baris hasil SELECT.
   * @returns {object[]}
   */
  async all(sql, params = []) {
    const [rows] = await pool.query(sql, normalizeParams(params));
    return rows || [];
  },

  /**
   * Eksekusi perintah DDL (CREATE TABLE, ALTER TABLE, dll.) tanpa parameter.
   */
  async exec(sql) {
    await pool.query(sql);
  }
};

/**
 * Coba sambungkan ke MySQL dengan mekanisme retry (menunggu container Docker).
 * Gagal total setelah 12 percobaan (± 30 detik).
 */
async function initDatabase() {
  let retries = 12;

  while (retries > 0) {
    try {
      const connection = await pool.getConnection();
      connection.release();
      logger.info(
        `Koneksi database MySQL siap: ${config.db.mysql.host}:${config.db.mysql.port}/${config.db.mysql.database}`
      );
      break;
    } catch (err) {
      retries--;
      if (retries === 0) {
        logger.error("Gagal terhubung ke MySQL setelah semua percobaan:", err.message);
        return;
      }
      logger.warn(`Menunggu MySQL siap... (${retries} percobaan tersisa)`);
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  }

  logger.info("Connection pool MySQL siap digunakan.");
}

// Inisialisasi koneksi segera saat modul di-require
initDatabase();

// Jalankan migrasi schema setelah event loop siap (hindari circular dependency)
setImmediate(async () => {
  try {
    const { runMigrations } = require("./migrations");
    await runMigrations();
  } catch (err) {
    logger.error("Migrasi gagal — aplikasi tetap berjalan:", err);
  }
});

module.exports = { db, pool, initDatabase };
