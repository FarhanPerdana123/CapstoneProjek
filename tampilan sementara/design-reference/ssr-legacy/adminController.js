/**
 * Controller Panel Super Admin (SSR EJS).
 * Semua aksi tulis memakai pola POST + redirect (PRG) dengan flash message
 * sehingga aman dari refresh berulang.
 */
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const ejs = require("ejs");
const multer = require("multer");

const adminService = require("../services/adminService");
const { MENU_ADMIN, PILIHAN_WARNA, WARNA_KATEGORI } = require("../config/adminTheme");

/* ------------------------------------------------------------------ */
/* Util render                                                         */
/* ------------------------------------------------------------------ */

const VIEW_DIR = path.join(__dirname, "../../views/admin");
const LAYOUT = path.join(VIEW_DIR, "partials/layout.ejs");

/**
 * Render satu halaman admin: konten halaman di-render lebih dulu,
 * lalu disisipkan ke layout (sidebar + topbar + flash message).
 */
async function tampilkan(res, view, data = {}) {
  const {
    admin = null,
    flash = null,
    activeMenu = "",
    pageTitle = "Panel Admin",
    ...rest
  } = data;

  const locals = {
    menus: MENU_ADMIN,
    activeMenu,
    pageTitle: pageTitle || "Panel Admin",
    admin: admin || { username: "Super Admin" },
    flash,
    ...rest
  };

  const body = await ejs.renderFile(path.join(VIEW_DIR, `${view}.ejs`), locals);
  locals.body = body;

  const html = await ejs.renderFile(LAYOUT, locals);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
}

/** Render halaman mandiri (tanpa layout), dipakai untuk halaman login. */
async function tampilkanMandiri(res, view, locals = {}) {
  const html = await ejs.renderFile(path.join(VIEW_DIR, `${view}.ejs`), locals);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.send(html);
}

function flashOf(req) {
  const flash = req.session ? req.session.flash : null;
  if (req.session) req.session.flash = null;
  return flash || null;
}

function setFlash(req, type, message) {
  if (req.session) req.session.flash = { type, message };
}

function redirectWith(req, res, target, type, message) {
  setFlash(req, type, message);
  return res.redirect(target);
}

/** Query string sisa (tanpa page) untuk komponen pagination. */
function sisaQuery(req, keys) {
  const params = new URLSearchParams();
  keys.forEach((key) => {
    const value = req.query[key];
    if (value !== undefined && value !== "" && value !== null) params.set(key, value);
  });
  const str = params.toString();
  return str ? `${str}&` : "";
}

function toPage(value) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function angka(value, fallback = 0) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) ? n : fallback;
}

/* ------------------------------------------------------------------ */
/* Upload gambar                                                       */
/* ------------------------------------------------------------------ */

const UPLOAD_DIR = path.join(__dirname, "../../public/admin/uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || ".png").toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`);
  }
});

const uploadGambar = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|webp|gif)$/i.test(file.mimetype);
    cb(ok ? null : new Error("Format gambar harus JPG atau PNG."), ok);
  }
}).single("gambar");

function handleUpload(req, res) {
  uploadGambar(req, res, (err) => {
    if (err) {
      return res.status(400).json({ success: false, message: err.message || "Gagal mengunggah gambar." });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Tidak ada berkas yang dikirim." });
    }
    return res.json({ success: true, url: `/uploads/${req.file.filename}` });
  });
}

/* ------------------------------------------------------------------ */
/* Autentikasi                                                         */
/* ------------------------------------------------------------------ */

function tampilLogin(req, res) {
  if (req.session && req.session.adminId) return res.redirect("/admin/dashboard");
  return tampilkanMandiri(res, "login", { pageTitle: "Masuk", error: req.query.error || null, email: "" });
}

async function prosesLogin(req, res) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return tampilkanMandiri(res, "login", {
      pageTitle: "Masuk",
      error: "Email dan password wajib diisi.",
      email: email || ""
    });
  }

  const admin = await adminService.verifySuperAdmin(email, password);
  if (!admin) {
    return tampilkanMandiri(res, "login", {
      pageTitle: "Masuk",
      error: "Email atau password salah.",
      email
    });
  }

  req.session.adminId = admin.id_admin;
  req.session.adminUsername = admin.username;
  setFlash(req, "success", `Selamat datang kembali, ${admin.username}.`);
  return res.redirect("/admin/dashboard");
}

function prosesLogout(req, res) {
  if (req.session) {
    req.session.destroy(() => res.redirect("/admin/login"));
    return;
  }
  return res.redirect("/admin/login");
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

async function dashboard(req, res) {
  const page = toPage(req.query.page);
  const [stats, aktivitas] = await Promise.all([
    adminService.getDashboardStats(),
    adminService.getAktivitas({ page, perPage: 6 })
  ]);

  return tampilkan(res, "dashboard", {
    pageTitle: "Dashboard",
    activeMenu: "dashboard",
    admin: { username: req.session.adminUsername },
    flash: flashOf(req),
    stats,
    aktivitas,
    query: ""
  });
}

/* ------------------------------------------------------------------ */
/* Kelola Sekolah                                                      */
/* ------------------------------------------------------------------ */

async function kelolaSekolah(req, res) {
  const status = ["aktif", "nonaktif"].includes(req.query.status) ? req.query.status : "semua";
  const search = String(req.query.search || "").trim();
  const sort = ["nama", "tanggal", "status"].includes(req.query.sort) ? req.query.sort : "tanggal";
  const dir = String(req.query.dir || "desc").toLowerCase() === "asc" ? "asc" : "desc";
  const page = toPage(req.query.page);

  const data = await adminService.getSchools({ status, search, sort, dir, page });

  return tampilkan(res, "kelola-sekolah", {
    pageTitle: "Kelola Sekolah",
    activeMenu: "sekolah",
    admin: { username: req.session.adminUsername },
    flash: flashOf(req),
    data,
    filter: { status, search, sort, dir },
    query: sisaQuery(req, ["status", "search", "sort", "dir"])
  });
}

async function simpanSekolah(req, res) {
  const id = angka(req.body.id_school, 0);
  const school_name = String(req.body.school_name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const alamat = String(req.body.alamat || "").trim();
  const kontak_telepon = String(req.body.kontak_telepon || "").trim();
  const status_aktif = req.body.status_aktif === "on" || req.body.status_aktif === "1";

  const gagal = (pesan) =>
    redirectWith(req, res, req.get("Referer") || "/admin/kelola-sekolah", "error", pesan);

  if (!school_name) return gagal("Nama sekolah wajib diisi.");
  if (!email) return gagal("Email sekolah wajib diisi.");
  if (!id && password.length < 6) return gagal("Password minimal 6 karakter untuk sekolah baru.");

  if (await adminService.emailSekolahDipakai(email, id || null)) {
    return gagal("Email sekolah sudah digunakan akun lain.");
  }

  try {
    if (id) {
      await adminService.updateSchool(id, {
        school_name,
        email,
        password: password || undefined,
        alamat,
        kontak_telepon,
        status_aktif
      });
      return redirectWith(req, res, "/admin/kelola-sekolah", "success", `Data sekolah "${school_name}" berhasil diperbarui.`);
    }

    await adminService.createSchool({
      adminId: req.session.adminId,
      school_name,
      email,
      password,
      alamat,
      kontak_telepon,
      status_aktif
    });
    return redirectWith(req, res, "/admin/kelola-sekolah", "success", `Sekolah "${school_name}" berhasil ditambahkan.`);
  } catch (err) {
    return gagal(err.message || "Gagal menyimpan data sekolah.");
  }
}

async function toggleStatusSekolah(req, res) {
  const id = angka(req.params.id, 0);
  const school = await adminService.getSchoolById(id);
  if (!school) {
    return redirectWith(req, res, "/admin/kelola-sekolah", "error", "Sekolah tidak ditemukan.");
  }
  await adminService.toggleSchoolStatus(id);
  const pesan = Number(school.status_aktif) === 1
    ? `Sekolah "${school.school_name}" berhasil dinonaktifkan.`
    : `Sekolah "${school.school_name}" berhasil diaktifkan.`;
  return redirectWith(req, res, "/admin/kelola-sekolah", "success", pesan);
}

async function hapusSekolah(req, res) {
  const id = angka(req.params.id, 0);
  const school = await adminService.getSchoolById(id);
  if (!school) {
    return redirectWith(req, res, "/admin/kelola-sekolah", "error", "Sekolah tidak ditemukan.");
  }
  await adminService.deleteSchool(id);
  return redirectWith(req, res, "/admin/kelola-sekolah", "success", `Sekolah "${school.school_name}" telah dihapus.`);
}

/* ------------------------------------------------------------------ */
/* Tes Skrining                                                        */
/* ------------------------------------------------------------------ */

async function daftarTes(req, res) {
  const sort = ["nama", "jenjang", "tanggal"].includes(req.query.sort) ? req.query.sort : "nama";
  const dir = String(req.query.dir || "asc").toLowerCase() === "desc" ? "desc" : "asc";
  const search = String(req.query.search || "").trim();

  const items = await adminService.getTests({ sort, dir, search });

  const aktif = items.filter((item) => Number(item.status_aktif) === 1).length;
  const totalSoal = items.reduce((acc, item) => acc + Number(item.jumlah_pertanyaan || 0), 0);
  const jenjang = new Set(items.map((item) => item.jenjang)).size;

  return tampilkan(res, "tes-skrining", {
    pageTitle: "Tes Skrining",
    activeMenu: "tes",
    admin: { username: req.session.adminUsername },
    flash: flashOf(req),
    items,
    filter: { sort, dir, search },
    total: items.length,
    aktif,
    totalSoal,
    jenjang
  });
}

async function simpanTes(req, res) {
  const id = angka(req.body.id_test, 0);
  const nama_tes = String(req.body.nama_tes || "").trim();
  const jenjang = String(req.body.jenjang || "").trim();
  const deskripsi = String(req.body.deskripsi || "").trim();
  const status_aktif = req.body.status_aktif === "on" || req.body.status_aktif === "1";

  if (!nama_tes || !jenjang) {
    return redirectWith(req, res, req.get("Referer") || "/admin/tes-skrining", "error",
      "Nama tes dan jenjang wajib diisi.");
  }

  try {
    if (id) {
      await adminService.updateTest(id, { nama_tes, jenjang, deskripsi, status_aktif });
      return redirectWith(req, res, "/admin/tes-skrining", "success", `Tes "${nama_tes}" berhasil diperbarui.`);
    }
    const baru = await adminService.createTest({
      adminId: req.session.adminId,
      nama_tes,
      jenjang,
      deskripsi,
      status_aktif
    });
    return redirectWith(req, res, `/admin/tes-skrining/${baru.id_test}`, "success",
      `Tes "${nama_tes}" berhasil dibuat. Silakan tambahkan pertanyaan.`);
  } catch (err) {
    return redirectWith(req, res, "/admin/tes-skrining", "error", err.message || "Gagal menyimpan tes.");
  }
}

async function detailTes(req, res) {
  const id = angka(req.params.id, 0);
  const test = await adminService.getTestById(id);
  if (!test) {
    return redirectWith(req, res, "/admin/tes-skrining", "error", "Tes skrining tidak ditemukan.");
  }

  const tab = ["ringkasan", "pertanyaan", "penilaian", "interpretasi"].includes(req.query.tab)
    ? req.query.tab
    : "ringkasan";
  const kategoriId = String(req.query.kategori || "");

  const [kategori, pertanyaan, konfigurasi, semuaKategori] = await Promise.all([
    adminService.getKategoriByTest(id),
    adminService.getQuestions({ testId: id, kategoriId, page: toPage(req.query.page) }),
    adminService.getKonfigurasi(id),
    adminService.getKategoriList(id)
  ]);

  return tampilkan(res, "tes-detail", {
    pageTitle: test.nama_tes,
    activeMenu: "tes",
    admin: { username: req.session.adminUsername },
    flash: flashOf(req),
    test,
    tab,
    kategori,
    pertanyaan,
    konfigurasi,
    semuaKategori,
    filter: { kategori: kategoriId },
    warnaPilihan: PILIHAN_WARNA.map((key) => WARNA_KATEGORI[key]),
    query: sisaQuery(req, ["tab", "kategori"])
  });
}

/* ------------------------------ Pertanyaan ------------------------------ */

async function detailPertanyaanJson(req, res) {
  const qid = angka(req.params.qid, 0);
  const detail = await adminService.getQuestionDetail(qid);
  if (!detail) return res.status(404).json({ success: false, message: "Pertanyaan tidak ditemukan." });

  const opsi = {};
  ["A", "B", "C", "D"].forEach((label) => {
    const found = (detail.opsi || []).find((o) => String(o.label_opsi).toUpperCase() === label);
    opsi[label] = {
      teks: found ? found.teks_opsi : "",
      url_gambar: found ? found.url_gambar || "" : ""
    };
  });

  return res.json({
    success: true,
    data: {
      id_pertanyaan: detail.id_pertanyaan,
      kategori_id: detail.kategori_id,
      teks_pertanyaan: detail.teks_pertanyaan,
      url_gambar: detail.url_gambar || "",
      jawaban_benar: detail.label_benar || "",
      skor: detail.skor,
      status_aktif: Number(detail.status_aktif) === 1,
      opsi
    }
  });
}

async function simpanPertanyaan(req, res) {
  const testId = angka(req.params.id, 0);
  const qid = angka(req.body.id_pertanyaan, 0);
  const kembali = `/admin/tes-skrining/${testId}?tab=pertanyaan`;

  const teks = String(req.body.teks_pertanyaan || "").trim();
  const kategori_id = angka(req.body.kategori_id, 0);
  const jawaban_benar = String(req.body.jawaban_benar || "").trim().toUpperCase();
  const url_gambar = String(req.body.url_gambar || "").trim();
  const skor = angka(req.body.skor, 1);
  const status_aktif = req.body.status_aktif === "on" || req.body.status_aktif === "1";

  if (!teks) return redirectWith(req, res, kembali, "error", "Teks pertanyaan wajib diisi.");
  if (!kategori_id) return redirectWith(req, res, kembali, "error", "Kategori asesmen wajib dipilih.");

  const opsi = {};
  let jumlahOpsi = 0;
  ["A", "B", "C", "D"].forEach((label) => {
    const text = String(req.body[`opsi_${label}`] || "").trim();
    const gambar = String(req.body[`opsi_${label}_gambar`] || "").trim();
    opsi[label] = { teks: text, url_gambar: gambar || null };
    if (text) jumlahOpsi += 1;
  });

  if (jumlahOpsi < 2) {
    return redirectWith(req, res, kembali, "error", "Isi minimal dua pilihan jawaban.");
  }
  if (!opsi[jawaban_benar] || !opsi[jawaban_benar].teks) {
    return redirectWith(req, res, kembali, "error", "Kunci jawaban harus menunjuk pilihan yang terisi.");
  }

  try {
    await adminService.saveQuestion({
      id: qid || null,
      testId,
      kategori_id,
      teks_pertanyaan: teks,
      url_gambar,
      jawaban_benar,
      skor,
      status_aktif,
      opsi
    });
    return redirectWith(
      req,
      res,
      kembali,
      "success",
      qid ? "Pertanyaan berhasil diperbarui." : "Pertanyaan baru berhasil ditambahkan."
    );
  } catch (err) {
    return redirectWith(req, res, kembali, "error", err.message || "Gagal menyimpan pertanyaan.");
  }
}

async function hapusPertanyaan(req, res) {
  const testId = angka(req.params.id, 0);
  const qid = angka(req.params.qid, 0);
  await adminService.deleteQuestion(qid);
  return redirectWith(req, res, `/admin/tes-skrining/${testId}?tab=pertanyaan`, "success",
    "Pertanyaan telah dihapus.");
}

async function toggleStatusPertanyaan(req, res) {
  const testId = angka(req.params.id, 0);
  const qid = angka(req.params.qid, 0);
  const detail = await adminService.getQuestionDetail(qid);
  const kembali = `/admin/tes-skrining/${testId}?tab=pertanyaan`;

  if (!detail) {
    return redirectWith(req, res, kembali, "error", "Pertanyaan tidak ditemukan.");
  }
  await adminService.toggleQuestionStatus(qid);
  return redirectWith(req, res, kembali, "success",
    Number(detail.status_aktif) === 1 ? "Pertanyaan dinonaktifkan." : "Pertanyaan diaktifkan.");
}

/* --------------------------- Konfigurasi Nilai -------------------------- */

async function detailKonfigurasiJson(req, res) {
  const id = angka(req.params.kid, 0);
  const row = await adminService.getKonfigurasiById(id);
  if (!row) return res.status(404).json({ success: false, message: "Rentang nilai tidak ditemukan." });

  return res.json({
    success: true,
    data: {
      id_konfigurasi: row.id_konfigurasiPenilaian,
      kategori_hasil: row.kategori_hasil,
      skor_min: Number(row.skor_min || 0),
      skor_max: Number(row.skor_max || 0),
      warna: row.warna_key || "biru",
      deskripsi: row.deskripsi || "",
      rekomendasi: row.rekomendasi || ""
    }
  });
}

async function simpanKonfigurasi(req, res) {
  const testId = angka(req.params.id, 0);
  const id = angka(req.body.id_konfigurasi, 0);
  const kembali = `/admin/tes-skrining/${testId}?tab=interpretasi`;

  const skor_min = angka(req.body.skor_min, 0);
  const skor_max = angka(req.body.skor_max, 0);
  const kategori_hasil = String(req.body.kategori_hasil || "").trim();
  const warna = PILIHAN_WARNA.includes(req.body.warna) ? req.body.warna : "biru";
  const deskripsi = String(req.body.deskripsi || "").trim();
  const rekomendasi = String(req.body.rekomendasi || "").trim();

  if (!kategori_hasil) {
    return redirectWith(req, res, kembali, "error", "Nama kategori hasil wajib diisi.");
  }
  if (skor_max < skor_min) {
    return redirectWith(req, res, kembali, "error", "Skor maksimal tidak boleh lebih kecil dari skor minimal.");
  }

  try {
    if (id) {
      await adminService.updateKonfigurasi(id, { skor_min, skor_max, kategori_hasil, warna, deskripsi, rekomendasi });
      return redirectWith(req, res, kembali, "success", `Rentang "${kategori_hasil}" berhasil diperbarui.`);
    }
    await adminService.createKonfigurasi({ testId, skor_min, skor_max, kategori_hasil, warna, deskripsi, rekomendasi });
    return redirectWith(req, res, kembali, "success", `Rentang "${kategori_hasil}" berhasil ditambahkan.`);
  } catch (err) {
    return redirectWith(req, res, kembali, "error", err.message || "Gagal menyimpan rentang nilai.");
  }
}

async function hapusKonfigurasi(req, res) {
  const testId = angka(req.params.id, 0);
  const id = angka(req.params.kid, 0);
  await adminService.deleteKonfigurasi(id);
  return redirectWith(req, res, `/admin/tes-skrining/${testId}?tab=interpretasi`, "success",
    "Rentang nilai telah dihapus.");
}

/* ------------------------------------------------------------------ */
/* Pengaturan                                                          */
/* ------------------------------------------------------------------ */

async function pengaturan(req, res) {
  const admin = await adminService.getSuperAdmin(req.session.adminId);
  const [stats, daftarTesAdmin] = await Promise.all([
    adminService.getDashboardStats(),
    adminService.getTests({})
  ]);

  return tampilkan(res, "pengaturan", {
    pageTitle: "Pengaturan",
    activeMenu: "pengaturan",
    admin: admin || { username: req.session.adminUsername },
    flash: flashOf(req),
    info: {
      totalSekolah: stats.totalSekolah,
      totalTes: daftarTesAdmin.length
    }
  });
}

async function simpanPengaturan(req, res) {
  const username = String(req.body.username || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "").trim();
  const konfirmasi = String(req.body.password_konfirmasi || "").trim();

  if (!username || !email) {
    return redirectWith(req, res, "/admin/pengaturan", "error", "Nama pengguna dan email wajib diisi.");
  }
  if (password && password.length < 6) {
    return redirectWith(req, res, "/admin/pengaturan", "error", "Password baru minimal 6 karakter.");
  }
  if (password && password !== konfirmasi) {
    return redirectWith(req, res, "/admin/pengaturan", "error", "Konfirmasi password tidak cocok.");
  }

  const existing = await adminService.findSuperAdminByEmail(email);
  if (existing && Number(existing.id_admin) !== Number(req.session.adminId)) {
    return redirectWith(req, res, "/admin/pengaturan", "error", "Email sudah dipakai akun lain.");
  }

  try {
    await adminService.updateSuperAdmin(req.session.adminId, {
      username,
      email,
      password: password || undefined
    });
    req.session.adminUsername = username;
    return redirectWith(req, res, "/admin/pengaturan", "success", "Profil berhasil diperbarui.");
  } catch (err) {
    return redirectWith(req, res, "/admin/pengaturan", "error", err.message || "Gagal menyimpan profil.");
  }
}

module.exports = {
  handleUpload,
  tampilLogin,
  prosesLogin,
  prosesLogout,
  dashboard,
  kelolaSekolah,
  simpanSekolah,
  toggleStatusSekolah,
  hapusSekolah,
  daftarTes,
  simpanTes,
  detailTes,
  detailPertanyaanJson,
  simpanPertanyaan,
  hapusPertanyaan,
  toggleStatusPertanyaan,
  detailKonfigurasiJson,
  simpanKonfigurasi,
  hapusKonfigurasi,
  pengaturan,
  simpanPengaturan
};
