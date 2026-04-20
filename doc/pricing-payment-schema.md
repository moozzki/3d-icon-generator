

### 📄 PRD 2: Update Schema DB & Better Auth Secured Checkout (Next.js 16)

**Subject:** Update Schema Database Multi-Currency & Secured Checkout Routing

**1. Latar Belakang & Objektif**
Aplikasi akan diintegrasikan dengan dua Payment Gateway berbeda (Pakasir untuk transaksi IDR dan Polar.sh untuk transaksi USD). *Schema* database Drizzle saat ini belum mendukung multi-currency karena hanya memiliki kolom `price_idr`. Selain itu, kita perlu menyiapkan halaman `/checkout` yang **sangat aman (terproteksi autentikasi)** untuk menangkap pengguna yang di- *redirect* dari *landing page*. Codebase ini menggunakan **Next.js 16** dan **Better Auth**.

**2. Update Drizzle Database Schema**
* Buka file `lib/db/schema.ts` (atau file tempat deklarasi schema Drizzle).
* Pada tabel `transactions`, lakukan modifikasi berikut:
    * **HAPUS:** kolom `price_idr` (integer).
    * **TAMBAH:** kolom `amount` (gunakan tipe `numeric({ precision: 10, scale: 2 })` agar mendukung nilai desimal USD).
    * **TAMBAH:** kolom `currency` (tipe `text`, not null, default: `'IDR'`).
    * **TAMBAH:** kolom `payment_provider` (tipe `text`, not null). Nantinya akan diisi dengan string `'pakasir'` atau `'polar'`.
* Jalankan perintah `npx drizzle-kit push` (atau perintah migrasi yang biasa Anda gunakan) untuk mengaplikasikan perubahan ke database Neon.

**3. Setup Halaman Penangkapan Checkout (`app/checkout/page.tsx`)**
Buat halaman *Server Component* di `/checkout/page.tsx` dengan pengamanan sesi dari Better Auth:
* Tangkap parameter URL `searchParams.package` (contoh parameter masuk: `?package=starter_idr`).
* **Server-Side Auth Check:** Gunakan *helper* Better Auth di server (contoh: memanggil `auth.api.getSession()` yang di-*await*) untuk memvalidasi sesi user.
* **Logika Redirect & Callback:**
    * Jika sesi tidak ditemukan (User belum login): Lakukan `redirect` ke halaman otentikasi aplikasi `/sign-in`, **dan sertakan URL tujuan saat ini sebagai parameter callback**. 
      *Contoh:* `redirect('/sign-in?callbackURL=/checkout?package=starter_idr')`. Pastikan *flow* login Better Auth dapat memproses *callback* ini agar user dikembalikan ke halaman *checkout*.
    * Jika sesi valid: Tampilkan UI konfirmasi (misal: "Memproses paket [package]..."). Halaman ini akan menjadi *base* untuk menembak API Payment Gateway di *task* selanjutnya.

**4. Konfigurasi Proteksi Rute (Next.js 16 Proxy)**
* Jika aplikasi ini menggunakan sistem proteksi rute global berbasis `proxy.ts`, pastikan rute `/checkout` ditambahkan ke dalam daftar rute yang diproteksi. 

Silakan eksekusi perombakan *schema* DB dan buat halaman `/checkout` ini sesuai dengan standar Better Auth dan Next.js 16 yang ada di *codebase* kita.
