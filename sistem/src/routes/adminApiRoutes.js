/**
 * REST API Panel Super Admin — dipasang di /api/admin.
 * Dikonsumsi frontend Next.js menggunakan JWT Bearer.
 *
 * Endpoint publik:
 *   POST /api/admin/login        → Login Super Admin atau Sekolah
 *   GET  /api/admin/meta         → Metadata UI (warna, menu)
 *
 * Endpoint terproteksi (wajib login sebagai super_admin):
 *   GET  /api/admin/me                                → Profil super admin
 *   GET  /api/admin/dashboard                         → Statistik dashboard
 *
 *   GET    /api/admin/sekolah                         → Daftar sekolah
 *   POST   /api/admin/sekolah                         → Tambah / ubah sekolah
 *   PATCH  /api/admin/sekolah/:id/toggle              → Aktifkan / nonaktifkan sekolah
 *   DELETE /api/admin/sekolah/:id                     → Hapus sekolah
 *
 *   GET    /api/admin/tes                             → Daftar tes skrining
 *   POST   /api/admin/tes                             → Tambah / ubah tes
 *   GET    /api/admin/tes/:id                         → Detail tes (+ pertanyaan & konfigurasi)
 *
 *   GET    /api/admin/tes/:id/pertanyaan/:qid         → Detail pertanyaan
 *   POST   /api/admin/tes/:id/pertanyaan              → Tambah / ubah pertanyaan
 *   PATCH  /api/admin/tes/:id/pertanyaan/:qid/toggle  → Aktifkan / nonaktifkan pertanyaan
 *   DELETE /api/admin/tes/:id/pertanyaan/:qid         → Hapus pertanyaan
 *
 *   GET    /api/admin/tes/:id/konfigurasi/:kid        → Detail konfigurasi penilaian
 *   POST   /api/admin/tes/:id/konfigurasi             → Tambah / ubah konfigurasi penilaian
 *   DELETE /api/admin/tes/:id/konfigurasi/:kid        → Hapus konfigurasi penilaian
 *
 *   GET  /api/admin/pengaturan                        → Profil & info pengaturan
 *   POST /api/admin/pengaturan                        → Perbarui profil super admin
 *   POST /api/admin/upload                            → Upload gambar pertanyaan
 */

const express = require("express");
const c = require("../controllers/adminApiController");
const { adminAuth } = require("../middlewares/adminAuthMiddleware");

const router = express.Router();

/* Endpoint publik */
router.post("/login", c.login);
router.get("/meta", c.meta);

/* Semua endpoint berikut memerlukan autentikasi Super Admin */
router.use(adminAuth);

router.get("/me", c.me);
router.get("/dashboard", c.dashboard);

/* Kelola Sekolah */
router.get("/sekolah", c.daftarSekolah);
router.post("/sekolah", c.simpanSekolah);
router.patch("/sekolah/:id/toggle", c.toggleSekolah);
router.delete("/sekolah/:id", c.hapusSekolah);

/* Tes Skrining */
router.get("/tes", c.daftarTes);
router.post("/tes", c.simpanTes);
router.get("/tes/:id", c.detailTes);

/* Pertanyaan Tes */
router.get("/tes/:id/pertanyaan/:qid", c.detailPertanyaan);
router.post("/tes/:id/pertanyaan", c.simpanPertanyaan);
router.patch("/tes/:id/pertanyaan/:qid/toggle", c.togglePertanyaan);
router.delete("/tes/:id/pertanyaan/:qid", c.hapusPertanyaan);

/* Konfigurasi Penilaian */
router.get("/tes/:id/konfigurasi/:kid", c.detailKonfigurasi);
router.post("/tes/:id/konfigurasi", c.simpanKonfigurasi);
router.delete("/tes/:id/konfigurasi/:kid", c.hapusKonfigurasi);

/* Pengaturan Profil & Upload */
router.get("/pengaturan", c.pengaturan);
router.post("/pengaturan", c.simpanPengaturan);
router.post("/upload", c.upload);

module.exports = router;
