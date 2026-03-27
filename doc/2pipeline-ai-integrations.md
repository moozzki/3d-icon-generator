## Architecture & Technical Spec: Asynchronous 2-Step AI Generation Pipeline

**Objective:** Menghasilkan ikon 3D beresolusi tinggi (2K dan 4K) secara stabil tanpa risiko *timeout* dari Vercel Serverless Function. Proses ini menggunakan arsitektur *event-driven background job* via Inngest untuk mengorkestrasi *chaining API* Fal.ai secara tangguh, lengkap dengan fitur *auto-retry* jika terjadi kegagalan jaringan sementara.

### Phase 0: Request Ingestion & Queuing (Synchronous)
Fase ini adalah satu-satunya bagian yang ditunggu oleh *browser user* secara langsung untuk memastikan UX terasa cepat (kurang dari 1 detik).
1. **Validation:** *Frontend* memanggil `/api/generate`. Route handler memvalidasi Auth, Rate Limit (Upstash Redis), dan kecukupan saldo kredit (Neon DB).
2. **Event Dispatch:** Jika validasi lolos, sistem tidak memanggil Fal.ai, melainkan menembakkan *event* ke Inngest (contoh: `audora/icon.generate`) dengan *payload* *prompt* yang sudah diracik oleh Prompt Mapper, ID *user*, dan pilihan kualitas.
3. **Immediate Response:** Route handler langsung mengembalikan `jobId` ke *frontend*.
4. **Frontend Polling:** *Frontend* menampilkan animasi *loading* (Framer Motion) sambil melakukan *polling* ringan ke *endpoint* `/api/job-status?jobId=...` setiap 2 detik untuk mengecek apakah proses *background* sudah selesai.

### Phase 1: Base Generation (Background Job via Inngest)
Inngest mengambil alih eksekusi di *background*. Fase ini murni bertugas membentuk struktur 3D dasar (baik dari teks maupun gambar referensi).
* **AI Model:** `fal-ai/recraft-v3`
* **Inngest Step:** Menggunakan `step.run()` agar proses pemanggilan API ini dilacak. Jika Fal.ai mengalami *downtime* atau *timeout*, Inngest akan otomatis melakukan *retry*.
* **Input Parameters:**
  * `prompt`: Hasil racikan spesifik (User Input + Posisi Kamera + *White Background*).
  * `image_url` *(Opsional)*: Presigned URL Cloudflare R2 jika *user* menggunakan referensi *Image-to-Image*.
* **Hardcoded Resolution:** Dikunci di **1024x1024 (1K)** untuk proporsi ikon yang paling akurat tanpa distorsi.
* **Output:** Temporary Image URL (1K resolution).

### Phase 2: Crisp Upscaling (The Finisher)
Masih di dalam *workflow* Inngest yang sama, mengambil *output* dari Phase 1 untuk dinaikkan resolusinya menggunakan model penajam khusus objek 3D/vektor.
* **AI Model:** `fal-ai/recraft/upscale/crisp`
* **Inngest Step:** Menggunakan `step.run()` terpisah.
* **Input Parameter:** `image_url` (Output dari Phase 1).
* **Conditional Scaling Logic:**
  * **2K (1 Kredit):** *Scale factor* **2x** (Target final: 2048x2048).
  * **4K (2 Kredit):** *Scale factor* **4x** (Target final: 4096x4096).
* **Output:** Final High-Resolution Image URL.

### Phase 3: R2 Storage & Database Finalization
Setelah URL final dari Phase 2 didapatkan, Inngest mengamankan aset tersebut ke infrastruktur Audora agar tidak bergantung pada *storage* sementara milik Fal.ai.
1. **Download & Buffer:** Inngest mengunduh gambar dari URL final Fal.ai ke dalam *memory buffer*.
2. **Permanent Upload:** Gambar diunggah ke *bucket* **Cloudflare R2** menggunakan `aws-sdk`.
3. **Ledger Update:** Neon DB melakukan transaksi Drizzle ORM: memotong saldo kredit *user*, menyimpan URL R2 ke tabel `generations`, dan mengubah status *job* menjadi `COMPLETED`.
4. **Frontend Resolution:** *Polling* dari *frontend* mendeteksi status `COMPLETED` dan langsung menampilkan gambar dari URL Cloudflare R2 kepada *user*.

### Phase 4: Resilience & Error Handling (Keunggulan Inngest)
* **Zero Vercel Timeout:** Karena beban berat dipindahkan ke mesin Inngest, limit 10 detik dari Vercel Hobby Tier tidak lagi menjadi ancaman pemutus *request*.
* **Graceful Failure:** Jika seluruh upaya *retry* di Inngest gagal (misal API Fal.ai sedang *down* total), Inngest akan mengupdate status *job* di Neon DB menjadi `FAILED`. *Frontend* akan menampilkan pesan *error* yang ramah, dan **kredit user tidak jadi dipotong**.
