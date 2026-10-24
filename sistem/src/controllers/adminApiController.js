/**
 * Controller REST API untuk Panel Super Admin & Akun Sekolah.
 * Melayani seluruh kebutuhan data frontend (Next.js) dengan autentikasi JWT Bearer.
 *
 * Cakupan fitur:
 * - Autentikasi (login multi-role: super_admin & sekolah, profil me)
 * - Dashboard ringkasan statistik & log aktivitas platform
 * - Upload gambar pertanyaan asesmen
 * - Metadata tema & navigasi admin
 * - Manajemen data sekolah (CRUD & toggle status aktif)
 * - Manajemen instrumen tes skrining (CRUD)
 * - Manajemen butir pertanyaan & opsi jawaban asesmen (CRUD)
 * - Manajemen konfigurasi rentang penilaian & interpretasi hasil (CRUD)
 * - Manajemen profil & update password super admin
 */

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const multer = require("multer");

const config = require("../config");
const adminService = require("../services/adminService");
const sekolahService = require("../services/sekolahAuthService");
const { PILIHAN_WARNA, WARNA_KATEGORI, MENU_ADMIN } = require("../config/adminTheme");

/** Direktori penyimpanan berkas gambar yang diunggah */
const UPLOAD_DIR = path.join(__dirname, "../../public/uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

/** Konfigurasi disk storage untuk multer upload */
const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || ".png").toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
  }
});

/** Middleware multer untuk unggah 1 berkas gambar (maks. 5MB) */
const uploadGambar = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error("Format gambar harus JPG, PNG, WEBP, atau GIF."), ok);
  }
}).single("gambar");

/* ------------------------------------------------------------------ */
/* Helper Functions                                                   */
/* ------------------------------------------------------------------ */

/**
 * Parsing nilai integer dengan fallback default yang aman.
 * @param {*} value
 * @param {number} fallback
 * @returns {number}
 */
function angka(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Parsing nomor halaman pagination (minimal bernilai 1).
 * @param {*} value
 * @returns {number}
 */
function halaman(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Format respon standar jika terjadi kegagalan atau validasi tidak lolos.
 * @param {import("express").Response} res
 * @param {string} message
 * @param {number} [statusCode=400]
 */
function gagal(res, message, statusCode = 400) {
  return res.status(statusCode).json({ success: false, message });
}

/**
 * Format respon standar untuk permintaan yang berhasil diproses.
 * @param {import("express").Response} res
 * @param {*} data
 * @param {string|null} [message=null]
 */
function oke(res, data, message = null) {
  return res.json({ success: true, message, data });
}

/**
 * Generate token JWT untuk Super Admin.
 * @param {object} admin
 * @returns {string}
 */
function tokenUntuk(admin) {
  return jwt.sign(
    { id: admin.id_admin, role: "super_admin", username: admin.username },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/* ------------------------------------------------------------------ */
/* 1. Autentikasi Admin & Sekolah                                     */
/* ------------------------------------------------------------------ */

/**
 * POST /api/admin/auth/login
 * Login terpadu untuk Super Admin dan Akun Sekolah.
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return gagal(res, "Email dan password wajib diisi.");
    }

    // 1) Coba verifikasi akun Super Admin terlebih dahulu
    const admin = await adminService.verifySuperAdmin(email, password);
    if (admin) {
      return oke(
        res,
        {
          role: "super_admin",
          token: tokenUntuk(admin),
          admin: {
            id: admin.id_admin,
            username: admin.username,
            email: admin.email,
            createdAt: admin.created_at
          }
        },
        `Selamat datang kembali, ${admin.username}.`
      );
    }

    // 2) Bukan super admin -> coba verifikasi akun Sekolah
    const hasil = await sekolahService.verifySekolah(email, password);
    if (hasil && !hasil.dinonaktifkan) {
      const sekolah = hasil.sekolah;
      const token = jwt.sign(
        { id: sekolah.id_school, role: "sekolah", schoolName: sekolah.school_name },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );

      return oke(
        res,
        {
          role: "sekolah",
          token,
          sekolah: {
            id: sekolah.id_school,
            schoolName: sekolah.school_name,
            email: sekolah.email,
            alamat: sekolah.alamat,
            createdAt: sekolah.created_at
          }
        },
        `Selamat datang, ${sekolah.school_name}.`
      );
    }

    // Jika akun sekolah ditemukan tapi status nonaktif
    if (hasil && hasil.dinonaktifkan) {
      return gagal(
        res,
        "Akun sekolah Anda sedang dinonaktifkan. Silakan hubungi Super Admin.",
        403
      );
    }

    return gagal(res, "Email atau password salah.", 401);
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/auth/me
 * Mengambil informasi profil Super Admin yang sedang login berdasarkan token JWT.
 */
async function me(req, res, next) {
  try {
    const admin = await adminService.getSuperAdmin(req.admin.id_admin);
    if (!admin) {
      return gagal(res, "Akun tidak ditemukan.", 401);
    }

    return oke(res, {
      id: admin.id_admin,
      username: admin.username,
      email: admin.email,
      createdAt: admin.created_at
    });
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------------------------------------------ */
/* 2. Dashboard Ringkasan & Aktivitas                                 */
/* ------------------------------------------------------------------ */

/**
 * GET /api/admin/dashboard
 * Mengambil ringkasan statistik platform dan feed aktivitas terbaru.
 */
async function dashboard(req, res, next) {
  try {
    const page = halaman(req.query.page);
    const [stats, aktivitas, daftarTesList] = await Promise.all([
      adminService.getDashboardStats(),
      adminService.getAktivitas({ page, perPage: 6 }),
      adminService.getTests({})
    ]);

    return oke(res, {
      stats: { ...stats, totalTes: daftarTesList.length },
      aktivitas,
      menu: MENU_ADMIN
    });
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------------------------------------------ */
/* 3. Media Upload & Metadata                                         */
/* ------------------------------------------------------------------ */

/**
 * POST /api/admin/upload
 * Endpoint upload gambar pertanyaan dengan multer.
 */
function upload(req, res) {
  uploadGambar(req, res, (err) => {
    if (err) return gagal(res, err.message || "Gagal mengunggah gambar.");
    if (!req.file) return gagal(res, "Tidak ada berkas yang dikirim.");
    return oke(res, { url: `/uploads/${req.file.filename}` });
  });
}

/**
 * GET /api/admin/meta
 * Mengambil data konfigurasi tema warna dan item navigasi sidebar admin.
 */
function meta(req, res) {
  return oke(res, {
    warna: Object.values(WARNA_KATEGORI),
    pilihanWarna: PILIHAN_WARNA,
    menu: MENU_ADMIN
  });
}

/* ------------------------------------------------------------------ */
/* 4. Manajemen Sekolah                                               */
/* ------------------------------------------------------------------ */

/**
 * GET /api/admin/sekolah
 * Menampilkan daftar sekolah dengan paginasi, pencarian, dan filter status.
 */
async function daftarSekolah(req, res, next) {
  try {
    const status = ["aktif", "nonaktif"].includes(req.query.status) ? req.query.status : "semua";
    const sort = ["nama", "tanggal", "status"].includes(req.query.sort) ? req.query.sort : "tanggal";
    const dir = String(req.query.dir || "desc").toLowerCase() === "asc" ? "asc" : "desc";

    const data = await adminService.getSchools({
      status,
      search: String(req.query.search || "").trim(),
      sort,
      dir,
      page: halaman(req.query.page)
    });

    return oke(res, data);
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/admin/sekolah
 * Membuat data sekolah baru atau memperbarui data sekolah yang ada.
 */
async function simpanSekolah(req, res, next) {
  try {
    const id = angka(req.body.id_school, 0);
    const school_name = String(req.body.school_name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const alamat = String(req.body.alamat || "").trim();
    const kontak_telepon = String(req.body.kontak_telepon || "").trim();
    const status_aktif = req.body.status_aktif === true || req.body.status_aktif === "1" || req.body.status_aktif === "on";

    if (!school_name) return gagal(res, "Nama sekolah wajib diisi.");
    if (!email) return gagal(res, "Email sekolah wajib diisi.");
    if (!id && password.length < 6) return gagal(res, "Password minimal 6 karakter untuk sekolah baru.");

    if (await adminService.emailSekolahDipakai(email, id || null)) {
      return gagal(res, "Email sekolah sudah digunakan.", 409);
    }

    if (id) {
      await adminService.updateSchool(id, { school_name, email, password, alamat, kontak_telepon, status_aktif });
      return oke(res, await adminService.getSchoolById(id), `Sekolah "${school_name}" berhasil diperbarui.`);
    }

    const baru = await adminService.createSchool({
      adminId: req.admin.id_admin,
      school_name,
      email,
      password,
      alamat,
      kontak_telepon,
      status_aktif
    });

    return res.status(201).json({
      success: true,
      message: `Sekolah "${school_name}" berhasil ditambahkan.`,
      data: baru
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/admin/sekolah/:id/toggle
 * Toggle status aktif/nonaktif akun sekolah.
 */
async function toggleSekolah(req, res, next) {
  try {
    const id = angka(req.params.id, 0);
    const school = await adminService.getSchoolById(id);
    if (!school) return gagal(res, "Sekolah tidak ditemukan.", 404);

    await adminService.toggleSchoolStatus(id);
    const pesan = Number(school.status_aktif) === 1 ? "Sekolah dinonaktifkan." : "Sekolah diaktifkan.";
    return oke(res, await adminService.getSchoolById(id), pesan);
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/admin/sekolah/:id
 * Soft-delete data sekolah.
 */
async function hapusSekolah(req, res, next) {
  try {
    const id = angka(req.params.id, 0);
    const school = await adminService.getSchoolById(id);
    if (!school) return gagal(res, "Sekolah tidak ditemukan.", 404);

    await adminService.deleteSchool(id);
    return oke(res, null, `Sekolah "${school.school_name}" telah dihapus.`);
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------------------------------------------ */
/* 5. Manajemen Instrumen Tes Skrining                                */
/* ------------------------------------------------------------------ */

/**
 * GET /api/admin/tes
 * Mengambil seluruh instrumen tes skrining kognitif.
 */
async function daftarTes(req, res, next) {
  try {
    const sort = ["nama", "jenjang", "tanggal"].includes(req.query.sort) ? req.query.sort : "nama";
    const dir = String(req.query.dir || "asc").toLowerCase() === "desc" ? "desc" : "asc";

    const items = await adminService.getTests({
      sort,
      dir,
      search: String(req.query.search || "").trim()
    });

    return oke(res, {
      items,
      total: items.length,
      aktif: items.filter((i) => Number(i.status_aktif) === 1).length,
      totalSoal: items.reduce((acc, i) => acc + Number(i.jumlah_pertanyaan || 0), 0),
      jenjang: new Set(items.map((i) => i.jenjang)).size
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/admin/tes
 * Membuat atau memperbarui instrumen tes skrining kognitif.
 */
async function simpanTes(req, res, next) {
  try {
    const id = angka(req.body.id_test, 0);
    const nama_tes = String(req.body.nama_tes || "").trim();
    const jenjang = String(req.body.jenjang || "").trim();
    const deskripsi = String(req.body.deskripsi || "").trim();
    const status_aktif = req.body.status_aktif === true || req.body.status_aktif === "1" || req.body.status_aktif === "on";

    if (!nama_tes || !jenjang) return gagal(res, "Nama tes dan jenjang wajib diisi.");

    if (id) {
      await adminService.updateTest(id, { nama_tes, jenjang, deskripsi, status_aktif });
      return oke(res, await adminService.getTestById(id), `Tes "${nama_tes}" berhasil diperbarui.`);
    }

    const baru = await adminService.createTest({
      adminId: req.admin.id_admin,
      nama_tes,
      jenjang,
      deskripsi,
      status_aktif
    });

    return res.status(201).json({
      success: true,
      message: `Tes "${nama_tes}" berhasil dibuat.`,
      data: baru
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/admin/tes/:id
 * Mengambil detail lengkap tes beserta kategori soal, pertanyaan, dan konfigurasi nilai.
 */
async function detailTes(req, res, next) {
  try {
    const id = angka(req.params.id, 0);
    const test = await adminService.getTestById(id);
    if (!test) return gagal(res, "Tes skrining tidak ditemukan.", 404);

    const tab = ["ringkasan", "pertanyaan", "penilaian", "interpretasi"].includes(req.query.tab)
      ? req.query.tab
      : "ringkasan";
    const kategoriId = String(req.query.kategori || "");

    const [kategori, pertanyaan, konfigurasi, semuaKategori] = await Promise.all([
      adminService.getKategoriByTest(id),
      adminService.getQuestions({ testId: id, kategoriId, page: halaman(req.query.page) }),
      adminService.getKonfigurasi(id),
      adminService.getKategoriList(id)
    ]);

    return oke(res, {
      test,
      tab,
      kategori,
      pertanyaan,
      konfigurasi,
      semuaKategori,
      filter: { kategori: kategoriId },
      warnaPilihan: PILIHAN_WARNA.map((key) => WARNA_KATEGORI[key])
    });
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------------------------------------------ */
/* 6. Manajemen Butir Pertanyaan & Opsi Jawaban                       */
/* ------------------------------------------------------------------ */

/**
 * GET /api/admin/pertanyaan/:qid
 * Mengambil data detail satu butir pertanyaan beserta pilihan opsi jawabannya.
 */
async function detailPertanyaan(req, res, next) {
  try {
    const detail = await adminService.getQuestionDetail(angka(req.params.qid, 0));
    if (!detail) return gagal(res, "Pertanyaan tidak ditemukan.", 404);

    const opsi = {};
    ["A", "B", "C", "D"].forEach((label) => {
      const found = (detail.opsi || []).find((o) => String(o.label_opsi).toUpperCase() === label);
      opsi[label] = {
        teks: found ? found.teks_opsi : "",
        url_gambar: found ? found.url_gambar || "" : ""
      };
    });

    return oke(res, {
      id_pertanyaan: detail.id_pertanyaan,
      kategori_id: detail.kategori_id,
      teks_pertanyaan: detail.teks_pertanyaan,
      url_gambar: detail.url_gambar || "",
      jawaban_benar: detail.label_benar || "",
      skor: detail.skor,
      status_aktif: Number(detail.status_aktif) === 1,
      opsi
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/admin/tes/:id/pertanyaan
 * Menyimpan butir pertanyaan baru atau memperbarui pertanyaan yang sudah ada.
 */
async function simpanPertanyaan(req, res, next) {
  try {
    const testId = angka(req.params.id, 0);
    const qid = angka(req.body.id_pertanyaan, 0);

    const teks = String(req.body.teks_pertanyaan || "").trim();
    const kategori_id = angka(req.body.kategori_id, 0);
    const jawaban_benar = String(req.body.jawaban_benar || "").trim().toUpperCase();
    const url_gambar = String(req.body.url_gambar || "").trim();
    const skor = angka(req.body.skor, 1);
    const aktif = req.body.status_aktif === true || req.body.status_aktif === "1" || req.body.status_aktif === "on";

    if (!teks) return gagal(res, "Teks pertanyaan wajib diisi.");
    if (!kategori_id) return gagal(res, "Kategori asesmen wajib dipilih.");

    const opsi = {};
    let jumlahOpsi = 0;
    ["A", "B", "C", "D"].forEach((label) => {
      const text = String(req.body[`opsi_${label}`] || "").trim();
      const gambar = String(req.body[`opsi_${label}_gambar`] || "").trim();
      opsi[label] = { teks: text, url_gambar: gambar || null };
      if (text) jumlahOpsi += 1;
    });

    if (jumlahOpsi < 2) return gagal(res, "Isi minimal dua pilihan jawaban.");
    if (!opsi[jawaban_benar] || !opsi[jawaban_benar].teks) {
      return gagal(res, "Kunci jawaban harus menunjuk pilihan yang terisi.");
    }

    const simpan = await adminService.saveQuestion({
      id: qid || null,
      testId,
      kategori_id,
      teks_pertanyaan: teks,
      url_gambar,
      jawaban_benar,
      skor,
      status_aktif: aktif,
      opsi
    });

    return res.status(qid ? 200 : 201).json({
      success: true,
      message: qid ? "Pertanyaan berhasil diperbarui." : "Pertanyaan baru berhasil ditambahkan.",
      data: simpan
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/admin/pertanyaan/:qid
 * Soft-delete butir pertanyaan asesmen.
 */
async function hapusPertanyaan(req, res, next) {
  try {
    const qid = angka(req.params.qid, 0);
    const detail = await adminService.getQuestionDetail(qid);
    if (!detail) return gagal(res, "Pertanyaan tidak ditemukan.", 404);

    await adminService.deleteQuestion(qid);
    return oke(res, null, "Pertanyaan telah dihapus.");
  } catch (err) {
    return next(err);
  }
}

/**
 * PATCH /api/admin/pertanyaan/:qid/toggle
 * Toggle status aktif butir pertanyaan.
 */
async function togglePertanyaan(req, res, next) {
  try {
    const qid = angka(req.params.qid, 0);
    const detail = await adminService.getQuestionDetail(qid);
    if (!detail) return gagal(res, "Pertanyaan tidak ditemukan.", 404);

    await adminService.toggleQuestionStatus(qid);
    const pesan = Number(detail.status_aktif) === 1 ? "Pertanyaan dinonaktifkan." : "Pertanyaan diaktifkan.";
    return oke(res, await adminService.getQuestionDetail(qid), pesan);
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------------------------------------------ */
/* 7. Manajemen Konfigurasi Penilaian & Interpretasi                  */
/* ------------------------------------------------------------------ */

/**
 * GET /api/admin/konfigurasi/:kid
 * Mengambil detail konfigurasi rentang penilaian berdasarkan ID.
 */
async function detailKonfigurasi(req, res, next) {
  try {
    const row = await adminService.getKonfigurasiById(angka(req.params.kid, 0));
    if (!row) return gagal(res, "Rentang nilai tidak ditemukan.", 404);

    return oke(res, {
      id_konfigurasi: row.id_konfigurasiPenilaian,
      kategori_hasil: row.kategori_hasil,
      skor_min: Number(row.skor_min || 0),
      skor_max: Number(row.skor_max || 0),
      warna: row.warna_key || "biru",
      deskripsi: row.deskripsi || "",
      rekomendasi: row.rekomendasi || ""
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/admin/tes/:id/konfigurasi
 * Menambah atau memperbarui rentang penilaian & interpretasi hasil pada tes.
 */
async function simpanKonfigurasi(req, res, next) {
  try {
    const testId = angka(req.params.id, 0);
    const id = angka(req.body.id_konfigurasi, 0);

    const skor_min = angka(req.body.skor_min, 0);
    const skor_max = angka(req.body.skor_max, 0);
    const kategori_hasil = String(req.body.kategori_hasil || "").trim();
    const warna = PILIHAN_WARNA.includes(req.body.warna) ? req.body.warna : "biru";
    const deskripsi = String(req.body.deskripsi || "").trim();
    const rekomendasi = String(req.body.rekomendasi || "").trim();

    if (!kategori_hasil) return gagal(res, "Nama kategori hasil wajib diisi.");
    if (skor_max < skor_min) return gagal(res, "Skor maksimal tidak boleh lebih kecil dari skor minimal.");

    const payload = { skor_min, skor_max, kategori_hasil, warna, deskripsi, rekomendasi };

    if (id) {
      await adminService.updateKonfigurasi(id, payload);
      return oke(res, await adminService.getKonfigurasiById(id), `Rentang "${kategori_hasil}" berhasil diperbarui.`);
    }

    const baru = await adminService.createKonfigurasi({ testId, ...payload });
    return res.status(201).json({
      success: true,
      message: `Rentang "${kategori_hasil}" berhasil ditambahkan.`,
      data: baru
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * DELETE /api/admin/konfigurasi/:kid
 * Menghapus konfigurasi rentang penilaian.
 */
async function hapusKonfigurasi(req, res, next) {
  try {
    const id = angka(req.params.kid, 0);
    const row = await adminService.getKonfigurasiById(id);
    if (!row) return gagal(res, "Rentang nilai tidak ditemukan.", 404);

    await adminService.deleteKonfigurasi(id);
    return oke(res, null, "Rentang nilai telah dihapus.");
  } catch (err) {
    return next(err);
  }
}

/* ------------------------------------------------------------------ */
/* 8. Pengaturan Profil Super Admin                                   */
/* ------------------------------------------------------------------ */

/**
 * GET /api/admin/pengaturan
 * Mengambil ringkasan data profil dan informasi umum platform untuk halaman pengaturan.
 */
async function pengaturan(req, res, next) {
  try {
    const [admin, stats, daftarTesList] = await Promise.all([
      adminService.getSuperAdmin(req.admin.id_admin),
      adminService.getDashboardStats(),
      adminService.getTests({})
    ]);

    return oke(res, {
      profil: {
        id: admin.id_admin,
        username: admin.username,
        email: admin.email,
        createdAt: admin.created_at
      },
      info: {
        totalSekolah: stats.totalSekolah,
        totalTes: daftarTesList.length
      }
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * PUT /api/admin/pengaturan
 * Memperbarui profil Super Admin (username, email, password baru).
 */
async function simpanPengaturan(req, res, next) {
  try {
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "").trim();
    const konfirmasi = String(req.body.password_konfirmasi || "").trim();

    if (!username || !email) return gagal(res, "Nama pengguna dan email wajib diisi.");
    if (password && password.length < 6) return gagal(res, "Password baru minimal 6 karakter.");
    if (password && password !== konfirmasi) return gagal(res, "Konfirmasi password tidak cocok.");

    const existing = await adminService.findSuperAdminByEmail(email);
    if (existing && Number(existing.id_admin) !== Number(req.admin.id_admin)) {
      return gagal(res, "Email sudah dipakai akun lain.", 409);
    }

    await adminService.updateSuperAdmin(req.admin.id_admin, {
      username,
      email,
      password: password || undefined
    });

    const admin = await adminService.getSuperAdmin(req.admin.id_admin);
    const perluTokenBaru = Boolean(password);

    return oke(
      res,
      {
        profil: {
          id: admin.id_admin,
          username: admin.username,
          email: admin.email,
          createdAt: admin.created_at
        },
        // Bila password berubah, sediakan token baru agar frontend dapat langsung memperbarui sesi
        token: perluTokenBaru ? tokenUntuk(admin) : undefined
      },
      "Profil berhasil diperbarui."
    );
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  login,
  me,
  dashboard,
  upload,
  meta,
  daftarSekolah,
  simpanSekolah,
  toggleSekolah,
  hapusSekolah,
  daftarTes,
  simpanTes,
  detailTes,
  detailPertanyaan,
  simpanPertanyaan,
  hapusPertanyaan,
  togglePertanyaan,
  detailKonfigurasi,
  simpanKonfigurasi,
  hapusKonfigurasi,
  pengaturan,
  simpanPengaturan
};
