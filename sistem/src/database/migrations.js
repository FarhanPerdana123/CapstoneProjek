/**
 * Migrasi schema tambahan — dijalankan otomatis saat server pertama kali start.
 *
 * Skema ERD utama dikelola oleh `docker/mysql/init.sql`.
 * File ini hanya menambahkan kolom-kolom UI yang dibutuhkan Panel Super Admin
 * namun belum tercakup dalam init.sql (backward-compatible, idempotent).
 */

const { db } = require("./db");
const logger = require("../utils/logger");

/**
 * Daftar kolom tambahan yang perlu dipastikan ada.
 * Migrasi bersifat idempotent: kolom yang sudah ada tidak akan ditambah ulang.
 */
const EXTRA_COLUMNS = [
  {
    table: "sekolah",
    column: "kontak_telepon",
    definition: "VARCHAR(30) NULL AFTER `alamat`"
  },
  {
    table: "konfigurasi_penilaian",
    column: "warna",
    definition: "VARCHAR(20) NOT NULL DEFAULT 'biru' AFTER `kategori_hasil`"
  },
  {
    table: "kategori_asesmen",
    column: "warna",
    definition: "VARCHAR(20) NULL AFTER `nama_kategori`"
  }
];

/** Periksa apakah kolom sudah ada di tabel tertentu. */
async function columnExists(table, column) {
  const row = await db.get(
    `SELECT COUNT(*) AS total
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME   = ?
       AND COLUMN_NAME  = ?`,
    [table, column]
  );
  return Number(row && row.total) > 0;
}

/** Tambahkan kolom yang belum ada ke tabel yang sesuai. */
async function ensureColumns() {
  for (const item of EXTRA_COLUMNS) {
    const exists = await columnExists(item.table, item.column);
    if (!exists) {
      await db.exec(
        `ALTER TABLE \`${item.table}\` ADD COLUMN \`${item.column}\` ${item.definition}`
      );
      logger.info(`Migrasi: kolom \`${item.table}\`.\`${item.column}\` ditambahkan.`);
    }
  }
}

/**
 * Isi warna default pada baris `konfigurasi_penilaian` yang belum berwarna.
 * Warna diurutkan berdasarkan palet dan posisi rentang (skor_min ASC).
 */
async function seedWarnaKonfigurasi() {
  const rows = await db.all(
    `SELECT id_konfigurasiPenilaian, test_id, skor_min, warna
     FROM konfigurasi_penilaian
     WHERE deleted_at IS NULL
     ORDER BY test_id ASC, skor_min ASC`
  );

  const palette = ["merah", "jingga", "hijau", "biru", "ungu", "toska"];

  // Kelompokkan per test_id
  const perTest = new Map();
  for (const row of rows) {
    const list = perTest.get(row.test_id) || [];
    list.push(row);
    perTest.set(row.test_id, list);
  }

  // Terapkan warna palet berurutan pada setiap kelompok
  for (const list of perTest.values()) {
    for (let i = 0; i < list.length; i++) {
      const row = list[i];
      const warna = palette[Math.min(i, palette.length - 1)];

      // Hanya update jika warna masih default atau kosong
      if (!row.warna || row.warna === "biru") {
        await db.run(
          "UPDATE konfigurasi_penilaian SET warna = ? WHERE id_konfigurasiPenilaian = ?",
          [warna, row.id_konfigurasiPenilaian]
        );
      }
    }
  }
}

/** Entry point: jalankan semua migrasi secara berurutan. */
async function runMigrations() {
  try {
    logger.info("Memeriksa status migrasi database...");
    await ensureColumns();
    await seedWarnaKonfigurasi();
    logger.success("Migrasi database selesai — schema up-to-date.");
  } catch (err) {
    logger.error("Gagal menjalankan migrasi:", err);
    throw err;
  }
}

module.exports = { runMigrations };
