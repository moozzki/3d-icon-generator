# User Flow Documentation - Audora

This document outlines the end-to-end user journey within the Audora platform, from onboarding to asset management and payments.

---

## 1. Onboarding & Authentication
**Goal:** Convert visitors into registered users with trial credits.

1.  **Landing Page:** User explores features, showcases, and pricing.
2.  **Sign Up / Sign In:**
    - User authenticates via **Magic Link** (Email) or **Social Login** (Google/GitHub) handled by **Better Auth**.
    - **First-time User:** System automatically creates a profile and grants **2 Free Credits**.
    - **Returning User:** Redirected straight to the Dashboard.

---

## 2. Workspace & Studio (Generation)
**Goal:** Provide an intuitive interface for creating 3D assets.

### Step 1: Input & Configuration
- **Text Prompt:** User describes the icon they want to generate.
- **Reference Image (Optional):**
    - User uploads an image.
    - Client-side compression (1024x1024) is applied.
    - Image is uploaded to **Cloudflare R2** via Presigned URL.
- **Settings:**
    - **Position:** Select from 7 camera angles (Isometric, Front, Top-down, etc.).
    - **Quality:** Choose between **2K (1 Credit)** or **4K (2 Credits)**.

### Step 2: Generation Process
1.  User clicks **"Generate Icon"**.
2.  **Frontend:** Validates credits and sends request to `/api/generate`.
3.  **Backend:**
    - Verifies session and credit balance.
    - Triggers **Inngest** background job.
    - **Pipeline:** Flux 2 Pro (Base) -> SeedVR2 (Upscale).
4.  **UI State:** Canvas shows a "Generating..." state with progress feedback.

---

## 3. Iterative Editing (Refine Mode)
**Goal:** Allow users to tweak generated assets without starting from scratch.

1.  User selects an existing icon from their Library or Canvas.
2.  Clicks **"Refine"**:
    - The `baseImageUrl` (1K) of the selected icon is used as the new reference.
    - User modifies the prompt or settings.
3.  **Cost:** Reduced cost (~$0.03/1K edit) but still consumes credits based on output resolution.

---

## 4. Library & Asset Management
**Goal:** Access and organize previous generations.

1.  **Gallery View:** Users can see all past generations.
2.  **Details Panel:**
    - View prompts, settings, and timestamps.
    - **Download:** High-res assets directly from CDN (`cdn.useaudora.com`).
    - **Delete:** Remove unwanted assets from the database and R2 storage.

---

## 5. Pricing & Payments (Pakasir Integration)
**Goal:** Seamlessly top-up credits when balance is low.

1.  **Pricing Section:** User selects a credit package (Starter, Creator, Studio).
2.  **Checkout:**
    - User clicks "Buy Now".
    - System creates a `pending` transaction in the database.
    - Redirects user to **Pakasir Payment Gateway** (QRIS/Bank Transfer).
3.  **Fulfillment:**
    - Once payment is successful, Pakasir sends a **Webhook** to `/api/webhooks/pakasir`.
    - System updates transaction status to `paid` and adds credits to the user's account.

---

## 6. Account & Support
- **Account Settings:** Manage profile, view transaction history, and check credit balance.
- **Support:** Access the support page for help or to provide feedback.
- **PostHog Analytics:** User actions are tracked (anonymously) to improve the platform experience.
