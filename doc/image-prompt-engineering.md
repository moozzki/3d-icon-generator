Gue pangkas dan fokusin PRD-nya khusus buat pembaruan arsitektur *prompt engineering* (Bagian No 3 & 4), lengkap dengan latar belakang masalah yang lu minta. Dokumen ini merangkum semua perdebatan dan solusi yang kita bahas hari ini.

---

# PRD Update: Audora Image-to-Image Prompt Optimization

## Latar Belakang & Objektif Pembaruan

Pembaruan arsitektur *prompt* ini dilakukan untuk merespons dua temuan utama dari hasil *testing* fitur **Generate by Reference Image**:

1.  **Konflik Prompt Engineering:** Menggunakan struktur *prompt* Text-to-Image (T2I) untuk alur kerja Image-to-Image (I2I) menyebabkan inakurasi visual. Model AI gagal mempertahankan identitas fisik subjek dari foto referensi. Selain itu, *prompt* T2I tidak memiliki instruksi pembersihan latar belakang yang cukup agresif, sehingga menyisakan *noise* tak kasatmata di resolusi 1K yang kemudian terekspos menjadi "bercak" pada latar belakang putih saat di-*upscale* oleh SeedVR2.
2.  **Kualitas Material Plastic:** *User* menghendaki gaya material *plastic* yang lebih *matte, soft*, dan menyerupai *designer toy* premium (seperti *figure* Pop Mart). Material plastik dari *prompt* sebelumnya dinilai terlalu mengkilap/berminyak (*glossy/oily*).

**Objektif:**
Meningkatkan *success rate* dan akurasi visual fitur I2I dengan memisahkan arsitektur *prompt* T2I dan I2I, serta menyempurnakan *template* material *plastic* agar lebih *matte* dan premium.

---

## 1. Arsitektur Prompt Engineering Khusus Image-to-Image

#### [NEW] `lib/prompts.ts` (atau file *prompt builder* terkait)
Kita memisahkan *master prompt* I2I dari T2I. Dibuat variabel baru `STYLE_REF_PROMPTS` dengan karakteristik:
* Menggunakan kata kerja transformasi ("Transform...").
* Mengunci identitas referensi (*"Maintain the core identity..."*).
* Eksekusi pembersihan latar belakang absolut untuk mencegah bercak SeedVR2.
* Estetika baru untuk material `plastic` (Matte Vinyl Designer Toy).

**Kode Implementasi:**
```typescript
// Master prompt templates for IMAGE-TO-IMAGE (Reference Upload)
// Placeholders: {subject}, {position}, {quality}
// ---------------------------------------------------------------------------

const STYLE_REF_PROMPTS: Record<StyleKey, string> = {
  plastic:
    "Transform {subject} into a highly detailed 3D character/icon in a premium matte vinyl designer toy style. {position}, clean composition. Maintain the core identity and clothing style of the reference, but render it as a smooth, non-glossy plastic figure. Feature soft, diffused ambient lighting with minimal shadows and no harsh specular highlights. Muted, elegant color palette. Strictly isolated on a perfect, flawless, uniform, pure solid white background (#FFFFFF). Remove any original background completely, zero background noise, no artifacts. {quality}, crystal clear image.",
  
  clay:
    "Transform {subject} into a stylized 3D icon made of soft clay material. {position}, balanced composition. Maintain the core identity of the reference. Add slightly imperfect edges and handcrafted texture details. Rendered with soft lighting to enhance tactile depth. Strictly isolated on a perfect, flawless, uniform, pure solid white background (#FFFFFF). Remove any original background completely, zero background noise, no artifacts. {quality}, crystal clear image.",

  glass:
    "Transform {subject} into a premium 3D icon made of translucent glass material. {position}, elegant composition. Maintain the core identity of the reference. Feature realistic refraction, reflections, and light dispersion. Rendered with studio lighting. Strictly isolated on a perfect, flawless, uniform, pure solid white background (#FFFFFF) with a subtle shadow. Remove any original background completely, zero background noise, no artifacts. {quality}, crystal clear image.",

  plush:
    "Transform {subject} into a cute 3D icon in a plush fabric style. {position}, friendly and playful composition. Maintain the core identity of the reference. Feature soft fibers, fuzzy texture, and rounded shapes. Rendered with soft lighting and subtle shadow. Strictly isolated on a perfect, flawless, uniform, pure solid white background (#FFFFFF). Remove any original background completely, zero background noise, no artifacts. {quality}, crystal clear image.",

  toy_block:
    "Transform {subject} into a playful 3D icon in a toy building block style. {position}, structured composition. Maintain the core identity of the reference. Feature bold shapes, vibrant colors, and smooth interlocking surfaces. Rendered with soft lighting. Strictly isolated on a perfect, flawless, uniform, pure solid white background (#FFFFFF). Remove any original background completely, zero background noise, no artifacts. {quality}, crystal clear image.",

  metallic:
    "Transform {subject} into a high-end 3D icon in a metallic chrome material style. {position}, strong composition. Maintain the core identity of the reference. Feature polished surfaces, sharp reflections, realistic highlights, and subtle shadow. Rendered with studio lighting. Strictly isolated on a perfect, flawless, uniform, pure solid white background (#FFFFFF). Remove any original background completely, zero background noise, no artifacts. {quality}, crystal clear image.",
};
```

---

## 2. Logika Prompt Builder (Reference) & Fallback

#### [NEW] Fungsi `buildRefEngineeredPrompt`
Membuat fungsi penyusun *prompt* terpisah yang memiliki mekanisme *graceful fallback*. Ini memastikan jika *user* mengunggah gambar referensi tanpa mengisi teks *prompt* di UI, sistem tetap dapat memberikan instruksi subjek yang valid ke model Flux 2 Pro Edit.

**Kode Implementasi:**
```typescript
// ---------------------------------------------------------------------------
// Prompt builder specifically for Reference Image workflow
// ---------------------------------------------------------------------------

export function buildRefEngineeredPrompt(
  userPrompt: string | undefined | null,
  style: StyleKey,
  position: string,
  quality: string
): string {
  // Graceful fallback for empty inputs
  const rawSubject = userPrompt?.trim() || "";
  const finalSubject = rawSubject !== "" 
    ? rawSubject 
    : "the exact main subject from the provided reference image";

  // Re-map position parameter
  const positionLabel = POSITION_PROMPTS[position] ?? position;
  const template = STYLE_REF_PROMPTS[style];
  
  return template
    .replace("{subject}", finalSubject)
    .replace("{position}", positionLabel)
    .replace("{quality}", quality);
}
```

## 3. Catatan & Risiko (Developer Notes)

* **Posisi vs. Referensi Asli:** Meskipun parameter `{position}` (contoh: Isometric) disuntikkan ke dalam *prompt*, hasil akhirnya akan sangat bergantung pada *angle* foto referensi asli. Akan ada kemungkinan *minor hallucination* dari model jika *user* memaksa foto "Front View" diubah menjadi posisi "Top-Down". Ini adalah batasan wajar dari model Image-to-Image berbasis difusi saat ini.
* **Verifikasi Latar Belakang:** Selalu tes menggunakan gambar referensi yang memiliki latar belakang yang sangat ramai untuk memverifikasi apakah instruksi *"Remove any original background completely"* di *prompt* baru sudah bekerja sempurna sebelum gambar masuk ke fase SeedVR2 Upscaler.