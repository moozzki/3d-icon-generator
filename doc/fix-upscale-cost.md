
# PRD Update: Flux 2 Pro Upscaling Logic & Cost Optimization

## Latar Belakang
Penggunaan resolusi Native 2K (2048x2048) langsung pada model `fal-ai/flux-2-pro` menghasilkan biaya yang terlalu tinggi (~$0.0750 per *request*) dan waktu *render* yang lama (~21 detik). Selain itu, ditemukan bahwa `fal-ai/recraft/upscale/crisp` tidak menerima parameter *scale*. 

Oleh karena itu, *pipeline* Flux 2 Pro harus dikembalikan ke strategi awal: menghasilkan gambar dasar (1K) yang murah, lalu di-*upscale* menggunakan Crisp model. Khusus untuk kebutuhan resolusi 4K, karena model Crisp memiliki fungsi pembesaran *fixed multiplier* (2x dari gambar sumber) dan biaya yang *flat* ($0.004), kita akan menggunakan metode "Double Crisp" (eksekusi API dua kali berturut-turut) untuk menjaga kualitas visual 3D icon tetap konsisten tanpa pembengkakan biaya.

## Perubahan Logika Pipeline (Inngest Worker)

#### [MODIFY] `lib/inngest/functions.ts`

**Branch A: `flux-2-pro`**

* **Step 1 (`generate-base-flux`):** Paksa `image_size` atau `width`/`height` pada parameter Flux 2 Pro ke resolusi dasar **1024x1024 (1K)**. Ini akan mengunci biaya dasar di angka ~$0.04.
* **Step 2 (`upscale-flux-crisp-2k`):** Lempar URL hasil 1K tersebut ke `fal-ai/recraft/upscale/crisp`. Jangan sertakan parameter `scale` di dalam *payload* (karena tidak didukung). Hasil dari proses ini adalah gambar **2K (2048x2048)** dengan tambahan biaya $0.004.
* **Step 3 (`conditional-upscale-flux-4k`):** Buat percabangan logika berdasarkan input *user*.
    * **Jika *user* memilih 2K:** Kembalikan URL dari Step 2 sebagai hasil akhir. (Total *cost*: ~$0.044).
    * **Jika *user* memilih 4K:** Ambil URL gambar 2K yang dihasilkan dari Step 2, lalu lempar **kembali** ke *endpoint* `fal-ai/recraft/upscale/crisp` dalam *step* Inngest baru. Hasil dari proses ini adalah gambar **4K (4096x4096)**. (Total *cost* untuk Base + 2x Upscale: ~$0.048).

**Branch B: `nano-banana-2`**

* Tidak ada perubahan. Tetap gunakan Native 2K dari model dasar karena harga dasarnya (~$0.14) sudah masuk dalam skema perhitungan kredit (2 kredit). Jika *user* meminta 4K, lakukan 1x pemanggilan ke `fal-ai/recraft/upscale/crisp`.