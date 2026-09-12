# Plan Final v3: Migrasi `useaudora.com` & `app.useaudora.com` → `zupericon.com` & `app.zupericon.com`

**Tanggal update:** 12 September 2026
**Status:** Berjalan — Fase 0-6 & 8 selesai (Fase 7 = rencana rollback, tidak terpakai). Pending: test transaksi Polar & Pakasir (menunggu verified KYC), Search Console (Fase 5.8), verifikasi Inngest dari domain baru, switch email `noreply@zupericon.com` + rename file download (Part B), dan Part B rebrand (menunggu upload logo baru).
**Ruang lingkup:** Repo app (`3d-icon-generator`) + repo landing (`audora-web`)
**Sisa pending:** `doc/domain-migration-pending-tasks.md`

---

## 1. Keputusan final

| Topik | Keputusan |
|---|---|
| Landing + blog marketing | **Pindah ke `zupericon.com` (+ `www`)**; domain lama `useaudora.com` tetap dilayani selama transisi |
| App/dashboard | **Pindah ke `app.zupericon.com`**; domain lama `app.useaudora.com` tetap dilayani selama transisi |
| Redirect 301 | **Ditunda ke Fase 8** (setelah migrasi stabil); saat ini dua domain hidup bersamaan |
| Auth | **Tanpa cross-subdomain**; cookie host-only per domain (`app.zupericon.com` / `app.useaudora.com`) |
| Navbar landing | **Decoupled penuh dari backend** — tombol Sign In statis, tidak ada session check |
| Coupling backend → landing | **Diputus total** (hapus CORS `/api/auth`, trusted origin landing, cross-subdomain cookie) |
| Pakasir (payment IDR) | Buat project baru slug `zupericon`; dukung dual-secret saat transisi |
| Rebrand Zupericon | **Part B, dieksekusi setelah migrasi stabil** (aset sudah siap); mencakup app **dan** landing |
| CDN | **Semua file (baru & lama) pindah ke `cdn.zupericon.com`**; `cdn.useaudora.com` tidak dipakai lagi — URL lama di DB dimigrasi via `scripts/migrate-cdn-domain.ts` |

### Kenapa aman tanpa cross-subdomain

Cookie host-only per domain: user di `app.useaudora.com` punya sesi sendiri, user di `app.zupericon.com` punya sesi sendiri. Cookie lama `.useaudora.com` tetap terbaca di domain lama sampai expired; user domain baru login ulang sekali. Tidak ada dependency silang antara landing dan app.

### Temuan audit yang mendasari

- Landing **sudah tidak punya coupling server-side** ke app:
  - `app/actions/waitlist.ts` dan `app/api/testimonials/route.ts` akses Neon DB langsung.
  - `lib/auth.ts` landing adalah **dead code** (tidak diimport siapa pun).
- Coupling landing → app cuma client-side: `components/landing/navbar.tsx` memakai `authClient.useSession()` + `UserProfileDropdown`.
- Coupling app → landing: CORS `/api/auth` (`next.config.ts:38-52`), `trustedOrigins` (`lib/auth.ts:111-119`), `crossSubDomainCookies` (`lib/auth.ts:121-128`), cookie deletion `.useaudora.com` (`app/api/sign-out/route.ts:30-33`).

### Arsitektur target

| Komponen | Sekarang | Target |
|---|---|---|
| Landing page | `useaudora.com` (Vercel) | `zupericon.com` + `www` — `useaudora.com` tetap dilayani |
| App/dashboard | `app.useaudora.com` (Vercel) | `app.zupericon.com` — `app.useaudora.com` tetap dilayani |
| CDN | `cdn.useaudora.com` | **`cdn.zupericon.com`** — satu-satunya host aset & hasil generate; URL lama di DB dimigrasi (Fase 8) |
| Auth | Cookie `.useaudora.com` | Host-only per domain, tanpa cross-subdomain |
| Email app | `noreply@useaudora.com` | `noreply@zupericon.com` (verify Resend; brand diganti di Part B) |

**Prinsip: zero-downtime + rollback mudah.** Domain lama tetap hidup sampai cutover; setelah Fase 8, `cdn.useaudora.com` tidak lagi dipakai (URL DB dimigrasi ke `cdn.zupericon.com`).

---

## Fase 0 — Persiapan

1. Pindah NS `zupericon.com` ke Cloudflare (propagasi 1-24 jam) — diperlukan untuk `zupericon.com`, `app.zupericon.com`, dan `cdn.zupericon.com`.
2. Kumpulkan akses dashboard: Cloudflare, Vercel (2 project), registrar, Polar, Pakasir, Resend, Google Cloud Console, GitHub OAuth, Inngest, Sanity, Turnstile, Neon.
3. Backup: export env production (app & landing) dari Vercel, snapshot Neon, catat `POLAR_WEBHOOK_SECRET`, `PAKASIR_WEBHOOK_SECRET`, `PAKASIR_SLUG`, product ID Polar.
4. Aset rebrand Zupericon standby untuk Part B.
5. Pastikan domain `useaudora.com` tetap diperpanjang (dibutuhkan untuk 301 redirect Fase 8).

---

## Fase 1 — Cloudflare (zone `zupericon.com`)

1. **DNS**:
   - `@` → `A 76.76.21.21` (atau `CNAME cname.vercel-dns.com`) — landing
   - `www` → `CNAME cname.vercel-dns.com` (redirect ke apex, opsional)
   - `app` → `CNAME cname.vercel-dns.com` — app
   - `cdn` → otomatis dibuat saat add R2 custom domain
   - Rekomendasi DNS-only (grey cloud); kalau diproxy set SSL **Full (strict)**.
2. **R2**: add custom domain `cdn.zupericon.com` ke bucket `audora-icon-storage`. (`cdn.useaudora.com` saat itu dipertahankan; sejak Fase 8 tidak dipakai lagi — lihat Fase 8.)
3. **R2 CORS**: tambah `https://app.zupericon.com`, `https://zupericon.com`, `https://www.zupericon.com` (pertahankan origin lama; dibutuhkan untuk presigned upload dari browser).
4. **Email Routing**: aktifkan `support@` / `rizky@zupericon.com` (skip jika pakai Google Workspace — cukup tambah user).
5. **Resend**: add domain `zupericon.com` → record DKIM/SPF/DMARC di Cloudflare → **Verify sebelum kirim email produksi**.
6. **Turnstile**: tambah hostname `zupericon.com` + `www.zupericon.com` (pertahankan hostname lama).
7. **Sanity**: tambah CORS origin `https://zupericon.com`, `https://www.zupericon.com`.
8. **Search Console**: add properti `zupericon.com` + submit sitemap baru.

Zone `useaudora.com` tetap ada di Cloudflare (untuk redirect Fase 8).

---

## Fase 2 — Vercel

1. **Landing project**: add production domains `zupericon.com` + `www.zupericon.com` (tetap pertahankan `useaudora.com` + `www`).
2. **App project**: add production domain `app.zupericon.com` (tetap pertahankan `app.useaudora.com`).
3. Update env production:
   - Landing: `NEXT_PUBLIC_SITE_URL=https://zupericon.com`
   - App (redeploy wajib karena `NEXT_PUBLIC_*` build-time):

```env
BETTER_AUTH_URL=https://app.zupericon.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://app.zupericon.com
NEXT_PUBLIC_APP_URL=https://app.zupericon.com
PAKASIR_SLUG=zupericon
PAKASIR_API_KEY=<baru>
PAKASIR_WEBHOOK_SECRET=<baru>
PAKASIR_WEBHOOK_SECRET_OLD=<lama>
```

4. **Belum ada redirect** — dua domain hidup bersamaan sampai Fase 8.
5. Jangan lepas domain lama dari Vercel sampai smoke test selesai.

---

## Fase 3 — Kode App (`D:\3d-icon-generator`)

### Decoupling dari landing + migrasi domain

| File | Baris | Perubahan |
|---|---|---|
| `lib/auth.ts` | 111-119 | `trustedOrigins`: `BETTER_AUTH_URL`, `https://app.useaudora.com`, `http://localhost:3000`, `https://*.vercel.app`; hapus origin landing (`useaudora.com`, `app.useaudora.com` sebagai landing origin, `www.useaudora.com`) |
| `lib/auth.ts` | 121-128 | **Hapus blok `advanced.crossSubDomainCookies`** (cookie jadi host-only) |
| `next.config.ts` | 38-52 | **Hapus blok `headers()` CORS** (landing tidak memanggil `/api/auth` cross-origin lagi) |
| `next.config.ts` | 18 | `images.remotePatterns` → `cdn.zupericon.com` (Fase 8: `cdn.useaudora.com` dihapus) |
| `app/api/sign-out/route.ts` | 6-10 | Default callback → `https://app.zupericon.com/sign-in`; regex izinkan `app.zupericon.com` **dan** `app.useaudora.com` + localhost |
| `app/api/sign-out/route.ts` | 22, 30-33 | Cookie deletion tanpa atribut `domain` (host-only); hapus referensi `.useaudora.com` |
| `lib/r2.ts` | 41 | URL CDN → `cdn.zupericon.com` (saran: jadikan env `R2_PUBLIC_URL` agar migrasi berikutnya tinggal ganti env) |
| `lib/inngest/functions.ts` | 374, 447, 746, 782 | 4 URL CDN → `cdn.zupericon.com` |
| `app/api/upload/route.ts` | 56 | `fileUrl` → `cdn.zupericon.com` |
| `app/api/remove-bg/route.ts` | 97 | `permanentUrl` → `cdn.zupericon.com` |
| `app/api/download/route.ts` | 9-14 | Allowlist SSRF: `cdn.zupericon.com` saja (Fase 8: host lama dihapus) |
| `app/api/export-pack/route.ts` | 11-14 | Sama — hanya `cdn.zupericon.com` (Fase 8: host lama dihapus) |
| `app/api/webhooks/pakasir/route.ts` | 6, 22-26 | Terima `PAKASIR_WEBHOOK_SECRET` **atau** `PAKASIR_WEBHOOK_SECRET_OLD` selama transisi |

### Tidak berubah di fase migrasi (link marketing tetap ke landing)

- `app/sign-in/page.tsx:90` — link balik ke landing (tetap, domain link menyesuaikan saat Part B/cutover)
- `app/checkout/page.tsx:21` — `PRICING_PAGE` (tetap)
- `components/layout/dashboard-layout.tsx:452, 637` — link landing + email support (tetap sampai Part B)
- Semua teks brand "Audora", `lib/resend.ts`, email magic link, invoice, `share-card.tsx`, `app/manifest.ts` — diganti di Part B

---

## Fase 4 — Kode Landing (`D:\audora-web`)

Tujuan: pindah domain, putus session check ke app, arahkan semua CTA ke domain app baru. Brand tetap "Audora" sampai Part B.

### Domain, URL & decoupling

| File | Baris | Perubahan |
|---|---|---|
| `lib/auth.ts` | — | **Hapus file** (dead code) |
| `lib/auth-client.ts` | — | **Hapus file** (hanya dipakai navbar) |
| `components/landing/user-profile-dropdown.tsx` | — | **Hapus file** |
| `components/landing/navbar.tsx` | 9-10, 26 | Hapus import + `authClient.useSession()` |
| `components/landing/navbar.tsx` | 17-22, 64-78 | `redirectToSignIn` → `https://app.zupericon.com/sign-in`; tombol Sign In **selalu tampil** |
| `components/landing/navbar.tsx` | 88-112, 154-164 | Hapus cabang session mobile; tombol "Sign In to Dashboard" selalu tampil |
| `next.config.ts` | 12 | `images.remotePatterns` → `cdn.zupericon.com` (Fase 8: `cdn.useaudora.com` dihapus) |
| `app/layout.tsx` | 31, 38, 49 | Metadata URL + OG image → `zupericon.com` / `cdn.zupericon.com` |
| `app/pricing/page.tsx` | 14, 18 | Metadata + OG image |
| `app/blog/page.tsx` | 15 | Metadata URL |
| `app/blog/[slug]/page.tsx` | 97 | `currentUrl` |
| `app/robots.ts` | 13 | URL sitemap |
| `app/sitemap.ts` | 7, 15, 21, 27 | Semua entry → `https://zupericon.com` |
| `app/privacy-policy/page.tsx` | 64 | Email → `support@zupericon.com` |
| `app/refund-policy/page.tsx` | 64 | Sama |
| `app/terms-of-service/page.tsx` | 64 | Sama |
| `components/landing/cta-primary.tsx` | 9 | Link app → `https://app.zupericon.com/sign-in` |
| `components/landing/hero-primary.tsx` | 12 | Sama |
| `components/landing/pricing-idr.tsx` | 10 | Checkout → `https://app.zupericon.com/checkout` |
| `components/landing/pricing-usd.tsx` | 10 | Sama |
| `components/landing/about-content.tsx` | 80, 104 | Aset → `cdn.zupericon.com` |
| `components/landing/carousel-icon.tsx` | 7-16 | Aset → `cdn.zupericon.com` |
| `components/landing/interactive-demo.tsx` | 11-23 | Aset → `cdn.zupericon.com` |
| `components/landing/personas.tsx` | 13-31 | Aset → `cdn.zupericon.com` |
| `components/landing/pricing-idr.tsx` / `pricing-usd.tsx` | 27, 37, 48 | Icon URL → `cdn.zupericon.com` |

### Catatan

- Landing tetap dilayani di `useaudora.com` dan `zupericon.com`; canonical & sitemap mengarah ke `zupericon.com`.
- Waitlist, testimonials, Sanity, Turnstile: tidak ada perubahan logika (hanya hostname Turnstile ditambah di dashboard).
- `footer.tsx` sosial media & copyright → Part B.

---

## Fase 5 — Dashboard Pihak Ketiga

**Status per 12 Sep 2026:** hampir selesai — semua konfigurasi beres; pending: test transaksi Polar & Pakasir (menunggu verified KYC) + Search Console.

1. [x] **Google Cloud Console** (OAuth): tambah Authorized JavaScript origin `https://app.zupericon.com` + redirect URI `https://app.zupericon.com/api/auth/callback/google`. **Pertahankan yang lama** (`app.useaudora.com`) karena app lama masih dipakai login.
2. [x] **GitHub OAuth App**: tambah callback `https://app.zupericon.com/api/auth/callback/github` (pertahankan lama).
3. [x] **Pakasir (project baru)**:
   - [x] Buat project slug `zupericon` → generate API key + webhook secret baru.
   - [x] Webhook URL: `https://app.zupericon.com/api/webhooks/pakasir?secret=<secret-baru>`.
   - [x] Env: `PAKASIR_SLUG=zupericon`, `PAKASIR_API_KEY=<baru>`, `PAKASIR_WEBHOOK_SECRET=<baru>`, `PAKASIR_WEBHOOK_SECRET_OLD=<lama>`.
   - [x] Project lama (webhook → `app.useaudora.com`, secret lama) tetap hidup min. 1 jam setelah cutover sampai transaksi pending selesai.
   - [ ] Test transaksi kecil (QRIS/VA) → webhook → kredit bertambah. **Pending: menunggu verified KYC.**
4. [x] **Polar**: **pindahkan (replace) URL endpoint** webhook ke `https://app.zupericon.com/api/webhooks/polar` (event `order.paid`). Jangan aktifkan 2 endpoint sekaligus — race double-credit (dua webhook masuk bersamaan sama-sama lolos guard `paymentStatus === "paid"`, lihat Risiko). Test dengan test webhook sebelum menghapus URL lama. Success URL otomatis ikut `NEXT_PUBLIC_APP_URL`.
   - [ ] Test order → webhook `order.paid` → kredit bertambah (pastikan hanya 1 endpoint aktif). **Pending: menunggu verified KYC.**
5. [x] **Inngest**: update Serve URL → `https://app.zupericon.com/api/inngest` → re-sync → verifikasi function terdaftar. (`INNGEST_EVENT_KEY`/`SIGNING_KEY` tidak berubah; event dari domain lama tetap diproses karena dikirim ke Inngest, bukan lewat serve URL.)
6. [x] **Turnstile**: tambah hostname `zupericon.com` + `www` (Fase 1).
7. [x] **Sanity**: tambah CORS origin domain baru (Fase 1).
8. [ ] **Search Console**: add properti `zupericon.com`, submit sitemap (Fase 1). **Belum dikerjakan.**

**Pending lain:** Part B (rebrand app + landing) menunggu upload logo baru dll.

Detail checklist: `doc/domain-migration-fase5-checklist.md`.

---

## Fase 6 — Cutover & Smoke Test (estimasi 1-2 jam)

**Status per 12 Sep 2026:** selesai — kecuali checkout Polar & Pakasir (menunggu verified KYC), verifikasi Inngest function dari domain baru, dan email dari `noreply@zupericon.com` (switch sender baru dilakukan di **Part B**).

1. [x] `cdn.zupericon.com` live (fetch aset lama dari bucket) → OK.
2. [x] Resend domain verified + email test → OK. (Sender app masih `noreply@useaudora.com` — switch di Part B.)
3. [x] Deploy app (kode + env baru) → add domain `app.zupericon.com` → verifikasi HTTPS/TLS.
4. [x] Deploy landing (kode decoupling + domain baru) → verifikasi `zupericon.com` dan `useaudora.com` sama-sama jalan.
5. [x] Update webhook: Polar (replace) → Pakasir (project baru) → Inngest.
6. **Smoke test**:
   - [x] Landing `zupericon.com` load, sitemap/robots mengarah ke `zupericon.com`, waitlist + testimonials jalan.
   - [x] Landing `useaudora.com` tetap normal (canonical tetap ke `zupericon.com`).
   - [x] Tombol Sign In landing selalu tampil → `https://app.zupericon.com/sign-in` (tidak ada session check).
   - [x] Login Google, GitHub, magic link di `app.zupericon.com` → cookie host-only ter-set.
   - [x] Login lama di `app.useaudora.com` masih jalan (cookie `.useaudora.com` existing).
   - [ ] Checkout Pakasir (1 transaksi test kecil di project baru) → QRIS/VA → webhook → kredit bertambah; webhook project lama masih valid untuk transaksi pending. **Pending: menunggu verified KYC (lihat Fase 5).**
   - [ ] Checkout Polar (test order) → webhook `order.paid` → kredit bertambah (pastikan hanya 1 endpoint aktif). **Pending: menunggu verified KYC (lihat Fase 5).**
   - [x] Upload reference image (presigned PUT R2 — cek CORS) → generate → URL CDN baru 200.
   - [x] Download, export pack, invoice PDF, share card, PWA — fungsi OK. **Nama file `audora-*` masih belum di-rename → Part B.**
   - [ ] Inngest function jalan dari domain baru. **Belum diverifikasi.**
   - [ ] Email dari `noreply@zupericon.com` lolos SPF/DKIM. **Pending: sender masih `noreply@useaudora.com` — switch di Part B (`lib/resend.ts:15` + invoice).**
   - [x] `cdn.useaudora.com/<asset-lama>` masih 200; `cdn.zupericon.com/<asset-lama>` juga 200.
7. [x] Monitor 24-48 jam: Vercel logs, Inngest, Resend, Polar, Pakasir.

Detail checklist: `doc/domain-migration-fase6-checklist.md`.

**Catatan:** rename file download (`audora-*.png`, `audora-icon-pack-*`, `audora-batch-icons-*.zip`) dan ganti sender email ke `noreply@zupericon.com` **bukan** scope Fase 6 — keduanya masuk **Part B (rebrand)**.

---

## Fase 7 — Rollback

- Landing & app lama masih hidup → rollback = kembalikan env + deploy; lepas domain baru; kembalikan webhook Polar URL.
- Pakasir: `PAKASIR_WEBHOOK_SECRET_OLD` sudah didukung; kembalikan `PAKASIR_SLUG`/API key lama bila perlu.
- OAuth redirect lama tetap terdaftar → rollback cepat tanpa downtime.
- Tidak ada data loss (DB & R2 tidak disentuh).

---

## Fase 8 — Post-Cutover (H+7 s/d H+30)

**Status per 12 Sep 2026:** selesai — termasuk perubahan kebijakan CDN: semua file storage/generate pindah ke `cdn.zupericon.com` (tidak lagi pakai `cdn.useaudora.com`).

1. [x] Pasang **301 redirect** `useaudora.com` → `zupericon.com` dan `app.useaudora.com` → `app.zupericon.com` (Vercel domain redirect atau Cloudflare Rules).
2. [x] Hapus webhook lama (Polar URL lama, Pakasir project lama setelah semua transaksi selesai) + `PAKASIR_WEBHOOK_SECRET_OLD`.
3. [x] Hapus OAuth redirect URI lama setelah dipastikan tidak ada traffic.
4. [x] **CDN** — ganti semua referensi `cdn.useaudora.com` → `cdn.zupericon.com`:
   - [x] App: allowlist SSRF (`download`, `export-pack`), `next.config.ts` remotePatterns, preview aset UI dashboard (`page.tsx`, `[jobId]/page.tsx`)
   - [x] Landing: `next.config.ts` remotePatterns
   - [x] Script migrasi URL lama di DB: `scripts/migrate-cdn-domain.ts` (`npm run db:migrate-cdn`)
   - [x] Migrasi URL DB di production dijalankan (`npm run db:migrate-cdn`) — **508 baris di-update, 0 referensi `cdn.useaudora.com` tersisa**; spot-check 3 aset lama → 200
   Catatan: `cdn.useaudora.com` boleh dibiarkan hidup sampai migrasi DB selesai; setelah itu tidak dipakai lagi.
5. [x] Update dokumentasi internal.
6. [x] Lanjut ke Part B (menunggu upload logo baru dll).

Detail checklist: `doc/domain-migration-fase8-checklist.md`.

---

## Part B — Rebrand Zupericon (setelah migrasi stabil)

**Aset:** menunggu upload logo baru dll sebelum eksekusi. Dieksekusi terpisah; canonical/sitemap tetap ke `zupericon.com`.

### App (`D:\3d-icon-generator`)

| File | Baris | Perubahan |
|---|---|---|
| `lib/auth.ts` | 67-87 | Subject + isi email magic link, brand & copyright |
| `lib/resend.ts` | 15 | `from`: `Zupericon <noreply@zupericon.com>` |
| `app/layout.tsx` | 16-23 | Metadata title/template/description |
| `app/manifest.ts` | 5-6 | `name` / `short_name` PWA |
| `app/api/transactions/[id]/invoice/route.ts` | 13, 118, 125, 276, 282 | Brand + email + domain invoice PDF |
| `components/share-card.tsx` | 122, 185, 201, 217 | Watermark & "Made with Audora" |
| `components/auth-loading-overlay.tsx` | 16 | Alt logo |
| `components/feedback/feedback-dialog.tsx` | 56, 83, 125 | Copy feedback |
| `app/checkout/page.tsx` | 37-38, 149, 154 | Metadata + brand |
| `app/sign-in/page.tsx` | 95, 105, 226 | Alt logo + copy + terms |
| `app/(dashboard)/page.tsx` | 872, 1598, 1998-1999 | Share text + disclaimer |
| `app/(dashboard)/page.tsx` | 655, 677, 735, 757, 792 | Rename nama file download `audora-*` → `zupericon-*` (`audora-batch-icons-*.zip`, `audora-icon-pack-*`, `audora-*-transparent.png`) |
| `app/(dashboard)/[jobId]/page.tsx` | 595-596, 1079, 1314-1315 | Share text + disclaimer |
| `app/(dashboard)/[jobId]/page.tsx` | 450, 472, 508 | Rename nama file download `audora-*` → `zupericon-*` |
| `app/(dashboard)/library/page.tsx` | 362-363, 1007-1008 | Share text |
| `app/(dashboard)/library/page.tsx` | 194, 224, 248 | Rename nama file download `audora-*` → `zupericon-*` |
| `app/(dashboard)/collections/[id]/page.tsx` | 220, 249, 272 | Rename nama file download `audora-*` → `zupericon-*` |
| `app/(dashboard)/spotlight/page.tsx` | 120 | Rename nama file download `audora-*` → `zupericon-*` |
| `app/api/export-pack/route.ts` | 53 | Default filename `audora-icon-pack` → `zupericon-icon-pack` |
| `app/(dashboard)/support/page.tsx` | 24, 29 | Email support |
| `app/actions/feedback.ts` | 35 | `adminEmail` → `rizky@zupericon.com` |
| `components/layout/dashboard-layout.tsx` | 188, 217-239, 452, 637 | Copy install prompt + brand sidebar + link landing & email |
| `app/sign-in/page.tsx` | 90 | Link balik landing → `https://zupericon.com` |
| `app/checkout/page.tsx` | 21 | `PRICING_PAGE` → `https://zupericon.com/pricing` |
| `public/assets/audora-*.png` | — | Ganti dengan aset Zupericon (nama baru) + update semua referensi (manifest, auth email, share card, navbar, footer, checkout, sign-in, dashboard layout, auth loading overlay) |
| `doc/*.md` | — | Update domain & brand |

### Landing (`D:\audora-web`)

| File | Perubahan |
|---|---|
| `app/layout.tsx` | Metadata siteName/title/OG alt → Zupericon |
| `components/landing/navbar.tsx` | Logo + teks "Why Audora?" |
| `components/landing/footer.tsx` | Logo, "Why Audora", copyright, sosial media |
| `components/landing/blog-hero.tsx` | Judul blog |
| `components/landing/cta-waitlist.tsx` | Copy waitlist |
| `components/landing/waitlist-modal.tsx` | Copy modal |
| `components/landing/features.tsx`, `hero.tsx`, `hero-primary.tsx`, `interactive-demo.tsx`, `personas.tsx`, `pricing-faq.tsx`, `testimonials.tsx` | Copy brand |
| `components/landing/about-content.tsx` | Story founder |
| `app/terms-of-service/page.tsx`, `app/refund-policy/page.tsx`, `app/privacy-policy/page.tsx` | Konten legal + email support |
| `app/blog/page.tsx`, `app/blog/[slug]/page.tsx` | Author "Audora Team" + copy |
| Konten Sanity | Blog post, author, dsb — edit via Sanity Studio |
| `public/assets/logos/audora-square-logo.png` | Ganti dengan logo Zupericon |
| Metadata canonical / sitemap / robots | Tetap `zupericon.com` |

---

## Checklist Env Production

**App project (Vercel):**

```env
BETTER_AUTH_URL=https://app.zupericon.com
NEXT_PUBLIC_BETTER_AUTH_URL=https://app.zupericon.com
NEXT_PUBLIC_APP_URL=https://app.zupericon.com
PAKASIR_SLUG=zupericon
PAKASIR_API_KEY=<baru>
PAKASIR_WEBHOOK_SECRET=<baru>
PAKASIR_WEBHOOK_SECRET_OLD=<lama>
```

**Landing project (Vercel):**

```env
NEXT_PUBLIC_SITE_URL=https://zupericon.com
```

**Tidak berubah:** `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`, `RESEND_API_KEY`, `UPSTASH_*`, `R2_*`, `INNGEST_*`, `FAL_KEY`, `POLAR_ACCESS_TOKEN`, `POLAR_WEBHOOK_SECRET`, `NEXT_PUBLIC_POSTHOG_*`, Sanity, Turnstile.

---

## Estimasi & Risiko

**Estimasi**: Fase 0-5 ±3-4 hari kerja (NS propagasi + verifikasi Resend + landing code), cutover 1-2 jam, monitoring 1 minggu, Part B terpisah.

| Risiko | Mitigasi |
|---|---|
| User existing ter-logout di domain app baru | Komunikasi + magic link; sesi DB tetap aman; domain lama tetap hidup |
| SEO landing turun saat pindah domain | Canonical `zupericon.com` sejak cutover, sitemap baru + Search Console; 301 di Fase 8 |
| Polar double-webhook saat 2 endpoint aktif | Satu endpoint aktif (replace URL), atau hardening idempotency (conditional update) sebelum overlap |
| Transaksi Pakasir pending saat ganti secret | Dual-secret support + cutover saat traffic rendah |
| Webhook terlewat saat update dashboard | Endpoint lama & baru hidup bersamaan; cek log 24 jam |
| Aset lama rusak | URL lama di DB dimigrasi ke `cdn.zupericon.com` via `npm run db:migrate-cdn`; jalankan migrasi sebelum/saat deploy kode allowlist baru |
| Email masuk spam | Verify SPF/DKIM/DMARC sebelum kirim produksi |
| Turnstile/Sanity/CORS lupa diupdate | Masuk checklist Fase 1/5 |
| NS propagasi lama | Mulai Fase 0 paling awal (1-24 jam) |

---

## Urutan Eksekusi yang Disarankan

1. Fase 0 (NS + backup + aset).
2. Fase 3 + Fase 4 (perubahan kode — bisa dikerjakan tanpa menunggu DNS).
3. Fase 1 (Cloudflare zone + R2 + Resend + Turnstile + Sanity + Search Console).
4. Fase 2 (Vercel domain + env).
5. Fase 5 (dashboard pihak ketiga) — OAuth lebih awal, webhook saat cutover.
6. Fase 6 (cutover + smoke test).
7. Fase 7 disiapkan, Fase 8 setelah stabil.
8. Part B rebrand.
