import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  });

  await R2.send(command);

  // Return public URL (whether it's CDN or proxy path)
  return `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${key}`;
}

export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  if (url.includes('.r2.cloudflarestorage.com/')) {
    return url.replace(/^https:\/\/[^/]+\.r2\.cloudflarestorage\.com\//, `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/`);
  }
  return url;
}


export async function deleteFromR2(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: key,
  });

  await R2.send(command);
}

/** Browser direct-upload to R2 (bypasses Next.js body size limits). */
export async function getPresignedPutUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(R2, command, { expiresIn: expiresInSeconds });
}

export default R2;
