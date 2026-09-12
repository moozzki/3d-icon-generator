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

## 4. Part B — Rebrand Zupericon (menunggu upload logo baru dll)

Detail baris per file ada di `doc/domain-migration-zupericon.md` → **Part B**. Ringkasan:

### 4a. Aset
- [ ] Upload aset/logo Zupericon baru (app `public/assets/`, landing `public/assets/logos/`, CDN bila perlu)
- [ ] Ganti semua referensi `audora-*.png` → aset baru: `app/manifest.ts`, `app/layout.tsx`, magic link email (`lib/auth.ts`), `components/share-card.tsx`, `components/layout/dashboard-layout.tsx`, `app/checkout/page.tsx`, `app/sign-in/page.tsx`, `components/auth-loading-overlay.tsx`

### 4b. Email & Invoice
- [ ] `lib/resend.ts:15` — `from`: `Zupericon <noreply@zupericon.com>` (domain Resend `zupericon.com` sudah verified)
- [ ] `lib/auth.ts:67-87` — subject + isi email magic link, brand & copyright
- [ ] `app/api/transactions/[id]/invoice/route.ts` — brand, email, domain invoice PDF

### 4c. Nama File Download → `zupericon-*`
- [ ] `app/(dashboard)/page.tsx` — baris 655, 677, 735, 757, 792
- [ ] `app/(dashboard)/[jobId]/page.tsx` — baris 450, 472, 508
- [ ] `app/(dashboard)/library/page.tsx` — baris 194, 224, 248
- [ ] `app/(dashboard)/collections/[id]/page.tsx` — baris 220, 249, 272
- [ ] `app/(dashboard)/spotlight/page.tsx` — baris 120
- [ ] `app/api/export-pack/route.ts:53` — default `audora-icon-pack` → `zupericon-icon-pack`

### 4d. Brand App (copy & metadata)
- [ ] `app/layout.tsx` (title/template/description), `app/manifest.ts` (PWA name/short_name)
- [ ] `components/share-card.tsx` (watermark "Made with Audora"), `components/auth-loading-overlay.tsx`, `components/feedback/feedback-dialog.tsx`
- [ ] `app/checkout/page.tsx` (metadata + brand + `PRICING_PAGE` → `https://zupericon.com/pricing`), `app/sign-in/page.tsx` (copy, terms, link balik → `https://zupericon.com`)
- [ ] Dashboard: `app/(dashboard)/page.tsx`, `[jobId]/page.tsx`, `library/page.tsx` (share text + disclaimer), `support/page.tsx` (email support)
- [ ] `app/actions/feedback.ts:35` — `adminEmail` → `rizky@zupericon.com`
- [ ] `components/layout/dashboard-layout.tsx` — install prompt + brand sidebar + link landing & email

### 4e. Brand Landing (`D:\audora-web`)
- [ ] `app/layout.tsx` (siteName/title/OG alt), `components/landing/navbar.tsx`, `footer.tsx` (logo, "Why Audora", copyright, sosial media)
- [ ] `blog-hero.tsx`, `cta-waitlist.tsx`, `waitlist-modal.tsx`
- [ ] `features.tsx`, `hero.tsx`, `hero-primary.tsx`, `interactive-demo.tsx`, `personas.tsx`, `pricing-faq.tsx`, `testimonials.tsx`
- [ ] `about-content.tsx` (story founder), legal pages (terms/refund/privacy), blog pages (author "Audora Team")
- [ ] Konten Sanity (blog post, author, dsb) via Sanity Studio
- [ ] `public/assets/logos/audora-square-logo.png` → logo Zupericon

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
3. **Part B** — mulai setelah aset logo baru di-upload (sekalian rename file download & email sender).
4. **Housekeeping opsional** — terakhir.
