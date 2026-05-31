import { NextRequest, NextResponse } from 'next/server';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import R2 from '@/lib/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  let fileKey = '';
  try {
    const { key } = await params;
    if (!key || key.length === 0) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 });
    }

    fileKey = key.join('/');
    const command = new GetObjectCommand({
      Bucket: process.env.CLOUDFLARE_R2_BUCKET_NAME!,
      Key: fileKey,
    });

    const response = await R2.send(command);
    const bodyStream = response.Body;

    if (!bodyStream) {
      return NextResponse.json({ error: 'File body is empty' }, { status: 404 });
    }

    // Convert AWS SDK stream to Web ReadableStream
    let readableStream: any = bodyStream;
    if (typeof (bodyStream as any).transformToWeb === 'function') {
      readableStream = (bodyStream as any).transformToWeb();
    } else if (typeof (bodyStream as any).pipe === 'function') {
      // Fallback for Node Readable streams
      readableStream = new ReadableStream({
        start(controller) {
          (bodyStream as any).on('data', (chunk: any) => {
            controller.enqueue(chunk);
          });
          (bodyStream as any).on('end', () => {
            controller.close();
          });
          (bodyStream as any).on('error', (err: any) => {
            controller.error(err);
          });
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': response.ContentType || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    if (response.ETag) headers['ETag'] = response.ETag;
    if (response.ContentLength) {
      headers['Content-Length'] = response.ContentLength.toString();
    }

    return new NextResponse(readableStream, {
      status: 200,
      headers,
    });
  } catch (error: any) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    console.error('Media proxy error for key:', fileKey, error);
    return NextResponse.json({ error: 'Failed to retrieve media file' }, { status: 500 });
  }
}
