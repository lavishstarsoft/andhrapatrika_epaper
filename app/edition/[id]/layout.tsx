import { Metadata, ResolvingMetadata } from 'next';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { headers } from 'next/headers';

export async function generateMetadata(
  { params }: { params: any },
  parent: ResolvingMetadata
): Promise<Metadata> {
  // Await params safely for Next.js 15+
  const resolvedParams = await params;
  const id = resolvedParams.id;

  try {
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');

    // Check if id is an valid ObjectId or treating it as an alias string
    const query = ObjectId.isValid(id) && id.length === 24
      ? { _id: new ObjectId(id) }
      : { alias: id };

    const edition = await db.collection('editions').findOne(query);

    if (!edition) {
      return {};
    }

    // Get base URL dynamically from headers to ensure correct domains on sharing
    const headersList = await headers();
    let host = headersList.get('host') || 'andhrapatrika-epaper.vercel.app';
    if (host === 'andhrapatrikaa.com') {
      host = 'www.andhrapatrikaa.com';
    }
    const protocol = headersList.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    const rawImageVersion = edition.updatedAt || edition.createdAt || edition.date;
    const imageVersion = rawImageVersion ? new Date(rawImageVersion).getTime() : NaN;
    const appendVersionParam = (url: string) => {
      if (!Number.isFinite(imageVersion) || url.includes('v=')) return url;
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}v=${imageVersion}`;
    };

    // OG image: first page URL from DB (e.g. Cloudflare R2 public URL). Must be https for WhatsApp/Facebook.
    const pageImage = edition.pages?.[0]?.url || '/logo.png';
    const versionedPageImage = appendVersionParam(pageImage);
    const absoluteImageUrl = versionedPageImage.startsWith('http')
      ? versionedPageImage
      : `${baseUrl.replace(/\/$/, '')}${versionedPageImage}`;
    const editionSlug = typeof edition.alias === 'string' ? edition.alias : id;
    const canonicalUrl = `${baseUrl.replace(/\/$/, '')}/edition/${editionSlug}`;

    return {
      title: `${edition.name} - Andhrapatrika ePaper`,
      description: edition.metaDescription || `Read ${edition.name} online from Andhrapatrika Daily ePaper.`,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: edition.metaTitle || `${edition.name} - Andhrapatrika`,
        description: edition.metaDescription || `Read ${edition.name} online from Andhrapatrika Daily ePaper.`,
        url: canonicalUrl,
        siteName: 'Andhrapatrika',
        locale: 'te_IN',
        images: [
          {
            url: absoluteImageUrl,
            width: 800,
            height: 1200,
            alt: `${edition.name} Front Page`,
          },
        ],
        type: 'article',
      },
      twitter: {
        card: 'summary_large_image',
        title: edition.metaTitle || `${edition.name} - Andhrapatrika`,
        description: edition.metaDescription || `Read ${edition.name} online from Andhrapatrika Daily ePaper.`,
        images: [absoluteImageUrl],
      },
    };
  } catch (error) {
    console.error('Metadata fetch error:', error);
    return {};
  }
}

export default function EditionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>;
}
