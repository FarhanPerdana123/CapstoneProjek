/**
 * Service Layer untuk Panel Super Admin.
 * Menangani semua query basis data ke tabel:
 * - `super_admin`: kredensial dan profil super admin
 * - `sekolah`: data institusi sekolah mitra
 * - `tes_skrining`: master instrumen asesmen kognitif
 * - `kategori_asesmen`: dimensi kognitif (logika, numerik, dsb.)
 * - `pertanyaan` & `opsi_jawaban`: bank soal asesmen
 * - `konfigurasi_penilaian`: rentang skor dan interpretasi hasil
 */

const { db } = require("../database/db");
const bcrypt = require("bcryptjs");

/** Jumlah item default per halaman untuk paginasi */
const PER_PAGE = 8;

/**
 * Konversi nilai ke integer dengan fallback default.
 * @param {*} value
 * @param {number} fallback
 * @returns {number}
 */
function toInt(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Format 2 digit angka (padding nol).
 * @param {number} n
 * @returns {string}
 */
function pad(n) {
  return String(n).padStart(2, "0");
}

/** Nama bulan singkat berbahasa Indonesia */
const BULAN_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/**
 * Format timestamp MySQL/ISO ke string tanggal ramah pengguna (contoh: "14 Okt 2026 • 15:30").
 * @param {string|Date} value
 * @param {boolean} [withTime=false]
 * @returns {string}
 */
function formatTanggal(value, withTime = false) {
  if (!value) return "-";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  const base = `${pad(d.getDate())} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
  return withTime ? `${base} • ${pad(d.getHours())}:${pad(d.getMinutes())}` : base;
}

/* ------------------------------------------------------------------ */
/* 1. Identitas & Autentikasi Super Admin                             */
/* ------------------------------------------------------------------ */

/**
 * Mengambil data profil Super Admin berdasarkan ID.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getSuperAdmin(id) {
  if (!id) return null;
  return db.get(
    "SELECT id_admin, username, email, created_at FROM super_admin WHERE id_admin = ? AND deleted_at IS NULL",
    [id]
  );
}

/**
 * Mencari akun Super Admin berdasarkan alamat email.
 * @param {string} email
 * @returns {Promise<object|null>}
 */
async function findSuperAdminByEmail(email) {
  if (!email) return null;
  return db.get(
    "SELECT * FROM super_admin WHERE LOWER(email) = ? AND deleted_at IS NULL LIMIT 1",
    [String(email).trim().toLowerCase()]
  );
}

/**
 * Verifikasi login Super Admin berdasarkan email dan password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object|null>}
 */
async function verifySuperAdmin(email, password) {
  const admin = await findSuperAdminByEmail(email);
  if (!admin) return null;

  const stored = String(admin.password || "");
  let cocok = false;

  // Mendukung hash bcrypt maupun teks plain (untuk seed legacy jika ada)
  if (stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")) {
    cocok = await bcrypt.compare(String(password), stored);
  } else {
    cocok = stored === String(password);
  }

  if (!cocok) return null;
  return admin;
}

/**
 * Memperbarui profil akun Super Admin (username, email, password baru).
 * @param {number} id
 * @param {object} params
 * @param {string} [params.username]
 * @param {string} [params.email]
 * @param {string} [params.password]
 * @returns {Promise<object|null>}
 */
async function updateSuperAdmin(id, { username, email, password }) {
  const fields = [];
  const params = [];

  if (username) {
    fields.push("username = ?");
    params.push(username);
  }
  if (email) {
    fields.push("email = ?");
    params.push(email);
  }
  if (password) {
    fields.push("password = ?");
    params.push(await bcrypt.hash(String(password), 10));
  }

  if (!fields.length) return getSuperAdmin(id);

  params.push(id);
  await db.run(`UPDATE super_admin SET ${fields.join(", ")} WHERE id_admin = ?`, params);
  return getSuperAdmin(id);
}

/* ------------------------------------------------------------------ */
/* 2. Statistik Dashboard & Log Aktivitas                             */
/* ------------------------------------------------------------------ */

/**
 * Mengambil ringkasan statistik platform untuk kartu dashboard.
 * @returns {Promise<{totalSekolah: number, sekolahAktif: number, sesiAktif: number, totalSiswa: number}>}
 */
async function getDashboardStats() {
  const totalSekolah = await db.get(
    "SELECT COUNT(*) AS total FROM sekolah WHERE deleted_at IS NULL"
  );
  const sekolahAktif = await db.get(
    "SELECT COUNT(*) AS total FROM sekolah WHERE deleted_at IS NULL AND status_aktif = 1"
  );
  const sesiAktif = await db.get(
    "SELECT COUNT(*) AS total FROM sesi_skrining WHERE deleted_at IS NULL AND status_sesi = 'aktif'"
  );
  const totalSiswa = await db.get(
    "SELECT COUNT(DISTINCT student_id) AS total FROM hasil_skrining WHERE deleted_at IS NULL"
  );

  return {
    totalSekolah: Number(totalSekolah?.total || 0),
    sekolahAktif: Number(sekolahAktif?.total || 0),
    sesiAktif: Number(sesiAktif?.total || 0),
    totalSiswa: Number(totalSiswa?.total || 0)
  };
}

/**
 * Mengambil feed timeline aktivitas platform (sekolah baru, profil diubah, sesi baru, dsb.).
 * @param {object} [options]
 * @param {number} [options.page=1]
 * @param {number} [options.perPage=5]
 * @returns {Promise<object>}
 */
async function getAktivitas({ page = 1, perPage = 5 } = {}) {
  const rows = await db.all(
    `SELECT * FROM (
        SELECT
          'Sekolah Baru Terdaftar' AS aktivitas,
          CONCAT('Sekolah ', s.school_name, ' bergabung di platform') AS detail,
          s.created_at AS tanggal,
          'Baru' AS status,
          'building-add' AS ikon
        FROM sekolah s WHERE s.deleted_at IS NULL

        UNION ALL

        SELECT
          'Data Sekolah Diperbarui',
          CONCAT('Profil ', s.school_name, ' diperbarui'),
          s.updated_at,
          'Diperbarui',
          'pencil-square'
        FROM sekolah s
        WHERE s.deleted_at IS NULL AND s.updated_at > s.created_at

        UNION ALL

        SELECT
          'Sesi Skrining Baru',
          CONCAT(sk.nama_sesi, ' • ', COALESCE(s.school_name, 'Sekolah')),
          sk.created_at,
          'Sesi Baru',
          'clipboard2-plus'
        FROM sesi_skrining sk
        LEFT JOIN sekolah s ON s.id_school = sk.school_id
        WHERE sk.deleted_at IS NULL

        UNION ALL

        SELECT
          'Sekolah Dinonaktifkan',
          CONCAT('Akun ', s.school_name, ' dinonaktifkan'),
          s.updated_at,
          'Nonaktif',
          'pause-circle'
        FROM sekolah s
        WHERE s.deleted_at IS NULL AND s.status_aktif = 0

        UNION ALL

        SELECT
          'Tes Skrining Baru',
          CONCAT('Instrumen ', t.nama_tes, ' tersedia'),
          t.created_at,
          'Baru',
          'ui-checks'
        FROM tes_skrining t WHERE t.deleted_at IS NULL
     ) AS aktivitas
     ORDER BY tanggal DESC
     LIMIT ? OFFSET ?`,
    [perPage, (page - 1) * perPage]
  );

  const total = await db.get(
    `SELECT
       (SELECT COUNT(*) FROM sekolah WHERE deleted_at IS NULL)
     + (SELECT COUNT(*) FROM sekolah WHERE deleted_at IS NULL AND updated_at > created_at)
     + (SELECT COUNT(*) FROM sesi_skrining WHERE deleted_at IS NULL)
     + (SELECT COUNT(*) FROM sekolah WHERE deleted_at IS NULL AND status_aktif = 0)
     + (SELECT COUNT(*) FROM tes_skrining WHERE deleted_at IS NULL) AS total`
  );

  const totalData = Number(total?.total || 0);

  return {
    items: rows.map((row) => ({ ...row, tanggal: formatTanggal(row.tanggal) })),
    total: totalData,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(totalData / perPage)),
    from: totalData === 0 ? 0 : (page - 1) * perPage + 1,
    to: Math.min(page * perPage, totalData)
  };
}

/* ------------------------------------------------------------------ */
/* 3. Manajemen Sekolah                                               */
/* ------------------------------------------------------------------ */

const SORT_SEKOLAH = {
  nama: "s.school_name",
  tanggal: "s.created_at",
  status: "s.status_aktif"
};

/**
 * Mengambil daftar sekolah dengan filter, pencarian, dan paginasi.
 * @param {object} [options]
 * @param {string} [options.status="semua"]
 * @param {string} [options.search=""]
 * @param {string} [options.sort="tanggal"]
 * @param {string} [options.dir="desc"]
 * @param {number} [options.page=1]
 * @param {number} [options.perPage=PER_PAGE]
 * @returns {Promise<object>}
 */
async function getSchools({
  status = "semua",
  search = "",
  sort = "tanggal",
  dir = "desc",
  page = 1,
  perPage = PER_PAGE
} = {}) {
  const where = ["s.deleted_at IS NULL"];
  const params = [];

  if (status === "aktif") where.push("s.status_aktif = 1");
  if (status === "nonaktif") where.push("s.status_aktif = 0");

  if (search && search.trim()) {
    where.push("(s.school_name LIKE ? OR s.email LIKE ?)");
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;
  const orderColumn = SORT_SEKOLAH[sort] || SORT_SEKOLAH.tanggal;
  const orderDir = String(dir).toLowerCase() === "asc" ? "ASC" : "DESC";

  const totalRow = await db.get(
    `SELECT COUNT(*) AS total FROM sekolah s ${whereSql}`,
    params
  );
  const total = Number(totalRow?.total || 0);

  const rows = await db.all(
    `SELECT s.id_school, s.school_name, s.email, s.alamat, s.kontak_telepon,
            s.status_aktif, s.created_at, s.updated_at,
            (SELECT COUNT(*) FROM sesi_skrining sk
              WHERE sk.school_id = s.id_school AND sk.deleted_at IS NULL) AS total_sesi
     FROM sekolah s
     ${whereSql}
     ORDER BY ${orderColumn} ${orderDir}
     LIMIT ? OFFSET ?`,
    [...params, perPage, (page - 1) * perPage]
  );

  return {
    items: rows.map((row, index) => ({
      ...row,
      no: (page - 1) * perPage + index + 1,
      total_sesi: Number(row.total_sesi || 0),
      tanggal_format: formatTanggal(row.created_at)
    })),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    from: total === 0 ? 0 : (page - 1) * perPage + 1,
    to: Math.min(page * perPage, total)
  };
}

/**
 * Mengambil detail data sekolah berdasarkan ID.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getSchoolById(id) {
  return db.get(
    "SELECT * FROM sekolah WHERE id_school = ? AND deleted_at IS NULL",
    [id]
  );
}

/**
 * Cek apakah email sekolah sudah terdaftar oleh sekolah lain.
 * @param {string} email
 * @param {number|null} [exceptId=null]
 * @returns {Promise<boolean>}
 */
async function emailSekolahDipakai(email, exceptId = null) {
  const params = [String(email).trim().toLowerCase()];
  let sql = "SELECT id_school FROM sekolah WHERE LOWER(email) = ?";
  if (exceptId) {
    sql += " AND id_school <> ?";
    params.push(exceptId);
  }
  const row = await db.get(sql, params);
  return Boolean(row);
}

/**
 * Mendaftarkan akun sekolah baru.
 * @param {object} params
 * @returns {Promise<object>}
 */
async function createSchool({ adminId, school_name, email, password, alamat, kontak_telepon, status_aktif }) {
  const hash = await bcrypt.hash(String(password), 10);
  const result = await db.run(
    `INSERT INTO sekolah (admin_id, school_name, email, password, alamat, kontak_telepon, status_aktif)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      adminId,
      String(school_name).trim(),
      String(email).trim().toLowerCase(),
      hash,
      alamat ? String(alamat).trim() : null,
      kontak_telepon ? String(kontak_telepon).trim() : null,
      status_aktif ? 1 : 0
    ]
  );
  return getSchoolById(result.insertId);
}

/**
 * Memperbarui profil data sekolah.
 * @param {number} id
 * @param {object} params
 * @returns {Promise<object>}
 */
async function updateSchool(id, { school_name, email, password, alamat, kontak_telepon, status_aktif }) {
  const fields = [
    "school_name = ?",
    "email = ?",
    "alamat = ?",
    "kontak_telepon = ?",
    "status_aktif = ?"
  ];
  const params = [
    String(school_name).trim(),
    String(email).trim().toLowerCase(),
    alamat ? String(alamat).trim() : null,
    kontak_telepon ? String(kontak_telepon).trim() : null,
    status_aktif ? 1 : 0
  ];

  if (password && String(password).trim()) {
    fields.push("password = ?");
    params.push(await bcrypt.hash(String(password), 10));
  }

  params.push(id);
  await db.run(`UPDATE sekolah SET ${fields.join(", ")} WHERE id_school = ?`, params);
  return getSchoolById(id);
}

/**
 * Toggle status aktif/nonaktif akun sekolah.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function toggleSchoolStatus(id) {
  const school = await getSchoolById(id);
  if (!school) return null;
  await db.run(
    "UPDATE sekolah SET status_aktif = ? WHERE id_school = ?",
    [school.status_aktif ? 0 : 1, id]
  );
  return getSchoolById(id);
}

/**
 * Soft-delete data sekolah.
 * @param {number} id
 */
async function deleteSchool(id) {
  await db.run("UPDATE sekolah SET deleted_at = NOW() WHERE id_school = ?", [id]);
}

/* ------------------------------------------------------------------ */
/* 4. Manajemen Instrumen Tes Skrining                                */
/* ------------------------------------------------------------------ */

const SORT_TES = {
  nama: "t.nama_tes",
  jenjang: "t.jenjang",
  tanggal: "t.created_at"
};

/**
 * Mengambil daftar tes skrining kognitif.
 * @param {object} [options]
 * @param {string} [options.sort="nama"]
 * @param {string} [options.dir="asc"]
 * @param {string} [options.search=""]
 * @returns {Promise<Array<object>>}
 */
async function getTests({ sort = "nama", dir = "asc", search = "" } = {}) {
  const orderColumn = SORT_TES[sort] || SORT_TES.nama;
  const orderDir = String(dir).toLowerCase() === "desc" ? "DESC" : "ASC";

  const params = [];
  let whereSql = "WHERE t.deleted_at IS NULL";
  if (search && search.trim()) {
    whereSql += " AND (t.nama_tes LIKE ? OR t.jenjang LIKE ?)";
    const term = `%${search.trim()}%`;
    params.push(term, term);
  }

  const rows = await db.all(
    `SELECT t.id_test, t.nama_tes, t.jenjang, t.deskripsi, t.status_aktif,
            t.created_at, t.updated_at,
            (SELECT COUNT(*) FROM pertanyaan p
              WHERE p.test_id = t.id_test AND p.deleted_at IS NULL) AS jumlah_pertanyaan
     FROM tes_skrining t
     ${whereSql}
     ORDER BY ${orderColumn} ${orderDir}`,
    params
  );

  return rows.map((row) => ({
    ...row,
    jumlah_pertanyaan: Number(row.jumlah_pertanyaan || 0),
    tanggal_format: formatTanggal(row.created_at)
  }));
}

/**
 * Mengambil detail tes skrining berdasarkan ID beserta statistik jumlah pertanyaannya.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getTestById(id) {
  const row = await db.get(
    `SELECT t.*,
       (SELECT COUNT(*) FROM pertanyaan p
          WHERE p.test_id = t.id_test AND p.deleted_at IS NULL AND p.status_aktif = 1) AS jumlah_pertanyaan_aktif,
       (SELECT COUNT(*) FROM pertanyaan p
          WHERE p.test_id = t.id_test AND p.deleted_at IS NULL) AS jumlah_pertanyaan
     FROM tes_skrining t
     WHERE t.id_test = ? AND t.deleted_at IS NULL`,
    [id]
  );
  if (!row) return null;
  return {
    ...row,
    jumlah_pertanyaan_aktif: Number(row.jumlah_pertanyaan_aktif || 0),
    jumlah_pertanyaan: Number(row.jumlah_pertanyaan || 0)
  };
}

/**
 * Membuat tes skrining baru.
 * @param {object} params
 * @returns {Promise<object>}
 */
async function createTest({ adminId, nama_tes, jenjang, deskripsi, status_aktif }) {
  const result = await db.run(
    `INSERT INTO tes_skrining (admin_id, nama_tes, jenjang, deskripsi, status_aktif)
     VALUES (?, ?, ?, ?, ?)`,
    [
      adminId,
      String(nama_tes).trim(),
      String(jenjang).trim(),
      deskripsi ? String(deskripsi).trim() : null,
      status_aktif ? 1 : 0
    ]
  );
  return getTestById(result.insertId);
}

/**
 * Memperbarui instrumen tes skrining.
 * @param {number} id
 * @param {object} params
 * @returns {Promise<object>}
 */
async function updateTest(id, { nama_tes, jenjang, deskripsi, status_aktif }) {
  await db.run(
    `UPDATE tes_skrining
     SET nama_tes = ?, jenjang = ?, deskripsi = ?, status_aktif = ?
     WHERE id_test = ?`,
    [
      String(nama_tes).trim(),
      String(jenjang).trim(),
      deskripsi ? String(deskripsi).trim() : null,
      status_aktif ? 1 : 0,
      id
    ]
  );
  return getTestById(id);
}

const PALET_KATEGORI_KEY = ["biru", "hijau", "jingga", "merah", "ungu", "toska"];

/**
 * Daftar kategori asesmen beserta jumlah soal pada satu tes,
 * lengkap dengan persentase & warna untuk progress bar UI.
 * @param {number} testId
 * @returns {Promise<Array<object>>}
 */
async function getKategoriByTest(testId) {
  const rows = await db.all(
    `SELECT k.id_kategori, k.nama_kategori,
            COUNT(p.id_pertanyaan) AS jumlah_soal,
            SUM(CASE WHEN p.status_aktif = 1 THEN 1 ELSE 0 END) AS jumlah_aktif
     FROM kategori_asesmen k
     INNER JOIN pertanyaan p
       ON p.kategori_id = k.id_kategori
      AND p.test_id = ?
      AND p.deleted_at IS NULL
     WHERE k.deleted_at IS NULL
     GROUP BY k.id_kategori, k.nama_kategori
     ORDER BY MIN(p.id_pertanyaan) ASC`,
    [testId]
  );

  const total = rows.reduce((acc, row) => acc + Number(row.jumlah_soal || 0), 0);

  return rows.map((row, index) => {
    const jumlah = Number(row.jumlah_soal || 0);
    const warnaKey = PALET_KATEGORI_KEY[index % PALET_KATEGORI_KEY.length];
    const warna = ambilWarna(warnaKey);
    return {
      ...row,
      jumlah_soal: jumlah,
      persentase: total > 0 ? Math.round((jumlah / total) * 100) : 0,
      warna_key: warna.key,
      warna_label: warna.label,
      warna: warna.hex
    };
  });
}

/**
 * Mengambil seluruh master kategori asesmen yang aktif.
 * @param {number|null} [testId=null]
 * @returns {Promise<Array<object>>}
 */
async function getKategoriList(testId = null) {
  return db.all(
    "SELECT id_kategori, nama_kategori FROM kategori_asesmen WHERE deleted_at IS NULL ORDER BY id_kategori ASC"
  );
}

/* ------------------------------------------------------------------ */
/* 5. Pertanyaan & Opsi Jawaban                                       */
/* ------------------------------------------------------------------ */

/**
 * Normalisasi format kunci jawaban ke label opsi standar (A/B/C/D).
 * @param {string} kunci
 * @param {Array<object>} options
 * @returns {string}
 */
function resolveLabel(kunci, options) {
  const raw = String(kunci || "").trim();
  if (!raw) return "";
  if (/^[A-Da-d]$/.test(raw)) return raw.toUpperCase();
  const match = (options || []).find(
    (opt) => String(opt.teks_opsi || "").trim().toLowerCase() === raw.toLowerCase()
  );
  return match ? String(match.label_opsi).toUpperCase() : raw;
}

/**
 * Mengambil daftar pertanyaan pada suatu tes dengan opsi jawaban dan paginasi.
 * @param {object} params
 * @param {number} params.testId
 * @param {string|number} [params.kategoriId=""]
 * @param {number} [params.page=1]
 * @param {number} [params.perPage=PER_PAGE]
 * @returns {Promise<object>}
 */
async function getQuestions({ testId, kategoriId = "", page = 1, perPage = PER_PAGE }) {
  const where = ["p.deleted_at IS NULL", "p.test_id = ?"];
  const params = [testId];

  if (kategoriId) {
    where.push("p.kategori_id = ?");
    params.push(kategoriId);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const totalRow = await db.get(
    `SELECT COUNT(*) AS total FROM pertanyaan p ${whereSql}`,
    params
  );
  const total = Number(totalRow?.total || 0);

  const rows = await db.all(
    `SELECT p.id_pertanyaan, p.teks_pertanyaan, p.url_gambar, p.jawaban_benar,
            p.skor, p.status_aktif, p.kategori_id, k.nama_kategori
     FROM pertanyaan p
     LEFT JOIN kategori_asesmen k ON k.id_kategori = p.kategori_id
     ${whereSql}
     ORDER BY p.id_pertanyaan ASC
     LIMIT ? OFFSET ?`,
    [...params, perPage, (page - 1) * perPage]
  );

  const ids = rows.map((r) => r.id_pertanyaan);
  let opsiMap = new Map();

  if (ids.length) {
    const opsi = await db.all(
      `SELECT id_jawaban, pertanyaan_id, label_opsi, teks_opsi
       FROM opsi_jawaban
       WHERE deleted_at IS NULL AND pertanyaan_id IN (${ids.map(() => "?").join(",")})
       ORDER BY label_opsi ASC`,
      ids
    );
    opsiMap = opsi.reduce((acc, item) => {
      const list = acc.get(item.pertanyaan_id) || [];
      list.push(item);
      acc.set(item.pertanyaan_id, list);
      return acc;
    }, new Map());
  }

  const items = rows.map((row, index) => {
    const opsi = opsiMap.get(row.id_pertanyaan) || [];
    const label = resolveLabel(row.jawaban_benar, opsi);
    const teksBenar = opsi.find((o) => o.label_opsi === label)?.teks_opsi || row.jawaban_benar;
    return {
      ...row,
      no: (page - 1) * perPage + index + 1,
      jumlah_opsi: opsi.length,
      label_benar: label,
      teks_jawaban_benar: teksBenar,
      preview: String(row.teks_pertanyaan || "").slice(0, 95)
    };
  });

  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    from: total === 0 ? 0 : (page - 1) * perPage + 1,
    to: Math.min(page * perPage, total)
  };
}

/**
 * Mengambil detail lengkap butir pertanyaan beserta opsi jawabannya.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getQuestionDetail(id) {
  const row = await db.get(
    "SELECT * FROM pertanyaan WHERE id_pertanyaan = ? AND deleted_at IS NULL",
    [id]
  );
  if (!row) return null;

  const opsi = await db.all(
    "SELECT * FROM opsi_jawaban WHERE pertanyaan_id = ? AND deleted_at IS NULL ORDER BY label_opsi ASC",
    [id]
  );

  return {
    ...row,
    label_benar: resolveLabel(row.jawaban_benar, opsi),
    opsi
  };
}

/**
 * Menyimpan atau memperbarui butir pertanyaan beserta 4 opsi jawaban (A, B, C, D).
 * @param {object} params
 * @returns {Promise<object>}
 */
async function saveQuestion({ id, testId, kategori_id, teks_pertanyaan, url_gambar, jawaban_benar, skor, status_aktif, opsi }) {
  let questionId = id;

  if (id) {
    await db.run(
      `UPDATE pertanyaan
       SET kategori_id = ?, teks_pertanyaan = ?, url_gambar = ?, jawaban_benar = ?,
           skor = ?, status_aktif = ?
       WHERE id_pertanyaan = ?`,
      [
        kategori_id,
        teks_pertanyaan,
        url_gambar || null,
        jawaban_benar,
        toInt(skor, 1),
        status_aktif ? 1 : 0,
        id
      ]
    );
  } else {
    const result = await db.run(
      `INSERT INTO pertanyaan
        (kategori_id, test_id, teks_pertanyaan, url_gambar, jawaban_benar, skor, status_aktif)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        kategori_id,
        testId,
        teks_pertanyaan,
        url_gambar || null,
        jawaban_benar,
        toInt(skor, 1),
        status_aktif ? 1 : 0
      ]
    );
    questionId = result.insertId;
  }

  // Update atau insert opsi jawaban A, B, C, D
  for (const label of ["A", "B", "C", "D"]) {
    const teks = opsi?.[label]?.teks || "";
    const gambar = opsi?.[label]?.url_gambar || null;
    if (!String(teks).trim()) continue;

    const existing = await db.get(
      "SELECT id_jawaban FROM opsi_jawaban WHERE pertanyaan_id = ? AND label_opsi = ? AND deleted_at IS NULL",
      [questionId, label]
    );

    if (existing) {
      await db.run(
        "UPDATE opsi_jawaban SET teks_opsi = ?, url_gambar = ? WHERE id_jawaban = ?",
        [teks, gambar, existing.id_jawaban]
      );
    } else {
      await db.run(
        "INSERT INTO opsi_jawaban (pertanyaan_id, label_opsi, teks_opsi, url_gambar) VALUES (?, ?, ?, ?)",
        [questionId, label, teks, gambar]
      );
    }
  }

  return getQuestionDetail(questionId);
}

/**
 * Soft-delete butir pertanyaan asesmen.
 * @param {number} id
 */
async function deleteQuestion(id) {
  await db.run("UPDATE pertanyaan SET deleted_at = NOW() WHERE id_pertanyaan = ?", [id]);
}

/**
 * Toggle status aktif butir pertanyaan asesmen.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function toggleQuestionStatus(id) {
  const row = await db.get(
    "SELECT status_aktif FROM pertanyaan WHERE id_pertanyaan = ? AND deleted_at IS NULL",
    [id]
  );
  if (!row) return null;

  await db.run("UPDATE pertanyaan SET status_aktif = ? WHERE id_pertanyaan = ?", [
    row.status_aktif ? 0 : 1,
    id
  ]);
  return getQuestionDetail(id);
}

/* ------------------------------------------------------------------ */
/* 6. Konfigurasi Penilaian & Interpretasi Hasil                      */
/* ------------------------------------------------------------------ */

/**
 * Mengambil daftar konfigurasi rentang penilaian pada suatu instrumen tes.
 * @param {number} testId
 * @returns {Promise<Array<object>>}
 */
async function getKonfigurasi(testId) {
  const rows = await db.all(
    `SELECT * FROM konfigurasi_penilaian
     WHERE test_id = ? AND deleted_at IS NULL
     ORDER BY skor_min ASC`,
    [testId]
  );

  return rows.map((row) => {
    const warna = ambilWarna(row.warna);
    return {
      ...row,
      skor_min: Number(row.skor_min || 0),
      skor_max: Number(row.skor_max || 0),
      warna_key: warna.key,
      warna_label: warna.label,
      warna_hex: warna.hex,
      warna_soft: warna.soft
    };
  });
}

/**
 * Mengambil detail konfigurasi rentang penilaian berdasarkan ID.
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getKonfigurasiById(id) {
  const row = await db.get(
    "SELECT * FROM konfigurasi_penilaian WHERE id_konfigurasiPenilaian = ? AND deleted_at IS NULL",
    [id]
  );
  if (!row) return null;
  const warna = ambilWarna(row.warna);
  return { ...row, warna_key: warna.key, warna_hex: warna.hex };
}

/**
 * Menambahkan rentang penilaian & interpretasi hasil baru pada tes.
 * @param {object} params
 * @returns {Promise<object>}
 */
async function createKonfigurasi({ testId, skor_min, skor_max, kategori_hasil, warna, deskripsi, rekomendasi }) {
  const result = await db.run(
    `INSERT INTO konfigurasi_penilaian
      (test_id, skor_min, skor_max, kategori_hasil, warna, deskripsi, rekomendasi)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      testId,
      toInt(skor_min),
      toInt(skor_max),
      kategori_hasil,
      PILIHAN_WARNA.includes(warna) ? warna : "biru",
      deskripsi || null,
      rekomendasi || null
    ]
  );
  return getKonfigurasiById(result.insertId);
}

/**
 * Memperbarui rentang penilaian & interpretasi hasil yang sudah ada.
 * @param {number} id
 * @param {object} params
 * @returns {Promise<object>}
 */
async function updateKonfigurasi(id, { skor_min, skor_max, kategori_hasil, warna, deskripsi, rekomendasi }) {
  await db.run(
    `UPDATE konfigurasi_penilaian
     SET skor_min = ?, skor_max = ?, kategori_hasil = ?, warna = ?, deskripsi = ?, rekomendasi = ?
     WHERE id_konfigurasiPenilaian = ?`,
    [
      toInt(skor_min),
      toInt(skor_max),
      kategori_hasil,
      PILIHAN_WARNA.includes(warna) ? warna : "biru",
      deskripsi || null,
      rekomendasi || null,
      id
    ]
  );
  return getKonfigurasiById(id);
}

/**
 * Menghapus data konfigurasi rentang penilaian (soft-delete).
 * @param {number} id
 */
async function deleteKonfigurasi(id) {
  await db.run(
    "UPDATE konfigurasi_penilaian SET deleted_at = NOW() WHERE id_konfigurasiPenilaian = ?",
    [id]
  );
}

module.exports = {
  getSuperAdmin,
  findSuperAdminByEmail,
  verifySuperAdmin,
  updateSuperAdmin,
  getDashboardStats,
  getAktivitas,
  getSchools,
  getSchoolById,
  emailSekolahDipakai,
  createSchool,
  updateSchool,
  toggleSchoolStatus,
  deleteSchool,
  getTests,
  getTestById,
  createTest,
  updateTest,
  getKategoriByTest,
  getKategoriList,
  getQuestions,
  getQuestionDetail,
  saveQuestion,
  deleteQuestion,
  toggleQuestionStatus,
  getKonfigurasi,
  getKonfigurasiById,
  createKonfigurasi,
  updateKonfigurasi,
  deleteKonfigurasi
};
