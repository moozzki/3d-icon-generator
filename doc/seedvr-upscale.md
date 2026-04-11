

# PRD: Arsitektur Multi-Pipeline Audora (SeedVR2 & Flux 2 Pro Edit)

## 1. Latar Belakang & Objektif
* Menggantikan model `fal-ai/recraft/upscale/crisp` dengan `fal-ai/seedvr/upscale/image` (SeedVR2) untuk mendapatkan kapabilitas *upscale native* 2x dan 4x dalam satu pemanggilan API tanpa membebani *serverless function* Vercel.
* Mengimplementasikan fitur **Generate by Reference Image** dan **Refine Image** menggunakan *endpoint* `fal-ai/flux-2-pro/edit`.
* Menerapkan strategi penyimpanan `baseImageUrl` (1K) untuk mengamankan biaya (Cost Control) pada fitur Edit agar terkunci di angka ~$0.03.

---

## 2. Pembaruan Database Schema (Neon / Drizzle)

#### [MODIFY] `lib/db/schema.ts`
Tambahkan kolom baru untuk menyimpan hasil *render* mentah 1K. Ini wajib untuk fitur **Refine**.

```ts
import { text } from "drizzle-orm/pg-core";

// Di dalam definisi tabel generations:
baseImageUrl: text("base_image_url"), // Menyimpan URL gambar mentah (resolusi 1K)
```
* *Migration Plan:* `npx drizzle-kit push` atau buat migrasi baru. Kolom ini boleh *null* untuk data lama.

---

## 3. Frontend Pre-Processing (Sangat Krusial)

#### [NEW] `components/Studio/UploadReference.tsx`
Untuk fitur **Generate by Reference Image**, gambar yang diunggah *user* tidak boleh langsung dilempar mentah-mentah ke R2/Fal.ai untuk mencegah *cost* meledak.
* **Wajib:** Implementasikan *client-side resizing* (misal menggunakan `browser-image-compression`).
* **Aturan:** Semua gambar referensi yang di-*upload* harus di-*resize* ke dimensi maksimal **1024x1024 (1 Megapixel)** sebelum diunggah ke Cloudflare R2 untuk mendapatkan URL.

---

## 4. Inngest Worker Pipelines (`lib/inngest/functions.ts`)

Kita akan membagi fungsi `audora/icon.generate` menjadi tiga *branch/workflow* utama berdasarkan *action* dari *user*.

### Workflow A: Generate Text-to-Image
*Trigger: User membuat icon baru dari teks.*
1.  **Generate Base (1K):** Panggil `fal-ai/flux-2-pro` dengan resolusi 1024x1024.
2.  **Save Base:** *Upload* ke R2. Dapatkan URL dan simpan ke memori sebagai `base_url_1k`.
3.  **Upscale (SeedVR2):** Panggil `fal-ai/seedvr/upscale/image`.
    * Jika parameter user `2K`: set `"upscale_factor": 2`.
    * Jika parameter user `4K`: set `"upscale_factor": 4`.
4.  **Finalize:** *Upload* hasil SeedVR2 ke R2.
5.  **DB Update:** Insert ke `generations` -> `baseImageUrl`: `base_url_1k`, `resultImageUrl`: URL hasil SeedVR2.

### Workflow B: Generate by Reference Image
*Trigger: User mengunggah sketsa/foto yang sudah di-resize ke 1024x1024 via Frontend.*
1.  **Generate Edit (1K):** Panggil `fal-ai/flux-2-pro/edit`.
    * `prompt`: Instruksi dari user + *style guide* Audora.
    * `image_urls`: `[URL_GAMBAR_UPLOAD_USER_DARI_R2]`
    * **Wajib:** Kunci `image_size` ke `"square_hd"` atau dimensi 1024x1024 agar *cost* tetap $0.03.
2.  **Save Base:** *Upload* hasil ke R2. Dapatkan URL dan simpan sebagai `base_url_1k`.
3.  **Upscale (SeedVR2):** Lempar `base_url_1k` ke SeedVR2 dengan `"upscale_factor": 2` atau `4` sesuai opsi *user*.
4.  **Finalize & DB Update:** *Upload* ke R2, simpan `baseImageUrl` (hasil no 2) dan `resultImageUrl` (hasil no 3) ke tabel baru.

### Workflow C: Refine (Iterative Edit)
*Trigger: User menekan tombol "Refine" pada asset yang sudah ada di Library/Studio.*
1.  **Fetch Base Image:** Di API Route *sebelum* memanggil Inngest, ambil data `baseImageUrl` dari tabel `generations` berdasarkan `jobId` yang ingin di-*refine*.
2.  **Generate Edit (1K):** Panggil `fal-ai/flux-2-pro/edit`.
    * `prompt`: Prompt baru dari user.
    * `image_urls`: `[baseImageUrl_LAMA]` (Karena ini pasti 1K, *cost* terjamin $0.03).
3.  **Save Base:** *Upload* hasil baru ke R2. Dapatkan `new_base_url_1k`.
4.  **Upscale (SeedVR2):** Panggil SeedVR2 (faktor 2 atau 4).
5.  **Finalize & DB Update:** Buat *row* baru (sebagai iterasi baru dari gambar tersebut) atau *update row* yang sama di `generations` dengan `baseImageUrl` dan `resultImageUrl` yang baru.

---

## 5. Ringkasan Payload API SeedVR2
Untuk menggantikan blok kode Crisp Upscaler lama, gunakan *payload* berikut pada tahap *upscaling* di Inngest:

```typescript
const upscaleFactor = resolution === "4K" ? 4 : 2;

const upscaledResult = await fal.subscribe("fal-ai/seedvr/upscale/image", {
  input: {
    image_url: base_url_1k, // Selalu gunakan gambar 1K hasil generate/edit
    upscale_mode: "factor",
    upscale_factor: upscaleFactor,
    output_format: "png", // Paksa output ke PNG agar tidak perlu Sharp.js lagi
  },
  // ... logs / queue monitoring
});
```