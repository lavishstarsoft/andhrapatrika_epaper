import { Metadata } from 'next';
import clientPromise from '@/lib/mongodb';
import EditionReader from '@/components/EditionReader';
import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import { headers } from 'next/headers';

interface EditionPage {
  filename: string;
  url: string;
  pageNum: number;
  previewUrl?: string;
}

interface Edition {
  _id: string;
  name: string;
  alias: string;
  date: string;
  pages: EditionPage[];
  pageCount: number;
}

async function getEdition(id: string): Promise<Edition | null> {
  try {
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    
    // Check if id is a valid ObjectId or treating it as alias string
    const query = ObjectId.isValid(id) && id.length === 24
      ? { _id: new ObjectId(id) }
      : { alias: id };

    const edition = await db.collection('editions').findOne(query);

    if (!edition) return null;

    // Convert Mongo object to plain JS object with string IDs
    return JSON.parse(JSON.stringify(edition));
  } catch (error) {
    console.error('Error fetching edition:', error);
    return null;
  }
}

async function getSettings() {
  try {
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    const settings = await db.collection('settings').findOne({ type: 'global' });
    return settings;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const edition = await getEdition(id);

  if (!edition) {
    return {
      title: 'Edition Not Found | Andhrapatrika',
    };
  }

  // Get base URL dynamically from headers to ensure correct domains on sharing
  const headersList = await headers();
  const host = headersList.get('host') || 'andhrapatrika-epaper.vercel.app';
  const protocol = headersList.get('x-forwarded-proto') || 'https';
  const baseUrl = `${protocol}://${host}`;

  const firstPageThumbnail = edition.pages[0]?.previewUrl || edition.pages[0]?.url || '/logo.png';
  const absoluteImageUrl = firstPageThumbnail.startsWith('http')
    ? firstPageThumbnail
    : `${baseUrl.replace(/\/$/, '')}${firstPageThumbnail}`;

  const editionSlug = edition.alias || id;
  const canonicalUrl = `${baseUrl.replace(/\/$/, '')}/edition/${editionSlug}`;

  return {
    title: `${edition.name} - Andhrapatrika Telugu Daily ePaper`,
    description: `Read the Andhrapatrika Telugu Daily ePaper online. Edition: ${edition.name}.`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${edition.name} | Andhrapatrika ePaper`,
      description: `Read today's edition of Andhrapatrika Telugu Daily.`,
      url: canonicalUrl,
      siteName: 'Andhrapatrika',
      images: [
        {
          url: absoluteImageUrl,
          width: 800,
          height: 1200,
          alt: edition.name,
        },
      ],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${edition.name} | Andhrapatrika ePaper`,
      description: `Read today's edition of Andhrapatrika Telugu Daily.`,
      images: [absoluteImageUrl],
    },
  };
}

export default async function EditionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [edition, settings] = await Promise.all([
    getEdition(id),
    getSettings()
  ]);

  if (!edition) {
    notFound();
  }

  const pageFlipSoundEnabled = settings?.pageFlipSoundEnabled ?? true;

  return (
    <EditionReader initialEdition={edition} alias={id} pageFlipSoundEnabled={pageFlipSoundEnabled} />
  );
}
