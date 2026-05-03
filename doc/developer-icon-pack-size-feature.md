
# Product Requirements Document (PRD): "Dev-Ready" Export Pack (One-Click App Icons)

## 1. Overview & Objective
**Nama Fitur:** "Dev-Ready" Export Pack
**Tujuan:** Menyelesaikan masalah utama pengembang aplikasi dan desainer web yang harus mengubah ukuran (*resize*) ikon 3D secara manual untuk berbagai platform (iOS, Android, Web). Fitur ini memungkinkan pengguna untuk mengunduh satu paket arsip (`.zip`) yang berisi variasi ukuran standar industri dari satu *base image* ikon mereka, secara instan dengan satu klik.


## 2. Business & Monetization Value
*   **User Retention:** Menghemat waktu pengguna secara signifikan (menghapus kebutuhan perangkat lunak pihak ketiga seperti Photoshop), meningkatkan persepsi nilai Audora sebagai alat produktivitas *end-to-end*.

## 3. User Flow & UI/UX Requirements

Fitur ini akan diletakkan di halaman studio dan jobid 

1.  **Placement:** Di side sheet trigger yang ada pada halaman studio/dashboard saat user sukses generate image, serta di halaman jobid saat user pilih opsi refine image. letakan di dalam accordion menu Actions button
2.  **Tombol (Primary Action):**
    *   **Ikon:** gunakan "Package2" Icons dari lucide-react
    *   **Label:** "Export App Icons (.zip)".
    *   **Tooltip (saat di-hover):** *"Includes iOS, Android, macOS, and Web Favicon sizes in a single ZIP."*
3.  **Interaction States:**
    *   **Loading:** Saat diklik, tombol berubah menjadi tulisan *"Zipping..."* dengan animasi *spinner*. Tombol di-*disable* agar tidak terjadi klik ganda.
    *   **Success:** *Browser* secara otomatis mengunduh file `.zip`. Tombol kembali ke *state* Default.
4.  **File Naming Convention:** File `.zip` yang diunduh harus memiliki nama yang rapi, dengan nama file yang sudah ada dan berakhiran `.zip`.

## 4. Technical Specifications & Architecture

Fitur ini didesain untuk **Low Cost / Zero Cost** pada sisi infrastruktur. Tidak menggunakan Inngest atau GPU *rendering*, sepenuhnya berjalan secara *synchronous* menggunakan memori Vercel ( *Serverless Function* ).

### A. Endpoint API
*   **Route:** `GET /api/export-pack`
*   **Query Parameters:**
    *   `imageId` (ID dari ikon di *database*) ATAU
    *   `url` (Direct URL *base image* resolusi tinggi dari R2).

### B. Dependencies (Node.js)
*   **`sharp`**: Digunakan untuk manipulasi gambar ( *resizing*) yang sangat cepat di memori.
*   **`archiver`**: Digunakan untuk membuat *file* `.zip` secara *streaming*.

### C. Backend Logic Flow
1.  **Request Handling:** Menerima *request* dari *frontend*.
2.  **Fetch Asset:** Mengunduh gambar sumber (resolusi tinggi) dari penyimpanan Cloudflare R2 ke dalam memori Vercel sebagai *Buffer*.
3.  **Buffer Resizing (Sharp Pipeline):**
    Menggunakan `sharp` untuk memproses *Buffer* gambar sumber menjadi beberapa *Buffer* baru dengan ukuran spesifik secara asinkron (*Promise.all* untuk kecepatan).
4.  **Streaming ZIP (Archiver):**
    *   Mendeklarasikan *header* HTTP untuk merespons sebagai file unduhan:
        `Content-Type: application/zip`
        `Content-Disposition: attachment; filename="nama-file.zip"`
    *   Menginisialisasi `archiver('zip')`.
    *   Mengarahkan (*pipe*) *output archiver* langsung ke *HTTP Response stream*.
    *   Menambahkan (*append*) Buffer hasil *resize* ke dalam arsip satu per satu.
    *   Memanggil `archive.finalize()`.

### D. Standard Output Sizes (Isi dari File .zip)
Struktur *folder* di dalam file `.zip` akan diatur sebagai berikut:

*   📁 **iOS/**
    *   `icon-1024.png` (1024x1024) - *App Store Standard*
    *   `icon-180.png` (180x180) - *iPhone Retina*
    *   `icon-120.png` (120x120) - *iPhone Standard*
*   📁 **Android/**
    *   `icon-512.png` (512x512) - *Google Play Standard*
    *   `icon-192.png` (192x192) - *Android Default*
*   📁 **Web/**
    *   `apple-touch-icon.png` (180x180)
    *   `favicon-32.png` (32x32)
    *   `favicon-16.png` (16x16)

## 5. Constraints & Error Handling
*   **Memory Limit Vercel:** Proses *resizing* dengan `sharp` menggunakan RAM. Karena hanya me- *resize* 1 gambar asal ke ~8 ukuran kecil, beban memori harusnya sangat kecil (< 50MB) dan sangat aman untuk *serverless environment*.
*   **Error State:** Jika proses *fetch* gambar awal gagal (URL tidak valid atau *file* tidak ada di R2), API merespons dengan HTTP 404/500, dan *frontend* menampilkan *Toast Notification* berwarna merah: *"Failed to generate pack. Please try again later."*

## 6. Implementation Steps
1.  *Install* *library* `archiver` (`npm install archiver` dan `@types/archiver`). (*Sharp* kemungkinan sudah terinstal di proyek ini).
2.  Buat *file* *route* `GET` pada `app/api/export-pack/route.ts`.
3.  Implementasikan *logic streaming zip* di dalam *route* tersebut.
4.  Tambahkan tombol CTA di UI halaman detail ikon.
5.  Uji coba pengunduhan untuk memastikan *file* `.zip` valid, struktur *folder* benar, dan ukuran *file* akurat.