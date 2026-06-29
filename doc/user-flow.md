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

## 5. Pricing & Payments (Pakasir & Polar.sh Integration)
**Goal:** Seamlessly top-up credits when balance is low using localized currency channels.

1.  **Pricing Section:** User selects a package (Starter, Creator, Studio) from the Pricing/Checkout interface.
2.  **Dynamic Routing Check:**
    - **Domestic (Indonesia):** Users checkout in IDR via **Pakasir** (QRIS & Bank Transfers).
    - **Global (Rest of World):** Users checkout in USD via **Polar.sh** (Credit Card & Apple Pay).
3.  **Packages & Pricing Details:**
    - **IDR Packages (Pakasir):**
      - **Starter:** Rp 30.000 for 10 Credits
      - **Creator:** Rp 75.000 for 30 Credits
      - **Studio:** Rp 150.000 for 75 Credits
    - **USD Packages (Polar.sh):**
      - **Starter:** $5.00 for 25 Credits
      - **Creator:** $10.00 for 60 Credits
      - **Studio:** $25.00 for 175 Credits
4.  **Checkout & Fulfillment:**
    - User clicks "Buy Now" and the system initiates a `pending` transaction.
    - User is redirected to either the Pakasir payment portal or the Polar.sh hosted checkout screen.
    - On success, the corresponding payment gateway triggers a webhook to either `/api/webhooks/pakasir` or `/api/webhooks/polar`.
    - The webhook updates transaction status to `paid` and adds credits to the user's balance.

---

## 6. Account & Support
- **Account Settings:** Manage profile, view transaction history, and check credit balance.
- **Support:** Access the support page for help or to provide feedback.
- **PostHog Analytics:** User actions are tracked (anonymously) to improve the platform experience.
