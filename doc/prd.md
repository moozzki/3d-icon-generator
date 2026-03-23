Siapp, Ky. Ini versi final PRD-nya yang udah gue kompilasi secara utuh tanpa ada yang di-*skip*. Lu tinggal *copy* dokumen di bawah ini dan *paste* ke Notion, Obsidian, atau dokumentasi internal lu.

***

# Product Requirements Document (PRD): AI 3D Icon Generator MVP

## 1. Overview
SaaS berbasis web untuk *developer*, desainer, dan *marketer* yang membutuhkan aset visual instan. Platform ini menghasilkan ikon 3D berkualitas tinggi (2K & 4K) melalui *text prompt* dan/atau *image upload*, dengan kontrol spesifik pada sudut pandang (kamera) objek. 

## 2. Tech Stack (MVP)
* **Frontend/Framework:** Next.js (App Router), Tailwind CSS, Shadcn UI, Framer Motion.
* **Backend/API:** Next.js Route Handlers.
* **Hosting & Deployment:** Vercel.
* **Database & ORM:** Neon (Serverless Postgres), Drizzle ORM.
* **Authentication:** Better Auth.
* **Storage:** Cloudflare R2 (Bebas *egress fee*, untuk referensi gambar & hasil *generate*).
* **AI Provider:** Fal.ai (Model Flux.1/Recraft via API - *pricing* transparan).
* **Security & Caching:** Upstash Redis (Rate Limiting).

## 3. Design System & UI Guidelines
* **Typography:**
  * **Heading:** Space Grotesk (Memberikan kesan teknis, modern, dan unik).
  * **Body Text:** Inter (Optimal untuk keterbacaan di layar resolusi tinggi).
* **Color Palette:**
  * **Background (Light Mode):** Offwhite (misal: `#FAFAFA` atau `#F8F9FA`) untuk mengurangi kelelahan mata.
  * **Primary Brand Color:** `#CCCCFF` (Soft Periwinkle / Blue) untuk elemen aksen, *highlight*, dan identitas *brand*.
  * **Call to Action (CTA):** `#4949FF` (Strong Indigo) untuk tombol utama seperti "Generate Icon" atau "Top Up Credits" agar sangat mencolok dan menaikkan konversi.

## 4. Pricing & Credit Economics
* **Sign-up Bonus:** 2 Kredit gratis untuk *trial user* baru.
* **Generation Cost:**
  * Resolusi 2K = 1 Kredit.
  * Resolusi 4K = 2 Kredit.
* **Top-up Tier (MVP):** 10 Kredit seharga Rp 30.000. *(Harga paket lain menyusul pasca-MVP)*.

## 5. User Flow
1. **Onboarding:** *User* mendaftar via Email/Google (Better Auth). Saldo 2 kredit otomatis ditambahkan.
2. **Workspace / Studio:**
   * *User* memasukkan *Text Prompt*.
   * *(Opsional)* Mengunggah *Image Reference* (Diunggah langsung ke Cloudflare R2 via *Presigned URL* tanpa membebani *server*).
   * *User* memilih **Kualitas** (2K / 4K).
   * *User* memilih **Posisi 3D** dari 7 opsi yang tersedia.
3. **Generation & Backend Logic:**
   * Klik "Generate Icon".
   * Upstash Redis memvalidasi *Rate Limit*.
   * Sistem memvalidasi kecukupan saldo (Neon DB).
   * *Prompt Mapper* berjalan di *background* untuk menyesuaikan input *user* menjadi instruksi spesifik ke API Fal.ai.
   * Eksekusi API Fal.ai -> Hasil diunduh *serverless function* -> Upload permanen ke Cloudflare R2.
   * Saldo kredit dipotong sesuai kualitas -> Simpan *history* ke tabel *database*.
4. **Result:** Ikon tampil dengan animasi transisi (Framer Motion) dan siap diunduh (dengan latar belakang transparan).

## 6. Fitur Utama (MVP Scope)
* **Auth & Protected Routes:** Akses *dashboard* dan *generator* hanya untuk *user* yang sudah *login*.
* **Credit Management Engine:** Sistem *top-up*, pemotongan saldo *real-time*, dan penolakan *request* jika saldo tidak cukup.
* **R2 Image Pipeline:** Alur *upload* gambar tanpa membebani *bandwidth server* menggunakan *Presigned URL*.
* **AI Prompt Mapper:** Fungsi internal untuk meracik *prompt* mentah dari *user* ditambah parameter teknis kamera sebelum dikirim ke Fal.ai.
* **Personal Gallery:** Halaman riwayat (*history*) yang menampilkan daftar ikon yang pernah di-*generate* oleh *user* tersebut.

## 7. Spesifikasi 3D Icon Positions & Prompt Mapper
Sistem akan memodifikasi *prompt* ke AI berdasarkan 7 opsi sudut pandang ini:
1. **Isometric:** Sudut pandang teknis tanpa distorsi perspektif.
2. **Front Facing:** Tampak depan tegak lurus.
3. **Back Facing:** Tampak belakang tegak lurus.
4. **Side Facing:** Tampak samping murni (kiri atau kanan).
5. **Three Quarter:** Sudut 45 derajat (mengekspos bagian depan dan samping objek).
6. **Top Down:** Tampak atas persis (mata burung).
7. **Dimetric:** Menyerupai isometrik namun dengan penekanan pada satu sisi (lebih natural).

### Script Prompt Mapper (Next.js Route Handler)
```typescript
import { NextResponse } from "next/server";

// 1. Mapping spesifik untuk mengendalikan AI Camera Angle
const POSITION_PROMPTS: Record<string, string> = {
  isometric: "isometric 3D render, perfectly orthographic projection, uniform scale",
  front_facing: "straight-on front view, symmetrical composition, zero degree angle",
  back_facing: "straight-on back view, rear angle, symmetrical",
  side_facing: "pure side profile view, orthogonal side camera",
  three_quarter: "3/4 perspective angle, dynamic three-quarter view exposing front and side",
  top_down: "top-down flat-lay view, bird's eye perspective, perfectly straight from above",
  dimetric: "dimetric 3D render, angled perspective showing subtle depth"
};

// 2. Mapping untuk mengontrol kualitas/resolusi ke parameter API Fal.ai
const QUALITY_SETTINGS: Record<string, { width: number; height: number }> = {
  "2K": { width: 2048, height: 2048 },
  "4K": { width: 3840, height: 3840 } // Pastikan batas ini didukung model AI pilihan
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userPrompt, position, quality } = body;

    // Validasi input
    if (!POSITION_PROMPTS[position] || !QUALITY_SETTINGS[quality]) {
      return NextResponse.json({ error: "Invalid position or quality parameters" }, { status: 400 });
    }

    // 3. Prompt Engineering: Menggabungkan input user dengan instruksi sistem
    // Ditambahkan instruksi 'isolated on pure white background' untuk mempermudah background removal
    const engineeredPrompt = `A high quality 3D icon of ${userPrompt}. ${POSITION_PROMPTS[position]}. rendered in a modern 3D style, soft lighting, highly detailed, clean design, isolated on a pure white background.`;

    const imageDimensions = QUALITY_SETTINGS[quality];

    /* TODO Pipeline: 
      1. Cek Rate Limit (Upstash Redis)
      2. Cek Saldo User (Drizzle + Neon)
      3. Hit API Fal.ai menggunakan `engineeredPrompt` dan `imageDimensions`
      4. Upload hasil R2 (Jika butuh background removal, tambahkan proses di sini)
      5. Potong saldo & Insert ke tabel `generations`
    */

    return NextResponse.json({ 
      success: true, 
      engineeredPrompt, 
      dimensions: imageDimensions
    });

  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
```

## 8. Database Schema (Drizzle ORM)
Skema di bawah dirancang *lean* untuk MVP namun tetap *type-safe* dan *scalable*.

```typescript
import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

// Enum untuk posisi kamera agar data lebih terstruktur
export const positionEnum = pgEnum("position", [
  "isometric", 
  "front_facing", 
  "back_facing", 
  "side_facing", 
  "three_quarter", 
  "top_down", 
  "dimetric"
]);

export const qualityEnum = pgEnum("quality", ["2K", "4K"]);

// Tabel User (Disesuaikan dengan field default Better Auth)
export const users = pgTable("users", {
  id: text("id").primaryKey(), 
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabel Saldo Kredit User
export const userCredits = pgTable("user_credits", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull().unique(),
  balance: integer("balance").default(2).notNull(), // Default 2 kredit saat daftar
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabel Riwayat Generate Ikon
export const generations = pgTable("generations", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  prompt: text("prompt").notNull(),
  referenceImage: text("reference_image"), // URL R2 untuk gambar referensi (nullable)
  position: positionEnum("position").notNull(),
  quality: qualityEnum("quality").notNull(),
  cost: integer("cost").notNull(), // Biaya yang terpotong (1 atau 2 kredit)
  resultImageUrl: text("result_image_url").notNull(), // URL R2 untuk hasil akhir
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabel Riwayat Top-up / Transaksi
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").references(() => users.id).notNull(),
  creditAmount: integer("credit_amount").notNull(), 
  priceIdr: integer("price_idr").notNull(), 
  paymentStatus: text("payment_status").notNull(), // 'pending', 'success', 'failed'
  paymentProviderRef: text("payment_provider_ref"), // Referensi ID dari Payment Gateway
  createdAt: timestamp("created_at").defaultNow(),
});
