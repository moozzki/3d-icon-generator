Ini keputusan yang sangat tepat dari kacamata manajemen produk (*Product Management*). Begitu sebuah platform generatif mulai mendapatkan *traction* dan *user* mulai men-generate banyak aset (seperti 47 *users* lu yang sudah men-generate 179 ikon), masalah berikutnya yang mereka hadapi adalah **clutter** (berantakan). Fitur *Collections* ini akan meningkatkan *retention* karena membuat workspace mereka terasa seperti *professional tool* dan teratur.

Sebagai PM dan senior coder, gue buatin **Mini PRD (Product Requirement Document)** yang rapi, modular, dan siap lu *handover* ke proses *coding* pake *stack* Next.js 16 + Shadcn UI + Drizzle ORM lu.

---

# 📝 mini-prd.md

## 📌 Document Overview

* **Feature Name:** Custom Collections & Folder Management
* **Status:** Draft / Ready for Implementation
* **Author:** Project Manager & SaaS Consultant
* **Target Stack:** Next.js 16 (App Router), Drizzle ORM + PostgreSQL (Neon), Shadcn UI, Lucide Icons, PostHog

---

## 1. Objective & User Problem

* **Problem:** User yang aktif mulai kesulitan menemukan hasil generate ikon terdahulu karena semuanya menumpuk di satu halaman *library*.
* **Objective:** Menyediakan struktur direktori/folder (Collections) fleksibel agar user dapat mengelompokkan ikon berdasarkan proyek, tema, atau klien mereka sendiri.

---

## 2. Core User Flow (Step-by-Step)

1. **Trigger:** User melihat menu baru `+ New Collection` di sidebar dashboard.
2. **Creation:** User klik tombol tersebut -> Muncul Modal/Dialog -> Input nama folder -> Klik `Create`.
3. **Redirection & Empty State:** Setelah sukses, user di-redirect ke halaman detail folder baru (`/dashboard/collections/[id]`). Karena belum ada data, sistem menampilkan *Empty State UI* dengan tombol CTA: `Browse Library`.
4. **Allocation:** User klik CTA -> Masuk ke halaman Library utama -> Pilih ikon 3D -> Klik menu `...` (Context Menu/Dropdown) pada kartu ikon -> Pilih `Add to Collection` -> Pilih folder tujuan dari list yang muncul.
5. **Success:** System memproses asosiasi data -> Memunculkan *Success Toast* -> Ikon otomatis ter-render di dalam folder bersangkutan saat folder tersebut dibuka kembali.

---

## 3. Data Architecture (Drizzle ORM Schema Updates)

Untuk menjaga skalabilitas (siapa tahu ke depannya 1 ikon bisa dimasukkan ke beberapa *collections* sekaligus), kita gunakan hubungan *Many-to-Many* dengan tabel *junction*.

Tambahkan dua tabel ini di file skema DB lu:

```typescript
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { users } from "./auth-schema"; // sesuaikan dengan core schema lu
import { generations } from "./generation-schema";

// 1. Tabel Master Folder/Collection
export const collections = pgTable("collections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 2. Tabel Junction (Menghubungkan Icon/Generation ke Folder)
export const collectionItems = pgTable("collection_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  collectionId: uuid("collection_id")
    .references(() => collections.id, { onDelete: "cascade" })
    .notNull(),
  generationId: uuid("generation_id")
    .references(() => generations.id, { onDelete: "cascade" })
    .notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

```

---

## 4. Component & UI/UX Specifications (Shadcn UI Setup)

### A. Sidebar Component Updates

* **Elemen:** Tambahkan grup section baru bernama `Collections`.
* **Interaksi:** Di samping teks `Collections`, tambahkan tombol ikon `Plus` (`lucide-react`) berukuran kecil.
* **Modal Trigger:** Klik ikon `Plus` akan membuka `<Dialog>` dari Shadcn UI.
* **Copywriting Input Modal:**
* *Title:* "Create New Collection"
* *Placeholder:* "e.g., Finance App Redesign, Crypto Project"
* *CTA Button:* "Create Folder"



### B. Halaman Detail Folder (`/dashboard/collections/[id]`)

* **Dynamic Routing:** Menggunakan Next.js App Router (`app/dashboard/collections/[id]/page.tsx`).
* **Empty State UI:** Jika query ke `collectionItems` menghasilkan array kosong, render komponen *Empty State*.
* *Icon:* `FolderOpen` dari lucide dengan opacity rendah.
* *Heading:* "This collection is empty"
* *Subheading:* "Organize your high-fidelity 3D icons by adding them from your personal library."
* *CTA Button (Shadcn `<Button>`):* "Browse Library" (Redirects to `/dashboard/library`)



### C. Library Card Action Item

* **Menu Item:** `Add to Collection` -> Membuka sub-menu berisi daftar koleksi milik user (Gunakan `<DropdownMenuSub>`).
---

## 5. API Endpoint Specifications

### 1. `POST /api/collections`

* **Fungsi:** Membuat folder baru.
* **Payload:** `{ name: string }`
* **Auth:** Proteksi server-side via Better Auth session check.

### 2. `POST /api/collections/add-item`

* **Fungsi:** Memasukkan ikon ke dalam folder.
* **Payload:** `{ collectionId: string, generationId: string }`

---