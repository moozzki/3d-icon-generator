Berikut adalah PRD untuk fitur *On-Demand Background Removal* menggunakan BiRefNet yang siap lo dokumentasikan.

---

# PRD: On-Demand Background Removal (BiRefNet v2)

## 1. Latar Belakang & Objektif
*User* Audora membutuhkan fleksibilitas untuk mengunduh hasil 3D *icon* tanpa latar belakang putih (*transparent background*) agar mudah ditempelkan di berbagai desain antarmuka. 
Alih-alih memproses penghapusan latar belakang secara otomatis pada setiap proses *generate* yang akan memboroskan ruang penyimpanan (Cloudflare R2), sistem akan menggunakan arsitektur **On-Demand / Lazy Loading**. Proses AI (BiRefNet) hanya akan dijalankan secara *real-time* saat *user* secara eksplisit meminta pengunduhan varian transparan.

**Objektif:**
* Mengintegrasikan `fal-ai/birefnet/v2` dengan skema resolusi dinamis (menyesuaikan input 2K atau 4K).
* Menjaga efisiensi *storage* R2 dengan melakukan *caching* (penyimpanan satu kali).
* Menjamin *compute cost* API tetap mendekati $0.

---

## 2. Pembaruan Database Schema (Neon / Drizzle)

#### [MODIFY] `lib/db/schema.ts`
Tambahkan satu kolom opsional pada tabel `generations` untuk menyimpan URL gambar transparan hasil proses BiRefNet (Caching).

```typescript
import { text } from "drizzle-orm/pg-core";

// Di dalam definisi tabel generations:
transparentImageUrl: text("transparent_image_url"), // URL gambar PNG tanpa background
```
* *Migration Plan:* Jalankan `npx drizzle-kit push` (atau generate migration). Data lama yang sudah ada di *database* akan memiliki nilai `null` secara *default*, yang mana sudah sesuai dengan logika *Lazy Loading*.

---

## 3. Alur Kerja Backend (API Route)

#### [NEW] `app/api/remove-bg/route.ts`
Buat satu *endpoint* API spesifik yang akan dipanggil oleh tombol *"Download without Background"* di *frontend*.

**Logika Pelaksanaan (Lazy Loading Caching):**
1. Menerima *request* berisi `jobId` dari *frontend*.
2. Melakukan *query* ke *database* untuk mengambil data `generations` berdasarkan `jobId`.
3. **Cek Cache:**
   * Jika `transparentImageUrl` **TIDAK null**: Langsung kembalikan URL tersebut sebagai *response* (Proses selesai, waktu 0 detik, biaya $0).
   * Jika `transparentImageUrl` **null**: Lanjut ke Langkah 4.
4. **Proses Fal.ai:** Tembak API `fal-ai/birefnet/v2` menggunakan `resultImageUrl` (gambar 2K/4K yang berlatar putih).
5. **Upload & Cache:** * Terima hasil gambar dari Fal.ai (berupa data *base64* atau URL sementara).
   * Konversi dan unggah gambar tersebut ke Cloudflare R2 untuk mendapatkan URL permanen.
   * *Update* *database*: Masukkan URL permanen R2 tersebut ke kolom `transparentImageUrl` pada baris `jobId` yang bersangkutan.
6. Kembalikan URL permanen tersebut ke *frontend* untuk diunduh.

---

## 4. Parameter Dinamis BiRefNet (Resolusi 2K vs 4K)

Pada Langkah 4 di atas, implementasikan logika *conditional* untuk memastikan pemotongan garis (*masking*) maksimal tanpa membuat VRAM AI kelebihan beban. Gambar 4K akan menggunakan model dan resolusi operasi tertinggi, sementara gambar 2K menggunakan mode standar.

**Kode Implementasi Payload Fal.ai:**

```typescript
// Asumsi: resolutionType bisa di-query dari DB atau dicek dari URL-nya
const is4K = resolutionType === "4K"; 

const result = await fal.subscribe("fal-ai/birefnet/v2", {
  input: {
    image_url: resultImageUrl, // URL gambar asli berlatar putih dari DB
    
    // Konfigurasi dinamis untuk menjaga kualitas tepi objek
    model: is4K ? "General Use (Dynamic)" : "General Use (Light)", 
    operating_resolution: is4K ? "2304x2304" : "2048x2048",
    
    // Parameter wajib
    refine_foreground: true,
    output_format: "png" // Mutlak wajib PNG agar transparansi (alpha channel) tersimpan
  },
  // ... handling response
});
```
*Catatan Penting:* Parameter `operating_resolution` hanya mengendalikan "Kanvas Kerja Internal" AI, bukan resolusi akhir. Gambar asal 4K akan tetap di-*output* sebagai 4096px murni.

---

## 5. Implementasi Frontend (UI)

#### [MODIFY] Komponen `StudioGallery` atau `DownloadButton`
* Tambahkan opsi *dropdown* atau *toggle* kecil berlabel **"Transparent Background"** saat *user* akan mengunduh gambar.
* Jika diaktifkan, tombol *download* tidak akan langsung mengunduh dari kolom `resultImageUrl`, melainkan akan menembak *endpoint* `POST /api/remove-bg` dengan memberikan `jobId` terkait.
* Berikan *state loading* (misal: *spinner*) pada tombol tersebut, karena pada penembakan pertama kalinya (saat *cache* masih kosong), proses BiRefNet + *upload* ke R2 akan memakan waktu sekitar 2-4 detik. Penembakan kedua dan seterusnya akan instan.