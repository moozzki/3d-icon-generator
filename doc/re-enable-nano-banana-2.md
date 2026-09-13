# Re-Enable Nano Banana 2 sebagai Pilihan AI Model

Status: **executed**
Tanggal: 2026-09-13

## Latar Belakang

Nano Banana 2 (`fal-ai/nano-banana-2`) pernah aktif di branch lama
(`origin/ai-model-selector`, commit `afa106b`) namun pipeline-nya dihapus dari
`main` pada commit `41b8f5d`. Kode sisa yang masih ada:

- `AI_MODELS` di `app/(dashboard)/page.tsx` dan `app/(dashboard)/[jobId]/page.tsx`
  memuat `nano-banana-2` tetapi tidak pernah dirender (state `aiModel` read-only).
- `aiModelEnum` di `lib/db/schema.ts` **sudah** mendukung `nano-banana-2`
  (tidak perlu migrasi DB).
- API routes dan Inngest worker masih flux-only.

Dokumen ini adalah plan final yang dieksekusi untuk mengaktifkan kembali model
tersebut sebagai pilihan di UI.

## Keputusan Produk

| Topik | Keputusan |
|---|---|
| Akses | Terbuka untuk semua user (tanpa paywall `hasPurchased`). Free user (2 kredit) otomatis tidak bisa memakai nano karena harga 3/4 kredit |
| Harga kredit | Nano Banana 2: **2K = 3 kredit**, **4K = 4 kredit** |
| Batch mode | Nano aktif, harga per item sama (3/4 kredit) |
| UI selector | Block ReUI `@reui/c-dropdown-menu-18` ("AI model selector with provider icons") |
| Halaman | Selector dipasang di `app/(dashboard)/page.tsx` dan `app/(dashboard)/[jobId]/page.tsx` |
| Upscaler | `fal-ai/seedvr/upscale/image` (standar Zupericon) — **bukan** Recraft Crisp |

## Biaya FAL

SeedVR2: **$0.001 per megapixel**.

| Jalur | Pipeline | FAL Cost | Kredit |
|---|---|---|---|
| Nano 2K | 1K native ($0.08) + SeedVR factor 2 → 2048² (4.19MP) | ~$0.0842 | 3 |
| Nano 4K | 1K native ($0.08) + SeedVR factor 4 → 4096² (16.78MP) | ~$0.0968 | 4 |
| Flux 2K | 1K base (~$0.040) + SeedVR factor 2 | ~$0.0442 | 1 |
| Flux 4K | 1K base (~$0.040) + SeedVR factor 4 | ~$0.0568 | 2 |

Strategi nano mengikuti pola flux: generate base **1K** (paling murah) lalu
upscale dengan SeedVR, sehingga lebih hemat dibanding native 2K/4K
(native: 2K $0.12, 4K $0.16).

## Perubahan

### 1. ReUI Dropdown (`@reui/c-dropdown-menu-18`)

- Install via `npx shadcn@latest add @reui/c-dropdown-menu-18`
  (registry `@reui` sudah terkonfigurasi di `components.json`, style `radix-vega`).
- File hasil install: `components/examples/c-dropdown-menu-18.tsx` + SVG provider
  di `components/ui/svgs/`.
- Import bawaan example rusak (`@/app/(create)/components/icon-placeholder`) →
  diganti `ChevronDownIcon` lucide, lalu example dihapus setelah diadaptasi.
- Hanya SVG yang dipakai dipertahankan (`gemini.tsx` untuk Nano Banana 2).

### 2. `lib/ai-models.ts` (baru)

Sentralisasi metadata model: `AI_MODELS`, `type AiModelId`, `getCreditCost()`.
Dipakai oleh kedua halaman Studio dan komponen dropdown.

### 3. `components/Studio/AiModelDropdown.tsx` (baru)

Dropdown produksi hasil adaptasi block ReUI:

- Trigger bergaya toolbar existing (ikon model aktif + label + chevron).
- Item: ikon (Flux = `ZapIcon`, Nano = `<Gemini />`), label, deskripsi,
  badge kredit, checkmark untuk model aktif.
- Tanpa lock/paywall — pembatasnya kredit.

### 4. Inngest Worker (`lib/inngest/functions.ts`)

- `IconGenerateEvent.aiModel` → `"flux-2-pro" | "nano-banana-2"`.
- Helper bersama `upscaleWithSeedVR()` (diekstrak dari Branch A) untuk flux & nano.
- Branch B `nano-banana-2` (mirror Branch A):
  1. `prepare-ref-image` → base64 data URI (jika ada reference).
  2. Base 1K:
     - T2I: `fal-ai/nano-banana-2` (`resolution: "1K"`, `aspect_ratio: "1:1"`,
       `output_format: "png"`, `safety_tolerance: "5"`, seed batch).
     - Reference/refine: `fal-ai/nano-banana-2/edit` (`image_urls: [dataUri]`).
  3. Upload base 1K ke R2 → `baseImageUrl`.
  4. SeedVR upscale (factor 2 untuk 2K, factor 4 untuk 4K).
  5. `finalizeJob()` → pipeline `"nano-banana-2"`.
- Komentar Crisp/Recraft usang dibersihkan.

Catatan skema FAL terbaru (terverifikasi dari dokumentasi resmi):

- T2I `fal-ai/nano-banana-2`: parameter `resolution` (0.5K/1K/2K/4K) menggantikan
  `image_size`; `enable_safety_checker` tidak ada, hanya `safety_tolerance`.
- Edit `fal-ai/nano-banana-2/edit`: `image_urls: string[]`, bukan `image_url`.

### 5. API Routes

- `app/api/generate/route.ts` dan `app/api/batch-generate/route.ts`:
  `type AiModel` + `"nano-banana-2"`, matrix `{2K: 3, 4K: 4}`,
  `VALID_AI_MODELS` + nano.

### 6. UI Pages

- `app/(dashboard)/page.tsx` (~toolbar controls row) dan
  `app/(dashboard)/[jobId]/page.tsx`: pasang `AiModelDropdown`, aktifkan
  `setAiModel`, estimasi durasi nano disesuaikan.
- Import `AI_MODELS`/`getCreditCost` dari `lib/ai-models.ts`.

### 7. Dokumen

- Hapus `doc/recraft-crisp.md` dan `doc/fix-upscale-cost.md` (usang; SeedVR
  didokumentasikan di `doc/seedvr-upscale.md`).
- Update `doc/new-2pipeline-ai-model.md` dan `doc/master.md` (SeedVR + harga kredit).

## Verifikasi

1. `npm run lint` + `npx tsc --noEmit`.
2. Smoke test FAL: T2I nano 1K, edit nano 1K (`image_urls`), SeedVR factor 2 & 4.
3. Inngest dev + UI: flux (regresi), nano T2I/refine 2K & 4K, batch nano.
4. Kredit terpotong 3/4, refund `onFailure`, user saldo 2 → 403 tanpa potong.
5. `grep -i "crisp\|recraft"` bersih di code.

## Risiko

- Kualitas hasil SeedVR dari base 1K perlu dibandingkan dengan native 2K;
  fallback: naikkan `resolution` base ke `"2K"` bila perlu.
- `falPostQueueInngest` memiliki batas polling ~55s; nano Flash + SeedVR
  umumnya jauh di bawah itu.
- Prompt di `lib/prompts.ts` dioptimalkan untuk flux; tuning khusus nano
  (Gemini lebih natural-language) disarankan sebagai fase lanjutan.
