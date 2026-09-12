# Checklist Fase 8 — Post-Cutover & Retire CDN Lama

**Referensi:** `doc/domain-migration-zupericon.md` — Fase 8
**Tanggal update:** 12 September 2026
**Status:** Selesai — termasuk migrasi URL DB (508 baris, 0 referensi lama tersisa). Tinggal Part B (menunggu upload logo baru) — dirangkum di `doc/domain-migration-pending-tasks.md`

---

## A. Redirect & Cleanup Domain Lama

- [x] 301 redirect `useaudora.com` → `zupericon.com`
- [x] 301 redirect `app.useaudora.com` → `app.zupericon.com`
- [x] Hapus webhook Polar lama
- [x] Hapus Pakasir project lama + `PAKASIR_WEBHOOK_SECRET_OLD`
- [x] Hapus OAuth redirect URI lama

## B. CDN — Pindah Total ke `cdn.zupericon.com`

- [x] App: `next.config.ts` remotePatterns (host lama dihapus)
- [x] App: allowlist SSRF `app/api/download/route.ts` (host lama dihapus)
- [x] App: allowlist SSRF `app/api/export-pack/route.ts` (host lama dihapus)
- [x] App: preview aset UI dashboard — `app/(dashboard)/page.tsx` + `app/(dashboard)/[jobId]/page.tsx`
- [x] Landing: `D:\audora-web\next.config.ts` remotePatterns (host lama dihapus)
- [x] Upload/generate baru otomatis pakai `cdn.zupericon.com` (`lib/r2.ts` → `R2_PUBLIC_URL`, fallback sudah benar sejak Fase 3)
- [x] Script migrasi URL lama di DB dibuat: `scripts/migrate-cdn-domain.ts` + `npm run db:migrate-cdn`
- [x] **`npm run db:migrate-cdn`** dijalankan ke DB production (12 Sep 2026) — 508 baris di-update (83 `reference_image`, 184 `base_image_url`, 189 `result_image_url`, 51 `transparent_image_url`, 1 `animations.base_image_url`); output `Remaining old-CDN references: 0`
- [x] Spot-check aset lama setelah migrasi — 3 sampel `result_image_url` → HTTP **200** di `cdn.zupericon.com`
- [ ] Opsional setelah 0 referensi lama: hentikan/lepaskan `cdn.useaudora.com` dari R2

## C. Dokumentasi & Lanjutan

- [x] Update dokumentasi internal (plan + checklist fase)
- [ ] Part B rebrand — menunggu upload logo baru dll

---

## Catatan

1. Script migrasi mengubah kolom: `generations.reference_image`, `generations.base_image_url`, `generations.result_image_url`, `generations.transparent_image_url`, `animations.base_image_url`, `animations.result_video_url`. Idempotent — aman dijalankan berulang.
2. **Urutan aman:** jalankan migrasi DB dulu (host baru sudah diterima allowlist deploy lama sejak Fase 3/6), baru deploy kode yang menghapus host lama — supaya tidak ada window 403 untuk aset lama.
3. Migrasi dijalankan 12 September 2026 langsung ke Neon production (508 baris). Script idempotent & reversibel — aman diulang; gunakan `--dry-run` untuk cek tanpa mengubah data.
4. Disarankan set `R2_PUBLIC_URL=https://cdn.zupericon.com` di Vercel (opsional; fallback kode sudah sama).
5. Setelah migrasi selesai, `cdn.useaudora.com` tidak dipakai lagi oleh aplikasi.
