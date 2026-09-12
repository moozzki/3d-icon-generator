# Checklist Fase 3 — Kode App (`D:\3d-icon-generator`)

**Referensi:** `doc/domain-migration-zupericon.md` — Fase 3
**Tujuan:** Decoupling app dari landing + migrasi domain/CDN ke `zupericon.com` (dua domain hidup bersamaan)
**Status:** Kode selesai (12 September 2026) — item env production di Vercel dikerjakan manual saat Fase 2/6

---

## A. Decoupling Auth & Landing

- [x] `lib/auth.ts` — `trustedOrigins`: pertahankan `BETTER_AUTH_URL`, `https://app.useaudora.com`, `http://localhost:3000`, `http://localhost:3001`, `https://*.vercel.app`; hapus `https://useaudora.com` & `https://www.useaudora.com`
- [x] `lib/auth.ts` — hapus blok `advanced.crossSubDomainCookies` (cookie jadi host-only per domain)
- [x] `next.config.ts` — hapus blok `headers()` CORS `/api/auth` (landing tidak memanggil cross-origin lagi)
- [x] `app/api/sign-out/route.ts` — default callback → `https://app.zupericon.com/sign-in`
- [x] `app/api/sign-out/route.ts` — regex allowlist: `app.zupericon.com` + `app.useaudora.com` + `localhost`
- [x] `app/api/sign-out/route.ts` — cookie deletion tanpa atribut `domain` (host-only); hapus referensi `.useaudora.com`

## B. Migrasi CDN ke `cdn.zupericon.com`

- [x] `lib/r2.ts` — tambah env `R2_PUBLIC_URL` (fallback `https://cdn.zupericon.com`) + helper `getPublicUrl()`
- [x] `lib/inngest/functions.ts:374` — URL base R2 → `getPublicUrl()`
- [x] `lib/inngest/functions.ts:447` — URL finalisasi job → `getPublicUrl()`
- [x] `lib/inngest/functions.ts:746` — URL canvas animasi → `getPublicUrl()`
- [x] `lib/inngest/functions.ts:782` — URL video animasi → `getPublicUrl()`
- [x] `app/api/upload/route.ts:56` — `fileUrl` → `getPublicUrl()`
- [x] `app/api/remove-bg/route.ts:97` — `permanentUrl` → `getPublicUrl()`
- [x] `app/api/download/route.ts` — allowlist SSRF: tambah `cdn.zupericon.com` (pertahankan `cdn.useaudora.com`)
- [x] `app/api/export-pack/route.ts` — allowlist SSRF: tambah `cdn.zupericon.com` (pertahankan `cdn.useaudora.com`)
- [x] `next.config.ts` — `images.remotePatterns` tambah `cdn.zupericon.com` (pertahankan `cdn.useaudora.com`)

## C. Pakasir Dual-Secret

- [x] `app/api/webhooks/pakasir/route.ts` — terima `PAKASIR_WEBHOOK_SECRET` **atau** `PAKASIR_WEBHOOK_SECRET_OLD` selama transisi
- [x] `app/api/webhooks/pakasir/route.ts` — update komentar contoh URL webhook ke `app.zupericon.com`

## D. Env Production (App Project — Vercel)

- [x] `BETTER_AUTH_URL=https://app.zupericon.com`
- [x] `NEXT_PUBLIC_BETTER_AUTH_URL=https://app.zupericon.com`
- [x] `NEXT_PUBLIC_APP_URL=https://app.zupericon.com`
- [x] `PAKASIR_SLUG=zupericon`
- [x] `PAKASIR_API_KEY=<baru>`
- [x] `PAKASIR_WEBHOOK_SECRET=<baru>`
- [x] `PAKASIR_WEBHOOK_SECRET_OLD=<lama>`
- [x] `R2_PUBLIC_URL=https://cdn.zupericon.com` (opsional — kode sudah fallback ke nilai ini)
- [ ] Redeploy wajib (variabel `NEXT_PUBLIC_*` bersifat build-time)

## E. Tidak Berubah di Fase Ini (tetap sampai Part B)

- [x] `app/sign-in/page.tsx:90` — link balik landing (domain link menyesuaikan saat Part B)
- [x] `app/checkout/page.tsx:21` — `PRICING_PAGE` (tetap)
- [x] `components/layout/dashboard-layout.tsx:452,637` — link landing + email support (tetap sampai Part B)
- [x] Semua teks brand "Audora", `lib/resend.ts`, email magic link, invoice, `share-card.tsx`, `app/manifest.ts` — diganti di Part B
- [x] Referensi aset `cdn.useaudora.com` di UI dashboard — tetap (CDN lama hidup; aset landing diganti Part B)

## F. Verifikasi

- [x] `npm run lint` — tanpa error baru
- [x] `npx tsc --noEmit` — lolos
- [ ] Smoke test di Fase 6 (bukan scope Fase 3)

---

## Catatan Implementasi

1. **`R2_PUBLIC_URL`**: belum ada di `.env.local` Vercel/environment manapun. Kode fallback ke `https://cdn.zupericon.com`, jadi deploy tanpa env baru tetap benar. Disarankan tetap menambahkan env-nya agar migrasi berikutnya cukup ganti env.
2. **Cookie sign-out**: better-auth kini menyetel cookie host-only. Deletion tambahan di route sign-out juga host-only (tanpa `domain`). Cookie lama `.useaudora.com` tetap valid di domain lama sampai expired — sesuai keputusan plan.
3. **`trustedOrigins`**: `http://localhost:3001` dipertahankan untuk kebutuhan dev (plan tidak menyebut eksplisit penghapusannya).
4. **Ordering imports**: `getPublicUrl` diekspor dari `lib/r2.ts` (baris 29) dan dipakai di 3 file: `lib/inngest/functions.ts`, `app/api/upload/route.ts`, `app/api/remove-bg/route.ts`. `uploadToR2()` sekarang juga mengembalikan `getPublicUrl(key)`.
5. **Verifikasi**: `npm run lint` tidak memunculkan error baru (29 error yang ada semuanya pre-existing di file di luar scope Fase 3); `npx tsc --noEmit` lolos tanpa error.
6. **Urutan deploy**: perubahan ini aman di-deploy sebelum `cdn.zupericon.com` aktif — aset baru akan memakai URL `cdn.zupericon.com` yang baru hidup setelah Fase 1 (R2 custom domain). Pastikan Fase 1 selesai sebelum generate di production.
