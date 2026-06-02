import { Metadata } from 'next';
import ClipPageClient from '@/components/ClipPageClient';
import { headers } from 'next/headers';

const normalizeBaseUrl = (rawBase?: string | null) => {
  let base = (rawBase || process.env.NEXTAUTH_URL || 'https://www.andhrapatrikaa.com').trim();
  if (base.includes('andhrapatrikaa.com') && !base.includes('www.andhrapatrikaa.com')) {
    base = base.replace('://andhrapatrikaa.com', '://www.andhrapatrikaa.com');
  }
  return base.replace(/\/$/, '');
};

const getRequestBaseUrl = async () => {
  const headersList = await headers();
  const host = headersList.get('host') || 'www.andhrapatrikaa.com';
  const protocol = headersList.get('x-forwarded-proto') || 'https';
  return normalizeBaseUrl(`${protocol}://${host}`);
};

export async function generateMetadata({ params, searchParams }: any): Promise<Metadata> {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const { id } = resolvedParams;
  const { url, x, y, w, h, base, title, date, page, cid } = resolvedSearchParams;

  const requestBaseUrl = await getRequestBaseUrl();
  const baseUrl = normalizeBaseUrl(base || requestBaseUrl);
  const decodedUrl = decodeURIComponent(url || '');
  const decodedTitle = decodeURIComponent(title || 'ePaper Clip');
  const displayDate = date || '';

  // Create an absolute URL for the Open Graph image to point directly to the inline crop API
  const cropImageUrl = `${baseUrl}/api/clip-download?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&date=${encodeURIComponent(displayDate)}&page=${page}&inline=true`;

  return {
    title: decodedTitle || 'Andhrapatrika',
    description: `Andhrapatrika clip - ${displayDate} Page ${page || ''}`.trim(),
    openGraph: {
      title: decodedTitle || 'Andhrapatrika',
      description: `Andhrapatrika clip - ${displayDate} Page ${page || ''}`.trim(),
      url: `${baseUrl}/edition/${id}/clip?url=${encodeURIComponent(decodedUrl)}&x=${x}&y=${y}&w=${w}&h=${h}&title=${encodeURIComponent(decodedTitle)}&date=${encodeURIComponent(date || '')}&page=${page}&cid=${cid}`,
      siteName: 'Andhrapatrika',
      images: [
        {
          url: cropImageUrl,
          width: 1200,
          height: 630,
          alt: 'Andhrapatrika Clip',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: decodedTitle || 'Andhrapatrika',
      description: `Andhrapatrika clip - ${displayDate} Page ${page || ''}`.trim(),
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
  const requestBaseUrl = await getRequestBaseUrl();
  const baseUrl = normalizeBaseUrl(base || requestBaseUrl);
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
