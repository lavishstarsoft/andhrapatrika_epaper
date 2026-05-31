import { Metadata } from 'next';
import clientPromise from '@/lib/mongodb';
import EditionReader from '@/components/EditionReader';
import { notFound } from 'next/navigation';

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

async function getEdition(alias: string): Promise<Edition | null> {
  try {
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    const edition = await db.collection('editions').findOne({ alias });

    if (!edition) return null;

    // Convert Mongo object to plain JS object with string IDs
    return JSON.parse(JSON.stringify(edition));
  } catch (error) {
    console.error('Error fetching edition:', error);
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

  const firstPageThumbnail = edition.pages[0]?.previewUrl || edition.pages[0]?.url || '/logo.png';
  const siteUrl = process.env.NEXTAUTH_URL || 'https://andhrapatrikaa.com';

  return {
    title: `${edition.name} - Andhrapatrika Telugu Daily ePaper`,
    description: `Read the Andhrapatrika Telugu Daily ePaper online. Edition: ${edition.name}.`,
    openGraph: {
      title: `${edition.name} | Andhrapatrika ePaper`,
      description: `Read today's edition of Andhrapatrika Telugu Daily.`,
      url: `${siteUrl}/edition/${id}`,
      siteName: 'Andhrapatrika',
      images: [
        {
          url: firstPageThumbnail,
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
      images: [firstPageThumbnail],
    },
  };
}

export default async function EditionDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const edition = await getEdition(id);

  if (!edition) {
    notFound();
  }

  return (
    <EditionReader initialEdition={edition} alias={id} />
  );
}
