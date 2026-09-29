-- =======================================================
-- Inisialisasi Database Sistem Skrining Kognitif (MySQL 8)
-- =======================================================

CREATE DATABASE IF NOT EXISTS `skrining_kognitif` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `skrining_kognitif`;

-- 1. Tabel Schools (Data Sekolah)
CREATE TABLE IF NOT EXISTS `schools` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `schoolName` VARCHAR(255) NOT NULL,
  `address` TEXT,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabel Users (Data Pengguna / Guru / Konselor / Superadmin)
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `passwordHash` VARCHAR(255) NOT NULL,
  `role` ENUM('user', 'admin_sekolah', 'superadmin') DEFAULT 'user',
  `schoolId` INT NULL UNIQUE,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_users_school` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabel Questions (Bank Soal SD & SMP)
CREATE TABLE IF NOT EXISTS `questions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `questionCode` VARCHAR(64) UNIQUE NOT NULL,
  `level` VARCHAR(10) NOT NULL,
  `categoryKey` VARCHAR(50) NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `difficulty` VARCHAR(20) NOT NULL,
  `questionText` TEXT NOT NULL,
  `optionsJson` LONGTEXT NOT NULL,
  `correctAnswer` VARCHAR(20) NOT NULL,
  `explanation` TEXT,
  `scoreWeight` INT DEFAULT 1,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_questions_level_cat` (`level`, `categoryKey`),
  INDEX `idx_questions_code` (`questionCode`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabel Test Rooms (Ruang Tes / PIN Sesi)
CREATE TABLE IF NOT EXISTS `test_rooms` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `schoolId` INT NOT NULL,
  `pinCode` VARCHAR(20) UNIQUE NOT NULL,
  `level` VARCHAR(10) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'active',
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_test_rooms_pin` (`pinCode`),
  INDEX `idx_test_rooms_school` (`schoolId`),
  INDEX `idx_test_rooms_status` (`status`),
  CONSTRAINT `fk_rooms_school` FOREIGN KEY (`schoolId`) REFERENCES `schools`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabel Screening Sessions (Sesi Tes & Hasil Scoring)
CREATE TABLE IF NOT EXISTS `screening_sessions` (
  `sessionId` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NULL,
  `roomId` INT NULL,
  `level` VARCHAR(10) NOT NULL,
  `studentName` VARCHAR(255) NOT NULL,
  `studentAge` VARCHAR(50) NULL,
  `studentGrade` VARCHAR(50) NULL,
  `studentSchool` VARCHAR(255) NULL,
  `status` VARCHAR(50) NOT NULL,
  `startedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `completedAt` DATETIME NULL,
  `answersJson` LONGTEXT NULL,
  `resultJson` LONGTEXT NULL,
  INDEX `idx_sessions_user` (`userId`),
  INDEX `idx_sessions_status` (`status`),
  INDEX `idx_sessions_room` (`roomId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabel System Settings (Pengaturan Global)
CREATE TABLE IF NOT EXISTS `system_settings` (
  `key` VARCHAR(100) PRIMARY KEY,
  `value` TEXT NOT NULL,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabel System Logs (Audit Trail)
CREATE TABLE IF NOT EXISTS `system_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `action` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `userId` INT NULL,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_system_logs_action` (`action`),
  INDEX `idx_system_logs_created` (`createdAt`),
  INDEX `idx_system_logs_user` (`userId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Pengaturan awal default (minimum score)
INSERT INTO `system_settings` (`key`, `value`, `updatedAt`)
VALUES ('minimum_score', '75', NOW())
ON DUPLICATE KEY UPDATE `value` = `value`;
