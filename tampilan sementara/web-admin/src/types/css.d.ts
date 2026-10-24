/**
 * Deklarasi tipe untuk import CSS biasa (side-effect import).
 *
 * Next.js hanya menyediakan deklarasi untuk `*.module.css` (lihat
 * node_modules/next/types/global.d.ts). Import seperti `import "./globals.css"`
 * tidak punya deklarasi, sehingga TypeScript versi baru (yang mengaktifkan
 * `noUncheckedSideEffectImports`, mis. TS 6 / VS Code) melaporkan:
 *
 *   TS2882: Cannot find module or type declarations for side-effect import
 *
 * Runtime tidak terpengaruh — ini murni type-checking.
 */
declare module "*.css";
