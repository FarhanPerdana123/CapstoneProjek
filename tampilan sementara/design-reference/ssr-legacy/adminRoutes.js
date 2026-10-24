/**
 * Route Panel Super Admin (SSR). Semua halaman dilindungi session login.
 */
const express = require("express");
const adminController = require("../controllers/adminController");

const router = express.Router();

/* ------------------------------ Middleware ------------------------------ */
function wajibLogin(req, res, next) {
  if (req.session && req.session.adminId) return next();
  if (req.method === "GET") {
    return res.redirect(`/admin/login?next=${encodeURIComponent(req.originalUrl)}`);
  }
  return res.redirect("/admin/login");
}

function sudahLogin(req, res, next) {
  if (req.session && req.session.adminId) return res.redirect("/admin/dashboard");
  return next();
}

/* ------------------------------ Autentikasi ----------------------------- */
router.get("/login", sudahLogin, adminController.tampilLogin);
router.post("/login", adminController.prosesLogin);
router.post("/logout", adminController.prosesLogout);
router.get("/logout", adminController.prosesLogout);

/* --------------------------------- Root --------------------------------- */
router.get("/", (req, res) => {
  if (req.session && req.session.adminId) return res.redirect("/admin/dashboard");
  return res.redirect("/admin/login");
});

/* ------------------------------- Dashboard ------------------------------ */
router.get("/dashboard", wajibLogin, adminController.dashboard);

/* ----------------------------- Kelola Sekolah --------------------------- */
router.get("/kelola-sekolah", wajibLogin, adminController.kelolaSekolah);
router.post("/kelola-sekolah", wajibLogin, adminController.simpanSekolah);
router.post("/kelola-sekolah/:id/toggle", wajibLogin, adminController.toggleStatusSekolah);
router.post("/kelola-sekolah/:id/hapus", wajibLogin, adminController.hapusSekolah);

/* ------------------------------- Tes Skrining --------------------------- */
router.get("/tes-skrining", wajibLogin, adminController.daftarTes);
router.post("/tes-skrining", wajibLogin, adminController.simpanTes);
router.get("/tes-skrining/:id", wajibLogin, adminController.detailTes);
router.post("/tes-skrining/:id/pertanyaan", wajibLogin, adminController.simpanPertanyaan);
router.get("/tes-skrining/:id/pertanyaan/:qid/json", wajibLogin, adminController.detailPertanyaanJson);
router.post("/tes-skrining/:id/pertanyaan/:qid/hapus", wajibLogin, adminController.hapusPertanyaan);
router.post("/tes-skrining/:id/pertanyaan/:qid/toggle", wajibLogin, adminController.toggleStatusPertanyaan);
router.post("/tes-skrining/:id/penilaian", wajibLogin, adminController.simpanKonfigurasi);
router.get("/tes-skrining/:id/penilaian/:kid/json", wajibLogin, adminController.detailKonfigurasiJson);
router.post("/tes-skrining/:id/penilaian/:kid/hapus", wajibLogin, adminController.hapusKonfigurasi);

/* -------------------------------- Pengaturan ---------------------------- */
router.get("/pengaturan", wajibLogin, adminController.pengaturan);
router.post("/pengaturan", wajibLogin, adminController.simpanPengaturan);

/* --------------------------------- Upload ------------------------------- */
router.post("/upload", wajibLogin, adminController.handleUpload);

module.exports = router;
