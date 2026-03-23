# Integration Setup Guide: Upstash Redis & Cloudflare R2

This guide walks you through the steps to set up and integrate **Upstash Redis** (for rate limiting/caching) and **Cloudflare R2** (for storing generated 3D icons) into this project.

---

## 🚀 1. Upstash Redis Setup

Upstash provides serverless Redis that is perfect for serverless functions (Next.js API routes).

### Step-by-Step Instructions:
1.  **Create an Account**: Go to [Upstash Console](https://console.upstash.com/) and sign up.
2.  **Create a Redis Database**:
    *   Click on **"Create Database"**.
    *   **Name**: `3d-icon-generator-redis` (or your preferred name).
    *   **Region**: Choose a region closest to your deployment (e.g., `Singapore` if using Neon `ap-southeast-1`).
    *   **TLS**: Ensure TLS is enabled.
3.  **Get API Credentials**:
    *   In the database dashboard, find the **"REST API"** section.
    *   Copy the `UPSTASH_REDIS_REST_URL`.
    *   Copy the `UPSTASH_REDIS_REST_TOKEN`.
4.  **Update `.env.local`**:
    ```env
    UPSTASH_REDIS_REST_URL="your-url-here"
    UPSTASH_REDIS_REST_TOKEN="your-token-here"
    ```

---

## ☁️ 2. Cloudflare R2 Setup

Cloudflare R2 is an S3-compatible object storage service with zero egress fees.

### Step-by-Step Instructions:
1.  **Enable R2**: Go to the [Cloudflare Dashboard](https://dash.cloudflare.com/), select your account, and click on **R2** in the sidebar. (Note: You may need to provide a credit card, but there is a generous free tier).
2.  **Create a Bucket**:
    *   Click **"Create bucket"**.
    *   **Bucket Name**: `3d-icons` (this will be your `R2_BUCKET_NAME`).
    *   Click **"Create bucket"**.
3.  **Get Your Account ID**:
    *   On the R2 overview page, look for your **"Account ID"** on the right side.
    *   Copy it into `R2_ACCOUNT_ID`.
4.  **Generate API Credentials**:
    *   On the R2 overview page, click **"Manage R2 API Tokens"** (on the right).
    *   Click **"Create API Token"**.
    *   **Token Name**: `3d-icon-generator-token`.
    *   **Permissions**: Select **"Object Read & Write"**.
    *   **Bucket Scoping**: You can select "All buckets" or "Specific buckets" and choose your `3d-icons` bucket.
    *   Click **"Create API Token"**.
5.  **Copy Credentials**:
    *   Copy the **Access Key ID**.
    *   Copy the **Secret Access Key**.
    *   **IMPORTANT**: These will only be shown once.
6.  **Update `.env.local`**:
    ```env
    R2_ACCOUNT_ID="your-account-id-here"
    R2_ACCESS_KEY_ID="your-access-key-id-here"
    R2_SECRET_ACCESS_KEY="your-secret-access-key-here"
    R2_BUCKET_NAME="3d-icons"
    ```

---

## 🛠 3. Implementation Details

We use standard SDKs to interact with these services.

### Packages Used:
*   **Upstash Redis**: `@upstash/redis`
*   **Cloudflare R2**: `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`

### Common Usage (Example):

#### Redis (Rate Limiting):
```typescript
import { Redis } from "@upstash/redis"

const redis = Redis.fromEnv()
// Use to track usage, rate limit, etc.
```

#### R2 (File Upload):
```typescript
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
```

---

## ✅ Final Check
Once you've added all values to `.env.local`, restart your development server:
```bash
npm run dev
```
