# Web Admin — Skrining Kognitif (Next.js)

Frontend **Panel Super Admin** berbasis Next.js (App Router + TypeScript),
mengonsumsi REST API dari backend Express di folder `../../sistem`.

## Arsitektur

```
sistem/                  -> backend Node.js (Express), API-only, port 5000
tampilan sementara/
├── web-admin/           -> frontend Next.js (folder ini), port 3000
├── design-reference/    -> arsip desain panel admin lama (EJS + CSS + JS)
├── legacy-vanilla/      -> arsip prototype HTML vanilla lama
├── index.html           -> prototype halaman siswa (belum dimigrasi)
└── indexV2.html         -> prototype halaman siswa v2 (belum dimigrasi)
```

## Menjalankan

Butuh **dua** terminal.

**1. Backend** (dari folder `sistem/`):

```bash
npm start            # http://localhost:5000
```

Pastikan MySQL sudah jalan:

```bash
docker compose up -d  # dari root project
```

**2. Frontend** (dari folder ini):

```bash
cp .env.local.example .env.local   # sekali saja
npm install                        # sekali saja
npm run dev                        # http://localhost:3000
```

Buka http://localhost:3000 → otomatis diarahkan ke `/login`.

Kredensial: `superadmin@skriningkognitif.id` / `admin123`

## Konfigurasi

`.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

## Halaman

| Rute | Fungsi |
|---|---|
| `/login` | Login Super Admin |
| `/dashboard` | Statistik + aktivitas platform |
| `/sekolah` | CRUD sekolah (tambah/edit/hapus/aktif-nonaktif, pencarian, filter, paginasi) |
| `/tes` | Daftar tes skrining + buat tes baru |
| `/tes/[id]` | Detail tes: tab Ringkasan, Pertanyaan, Penilaian, Interpretasi |
| `/pengaturan` | Profil Super Admin + ganti password |

## Endpoint API yang dipakai

Semua endpoint `/api/admin/*` (kecuali `login` dan `meta`) butuh header
`Authorization: Bearer <token>`.

| Method | Endpoint | Keterangan |
|---|---|---|
| POST | `/api/admin/login` | Login, mengembalikan JWT |
| GET | `/api/admin/me` | Profil dari token |
| GET | `/api/admin/meta` | Menu, palet warna |
| GET | `/api/admin/dashboard` | Statistik + aktivitas (paginasi) |
| GET/POST | `/api/admin/sekolah` | Daftar / simpan sekolah |
| PATCH | `/api/admin/sekolah/:id/toggle` | Aktif ↔ nonaktif |
| DELETE | `/api/admin/sekolah/:id` | Hapus sekolah (soft delete) |
| GET/POST | `/api/admin/tes` | Daftar / simpan tes |
| GET | `/api/admin/tes/:id` | Detail tes + pertanyaan + konfigurasi |
| GET/POST | `/api/admin/tes/:id/pertanyaan` | Detail / simpan pertanyaan |
| PATCH | `/api/admin/tes/:id/pertanyaan/:qid/toggle` | Aktif ↔ nonaktif |
| DELETE | `/api/admin/tes/:id/pertanyaan/:qid` | Hapus pertanyaan |
| GET/POST | `/api/admin/tes/:id/konfigurasi` | Detail / simpan rentang nilai |
| DELETE | `/api/admin/tes/:id/konfigurasi/:kid` | Hapus rentang |
| GET/POST | `/api/admin/pengaturan` | Profil admin |
| POST | `/api/admin/upload` | Unggah gambar (multipart, field `gambar`) |

## Struktur kode

```
src/
├── app/
│   ├── layout.tsx              # root layout + AuthProvider
│   ├── globals.css             # design token (dari desain lama)
│   ├── login/page.tsx
│   └── (dashboard)/            # rute terproteksi (punya sidebar)
│       ├── layout.tsx
│       ├── dashboard/page.tsx
│       ├── sekolah/page.tsx
│       ├── tes/page.tsx
│       ├── tes/[id]/page.tsx
│       └── pengaturan/page.tsx
├── components/ui.tsx           # Alert, Badge, Stat, Modal, Pagination, dll
└── lib/
    ├── api.ts                  # fetch wrapper + JWT + ApiError
    ├── auth.tsx                # AuthProvider / useAuth
    ├── types.ts                # tipe data bersama
    ├── format.ts               # format tanggal Indonesia
    └── menu.ts                 # menu sidebar
```

## Catatan

- Token JWT disimpan di `localStorage`; 401 otomatis membersihkan sesi.
- Styling **tidak** lagi bergantung CDN (Bootstrap dihapus), jadi tampilan
  tetap normal tanpa internet.
- Desain asli (EJS, `admin.css`, `admin.js`) tetap tersimpan di
  `../design-reference/` sebagai acuan visual.
