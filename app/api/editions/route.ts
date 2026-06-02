import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import clientPromise from '@/lib/mongodb';
import { uploadToR2, resolveMediaUrl } from '@/lib/r2';

import path from 'path';
import sharp from 'sharp';

let pdfToImages: any = null;
async function getPdfToImages() {
  if (!pdfToImages) {
    try {
      const mod = await import('pdf-to-img');
      pdfToImages = mod.pdf;
      console.log('pdf-to-img loaded successfully via dynamic import');
    } catch (loadErr) {
      console.error('Failed to load pdf-to-img dynamically:', loadErr);
    }
  }
  return pdfToImages;
}

function isPdfUpload(file: File, buffer: Buffer): boolean {
  if (file.type === 'application/pdf') return true;
  const name = (file.name || '').toLowerCase();
  if (name.endsWith('.pdf')) return true;
  return buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === '%PDF';
}

async function uploadEditionImageBuffers(
  rawImageBuffer: Buffer,
  folderName: string,
  pageNum: number
) {
  const pageBaseName = `page_${pageNum}`;
  const filename = `${pageBaseName}.jpg`;
  const previewFilename = `${pageBaseName}_thumb.jpg`;
  const key = `editions/${folderName}/${filename}`;
  const previewKey = `editions/${folderName}/${previewFilename}`;

  // Full image: JPEG quality 100 — zero compression, original quality preserved
  const jpgBuffer = await sharp(rawImageBuffer)
    .rotate()
    .jpeg({ quality: 100, chromaSubsampling: '4:4:4' })
    .toBuffer();

  // Thumbnail: smaller size for fast preview loading
  const previewBuffer = await sharp(rawImageBuffer)
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

  return {
    filename,
    url,
    pageNum,
    previewUrl,
    previewFilename,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    
    let query: any = {};
    
    // Add date range filter if provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate + 'T00:00:00.000Z'),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    }
    
    const showAll = searchParams.get('all') === 'true';
    
    // Show published editions AND scheduled editions whose date has passed
    if (!showAll) {
      query.$or = [
        { status: 'published' },
        { status: 'scheduled', date: { $lte: new Date() } }
      ];
    }
    
    const editions = await db.collection('editions')
      .find(query)
      .sort({ date: -1 })
      .limit(limit)
      .toArray();
    
    const resolvedEditions = editions.map(edition => {
      if (edition.pages && Array.isArray(edition.pages)) {
        edition.pages = edition.pages.map((page: any) => ({
          ...page,
          url: resolveMediaUrl(page.url),
          previewUrl: resolveMediaUrl(page.previewUrl),
        }));
      }
      return edition;
    });

    const headers: Record<string, string> = showAll
      ? { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      : { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' };

    return NextResponse.json(
      { editions: resolvedEditions },
      { headers }
    );
  } catch (error) {
    console.error('Error fetching editions:', error);
    return NextResponse.json({ error: 'Failed to fetch editions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const payload = isJson ? await request.json() : null;
    const formData = isJson ? null : await request.formData();

    const name = isJson ? payload?.name : (formData?.get('name') as string);
    const alias = isJson ? payload?.alias : (formData?.get('alias') as string);
    const date = isJson ? payload?.date : (formData?.get('date') as string);
    const metaTitle = isJson ? payload?.metaTitle : (formData?.get('metaTitle') as string);
    const metaDescription = isJson ? payload?.metaDescription : (formData?.get('metaDescription') as string);
    const category = isJson ? payload?.category : (formData?.get('category') as string);
    const status = isJson ? payload?.status : (formData?.get('status') as string);
    const uploadType = isJson ? payload?.uploadType : (formData?.get('uploadType') as string);

    // Validate required fields
    if (!name || !date || !status || !uploadType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // JSON mode: pages are already uploaded separately.
    if (isJson) {
      const client = await clientPromise;
      const db = client.db('yellowsingam_epaper');
      const folderName = alias || date;
      const pages = Array.isArray(payload?.pages) ? payload.pages : [];

      const edition = {
        name,
        alias: folderName,
        date: new Date(date),
        metaTitle,
        metaDescription,
        category,
        status: status === 'live' ? 'published' : status === 'scheduled' ? 'scheduled' : 'draft',
        uploadType,
        pages,
        pageCount: pages.length,
        views: 0,
        downloads: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection('editions').insertOne(edition);
      revalidateTag('home-data');
      revalidatePath('/');
      return NextResponse.json({
        success: true,
        editionId: result.insertedId,
        message: 'Edition created successfully',
        pages: pages.length,
      });
    }

    // Multipart mode: process uploaded files and upload to Cloudflare R2
    const files: {
      filename: string;
      url: string;
      pageNum: number;
      previewUrl?: string;
      previewFilename?: string;
    }[] = [];
    let fileIndex = 0;
    let nextPageNum = 1;

    const folderName = alias || date;

    while (formData?.has(`file_${fileIndex}`)) {
      const file = formData.get(`file_${fileIndex}`) as File;
      if (file) {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        if (file.type.startsWith('image/')) {
          const pageMeta = await uploadEditionImageBuffers(buffer, folderName, nextPageNum);
          files.push(pageMeta);
          nextPageNum += 1;
        } else if (isPdfUpload(file, buffer)) {
          try {
            const pdfToImagesFn = await getPdfToImages();
            if (!pdfToImagesFn) {
              return NextResponse.json(
                {
                  error: 'PDF processing not available. Try uploading as images instead.',
                },
                { status: 503 }
              );
            }
            console.log('Starting PDF to images conversion for:', file.name, 'size:', buffer.length);
            const doc = await pdfToImagesFn(buffer, { scale: 5.0 });
            let pageCount = 0;
            for await (const pagePng of doc) {
              pageCount++;
              console.log('Converting PDF page:', pageCount);
              const pageMeta = await uploadEditionImageBuffers(
                Buffer.from(pagePng),
                folderName,
                nextPageNum
              );
              files.push(pageMeta);
              nextPageNum += 1;
            }
            console.log('PDF conversion completed:', pageCount, 'pages');
          } catch (pdfErr) {
            console.error('PDF to image conversion failed:', pdfErr);
            const errorMsg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
            console.error('Error details:', errorMsg, 'Stack:', pdfErr instanceof Error ? pdfErr.stack : '');
            return NextResponse.json(
              {
                error:
                  'Failed to convert PDF to images. ' + errorMsg + ' Try uploading as images instead.',
              },
              { status: 400 }
            );
          }
        } else {
          // Non-image fallback (kept for compatibility with existing flows).
          const ext = path.extname(file.name) || '.bin';
          const filename = `page_${nextPageNum}${ext}`;
          const key = `editions/${folderName}/${filename}`;
          const contentType = file.type || 'application/octet-stream';
          const url = await uploadToR2(buffer, key, contentType);

          files.push({
            filename,
            url,
            pageNum: nextPageNum,
          });
          nextPageNum += 1;
        }
      }
      fileIndex++;
    }

    // Save to MongoDB
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    
    const edition = {
      name,
      alias: folderName,
      date: new Date(date),
      metaTitle,
      metaDescription,
      category,
      status: status === 'live' ? 'published' : status === 'scheduled' ? 'scheduled' : 'draft',
      uploadType,
      pages: files,
      pageCount: files.length,
      views: 0,
      downloads: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('editions').insertOne(edition);
    revalidateTag('home-data');
    revalidatePath('/');

    return NextResponse.json({ 
      success: true, 
      editionId: result.insertedId,
      message: 'Edition created successfully',
      pages: files.length
    });
  } catch (error) {
    console.error('Error creating edition:', error);
    return NextResponse.json({ error: 'Failed to create edition' }, { status: 500 });
  }
}
