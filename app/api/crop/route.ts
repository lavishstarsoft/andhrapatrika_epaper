import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const x = parseFloat(searchParams.get('x') || '0');
    const y = parseFloat(searchParams.get('y') || '0');
    const w = parseFloat(searchParams.get('w') || '100');
    const h = parseFloat(searchParams.get('h') || '100');
    const filename = searchParams.get('filename') || 'cropped-image.png';

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let absoluteUrl = url;
    if (url.startsWith('/')) {
      absoluteUrl = `${request.nextUrl.origin}${url}`;
    }

    // Fetch the original image from R2
    const response = await fetch(absoluteUrl);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: response.status });
    }

    const imageBuffer = await response.arrayBuffer();
    
    // Get image metadata
    const image = sharp(Buffer.from(imageBuffer));
    const metadata = await image.metadata();
    
    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
    }

    // Use floor/ceil bounds to avoid right/bottom edge loss from rounding.
    const left = Math.floor((x / 100) * metadata.width);
    const top = Math.floor((y / 100) * metadata.height);
    const right = Math.ceil(((x + w) / 100) * metadata.width);
    const bottom = Math.ceil(((y + h) / 100) * metadata.height);

    // Ensure crop dimensions are within bounds
    const finalX = Math.max(0, Math.min(left, metadata.width - 1));
    const finalY = Math.max(0, Math.min(top, metadata.height - 1));
    const finalRight = Math.max(finalX + 1, Math.min(right, metadata.width));
    const finalBottom = Math.max(finalY + 1, Math.min(bottom, metadata.height));
    const finalWidth = finalRight - finalX;
    const finalHeight = finalBottom - finalY;

    const isOgSocial = searchParams.get('og') === 'main25';
    const isInline = searchParams.get('inline') === 'true';

    let outputPipeline = image.extract({
      left: finalX,
      top: finalY,
      width: finalWidth,
      height: finalHeight,
    });

    // Social OG: resize + JPEG so WhatsApp/Facebook accept (< ~300KB target).
    if (isOgSocial) {
      outputPipeline = outputPipeline
        .resize({ width: 1200, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true });
    } else {
      outputPipeline = outputPipeline.png({ quality: 100, compressionLevel: 0 });
    }

    const croppedBuffer = await outputPipeline.toBuffer();
    const contentType = isOgSocial ? 'image/jpeg' : 'image/png';
    const contentDisposition = isInline ? 'inline' : `attachment; filename="${filename}"`;

    return new NextResponse(croppedBuffer as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': croppedBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Crop error:', error);
    return NextResponse.json({ error: 'Failed to crop image' }, { status: 500 });
  }
}