import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID || "dummy"}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "dummy",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "dummy",
  },
});

export async function getUploadPresignedUrl(key: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || "dummy_bucket",
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

export async function getDownloadPresignedUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || "dummy_bucket",
    Key: key,
  });
  return getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

export async function uploadToR2(key: string, body: Buffer | Uint8Array | Blob | string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || "dummy_bucket",
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  
  await r2Client.send(command);
  
  // Return the public URL or presigned URL. 
  // Assuming public URL structure based on a custom domain, or fallback to presigned download URL.
  return `https://cdn.useaudora.com/${key}`;
}

export async function deleteFromR2(key: string) {
  const command = new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME || "dummy_bucket",
    Key: key,
  });
  await r2Client.send(command);
}
