

### 📄 PRD: Integrasi Payment Gateway Polar.sh (USD)

**Subject:** Polar.sh Integration for USD Packages (Credit Card/Global Payments)

**1. Latar Belakang & Objektif**
Kita telah memiliki integrasi Pakasir untuk paket IDR. Sekarang kita perlu mengintegrasikan **Polar.sh** untuk menangani paket USD (`starter_usd`, `creator_usd`, `studio_usd`). Polar akan bertindak sebagai *Merchant of Record* (MoR) menggunakan sistem *Hosted Checkout* mereka.

**2. Persiapan Data & Konstanta (Polar Packages)**
* Buat file konstanta untuk Polar (misal di `lib/polar/packages.ts`) yang memetakan `packageId` dengan `polarProductId` (ID produk dari dashboard Polar) dan jumlah *credit*-nya.
* **Harga telah diupdate.** Struktur datanya:
  ```typescript
  export const USD_PACKAGES = {
    starter_usd: { polarProductId: "...", credits: 10, amount: 5.00 },
    creator_usd: { polarProductId: "...", credits: 30, amount: 10.00 },
    studio_usd:  { polarProductId: "...", credits: 75, amount: 25.00 },
  }
  ```

**3. API Create Polar Checkout (`/api/payment/polar/route.ts`)**
* Method: `POST`. Menerima `packageId`.
* **Auth:** Verifikasi user session.
* **Database:** Insert transaksi baru dengan status `pending`, `currency: 'USD'`, dan `paymentProvider: 'polar'`.
* **Polar API:** Panggil endpoint Polar untuk membuat **Checkout Session**.
  * Gunakan SDK Polar atau Fetch API (dokumentasi terbaru Polar).
  * Masukkan `transactionId` dari database kita ke dalam `metadata` (sangat penting untuk *tracking* saat webhook masuk).
  * Set `success_url` ke `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/transactions?payment=success`.
* **Response:** Kembalikan `checkoutUrl` dari respon Polar.

**4. Webhook Handler Polar (`/api/webhooks/polar/route.ts`)**
* Method: `POST`.
* **Security:** Verifikasi *webhook signature* menggunakan rahasia dari `process.env.POLAR_WEBHOOK_SECRET` (Wajib, menggunakan standar validasi webhook Polar).
* **Listen Event:** Dengarkan event **`order.paid`** (ini adalah sumber kebenaran bahwa pembayaran sukses dan dana sudah terpotong).
* **Ekstraksi & Idempotency:** Ambil `transactionId` dari `metadata` payload Polar. Cek transaksi di database. Jika sudah `'paid'`, return 200.
* **Database Update (CRITICAL):**
  * Karena kita menggunakan `drizzle-orm/neon-http`, **WAJIB menggunakan `db.batch()`** (jangan `db.transaction()` atau dua `await` terpisah) untuk mengupdate `paymentStatus = 'paid'` dan meng-upsert saldo di tabel `user_credits`. *(Gunakan logika batch yang sama dengan webhook Pakasir).*
* Return HTTP 200 OK.

**5. Update UI Checkout (`app/checkout/_components/checkout-button.tsx`)**
* Buat *branching logic* berdasarkan akhiran `packageId`:
  * Jika `packageId.endsWith('_idr')` ➡️ Tampilkan UI Pakasir (In-House Checkout) yang sudah ada.
  * Jika `packageId.endsWith('_usd')` ➡️ Tampilkan UI Checkout Polar.
* **UI Polar:** Karena menggunakan *Hosted Checkout*, tampilkan ringkasan paket dalam USD, lalu sediakan satu tombol besar: **"Pay with Card / Apple Pay"**.
* Jika tombol diklik, panggil `/api/payment/polar`, lalu `window.location.href = response.checkoutUrl` (Redirect user ke halaman Polar).

Tolong implementasikan ini agar aplikasi bisa memproses kedua mata uang secara dinamis tergantung paket yang dipilih!

productid:
starter_usd: 50c025e4-bcb7-4d0f-95cf-ec5265aa1ce3
creator_usd: 51cc7934-3378-43ee-a69b-fc7c3401b585
studio_usd:  a792145f-9f27-4f73-934d-9c31cbb954de