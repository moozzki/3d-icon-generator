

### 📄 PRD: Integrasi API Payment Gateway Pakasir

**Subject:** Integrasi Endpoint Create Transaction & Webhook Pakasir

**1. Latar Belakang & Objektif**
Sistem telah memiliki rute `/checkout` yang terproteksi. Langkah selanjutnya adalah menghubungkan aplikasi dengan API Payment Gateway Pakasir (dokumentasi: `https://pakasir.com/p/docs`). Kita perlu membuat *endpoint* untuk membuat transaksi (*Create Payment*) dan *endpoint* Webhook untuk menerima notifikasi otomatis ketika *user* berhasil membayar.

**2. Persiapan Data & Konstanta**
Buat *mapping* harga dan *credit* di server-side (bisa di file konstanta atau langsung di dalam *route handler*) untuk paket IDR:
* `starter_idr`: amount 30000, credits 10
* `creator_idr`: amount 75000, credits 30
* `studio_idr`: amount 15000, credits 75 *(Note: Rp 150.000)*

**3. Endpoint API Create Transaction (`app/api/payment/pakasir/route.ts`)**
Buat route handler `POST` dengan alur berikut:
* **Auth Check:** Verifikasi sesi *user* menggunakan Better Auth. Tolak jika tidak *login*.
* **Request Body:** Terima `packageId` dari klien.
* **Validasi:** Cek apakah `packageId` valid di paket IDR.
* **Database Insert (Pending):** Buat record baru di tabel `transactions` menggunakan Drizzle:
    * `userId`: ID user saat ini
    * `creditAmount`: Sesuai paket
    * `amount`: Harga sesuai paket
    * `currency`: `'IDR'`
    * `paymentProvider`: `'pakasir'`
    * `paymentStatus`: `'pending'`
* **Hit API Pakasir:** Gunakan *fetch* untuk memanggil API *Create Transaction* Pakasir. Gunakan *Secret/API Key* dari `process.env.PAKASIR_API_KEY`. Sertakan `transaction.id` dari database kita sebagai `order_id` (atau *reference id*) ke Pakasir agar mudah dilacak.
* **Response:** Kembalikan URL Checkout / URL QRIS dari *response* Pakasir ke klien.

**4. Endpoint Webhook (`app/api/webhooks/pakasir/route.ts`)**
Buat route handler `POST` untuk menerima *callback* dari Pakasir:
* **Keamanan:** Verifikasi *signature* / validasi *request* (sesuai standar keamanan dokumentasi Pakasir) untuk memastikan ini benar-benar dari server Pakasir.
* **Parse Data:** Ambil `order_id` dan status pembayaran dari *body request*.
* **Jika Pembayaran Sukses (Paid):**
    * Cari transaksi di tabel `transactions` berdasarkan `order_id`. Jika statusnya sudah `'paid'`, *return* 200 OK (untuk mencegah *double credit*).
    * Gunakan **Database Transaction (Drizzle db.transaction)** untuk:
        1.  Update status di tabel `transactions` menjadi `'paid'`.
        2.  *Upsert* (Update atau Insert) saldo di tabel `user_credits`. Tambahkan saldo saat ini (`balance`) dengan `creditAmount` dari transaksi tersebut.
* **Response:** Wajib kembalikan HTTP Status 200 agar Pakasir berhenti mengirim ulang *webhook*.

**5. Update UI Checkout (`app/checkout/page.tsx`)**
* Tambahkan tombol **"Continue Payment"** (atau render otomatis) yang memanggil *endpoint* `/api/payment/pakasir`.
* Saat mendapatkan respon URL dari *endpoint* tersebut, *redirect user* ke URL pembayaran Pakasir (tampilkan QRIS-nya di layar jika user memilih qri).

Silakan pelajari dokumentasi Pakasir dan implementasikan alur di atas!
