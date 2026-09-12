# Checklist Fase 5 — Dashboard Pihak Ketiga

**Referensi:** `doc/domain-migration-zupericon.md` — Fase 5
**Tanggal update:** 12 September 2026
**Status:** Hampir selesai — pending test transaksi Polar & Pakasir (menunggu verified KYC) + Search Console. Semua sisa pending dirangkum di `doc/domain-migration-pending-tasks.md`.

---

## A. OAuth

- [x] **Google Cloud Console** — Authorized JavaScript origin `https://app.zupericon.com`
- [x] **Google Cloud Console** — redirect URI `https://app.zupericon.com/api/auth/callback/google`
- [x] **Google Cloud Console** — origin/redirect lama (`app.useaudora.com`) dipertahankan
- [x] **GitHub OAuth App** — callback `https://app.zupericon.com/api/auth/callback/github`
- [x] **GitHub OAuth App** — callback lama dipertahankan

## B. Pakasir (Project Baru)

- [x] Buat project slug `zupericon`
- [x] Generate API key + webhook secret baru
- [x] Set webhook URL: `https://app.zupericon.com/api/webhooks/pakasir?secret=<secret-baru>`
- [x] Env app: `PAKASIR_SLUG=zupericon`, `PAKASIR_API_KEY=<baru>`, `PAKASIR_WEBHOOK_SECRET=<baru>`, `PAKASIR_WEBHOOK_SECRET_OLD=<lama>`
- [x] Project lama tetap hidup (webhook → `app.useaudora.com` + secret lama, min. 1 jam sampai transaksi pending selesai)
- [ ] Test transaksi kecil (QRIS/VA) → webhook masuk → kredit bertambah — **BLOCKED: menunggu verified KYC**

## C. Polar

- [x] Replace URL endpoint webhook → `https://app.zupericon.com/api/webhooks/polar` (event `order.paid`)
- [x] Pastikan hanya 1 endpoint aktif (hindari race double-credit)
- [x] Test webhook dari dashboard Polar (sebelum hapus URL lama)
- [ ] Test order → webhook `order.paid` → kredit bertambah — **BLOCKED: menunggu verified KYC**

## D. Inngest

- [x] Update Serve URL → `https://app.zupericon.com/api/inngest`
- [x] Re-sync + verifikasi function terdaftar
- [x] `INNGEST_EVENT_KEY`/`SIGNING_KEY` tidak berubah

## E. Turnstile & Sanity (via Fase 1)

- [x] **Turnstile** — hostname `zupericon.com` + `www.zupericon.com` ditambahkan (hostname lama dipertahankan)
- [x] **Sanity** — CORS origin `https://zupericon.com` + `https://www.zupericon.com` ditambahkan

## F. Search Console

- [ ] Add properti `zupericon.com` — **belum**
- [ ] Submit sitemap `https://zupericon.com/sitemap.xml` — **belum**

## G. Pending / Menunggu

- [ ] Verifikasi KYC Polar
- [ ] Verifikasi KYC Pakasir
- [ ] Test transaksi Polar (setelah KYC verified)
- [ ] Test transaksi Pakasir (setelah KYC verified)
- [x] Part B rebrand (app + landing) — dipindah ke dokumen pending (menunggu upload logo baru dll)
- [x] Fase 6 cutover & smoke test — selesai selain item KYC/Inngest/email
- [x] Fase 8 post-cutover: 301 redirect, hapus webhook lama, hapus `PAKASIR_WEBHOOK_SECRET_OLD`, hapus OAuth redirect lama (H+7 s/d H+30)
- [ ] **Sisa pending digabung ke satu dokumen: `doc/domain-migration-pending-tasks.md`**

---

## Catatan

1. Item KYC: test transaksi **tidak bisa** divalidasi end-to-end sebelum verified KYC selesai. Jangan anggap Fase 5 tuntas sampai kedua test transaksi lulus.
2. Saat KYC beres: jalankan test kecil di Polar dan Pakasir, verifikasi kredit bertambah, lalu centang item di section B & C.
3. Search Console baru bisa submit sitemap setelah landing `zupericon.com` live (Fase 4/6). Sitemap: `https://zupericon.com/sitemap.xml`.
4. Part B menunggu aset logo baru — setelah di-upload, lanjut ke checklist Part B di plan utama.
