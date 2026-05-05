
# 📄 Product Requirements Document (PRD)
## Fitur: 🚀 Batch Icons Generation (Set Ikon Otomatis)

### 1. Latar Belakang & Tujuan
*   **Problem:** *User* (terutama UI/UX designer & dev) jarang butuh cuma 1 ikon. Mereka butuh 1 set ikon lengkap (misal: *Home, Profile, Settings, Cart*) untuk aplikasi mereka. *Generate* manual satu per satu makan waktu dan berisiko menghasilkan *style* 3D yang beda-beda (*inconsistent*).
*   **Solution:** Fitur di mana *user* bisa memasukkan satu *Base Prompt* (untuk mengunci gaya visual/warna) dan daftar *Items* (nama-nama ikon yang mau dibuat), lalu AI akan menghasilkan seluruh set ikon tersebut secara bersamaan dengan *vibe* yang 100% senada.
*   **Business Goal:** Meningkatkan kecepatan konsumsi *credits* per *user* (yang bakal berujung ke *upgrade* paket Studio), dan memposisikan Audora sebagai *tool* produksi UI yang serius, bukan cuma mainan AI biasa.

### 2. Target User
*   **UI/UX Designers:** Butuh set ikon 3D yang seragam untuk *mockup* Figma.
*   **Web/App Developers (Solo Makers):** Butuh aset cepat buat nge-bangun MVP tanpa harus nyewa 3D *artist*.

### 3. User Flow (Alur Penggunaan)
1.  *User* masuk ke halaman *Dashboard*.
2.  *User* memilih tab/toggle **"Batch Mode"**. Letakkan tab/toggle di bagian kiri atas prompt input box
3.  **Input 1 - User Prompt:** *User* mendeskripsikan *vibe* visualnya (Contoh: *"3D isometric clay style, smooth lighting, purple and orange color palette"* dan masuk ke user_prompt dan padukan dengan prompt master).
4.  **Input 2 - Item List:** *User* memasukkan nama-nama ikon yang ingin dibuat, dipisah dengan koma (Contoh: *"House, User avatar, Gear, Shopping cart"*). Ada limit maksimal per *batch* (misal: max 9 ikon).
5.  Sistem menampilkan konfirmasi total *credits* yang akan dipotong (Misal: 4 ikon = 4 credits).
6.  *User* klik tombol **"Generate Batch 🚀"**.
7.  Muncul *loading state* (kalau bisa per-*item* ada indikator *loading*-nya) dengan gunakan component skeleton yang sudah ada (di `components/ui/skeleton.tsx`).
8.  Hasil keluar dalam bentuk **Grid Card Horizontal** (mirip fitur *export* yang lu baru bikin).
canvas work area pada semua halaman bisa bebas di scroll up down right left seperti canvas pada figma. user bisa zoom in zoom out dengan ctrl + scroll mouse dan bisa geser2 dengan menekan tombol spacebar dan mouse click.

9.  *User* bisa klik individual buat *download* satu-satu, ATAU klik tombol **"Download All (ZIP)"**.

### 4. Functional Requirements (Kebutuhan Fitur Frontend & Backend)
*   **Dynamic Prompting:** Sistem di *backend* harus cerdas menggabungkan `Style Prompt` dengan masing-masing `Item List` sebelum dikirim ke Fal.ai.
    *   *Format:* `[Item List] icon, [user Prompt], [prompt master]`
    *   *Contoh:* `"House icon, 3D isometric clay style, smooth lighting, purple and orange color palette"`.
*   **Seed Locking (Krusial untuk Konsistensi):** Fal.ai biasanya punya parameter `seed`. Untuk *Batch Mode*, lu **wajib** nge-set angka `seed` yang SAMA untuk semua *request* di *batch* tersebut. Ini rahasia biar tekstur, *lighting*, dan warnanya nggak lari-lari antar ikon.
*   **Credit Deduction Logic:** Validasi di awal. Kalau *user* minta 5 ikon tapi *credits*-nya sisa 3, *button Generate* harus *disabled* dan munculin *warning* buat *top-up*.
*   **Download as ZIP:** Bikin *button* untuk nge-pak semua URL gambar dari R2 jadi satu *file* `.zip` di sisi *client* (bisa pakai *library* kayak `jszip`).

### 5. Technical Stack Implementation
*   **Frontend (Next.js):** 
    *   Pakai form dinamis buat `Item List` (bisa nambah/kurang *input field*).
    *   *State management* (Zustand/React Context) buat ngelacak status tiap-tiap ikon (mana yang masih *loading*, mana yang udah *done*).
*   **Backend / API:**
    *   Lakukan *Parallel API Calls* ke `fal.run`. Jangan di-*looping* nunggu satu per satu (nanti kelamaan/ *timeout* di Vercel). Tembak pakai `Promise.all()` biar batch gambar *generate* barengan.
*   **Storage (Cloudflare R2):** Upload hasil *generate* ke *bucket* secara paralel.
*   **Database (Neon Postgres):** Insert ke *table* `generations` pakai *bulk insert* (menyimpan `batch_id` yang sama biar tau ini 1 set).

