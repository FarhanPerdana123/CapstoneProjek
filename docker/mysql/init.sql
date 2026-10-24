CREATE DATABASE IF NOT EXISTS `skrining_kognitif`
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE `skrining_kognitif`;

SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------
-- 1. Tabel: super_admin
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `super_admin` (
  `id_admin` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_superadmin_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 2. Tabel: kategori_asesmen
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `kategori_asesmen` (
  `id_kategori` INT AUTO_INCREMENT PRIMARY KEY,
  `nama_kategori` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 3. Tabel: sekolah
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sekolah` (
  `id_school` INT AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT NOT NULL,
  `school_name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `alamat` TEXT NULL,
  `status_aktif` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_sekolah_admin` (`admin_id`),
  INDEX `idx_sekolah_email` (`email`),
  CONSTRAINT `fk_sekolah_admin` FOREIGN KEY (`admin_id`)
    REFERENCES `super_admin` (`id_admin`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 4. Tabel: tes_skrining
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `tes_skrining` (
  `id_test` INT AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT NOT NULL,
  `nama_tes` VARCHAR(255) NOT NULL,
  `jenjang` VARCHAR(255) NOT NULL,
  `deskripsi` TEXT NULL,
  `status_aktif` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_tes_admin` (`admin_id`),
  INDEX `idx_tes_jenjang` (`jenjang`),
  CONSTRAINT `fk_tes_admin` FOREIGN KEY (`admin_id`)
    REFERENCES `super_admin` (`id_admin`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 5. Tabel: konfigurasi_penilaian
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `konfigurasi_penilaian` (
  `id_konfigurasiPenilaian` INT AUTO_INCREMENT PRIMARY KEY,
  `test_id` INT NOT NULL,
  `skor_min` INT NOT NULL,
  `skor_max` INT NOT NULL,
  `kategori_hasil` VARCHAR(255) NOT NULL,
  `deskripsi` TEXT NULL,
  `rekomendasi` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_konfig_test` (`test_id`),
  CONSTRAINT `fk_konfig_test` FOREIGN KEY (`test_id`)
    REFERENCES `tes_skrining` (`id_test`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 6. Tabel: siswa
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `siswa` (
  `id_student` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `nama_lengkap` VARCHAR(255) NOT NULL,
  `nisn` VARCHAR(255) NULL,
  `tanggal_lahir` DATE NULL,
  `kelas` VARCHAR(255) NULL,
  `jenis_kelamin` ENUM('laki-laki', 'perempuan') NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_siswa_school` (`school_id`),
  INDEX `idx_siswa_nisn` (`nisn`),
  CONSTRAINT `fk_siswa_sekolah` FOREIGN KEY (`school_id`)
    REFERENCES `sekolah` (`id_school`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 7. Tabel: sesi_skrining
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `sesi_skrining` (
  `id_session` INT AUTO_INCREMENT PRIMARY KEY,
  `school_id` INT NOT NULL,
  `idKategori` INT NOT NULL,
  `nama_sesi` VARCHAR(255) NOT NULL,
  `kode_skrining` VARCHAR(6) NOT NULL UNIQUE,
  `tanggal_pelaksanaan` DATE NOT NULL,
  `status_sesi` ENUM('menunggu', 'aktif', 'selesai') NOT NULL DEFAULT 'menunggu',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_sesi_school` (`school_id`),
  INDEX `idx_sesi_kategori` (`idKategori`),
  INDEX `idx_sesi_kode` (`kode_skrining`),
  CONSTRAINT `fk_sesi_sekolah` FOREIGN KEY (`school_id`)
    REFERENCES `sekolah` (`id_school`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_sesi_kategori` FOREIGN KEY (`idKategori`)
    REFERENCES `kategori_asesmen` (`id_kategori`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 8. Tabel: pertanyaan
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `pertanyaan` (
  `id_pertanyaan` INT AUTO_INCREMENT PRIMARY KEY,
  `kategori_id` INT NOT NULL,
  `test_id` INT NOT NULL,
  `teks_pertanyaan` TEXT NOT NULL,
  `url_gambar` VARCHAR(255) NULL,
  `jawaban_benar` VARCHAR(255) NOT NULL,
  `skor` INT NOT NULL DEFAULT 1,
  `status_aktif` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_pertanyaan_kategori` (`kategori_id`),
  INDEX `idx_pertanyaan_test` (`test_id`),
  CONSTRAINT `fk_pertanyaan_kategori` FOREIGN KEY (`kategori_id`)
    REFERENCES `kategori_asesmen` (`id_kategori`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,
  CONSTRAINT `fk_pertanyaan_test` FOREIGN KEY (`test_id`)
    REFERENCES `tes_skrining` (`id_test`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 9. Tabel: opsi_jawaban
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `opsi_jawaban` (
  `id_jawaban` INT AUTO_INCREMENT PRIMARY KEY,
  `pertanyaan_id` INT NOT NULL,
  `label_opsi` CHAR(1) NOT NULL, -- Contoh: 'A', 'B', 'C', 'D'
  `teks_opsi` VARCHAR(255) NOT NULL,
  `url_gambar` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_opsi_pertanyaan` (`pertanyaan_id`),
  CONSTRAINT `fk_opsi_pertanyaan` FOREIGN KEY (`pertanyaan_id`)
    REFERENCES `pertanyaan` (`id_pertanyaan`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 10. Tabel: hasil_skrining
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `hasil_skrining` (
  `id_result` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `session_id` INT NOT NULL,
  `tanggal_skrining` DATE NOT NULL,
  `waktu_selesai` TIMESTAMP NULL DEFAULT NULL,
  `total_skor` INT DEFAULT 0,
  `kesimpulan_indikasi` TEXT NULL,
  `status_selesai` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_hasil_student` (`student_id`),
  INDEX `idx_hasil_session` (`session_id`),
  CONSTRAINT `fk_hasil_siswa` FOREIGN KEY (`student_id`)
    REFERENCES `siswa` (`id_student`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_hasil_sesi` FOREIGN KEY (`session_id`)
    REFERENCES `sesi_skrining` (`id_session`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------
-- 11. Tabel: detail_jawaban_siswa
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS `detail_jawaban_siswa` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `idHasil` INT NOT NULL,
  `idPertanyaan` INT NOT NULL,
  `idOpsi` INT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  INDEX `idx_detail_hasil` (`idHasil`),
  INDEX `idx_detail_pertanyaan` (`idPertanyaan`),
  INDEX `idx_detail_opsi` (`idOpsi`),
  CONSTRAINT `fk_detail_hasil` FOREIGN KEY (`idHasil`)
    REFERENCES `hasil_skrining` (`id_result`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_detail_pertanyaan` FOREIGN KEY (`idPertanyaan`)
    REFERENCES `pertanyaan` (`id_pertanyaan`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_detail_opsi` FOREIGN KEY (`idOpsi`)
    REFERENCES `opsi_jawaban` (`id_jawaban`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- =======================================================
-- SEED DATA / DATA DUMMY UNTUK PRESENTASI & DEMO
-- =======================================================

-- Nonaktifkan foreign key checks selama seeding data agar aman
SET FOREIGN_KEY_CHECKS = 0;

-- -------------------------------------------------------
-- 1. Dummy Data: super_admin
-- Password plain: "admin123" (semua akun demo)
-- Hash bcrypt di bawah = bcrypt("admin123", 10)
-- -------------------------------------------------------
INSERT INTO `super_admin` (`id_admin`, `username`, `email`, `password`) VALUES
(1, 'superadmin', 'superadmin@skriningkognitif.id', '$2a$10$I9ihZs5.UkL2HhJeBgioxORps6eUDFxPxzjA8shHbqVDgjFLxsqy6'),
(2, 'psikolog_pusat', 'psikolog@skriningkognitif.id', '$2a$10$I9ihZs5.UkL2HhJeBgioxORps6eUDFxPxzjA8shHbqVDgjFLxsqy6')
ON DUPLICATE KEY UPDATE `username` = VALUES(`username`);

-- -------------------------------------------------------
-- 2. Dummy Data: kategori_asesmen
-- -------------------------------------------------------
INSERT INTO `kategori_asesmen` (`id_kategori`, `nama_kategori`) VALUES
(1, 'Kemampuan Verbal & Pemahaman Bahasa'),
(2, 'Logika Numerik & Pola Angka'),
(3, 'Penalaran Spasial & Visual'),
(4, 'Konsentrasi & Kecepatan Kerja'),
(5, 'Daya Ingat & Memori Kerja')
ON DUPLICATE KEY UPDATE `nama_kategori` = VALUES(`nama_kategori`);

-- -------------------------------------------------------
-- 3. Dummy Data: sekolah
-- -------------------------------------------------------
INSERT INTO `sekolah` (`id_school`, `admin_id`, `school_name`, `email`, `password`, `alamat`, `status_aktif`) VALUES
(1, 1, 'SD Negeri 01 Menteng', 'admin@sdn01menteng.sch.id', 'sekolah123', 'Jl. Besuki No. 4, Menteng, Jakarta Pusat', 1),
(2, 1, 'SMP Negeri 1 Surabaya', 'admin@smpn1surabaya.sch.id', 'sekolah123', 'Jl. Pacar No. 4-6, Genteng, Surabaya', 1),
(3, 1, 'SD Islam Al-Azhar 1', 'admin@alazhar1.sch.id', 'sekolah123', 'Jl. Sisingamangaraja, Kebayoran Baru, Jakarta Selatan', 1)
ON DUPLICATE KEY UPDATE `school_name` = VALUES(`school_name`);

-- -------------------------------------------------------
-- 4. Dummy Data: tes_skrining
-- -------------------------------------------------------
INSERT INTO `tes_skrining` (`id_test`, `admin_id`, `nama_tes`, `jenjang`, `deskripsi`, `status_aktif`) VALUES
(1, 1, 'Skrining Kognitif Awal Siswa SD (Fase A-B)', 'SD', 'Instrumen pemetaan potensi kognitif anak untuk mendeteksi kesiapan belajar dan daya nalar dasar.', 1),
(2, 1, 'Asesmen Potensi Skolastik & Kognitif SMP', 'SMP', 'Asesmen kemampuan nalar kritis, logika matematika dasar, dan kecepatan pemrosesan informasi tingkat SMP.', 1)
ON DUPLICATE KEY UPDATE `nama_tes` = VALUES(`nama_tes`);

-- -------------------------------------------------------
-- 5. Dummy Data: konfigurasi_penilaian
-- -------------------------------------------------------
INSERT INTO `konfigurasi_penilaian` (`id_konfigurasiPenilaian`, `test_id`, `skor_min`, `skor_max`, `kategori_hasil`, `deskripsi`, `rekomendasi`) VALUES
(1, 1, 0, 40, 'Perlu Perhatian Khusus', 'Siswa menghadapi tantangan signifikan pada pemahaman pola dan instruksi verbal dasar.', 'Dianjurkan konsultasi dengan guru BK atau psikolog anak untuk asesmen diagnostik lanjutan.'),
(2, 1, 41, 75, 'Cukup / Rata-rata', 'Kemampuan kognitif siswa berada dalam rentang standar perkembangan usianya.', 'Diberikan latihan mandiri secara konsisten dan pengayaan interaktif di kelas.'),
(3, 1, 76, 100, 'Sangat Baik / Unggul', 'Siswa memiliki daya nalar dan kecepatan memahami masalah di atas rata-rata kelompok usianya.', 'Fasilitasi dengan materi pengayaan tingkat lanjut atau program akselerasi minat.'),
(4, 2, 0, 50, 'Kurang / Indikasi Hambatan Belajar', 'Daya serap informasi dan logika analitis memerlukan stimulus serta bimbingan ekstra.', 'Perlu metode remedial dengan pendekatan visual dan pembelajaran kontekstual.'),
(5, 2, 51, 80, 'Baik / Sesuai Standar', 'Kemampuan nalar kritis dan memori kerja berkembang dengan baik sesuai tingkatan kelas.', 'Pertahankan ritme belajar dengan latihan soal analitis dan studi kasus.'),
(6, 2, 81, 100, 'Sangat Unggul / Cerdas Istimewa', 'Kapasitas penalaran logika, pemecahan masalah, dan memori kerja sangat tinggi.', 'Dianjurkan mengikuti bimbingan olimpiade sains atau program pengembangan talenta.')
ON DUPLICATE KEY UPDATE `kategori_hasil` = VALUES(`kategori_hasil`);

-- -------------------------------------------------------
-- 6. Dummy Data: siswa
-- -------------------------------------------------------
INSERT INTO `siswa` (`id_student`, `school_id`, `nama_lengkap`, `nisn`, `tanggal_lahir`, `kelas`, `jenis_kelamin`) VALUES
(1, 1, 'Muhammad Rizky Pratama', '0123456781', '2014-05-12', '4A', 'laki-laki'),
(2, 1, 'Siti Aisyah Putri', '0123456782', '2014-08-20', '4A', 'perempuan'),
(3, 1, 'Kenzo Danendra', '0123456783', '2015-01-15', '3B', 'laki-laki'),
(4, 2, 'Ahmad Fajar Nurhadi', '0098765431', '2011-03-10', '7B', 'laki-laki'),
(5, 2, 'Nabila Zahra Kirana', '0098765432', '2011-11-25', '7B', 'perempuan')
ON DUPLICATE KEY UPDATE `nama_lengkap` = VALUES(`nama_lengkap`);

-- -------------------------------------------------------
-- 7. Dummy Data: sesi_skrining
-- -------------------------------------------------------
INSERT INTO `sesi_skrining` (`id_session`, `school_id`, `idKategori`, `nama_sesi`, `kode_skrining`, `tanggal_pelaksanaan`, `status_sesi`) VALUES
(1, 1, 1, 'Sesi Skrining Kognitif Kelas 4 Gelombang 1', 'SKR001', '2026-10-10', 'selesai'),
(2, 1, 2, 'Sesi Uji Logika Numerik Kelas 4', 'SKR002', '2026-10-12', 'aktif'),
(3, 2, 2, 'Asesmen Penalaran Logika Kelas 7 Semester 1', 'SMP001', '2026-10-15', 'menunggu')
ON DUPLICATE KEY UPDATE `nama_sesi` = VALUES(`nama_sesi`);

-- -------------------------------------------------------
-- 8. Dummy Data: pertanyaan
-- -------------------------------------------------------
INSERT INTO `pertanyaan` (`id_pertanyaan`, `kategori_id`, `test_id`, `teks_pertanyaan`, `url_gambar`, `jawaban_benar`, `skor`, `status_aktif`) VALUES
(1, 1, 1, 'Manakah pasangan kata berikut yang memiliki hubungan analogi yang sama seperti "Matahari : Siang"?', NULL, 'Bulan : Malam', 20, 1),
(2, 1, 1, 'Antonim atau lawan kata dari kata "DERMAWAN" adalah...', NULL, 'Pelit', 20, 1),
(3, 2, 1, 'Lanjutkan pola deret angka berikut: 2, 4, 8, 16, ...', NULL, '32', 20, 1),
(4, 2, 1, 'Jika sebuah persegi memiliki panjang sisi 6 cm, berapakah keliling bangun tersebut?', NULL, '24 cm', 20, 1),
(5, 3, 1, 'Manakah bentuk yang merupakan hasil rotasi 90 derajat searah jarum jam dari gambar acuan?', 'https://placehold.co/400x250/png?text=Soal+Pola+Spasial', 'Pola C', 20, 1)
ON DUPLICATE KEY UPDATE `teks_pertanyaan` = VALUES(`teks_pertanyaan`);

-- -------------------------------------------------------
-- 9. Dummy Data: opsi_jawaban
-- -------------------------------------------------------
INSERT INTO `opsi_jawaban` (`id_jawaban`, `pertanyaan_id`, `label_opsi`, `teks_opsi`, `url_gambar`) VALUES
-- Opsi untuk Soal 1
(1, 1, 'A', 'Bintang : Gelap', NULL),
(2, 1, 'B', 'Bulan : Malam', NULL),
(3, 1, 'C', 'Lampu : Terang', NULL),
(4, 1, 'D', 'Hujan : Basah', NULL),

-- Opsi untuk Soal 2
(5, 2, 'A', 'Sombong', NULL),
(6, 2, 'B', 'Pelit', NULL),
(7, 2, 'C', 'Jahat', NULL),
(8, 2, 'D', 'Kaya', NULL),

-- Opsi untuk Soal 3
(9, 3, 'A', '24', NULL),
(10, 3, 'B', '30', NULL),
(11, 3, 'C', '32', NULL),
(12, 3, 'D', '64', NULL),

-- Opsi untuk Soal 4
(13, 4, 'A', '12 cm', NULL),
(14, 4, 'B', '24 cm', NULL),
(15, 4, 'C', '36 cm', NULL),
(16, 4, 'D', '48 cm', NULL),

-- Opsi untuk Soal 5
(17, 5, 'A', 'Pola A', NULL),
(18, 5, 'B', 'Pola B', NULL),
(19, 5, 'C', 'Pola C', NULL),
(20, 5, 'D', 'Pola D', NULL)
ON DUPLICATE KEY UPDATE `teks_opsi` = VALUES(`teks_opsi`);

-- -------------------------------------------------------
-- 10. Dummy Data: hasil_skrining
-- -------------------------------------------------------
INSERT INTO `hasil_skrining` (`id_result`, `student_id`, `session_id`, `tanggal_skrining`, `waktu_selesai`, `total_skor`, `kesimpulan_indikasi`, `status_selesai`) VALUES
(1, 1, 1, '2026-10-10', '2026-10-10 09:45:00', 80, 'Sangat Baik / Unggul. Memiliki kecepatan analisis verbal dan logika angka yang sangat solid.', 1),
(2, 2, 1, '2026-10-10', '2026-10-10 09:50:30', 60, 'Cukup / Rata-rata. Pemahaman instruksi baik, disarankan pengayaan rutin pada penalaran spasial.', 1),
(3, 3, 1, '2026-10-10', NULL, 0, NULL, 0)
ON DUPLICATE KEY UPDATE `total_skor` = VALUES(`total_skor`);

-- -------------------------------------------------------
-- 11. Dummy Data: detail_jawaban_siswa
-- -------------------------------------------------------
INSERT INTO `detail_jawaban_siswa` (`id`, `idHasil`, `idPertanyaan`, `idOpsi`) VALUES
-- Jawaban Siswa 1 (Rizky Pratama - Skor: 80, Soal 1-4 Benar, Soal 5 Salah)
(1, 1, 1, 2),   -- Soal 1 pilih B (Benar, +20)
(2, 1, 2, 6),   -- Soal 2 pilih B (Benar, +20)
(3, 1, 3, 11),  -- Soal 3 pilih C (Benar, +20)
(4, 1, 4, 14),  -- Soal 4 pilih B (Benar, +20)
(5, 1, 5, 17),  -- Soal 5 pilih A (Salah, Kunci C)

-- Jawaban Siswa 2 (Siti Aisyah - Skor: 60, Soal 1, 2, 4 Benar)
(6, 2, 1, 2),   -- Soal 1 pilih B (Benar, +20)
(7, 2, 2, 6),   -- Soal 2 pilih B (Benar, +20)
(8, 2, 3, 9),   -- Soal 3 pilih A (Salah, Kunci C)
(9, 2, 4, 14),  -- Soal 4 pilih B (Benar, +20)
(10, 2, 5, 18)  -- Soal 5 pilih B (Salah, Kunci C)
ON DUPLICATE KEY UPDATE `idOpsi` = VALUES(`idOpsi`);

SET FOREIGN_KEY_CHECKS = 1;
