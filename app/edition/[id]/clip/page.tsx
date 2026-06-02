import { Metadata } from 'next';
import ClipPageClient from '@/components/ClipPageClient';

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { id } = resolvedParams;
  const { url, x, y, w, h, base, title, date, page, cid } = resolvedSearchParams;

  const baseUrl = base || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const decodedUrl = decodeURIComponent(url || '');
  const decodedTitle = decodeURIComponent(title || 'ePaper Clip');
  const displayDate = date || '';

  // Create an absolute URL for the Open Graph image to point directly to the inline crop API
  const cropImageUrl = `${baseUrl}/api/clip-download?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&date=${encodeURIComponent(displayDate)}&page=${page}&inline=true`;

  return {
    title: 'Andhrapatrika',
    description: '',
    openGraph: {
      title: 'Andhrapatrika',
      description: '',
      images: [
        {
          url: cropImageUrl,
          width: 800,
          height: 600,
          alt: 'Andhrapatrika Clip',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Andhrapatrika',
      description: '',
      images: [cropImageUrl],
    },
  };
}

export default async function ClipPage({ params, searchParams }: any) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { id } = resolvedParams;
  const { url, x, y, w, h, title, date, page, cid, base } = resolvedSearchParams;
  const decodedUrl = decodeURIComponent(url || '');
  const decodedTitle = decodeURIComponent(title || 'ePaper Clip');

  // Notice we must use a client-side relative or absolute api path for the page rendering
  const cropImageUrl = `/api/clip-download?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&date=${encodeURIComponent(date || '')}&page=${page}&inline=true`;
  const baseUrl = base || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const shareUrl = `${baseUrl}/edition/${id}/clip?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&title=${encodeURIComponent(decodedTitle)}&base=${encodeURIComponent(baseUrl)}&date=${encodeURIComponent(date || '')}&page=${page}&cid=${cid}`;
  const downloadUrl = `/api/clip-download?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&date=${encodeURIComponent(date || '')}&page=${page}&filename=${encodeURIComponent(`yellow-singam-clip-${cid || 'clip'}.png`)}`;
  const readUrl = `/edition/${id}?page=${page}&hx=${x}&hy=${y}&hw=${w}&hh=${h}`;

  return (
    <ClipPageClient
      cropImageUrl={cropImageUrl}
      shareUrl={shareUrl}
      downloadUrl={downloadUrl}
      readUrl={readUrl}
      date={date || ''}
      page={page || ''}
      cid={cid || ''}
    />
  );
}
