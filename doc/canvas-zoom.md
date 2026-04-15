Tentu, Rizky. Karena kamu sedang membangun SaaS **Audora**, fitur ini memang krusial untuk pengalaman pengguna saat berinteraksi dengan aset 3D atau ikon di *work area*.

Berikut adalah **Product Requirements Document (PRD)** singkat dan padat untuk fitur **Canvas Navigation & Zoom Control** tersebut.

---

# PRD: Canvas Navigation & Zoom Control (Audora)

## 1. Ringkasan Fitur
Fitur ini memberikan kendali penuh kepada pengguna atas visibilitas *work area* (kanvas). Pengguna dapat memperbesar, memperkecil, dan menavigasi elemen desain dengan presisi tinggi melalui menu drop-down dan pintasan keyboard.

## 2. User Stories
*   **Sebagai pengguna**, saya ingin memperbesar (zoom in) kanvas agar bisa melihat detail tekstur pada ikon 3D saya.
*   **Sebagai pengguna**, saya ingin melakukan "Zoom to Fit" agar semua objek di kanvas terlihat dalam satu layar secara otomatis.
*   **Sebagai pengguna**, saya ingin melihat persentase zoom saat ini agar saya tahu skala perbandingan objek saya.

## 3. Spesifikasi Fungsional

### A. Komponen UI
1.  **Zoom Indicator Button**: Menampilkan angka persentase zoom saat ini (misal: 16%). Klik pada tombol ini akan memicu munculnya *Drop-down Menu*.
2.  **Drop-down Menu**: Berisi daftar opsi preset zoom dan perintah fokus.
3.  **Separator Line**: Garis horizontal tipis untuk memisahkan fungsi zoom dasar dengan fungsi navigasi proyek.

### B. Menu Items & Logika
| Menu Item | Deskripsi | Shortcut (Windows/Mac) |
| :--- | :--- | :--- |
| **Zoom In** | Memperbesar tampilan sebesar 10-20% per klik. | `Ctrl` + `+` |
| **Zoom Out** | Memperkecil tampilan sebesar 10-20% per klik. | `Ctrl` + `-` |
| **Preset (50%, 100%, 200%)** | Mengatur zoom ke angka absolut yang ditentukan. | - |
| **Zoom to Fit Project** | Menghitung semua objek di kanvas dan mengatur zoom agar semuanya terlihat di layar. | `Shift` + `1` |
| **Zoom to Fit Selection** | (Disabled jika tidak ada objek dipilih) Fokus hanya pada objek yang sedang aktif. | `Shift` + `2` |

## 4. Persyaratan Teknis (Tech Stack: Next.js + React)
*   **State Management**: Gunakan state global atau context untuk menyimpan nilai `zoomScale`.
*   **Canvas Library**: Jika menggunakan komponen kustom, implementasikan CSS `transform: scale(n)` pada container utama *work area*.
*   **Event Listeners**: Tambahkan *Global Keyboard Shortcut* agar pengguna bisa melakukan zoom tanpa membuka menu.
*   **Accessibility**: Pastikan menu dapat diakses via keyboard menggunakan elemen `<select>` yang di-styling atau pustaka seperti Radix UI / Headless UI untuk aksesibilitas yang baik.

## 5. Kriteria Keberhasilan (Acceptance Criteria)
*   Pengguna dapat melakukan zoom menggunakan *scroll wheel* mouse sambil menahan tombol `Ctrl`.
*   Klik pada "Zoom to Fit" harus memposisikan ulang kanvas ke tengah layar secara instan.
*   Indikator persentase selalu terupdate secara real-time saat tingkat zoom berubah.

---

PRD ini bisa kamu jadikan acuan saat mulai *coding* komponen ini di **Audora**. Apakah kamu ingin saya buatkan cuplikan kode dasar React/Tailwind untuk UI menu ini?