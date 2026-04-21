

### 📄 PRD: Refactor to Pakasir Option C (Raw API) & In-House Checkout UI

**Subject:** Switch to Pakasir Core API (Option C), Custom Checkout UI, Countdown, and Cancel Feature

**1. Latar Belakang & Objektif**
Implementasi saat ini menggunakan Option B (Hosted Redirect) menyebabkan masalah UX (tombol *back* membuat duplikat transaksi karena API dipanggil di `useEffect`) dan merusak konsistensi *branding* karena *user* keluar dari aplikasi.
Tujuan *task* ini: Beralih ke **Option C (Raw/Core API)** dari Pakasir, membangun UI Checkout internal (termasuk pemilihan metode pembayaran, hitung mundur 1 jam, dan render QR/VA), serta memperbaiki *bug* duplikat transaksi.

**2. Update Drizzle Database Schema**
Pada tabel `transactions`, lakukan pembaruan berikut:
* **TAMBAH:** kolom `expires_at` (tipe `timestamp`).
* Pastikan kolom `payment_status` bisa menerima nilai `'cancelled'` dan `'expired'` (selain `'pending'` dan `'paid'`).
* Lakukan `db push`.

**3. Pemasangan Package Tambahan**
* Install library untuk merender QR Code di sisi klien (contoh: `npm install qrcode.react` atau `react-qr-code`).

**4. Refactor API Create Transaction (`/api/payment/pakasir/route.ts`)**
* **Perubahan Trigger:** Jangan panggil ini otomatis di *client*. Endpoint ini hanya dipanggil saat *user* **mengklik tombol "Bayar dengan [Metode]"**.
* **Request Body Tambahan:** Selain `packageId`, terima juga `paymentMethod` (contoh: `'qris'`, `'bca_va'`, dll).
* **Hit Pakasir Core API (Option C):** Panggil endpoint Pakasir untuk membuat transaksi spesifik dengan metode yang dipilih. Set *expiry time* transaksi ini menjadi **1 jam dari sekarang** (baik di *database* maupun di *payload* ke Pakasir jika API mereka mendukung parameter *expiry*).
* **Response:** Jangan kembalikan URL *redirect*. Kembalikan data mentah seperti `qr_string` (jika QRIS) atau `va_number` (jika Virtual Account), beserta `transactionId` dan `expiresAt`.

**5. Buat API Endpoint Cancel (`/api/payment/cancel/route.ts`)**
* Method: `POST`. Menerima `transactionId`.
* Verifikasi bahwa transaksi ini milik `user` yang sedang *login*.
* Update `paymentStatus` di database menjadi `'cancelled'`.
* (Opsional) Hit endpoint pembatalan Pakasir jika tersedia di dokumentasi mereka.

**6. Perombakan Total UI Checkout (`app/checkout/page.tsx` & komponennya)**
Buat UI menjadi 2 *step/state* di dalam satu *Client Component*:
* **State 1: Order Summary & Method Selection**
    * Tampilkan detail paket (Nama & Harga).
    * Tampilkan daftar metode pembayaran (QRIS, Mandiri VA, BCA VA, dll).
    * Tombol "Konfirmasi & Bayar" (Baru di tahap ini fungsi `POST /api/payment/pakasir` dijalankan, sehingga mencegah *bug* duplikat transaksi saat user menekan tombol *back*).
* **State 2: Payment Instruction (Waiting for Payment)**
    * Jika respon API adalah QRIS: Render QR Code menggunakan data `qr_string`.
    * Jika respon API adalah VA: Tampilkan nomor Virtual Account dengan tombol "Copy".
    * **Countdown Timer:** Buat komponen hitung mundur (1 jam) berdasarkan `expires_at` dari *database*. Jika waktu habis, otomatis ubah UI menjadi "Transaksi Kedaluwarsa" dan jalankan endpoint cancel.
    * **Tombol Cancel:** Sediakan tombol "Batalkan Pembayaran". Jika diklik, jalankan API `/api/payment/cancel`, update UI, lalu arahkan user kembali ke `/pricing`.

Silakan hapus logika auto-redirect lama dan implementasikan arsitektur *in-house checkout* ini secara menyeluruh!
