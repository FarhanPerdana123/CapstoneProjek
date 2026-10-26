# Sistem Asesmen & Skrining Kognitif Siswa (SD & SMP)

Platform asesmen berbasis web untuk melakukan skrining kognitif awal siswa tingkat SD dan SMP. Sistem ini mengukur empat dimensi kognitif utama (Logika & Pola, Penalaran Numerik, Penalaran Verbal, dan Spasial & Visual), menghasilkan estimasi IQ deterministik skala Wechsler, serta memberikan indikasi awal mengacu pada pedoman kriteria diagnostik DSM-5 Kriteria A.

---

## 🏗️ Arsitektur Proyek

Proyek ini menggunakan arsitektur *decoupled* (backend API terpisah dari frontend):

```
.
├── docker-compose.yml              # Konfigurasi container Docker (MySQL 8.0 & phpMyAdmin)
├── docker/
│   └── mysql/
│       └── init.sql                # Skema basis data lengkap & data seed awal
├── sistem/                         # Backend REST API (Node.js & Express)
│   ├── scripts/
│   │   └── create_superadmin.js    # Script CLI untuk membuat akun Super Admin
│   ├── package.json
│   ├── public/uploads/             # Direktori penyimpanan unggahan gambar soal
│   └── src/
│       ├── server.js               # Entry point Express HTTP server (port 5000)
│       ├── config/                 # Konfigurasi aplikasi & konstanta domain
│       ├── database/               # Koneksi pool MySQL (mysql2/promise) & migrasi
│       ├── models/                 # Model abstraksi query basis data
│       ├── controllers/            # Controller penanganan HTTP request & response
│       ├── services/               # Logika bisnis (scoring, autentikasi, logging)
│       ├── middlewares/            # Middleware auth, role (RBAC), error & request logging
│       ├── routes/                 # Definisi rute Express
│       └── utils/                  # Utilitas logger, apiResponse, dan custom error
├── web-admin/                      # Panel Super Admin (Next.js 15 App Router + TypeScript, port 3000)
└── _legacy-reference/              # Arsip legacy acuan desain visual & template EJS lama (gitignored)
```

---

## 🚀 Panduan Memulai Cepat

### Prasyarat
- [Node.js](https://nodejs.org/) v18+ atau v20+
- [Docker](https://www.docker.com/) & Docker Compose

---

### Langkah 1: Jalankan Database MySQL (Docker)

Dari root direktori proyek, jalankan:

```bash
docker compose up -d
```

- **MySQL Database**: `localhost:3306` (Database: `skrining_kognitif`, User: `skrining_user`, Password: `skrining_password123`)
- **phpMyAdmin**: `http://localhost:8080` (Akses GUI basis data)

> **Catatan**: Skema tabel dan data master awal akan otomatis diinisialisasi oleh Docker dari file `./docker/mysql/init.sql`.

---

### Langkah 2: Menjalankan Backend API

Buka terminal baru dan masuk ke direktori `sistem`:

```bash
cd sistem
npm install
```

Buat akun Super Admin pertama (jika belum dibuat):

```bash
npm run create-superadmin
```
*Ikuti prompt interaktif untuk memasukkan username, email, dan password.*

Jalankan backend server:

```bash
# Mode development (otomatis reload dengan Node --watch)
npm run dev

# Atau mode normal
npm start
```

Backend aktif di: `http://localhost:5000`  
Health check endpoint: `http://localhost:5000/api/health`

---

### Langkah 3: Menjalankan Frontend Panel Admin

Buka terminal kedua dan masuk ke direktori frontend:

```bash
cd web-admin
npm install
npm run dev
```

Frontend aktif di: `http://localhost:3000`  
Halaman login: `http://localhost:3000/login`

---

## 🔑 Autentikasi & Akun Awal

Sistem mendukung 3 tingkat pengguna (Role):
1. **Super Admin** (`super_admin`): Mengelola seluruh sekolah mitra, instrumen tes, bank soal, dan rentang skor. Kredensial default: `superadmin@skriningkognitif.id` / `admin123`.
2. **Sekolah** (`sekolah`): Didaftarkan oleh Super Admin, dapat membuat sesi tes / ruang ujian untuk siswa.
3. **Siswa / Peserta** (`student`): Masuk menggunakan PIN ruang tes atau kredensial yang dibagikan oleh pihak sekolah.

---

## 📡 Daftar Endpoint API Utama

| Metode | Rute Endpoint | Akses / Guard | Deskripsi |
|---|---|---|---|
| `GET` | `/api/health` | Publik | Status kesehatan backend |
| `POST` | `/api/admin/auth/login` | Publik | Login Super Admin & Sekolah |
| `GET` | `/api/admin/auth/me` | Bearer Token | Profil Super Admin login |
| `GET` | `/api/admin/dashboard` | Super Admin | Ringkasan statistik & timeline aktivitas |
| `GET/POST` | `/api/admin/sekolah` | Super Admin | CRUD data sekolah mitra |
| `PATCH` | `/api/admin/sekolah/:id/toggle`| Super Admin | Toggle status aktif/nonaktif sekolah |
| `GET/POST` | `/api/admin/tes` | Super Admin | CRUD instrumen tes skrining |
| `GET` | `/api/admin/tes/:id` | Super Admin | Detail tes, kategori, dan soal |
| `POST` | `/api/admin/tes/:id/pertanyaan`| Super Admin | Simpan butir soal & opsi A, B, C, D |
| `POST` | `/api/admin/upload` | Super Admin | Upload gambar butir pertanyaan |
| `POST` | `/api/auth/register` | Publik | Pendaftaran akun pengguna |
| `POST` | `/api/auth/login` | Publik | Login peserta tes |
| `GET` | `/api/questions/test/:testId` | Bearer Token | Mengambil butir soal asesmen |
| `POST` | `/api/screenings/submit` | Bearer Token | Kirim jawaban & kalkulasi skor otomatis |
| `GET/POST` | `/api/rooms` | Sekolah / Admin | Manajemen ruang tes & kode PIN |

---

## 🛠️ Standar & Aturan Kode

- **Indentasi**: 2 spasi konsisten di seluruh berkas JavaScript/TypeScript.
- **Line Endings**: LF (`\n`).
- **Dokumentasi**: Setiap file controller, service, model, dan middleware dilengkapi JSDoc dalam Bahasa Indonesia.
- **Format Respon API**: Terstandarisasi menggunakan helper `ApiResponse` (`{ success: true, message: "...", data: ... }`).
- **Penanganan Error**: Error operasional dikelola melalui kelas `AppError` dan ditangkap oleh `globalErrorHandler`.
