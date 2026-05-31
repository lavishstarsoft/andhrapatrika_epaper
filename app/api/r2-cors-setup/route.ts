import { NextResponse } from 'next/server';
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';

/**
 * One-time setup: configures CORS on your Cloudflare R2 bucket
 * so that browser-based presigned uploads work.
 *
 * Call this endpoint ONCE after deploying:
 *   GET https://andhrapatrika-epaper.vercel.app/api/r2-cors-setup
 *
 * After that, all browser-direct uploads via presigned URLs will work.
 */
export async function GET() {
  try {
    const R2 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
        secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
      },
    });

    const command = new PutBucketCorsCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: ['*'],
            AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
            AllowedHeaders: ['*'],
            ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
            MaxAgeSeconds: 86400,
          },
        ],
      },
    });

    await R2.send(command);

    return NextResponse.json({
      success: true,
      message: 'CORS rules configured successfully on R2 bucket. Browser-based presigned uploads will now work!',
    });
  } catch (error) {
    console.error('R2 CORS setup error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to set CORS rules on R2 bucket',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
