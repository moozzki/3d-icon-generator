

# 📄 PRD: Audora In-App Feedback System

## 1. Ringkasan Fitur (Overview)
Sistem pengumpulan masukan pengguna (*user feedback*) di dalam *dashboard* Audora. Setiap masukan yang masuk akan disimpan di database dan diteruskan secara otomatis ke email tim pengelola.

## 2. Tujuan (Goals)
* Mendapatkan masukan kualitatif (saran fitur, laporan *bug*) langsung dari pengguna aktif.
* Memonitor kepuasan pengguna melalui sistem *rating*.
* Notifikasi *real-time* ke email tim tanpa perlu membangun *dashboard* admin tambahan.

## 3. Tech Stack
* **UI:** Shadcn/UI (Dialog & Form components).
* **ORM:** Drizzle ORM.
* **Database:** Neon (Postgres).
* **Email Engine:** Resend.
* **Validation:** Zod.

## 4. Alur Pengguna (User Flow)
1.  *User* mengklik tombol/ikon **"Share Feedback"** di *sidebar footer* diatas user profile account dan di *top header dashboard*.
2.  **Modal Dialog** muncul dengan form yang berisi:
    * **User profil account pengguna**
    * **Rating (1-5 Bintang):** Input wajib.
    * **Feedback/Review (Textarea):** Input wajib.
    * **Feature Suggestions (Textarea):** Input opsional.
3.  *User* mengklik tombol **"Submit"**.
4.  *State* tombol berubah menjadi *loading*.
5.  **Setelah Berhasil:** Modal tertutup dan muncul *toast* notifikasi: *"Thank you! Your feedback helps us build a better Audora."*

## 5. Kebutuhan Teknis (Technical Requirements)

### A. Database Schema (Drizzle)
Tabel ini akan menyimpan riwayat ulasan untuk keperluan audit atau dipajang di *landing page* nanti.
```typescript
export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(), // Relasi ke tabel user
  rating: integer("rating").notNull(),
  content: text("content").notNull(),
  suggestions: text("suggestions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### B. Backend Logic (Server Action)
Satu fungsi yang menjalankan dua tugas:
1.  **DB Operation:** Melakukan `db.insert` ke tabel `feedbacks`.
2.  **Email Operation:** Mengirim email via Resend ke alamat admin (misal: `rizky@useaudora.com`) yang berisi detail ulasan tersebut.

### C. Budget Control (No Rewards)
* Menghapus semua logika penambahan *credits* otomatis setelah *submit*.
* Menghapus *banner* atau teks yang menjanjikan hadiah pada UI form.

## 6. Kriteria Sukses
* Feedback tersimpan di Neon DB dengan data `userId` yang tepat.
* Admin menerima email berisi teks ulasan < 1 menit setelah *user* klik *submit*.

---

