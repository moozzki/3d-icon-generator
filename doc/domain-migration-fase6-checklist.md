# Checklist Fase 6 — Cutover & Smoke Test

**Referensi:** `doc/domain-migration-zupericon.md` — Fase 6
**Tanggal update:** 12 September 2026
**Status:** Sebagian besar selesai — pending: checkout Polar & Pakasir (menunggu verified KYC), verifikasi Inngest dari domain baru, dan email `noreply@zupericon.com` (switch sender di Part B). Semua sisa pending dirangkum di `doc/domain-migration-pending-tasks.md`.

---

## A. Cutover

- [x] `cdn.zupericon.com` live (fetch aset lama dari bucket)
- [x] Resend domain verified + email test
- [x] Deploy app (kode + env baru) → domain `app.zupericon.com` → HTTPS/TLS OK
- [x] Deploy landing (kode decoupling + domain baru) → `zupericon.com` & `useaudora.com` sama-sama jalan
- [x] Update webhook: Polar (replace URL) → Pakasir (project baru) → Inngest

## B. Smoke Test

- [x] Landing `zupericon.com` load, sitemap/robots → `zupericon.com`, waitlist + testimonials jalan
- [x] Landing `useaudora.com` tetap normal (canonical tetap ke `zupericon.com`)
- [x] Tombol Sign In landing selalu tampil → `https://app.zupericon.com/sign-in` (tanpa session check)
- [x] Login Google, GitHub, magic link di `app.zupericon.com` → cookie host-only ter-set
- [x] Login lama di `app.useaudora.com` masih jalan (cookie `.useaudora.com` existing)
- [ ] Checkout Pakasir (transaksi test kecil di project baru) → QRIS/VA → webhook → kredit bertambah — **BLOCKED: menunggu verified KYC**
- [ ] Checkout Polar (test order) → webhook `order.paid` → kredit bertambah (hanya 1 endpoint aktif) — **BLOCKED: menunggu verified KYC**
- [x] Upload reference image (presigned PUT R2 — CORS) → generate → URL CDN baru 200
- [x] Download, export pack, invoice PDF, share card, PWA — fungsi OK (**nama file `audora-*` belum di-rename → Part B**)
- [ ] Inngest function jalan dari domain baru — **belum diverifikasi**
- [ ] Email dari `noreply@zupericon.com` lolos SPF/DKIM — **sender masih `noreply@useaudora.com`, switch di Part B**
- [x] `cdn.useaudora.com/<asset-lama>` masih 200; `cdn.zupericon.com/<asset-lama>` juga 200

## C. Monitoring

- [x] Monitor 24-48 jam: Vercel logs, Inngest, Resend, Polar, Pakasir

## D. Pending / Follow-up

- [ ] Checkout Pakasir setelah verified KYC (lihat juga `doc/domain-migration-fase5-checklist.md`)
- [ ] Checkout Polar setelah verified KYC
- [ ] Verifikasi Inngest function dari domain baru (Serve URL `https://app.zupericon.com/api/inngest` → re-sync → cek function terdaftar & event terproses)
- [ ] **Part B** — switch email sender: `lib/resend.ts:15` → `Zupericon <noreply@zupericon.com>` (+ brand & domain di `app/api/transactions/[id]/invoice/route.ts`)
- [ ] **Part B** — rename nama file download `audora-*` → `zupericon-*` (file & baris ada di tabel Part B plan)
- [ ] Search Console: add properti + submit sitemap (Fase 5.8)
- [x] Fase 8 post-cutover (H+7 s/d H+30): 301 redirect, hapus webhook lama, hapus OAuth redirect lama, hapus `PAKASIR_WEBHOOK_SECRET_OLD`
- [ ] **Sisa pending digabung ke satu dokumen: `doc/domain-migration-pending-tasks.md`**

---

## Jawaban: Rename file download & email sender diganti di fase berapa?

**Jawaban: Part B — Rebrand Zupericon**, bukan Fase 6.

| Item | Lokasi | Fase |
|---|---|---|
| Email sender `noreply@useaudora.com` → `noreply@zupericon.com` | `lib/resend.ts:15` (+ brand/domain invoice `app/api/transactions/[id]/invoice/route.ts`) | **Part B** |
| Rename file download `audora-*.png` / `audora-icon-pack-*` / `audora-batch-icons-*.zip` | `app/(dashboard)/page.tsx`, `[jobId]/page.tsx`, `library/page.tsx`, `collections/[id]/page.tsx`, `spotlight/page.tsx`, `app/api/export-pack/route.ts:53` | **Part B** |

Alasan: plan memisahkan **migrasi domain** (Fase 0-8) dari **rebrand** (Part B). Fase 3 sudah menetapkan `lib/resend.ts` dan semua teks brand "Audora" diganti di Part B. Item rename file download sudah ditambahkan ke tabel Part B di plan.
