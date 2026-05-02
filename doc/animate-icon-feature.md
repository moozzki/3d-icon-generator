
# Product Requirements Document (PRD): Animated 3D Icons (Audora V2)

## 1. Overview & Executive Summary
Fitur "Animated 3D Icons" memungkinkan pengguna Audora untuk menghidupkan aset ikon 3D statis yang telah mereka buat di platform menjadi video animasi *looping* berdurasi 4 detik. Fitur ini dirancang sebagai layanan *premium add-on* untuk desainer web dan *developer* yang membutuhkan interaksi mikro dinamis pada UI mereka. Dengan menggunakan model `fal-ai/veo3.1/lite/image-to-video`, Audora menawarkan kecepatan tinggi dengan efisiensi biaya (*cost-efficiency*) maksimal.

## 2. Business Goals & Strategy
*   **Meningkatkan "Credit Burn Rate":** Memaksa pengguna melakukan konsumsi *credits* ganda: pertama saat membuat aset 3D statis (Studio)[cite: 1], kedua saat menganimasikannya (Animation Studio).
*   **Quality Assurance (Closed Ecosystem):** Hanya menerima `baseImageUrl` dari *database* internal Audora[cite: 2] (tidak ada unggahan pihak ketiga) untuk menjamin kualitas input ke dalam model *Image-to-Video* dan mencegah komplain pengguna akibat input berkualitas rendah.
*   **Profitabilitas:** Mempertahankan margin kotor (*gross margin*) di atas 40% pada setiap *tier pricing* dengan mengunci durasi video di 4 detik dan menggunakan varian model AI yang efisien.

---

## 3. User Flow & UI/UX Requirements

Fitur ini akan diakses melalui halaman khusus dan terintegrasi dengan Library pengguna.

### A. Navigasi & Penamaan
*   **Menu Navigasi (Sidebar):** Ditambahkan menu baru bernama **"Animate"**.
*   **Judul Halaman:** **"Animate Your 3D Icon"** (Memberikan kesan fitur premium).
*   **Manajemen Aset (Library):** Halaman Library[cite: 1] akan memiliki dua tab utama: "3D Icons" (statis) dan "Animated Icons" (video MP4).

### B. Halaman "Animate" - Empty State
Jika pengguna belum pernah menghasilkan ikon 3D di Audora (atau belum memiliki aset di Library):
*   **Visual:** Menampilkan animasi GIF/Video *looping* perbandingan statis vs. animasi (*before-after*).
*   **Copywriting:** *"You haven't generated any 3D icons yet. To bring an asset to life, you need to create one first!"*
*   **Primary CTA:** Tombol besar "Go to Studio & Generate 3D Icon" yang mengarahkan pengguna ke halaman pembuatan aset statis[cite: 1].

### C. Halaman "Animate" - Main Flow (Sudah Ada Aset)
1.  **Step 1: Select Base Asset**
    *   Pengguna disambut dengan kanvas utama dan tombol **"Select 3D Icon"**.
    *   Mengklik tombol akan membuka *modal dialog* berisi *grid* aset dari Library pengguna[cite: 1].
    *   Pengguna memilih satu aset (Sistem akan menarik `baseImageUrl` 1K yang terkait dengan aset tersebut dari tabel `generations`)[cite: 2].
2.  **Step 2: Define Action (Prompt Box)**
    *   Kotak input muncul di bawah kanvas dengan label: **"Describe the animation (Action Prompt)"**.
    *   *Placeholder/Edukasi:* *"e.g., The 3D icon gently hovers, spins 360 degrees, and bounces slightly."*
3.  **Step 3: Set Properties (pilihan properties pada prompt input box seperti di halaman studio/jobid)**
    *   **Resolution:** `720p Video` (2 Credits) atau `1080p Video` (3 Credits).
    *   **Aspect Ratio:** `16:9` (Landscape) atau `9:16` (Portrait).
    *   **Background Integration:** *Color picker* (Input HEX) dengan label *"Match your UI Background"*.
    *   *Quick Presets:* White (`#FFFFFF`), Black (`#000000`), dan Chroma Green (`#00FF00` - untuk *transparent masking* di *editor* video).
    * Gunakan color-picker component dari yang sudah ada.
4.  **Step 4: Generation & Fulfillment**
    *   Pengguna menekan tombol "Generate".
    *   UI menampilkan *state* pemrosesan ("Generating...") menggunakan button loading component seperti di studio/jobid.
    *   Setelah selesai, kanvas menampilkan *Video Player* (otomatis *looping*, tanpa suara) seperti di halaman hasil studio/jobid.
    *   Menampilkan tombol sekunder: **"Download MP4"** dan **"Copy CDN Link"** seperti di halaman hasil studio/jobid.

---

## 4. Technical Architecture (Inngest Pipeline)

Proses pembuatan video wajib ditangani oleh **Inngest** sebagai *background jobs* untuk mencegah *timeout* di Vercel[cite: 2].

**Alur Pipeline Inngest:**
1.  **Payment Validation:** Sistem memvalidasi saldo dan memotong *credits* pengguna (2 atau 3) secara penuh di awal proses (*Pay-Upfront*)[cite: 1].
2.  **Fetch & Remove Background:**
    *   Inngest mengambil `baseImageUrl` (1K) dari tabel `generations`[cite: 2].
    *   Inngest memanggil API `fal-ai/birefnet/v2` untuk menghapus latar belakang. *Output:* PNG Transparan 1K.
3.  **Canvas Composition (Sharp):**
    *   Menggunakan *library* seperti `sharp`.
    *   Membuat kanvas sesuai resolusi (contoh: 1280x720 untuk 16:9 720p).
    *   Mengisi kanvas dengan warna latar belakang (kode HEX) yang dipilih pengguna.
    *   Menempatkan PNG transparan di tengah kanvas.
4.  **Video Rendering (Veo 3.1 Lite):**
    *   Mengirim URL gambar yang telah dikomposisi ke API `fal-ai/veo3.1/lite/image-to-video`.
    *   Parameter wajib disetel ( *hardcoded*): `duration: "4s"` dan `generate_audio: false`. Resolusi disetel sesuai pilihan pengguna.
5.  **Storage & Delivery:**
    *   Inngest mengunduh MP4 dan menyimpannya ke **Cloudflare R2**[cite: 2].
    *   Mengirim notifikasi keberhasilan ke *frontend* dan menyimpan URL hasil video di *database*.

---

## 5. Edge Cases & Fail-Safe Mechanisms
*   **Job Failure:** Jika API Fal.ai gagal atau tertolak kebijakan konten, sistem akan menjalankan fungsi otomatis untuk mengembalikan (*refund*) *credits* yang telah dipotong[cite: 2].
*   **Unsupported Legacy Assets:** Jika aset lama di *database* tidak memiliki `baseImageUrl` yang valid[cite: 2], aset tersebut tidak akan muncul atau tidak dapat dipilih dalam *modal* "Select Base Asset".

---

## 6. In-App User Education (UI Tooltips)
Sangat penting untuk mengelola ekspektasi pengguna mengingat batasan teknis AI Generatif:
*   **Pose Limitation (Ikon ℹ️ pada Prompt):** *"💡 Pro-Tip: The AI animates the existing pose. It cannot drastically change geometry (e.g., a sitting character cannot stand). Keep prompts focused on micro-interactions."*
*   **Background Limitation (Ikon ℹ️ pada Color Picker):** *"🎨 Why HEX Color? MP4 videos do not support transparent backgrounds natively. Enter your UI's background color so the video blends seamlessly, or choose 'Chroma Green' to remove it later in your video editor."*

