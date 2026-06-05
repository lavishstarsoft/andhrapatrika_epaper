import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { GlobalFonts, createCanvas } from '@napi-rs/canvas';

// Pre-register fonts for consistent rendering across environments
const fontsDir = path.join(process.cwd(), 'public', 'fonts');
try {
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Roboto-Regular.ttf'), 'Roboto');
  GlobalFonts.registerFromPath(path.join(fontsDir, 'Roboto-Bold.ttf'), 'RobotoBold');
} catch (e) {
  console.warn('Failed to register fonts from path, falling back to system fonts:', e);
}

export const runtime = 'nodejs';

const sanitizeAscii = (value: string) =>
  value
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeEnglishDate = (rawDate: string) => {
  // Try hard to get a real date object.
  let d = new Date(rawDate);
  
  // If standard parsing failed, try to extract numbers (Day, Month, Year)
  if (Number.isNaN(d.getTime())) {
    const numbers = rawDate.match(/\d+/g);
    if (numbers && numbers.length >= 3) {
      // Very basic attempt: assume first 3 numbers are D, M, Y
      // We'll try to build a YYYY-MM-DD string
      const day = numbers[0].padStart(2, '0');
      const month = numbers[1].padStart(2, '0');
      const year = numbers[2].length === 2 ? `20${numbers[2]}` : numbers[2];
      const testDate = new Date(`${year}-${month}-${day}`);
      if (!Number.isNaN(testDate.getTime())) {
        d = testDate;
      }
    }
  }

  if (!Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }

  // Final fallback: Strip everything except basic ASCII
  return rawDate.replace(/[^\x20-\x7E]/g, '').trim();
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');
    const x = parseFloat(searchParams.get('x') || '0');
    const y = parseFloat(searchParams.get('y') || '0');
    const w = parseFloat(searchParams.get('w') || '100');
    const h = parseFloat(searchParams.get('h') || '100');
    const filename = searchParams.get('filename') || 'yellow-singam-clip.png';
    const date = searchParams.get('date') || '';
    const page = searchParams.get('page') || '';

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    let absoluteUrl = url;
    if (url.startsWith('/')) {
      absoluteUrl = `${request.nextUrl.origin}${url}`;
    }

    const imageRes = await fetch(absoluteUrl);
    if (!imageRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: imageRes.status });
    }

    const imageBuffer = await imageRes.arrayBuffer();
    const image = sharp(Buffer.from(imageBuffer));
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
    }

    // Use floor/ceil bounds to preserve exact right/bottom edges.
    const left = Math.floor((x / 100) * metadata.width);
    const top = Math.floor((y / 100) * metadata.height);
    const right = Math.ceil(((x + w) / 100) * metadata.width);
    const bottom = Math.ceil(((y + h) / 100) * metadata.height);

    const finalX = Math.max(0, Math.min(left, metadata.width - 1));
    const finalY = Math.max(0, Math.min(top, metadata.height - 1));
    const finalRight = Math.max(finalX + 1, Math.min(right, metadata.width));
    const finalBottom = Math.max(finalY + 1, Math.min(bottom, metadata.height));
    const finalWidth = finalRight - finalX;
    const finalHeight = finalBottom - finalY;

    const croppedBuffer = await image
      .extract({
        left: finalX,
        top: finalY,
        width: finalWidth,
        height: finalHeight,
      })
      .png({ quality: 100, compressionLevel: 0 })
      .toBuffer();

    const logoPath = path.join(process.cwd(), 'public', 'ys-logo.jpeg');
    const logoBuffer = await fs.readFile(logoPath);

    const croppedMeta = await sharp(croppedBuffer).metadata();
    const cropW = croppedMeta.width || finalWidth;
    const cropH = croppedMeta.height || finalHeight;

    const logoTargetWidth = Math.max(350, Math.min(1200, Math.round(cropW * 0.50)));
    const resizedLogoBuffer = await sharp(logoBuffer)
      .resize({ width: logoTargetWidth })
      .flatten({ background: '#ffffff' })
      .png({ quality: 100, compressionLevel: 0 })
      .toBuffer();

    const resizedLogoMeta = await sharp(resizedLogoBuffer).metadata();
    const logoWidth = resizedLogoMeta.width || logoTargetWidth;
    const logoHeight = resizedLogoMeta.height || Math.round(logoTargetWidth * 0.4);

    const escapeXml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const normalizedDate = normalizeEnglishDate(date || '');
    const pageDigits = (page || '').replace(/[^\d]/g, '').trim();
    
    // Construct line1 and force ONLY English/ASCII characters
    let line1 = [normalizedDate, pageDigits ? `Page ${pageDigits}` : '']
      .filter(Boolean)
      .join(' | ');
    line1 = line1.replace(/[^\x20-\x7E]/g, '');

    const line2 = 'https://andhrapatrikaa.com/';
    const hasLine1 = line1.length > 0;
    
    const line1Size = Math.max(14, Math.min(48, Math.round(cropW * 0.024)));
    const line2Size = Math.max(12, Math.min(36, Math.round(cropW * 0.018)));
    const lineGap = Math.max(2, Math.min(8, Math.round(cropW * 0.003)));
    const textPaddingTop = 0; // No gap below the logo
    const textPaddingBottom = Math.max(4, Math.min(12, Math.round(cropW * 0.005)));
    
    const textBlockHeight =
      textPaddingTop + textPaddingBottom + (hasLine1 ? line1Size : 0) + lineGap + line2Size;

    // Use Canvas for reliable text rendering with custom fonts
    const canvas = createCanvas(cropW, textBlockHeight);
    const ctx = canvas.getContext('2d');
    
    // Transparent background for the text block (will be composited over white)
    ctx.clearRect(0, 0, cropW, textBlockHeight);
    
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (hasLine1) {
      ctx.font = `bold ${line1Size}px RobotoBold`;
      ctx.fillStyle = '#1a1a1a'; // Darker for better contrast
      ctx.fillText(line1, cropW / 2, textPaddingTop + line1Size / 2);
    }
    
    ctx.font = `${line2Size}px Roboto`;
    ctx.fillStyle = '#555555'; // Slightly darker grey
    ctx.fillText(
      line2, 
      cropW / 2, 
      (hasLine1 ? textPaddingTop + line1Size + lineGap : textPaddingTop) + line2Size / 2
    );
    
    const textBuffer = canvas.toBuffer('image/png');

    const padding = Math.max(6, Math.min(24, Math.round(cropW * 0.01))); // Minimal padding around logo (top/bottom space in header)
    const textGap = 0;  // Minimal gap between logo and text block
    const headerHeight = logoHeight + padding * 2 + textGap + textBlockHeight;

    // Add space below the header before the cropped newspaper clipping begins
    const headerBottomGap = Math.max(8, Math.min(24, Math.round(cropW * 0.015)));

    const finalCanvas = sharp({
      create: {
        width: cropW,
        height: headerHeight + headerBottomGap + cropH,
        channels: 4,
        background: '#ffffff',
      },
    });

    let composed = await finalCanvas
      .composite([
        {
          input: resizedLogoBuffer,
          top: padding,
          left: Math.max(0, Math.round((cropW - logoWidth) / 2)),
        },
        {
          input: textBuffer,
          top: padding + logoHeight + textGap,
          left: 0,
        },
        {
          input: croppedBuffer,
          top: headerHeight + headerBottomGap,
          left: 0,
        },
      ])
      .png({ compressionLevel: 6 })
      .toBuffer();

    const isInline = searchParams.get('inline') === 'true';
    if (isInline) {
      // For inline preview (like WhatsApp OG image or web display), resize to fit inside 1200x1200px
      // and encode as highly compressed JPEG to keep file size small (< 300KB)
      let sharpComposed = sharp(composed);
      const composedMeta = await sharpComposed.metadata();
      const compW = composedMeta.width || cropW;
      const compH = composedMeta.height || (headerHeight + headerBottomGap + cropH);

      if (compW > 1200 || compH > 1200) {
        sharpComposed = sharpComposed.resize({
          width: compW > compH ? 1200 : undefined,
          height: compH >= compW ? 1200 : undefined,
          fit: 'inside',
        });
      }
      composed = await sharpComposed.jpeg({ quality: 90, mozjpeg: true }).toBuffer();
    }

    const contentDisposition = isInline ? 'inline' : `attachment; filename="${filename}"`;

    return new NextResponse(composed as any, {
      headers: {
        'Content-Type': isInline ? 'image/jpeg' : 'image/png',
        'Content-Disposition': contentDisposition,
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': composed.length.toString(),
      },
    });
  } catch (error) {
    console.error('Clip download error:', error);
    return NextResponse.json({ error: 'Failed to generate clip' }, { status: 500 });
  }
}
