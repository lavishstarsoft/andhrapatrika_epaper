import { NextRequest, NextResponse } from 'next/server';
import { uploadToR2 } from '@/lib/r2';
import path from 'path';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const kind = formData.get('kind') as string | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Edition page mode: upload full + thumbnail jpeg, return both URLs.
    if (kind === 'edition') {
      const folderName = (formData.get('folderName') as string) || 'untitled';
      const pageNumRaw = (formData.get('pageNum') as string) || '1';
      const pageNum = Math.max(1, Number.parseInt(pageNumRaw, 10) || 1);

      const pageBaseName = `page_${pageNum}`;
      const filename = `${pageBaseName}.jpg`;
      const previewFilename = `${pageBaseName}_thumb.jpg`;
      const key = `editions/${folderName}/${filename}`;
      const previewKey = `editions/${folderName}/${previewFilename}`;

      // Full image: JPEG quality 100 — zero compression, original quality preserved
      const jpgBuffer = await sharp(buffer)
        .rotate()
        .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
        .toBuffer();

      // Thumbnail: smaller size for fast preview loading
      const previewBuffer = await sharp(buffer)
        .rotate()
        .resize({
          width: 420,
          height: 630,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 72 })
        .toBuffer();

      const [url, previewUrl] = await Promise.all([
        uploadToR2(jpgBuffer, key, 'image/jpeg'),
        uploadToR2(previewBuffer, previewKey, 'image/jpeg'),
      ]);

      return NextResponse.json({
        success: true,
        page: {
          filename,
          url,
          previewFilename,
          previewUrl,
          pageNum,
        },
      });
    }

    // Default mode (ad image upload)
    const ext = path.extname(file.name) || '.jpg';
    const filename = `ad_${Date.now()}${ext}`;
    const key = `ads/${filename}`;
    const contentType = file.type || 'image/jpeg';
    const url = await uploadToR2(buffer, key, contentType);
    return NextResponse.json({ success: true, url });
  } catch (error) {
    console.error('Error uploading ad image:', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
