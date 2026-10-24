# Design Reference — Panel Super Admin (arsip)

Folder ini berisi **desain panel admin lama** yang sebelumnya hidup di dalam
`sistem/` sebagai server-side rendering (EJS + Express session).

Kode ini **sudah tidak dijalankan** oleh backend. Disimpan sebagai acuan visual
dan logika bisnis saat frontend Next.js dibangun ulang.

## Isi

```
design-reference/
├── views/                   # 12 template EJS (halaman + partial + modal + tab)
│   └── admin/
│       ├── login.ejs
│       ├── dashboard.ejs
│       ├── kelola-sekolah.ejs
│       ├── tes-skrining.ejs
│       ├── tes-detail.ejs
│       ├── pengaturan.ejs
│       └── partials/        # layout, pagination, modals/, tabs/
├── admin-assets/
│   ├── css/admin.css        # sumber design token (warna, spacing, komponen)
│   ├── js/admin.js          # interaksi: modal, tab, konfirmasi hapus
│   └── img/avatar.svg
├── ssr-legacy/
│   ├── adminController.js   # controller SSR lama (referensi validasi form)
│   └── adminRoutes.js       # routing SSR lama
└── adminTheme.copy.js       # salinan palet warna & menu
```

## Pemetaan ke Next.js

| Desain lama (EJS) | Padanan Next.js |
|---|---|
| `public/admin/css/admin.css` | `web-admin/src/app/globals.css` |
| `partials/layout.ejs` | `web-admin/src/app/(dashboard)/layout.tsx` |
| `partials/pagination.ejs` | komponen `Pagination` di `src/components/ui.tsx` |
| `partials/modals/*.ejs` | komponen `Modal` + state form lokal |
| `partials/tabs/*.ejs` | tab di `src/app/(dashboard)/tes/[id]/page.tsx` |
| `adminController.js` | `sistem/src/controllers/adminApiController.js` |

## Catatan penting

- `admin.css` memakai **Bootstrap Icons** (`bi-*`) dan Bootstrap dari CDN.
  Versi Next.js sudah melepas ketergantungan itu (ikon diganti teks/unicode)
  supaya tampilan tetap normal tanpa internet.
- Logika validasi form di `adminController.js` sudah dipindahkan ke
  `adminApiController.js` pada backend, dengan pesan error yang sama.
- Jangan mengimpor folder ini dari aplikasi — murni dokumentasi.
