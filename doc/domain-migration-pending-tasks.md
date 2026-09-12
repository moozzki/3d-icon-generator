# Pending Tasks — Migrasi Domain & Rebrand Zupericon

**Tanggal update:** 12 September 2026
**Sumber:** `doc/domain-migration-zupericon.md` + checklist Fase 3/5/6/8
**Status migrasi:** Fase 0-8 **selesai** (termasuk cutover, CDN pindah penuh ke `cdn.zupericon.com`, migrasi 508 URL DB, 301 redirect, cleanup webhook/OAuth lama). Dokumen ini merangkum **semua sisa pekerjaan** yang belum tuntas.

---

## 1. KYC & Test Transaksi (blocker utama)

Menunggu **verified KYC** — test end-to-end tidak bisa divalidasi sebelum ini selesai.

- [ ] Verifikasi KYC **Polar**
- [ ] Verifikasi KYC **Pakasir**
- [ ] Test transaksi Pakasir (nominal kecil, QRIS/VA) di project `zupericon` → webhook masuk → kredit user bertambah
- [ ] Test order Polar → webhook `order.paid` → kredit user bertambah (pastikan hanya 1 endpoint aktif)
- [ ] Cek webhook project Pakasir lama masih memproses transaksi pending (jika masih ada)

**Selesai otomatis:** konfigurasi project, env dual-secret, webhook URL, dan replace endpoint Polar sudah beres (Fase 5).
**Referensi:** `doc/domain-migration-fase5-checklist.md` (B & C), `doc/domain-migration-fase6-checklist.md` (B).

## 2. Search Console (Fase 5.8)

- [ ] Add properti `zupericon.com` di Google Search Console
- [ ] Submit sitemap `https://zupericon.com/sitemap.xml`

## 3. Verifikasi Inngest dari Domain Baru

- [ ] Serve URL `https://app.zupericon.com/api/inngest` → **re-sync** di Inngest dashboard
- [ ] Verifikasi function terdaftar dan event terproses (test 1 generate dari `app.zupericon.com`)

## 4. Part B — Rebrand Zupericon

Detail baris per file ada di `doc/domain-migration-zupericon.md` → **Part B**. Ringkasan:

### 4a. Aset
- [x] Upload aset/logo Zupericon baru — master `public/assets/zupericon-logo-square.png` (598x698, transparent); landing: logo navbar/footer `public/assets/logos/zupericon-logo.square.webp` + icon set di-generate dari master (`app/favicon.ico` 16/32/48 PNG-in-ICO, `app/icon.png` 512 transparent, `app/apple-icon.png` 180 background putih)
  - Turunan digenerate via sharp: `zupericon-logo-square-192.png`, `zupericon-logo-square-512.png`, `zupericon-logo-square-withbg-180.png` (apple), `zupericon-logo-square-withbg-512.png` (maskable), `app/favicon.ico` (32x32 PNG-in-ICO)
- [x] Ganti semua referensi `audora-*.png` → aset baru: `app/manifest.ts`, `app/layout.tsx`, magic link email (`lib/auth.ts`), `components/share-card.tsx`, `components/layout/dashboard-layout.tsx`, `app/checkout/page.tsx`, `app/sign-in/page.tsx`, `components/auth-loading-overlay.tsx`; file `audora-*.png` lama sudah dihapus dari `public/assets/`

### 4b. Email & Invoice
- [x] `lib/resend.ts:15` — `from`: `Zupericon <noreply@zupericon.com>` (domain Resend `zupericon.com` sudah verified)
- [x] `lib/auth.ts:67-87` — subject + isi email magic link, brand & copyright
- [x] `app/api/transactions/[id]/invoice/route.ts` — brand, email, domain invoice PDF

### 4c. Nama File Download → `zupericon-*`
- [x] `app/(dashboard)/page.tsx` — batch-icons, icon-pack, png & transparent, story
- [x] `app/(dashboard)/[jobId]/page.tsx` — png, icon-pack, transparent, story
- [x] `app/(dashboard)/library/page.tsx` — png, icon-pack, transparent, story, animation
- [x] `app/(dashboard)/collections/[id]/page.tsx` — png, transparent, icon-pack
- [x] `app/(dashboard)/spotlight/page.tsx` — png
- [x] `app/api/export-pack/route.ts` — default `zupericon-icon-pack`
- [x] Bonus: `audora-story-*.jpg` → `zupericon-story-*.jpg` dan `audora-animation-*.mp4` → `zupericon-animation-*.mp4` (`animate/page.tsx` + library)

### 4d. Brand App (copy & metadata)
- [x] `app/layout.tsx` (title/template/description), `app/manifest.ts` (PWA name/short_name)
- [x] `components/share-card.tsx` (watermark "Made with Zupericon" + domain), `components/auth-loading-overlay.tsx`, `components/feedback/feedback-dialog.tsx`
- [x] `app/checkout/page.tsx` (metadata + brand + `PRICING_PAGE` → `https://zupericon.com/pricing`), `app/sign-in/page.tsx` (copy, terms, link balik → `https://zupericon.com`)
- [x] Dashboard: `app/(dashboard)/page.tsx`, `[jobId]/page.tsx`, `library/page.tsx` (share text + disclaimer), `support/page.tsx` (email support)
- [x] `app/actions/feedback.ts:35` — `adminEmail` → **`support@zupericon.com`**
- [x] `components/layout/dashboard-layout.tsx` — install prompt + brand sidebar + link landing & email
- [x] Bonus: komentar `Custom Audora tokens` → `Custom Zupericon tokens` (`app/globals.css`)

### 4e. Brand Landing (`D:\audora-web`) — selesai (12 September 2026)
- [x] `app/layout.tsx` (siteName/title/OG alt), `components/landing/navbar.tsx`, `footer.tsx` (logo Zupericon, "Why Audora"→"Why Zupericon", copyright, sosial media → `instagram.com/zupericon` & `threads.com/@zupericon`)
- [x] `blog-hero.tsx`, `cta-waitlist.tsx`, `waitlist-modal.tsx`
- [x] `features.tsx`, `hero.tsx`, `hero-primary.tsx`, `interactive-demo.tsx`, `personas.tsx`, `pricing-faq.tsx`, `testimonials.tsx`
- [x] `about-content.tsx` (story founder), legal pages (metadata + email), blog pages (fallback author "Audora Team" → "Zupericon Team", placeholder `AUDORA` → `ZUPERICON`)
- [x] Konten Sanity — 3 halaman legal (terms/refund/privacy) di-patch via `sanity exec`: 17x "Audora" → "Zupericon" + `support@useaudora.com` → `support@zupericon.com`; backup JSON di `%TEMP%\opencode\sanity-legal-backup-2026-09-12T07-38-39-292Z`; scan ulang semua dokumen: 0 referensi `audora` tersisa (blog post kosong, author "Rizky")
- [x] `public/assets/logos/audora-square-logo.png` → `zupericon-logo.square.webp` (navbar/footer); file PNG lama dihapus
- [x] Bonus (Fase 4 landing): canonical semua halaman → `zupericon.com`, sitemap/robots, CTA & checkout → `app.zupericon.com`, aset landing → `cdn.zupericon.com`, banner maintenance Pakasir di hero
- Sisa kecil (di luar kode): badge **Product Hunt** di footer masih menunjuk listing eksternal `producthunt.com/products/audora` + alt "Audora" (perlu rename listing di PH); aset CDN `*-founder-audora.png` & `*-cofounder-audora.png` masih pakai nama lama (tidak terlihat user, opsional rename di R2)

### 4f. Dokumentasi
- [ ] Update semua `doc/*.md` (app & landing) — domain & brand

## 5. Opsional / Housekeeping

- [ ] Set `R2_PUBLIC_URL=https://cdn.zupericon.com` di Vercel (opsional — fallback kode sudah sama)
- [ ] Lepaskan `cdn.useaudora.com` dari R2 setelah yakin tidak ada konsumen lama (opsional — app sudah tidak memakainya)
- [ ] Pastikan domain `useaudora.com` tetap diperpanjang selama 301 redirect masih dipakai
- [ ] Arsip/bersihkan checklist fase yang sudah selesai (`domain-migration-fase3/5/6/8-checklist.md`) bila sudah tidak diperlukan

---

## Urutan Eksekusi yang Disarankan

1. **KYC Polar & Pakasir** → begitu verified, jalankan 2 test transaksi → tutup Fase 5/6.
2. **Search Console + verifikasi Inngest** — bisa paralel, tidak menunggu KYC.
3. **Part B** — 4a–4e **selesai** (app + landing + konten legal Sanity); sisa **4f** update dokumentasi.
4. **Housekeeping opsional** — terakhir.
