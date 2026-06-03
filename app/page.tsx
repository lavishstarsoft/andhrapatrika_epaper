import 'server-only';
import Link from 'next/link';
import { Calendar as CalendarIcon, Flame } from 'lucide-react';
import Image from 'next/image';
import { unstable_cache } from 'next/cache';
import EditionCalendar from '@/components/EditionCalendar';
import Pagination from '@/components/Pagination';
import clientPromise from '@/lib/mongodb';

export const runtime = 'nodejs';

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
  status: string;
}

interface GlobalSettings {
  siteName?: string;
  adEnabled?: boolean;
  adType?: 'google' | 'custom';
  googleAdCode?: string;
  customAdImage?: string;
  customAdLink?: string;
}

const getHomeData = unstable_cache(
  async (page: number, pageSize: number, category?: string) => {
    try {
      const client = await clientPromise;
      const db = client.db('yellowsingam_epaper');

      const filter: any = {
        $or: [
          { status: 'published' },
          { status: 'scheduled', date: { $lte: new Date() } },
        ],
      };

      if (category && category !== 'all') {
        filter.category = category;
      }

      const [editionsRaw, settingsRaw, totalCount] = await Promise.all([
        db
          .collection('editions')
          .find(filter, {
            projection: {
              name: 1,
              alias: 1,
              date: 1,
              pages: { $slice: 1 },
              status: 1,
              category: 1,
            },
          })
          .sort({ date: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .toArray(),
        db.collection('settings').findOne(
          { type: 'global' },
          {
            projection: {
              siteName: 1,
              adEnabled: 1,
              adType: 1,
              googleAdCode: 1,
              customAdImage: 1,
              customAdLink: 1,
            },
          }
        ),
        db.collection('editions').countDocuments(filter),
      ]);

      const editions: Edition[] = editionsRaw.map((edition: any) => ({
        _id: String(edition._id),
        name: edition.name || '',
        alias: edition.alias || '',
        date:
          edition.date instanceof Date
            ? edition.date.toISOString()
            : String(edition.date || ''),
        pages: Array.isArray(edition.pages) ? edition.pages : [],
        status: edition.status || '',
        category: edition.category || 'main',
      }));

      return {
        editions,
        settings: (settingsRaw || {}) as GlobalSettings,
        totalCount: totalCount || 0,
      };
    } catch (error) {
      console.error('Home data fetch failed:', error);
      return {
        editions: [] as Edition[],
        settings: {} as GlobalSettings,
        totalCount: 0,
      };
    }
  },
  ['home-data'],
  { revalidate: 120, tags: ['home-data'] }
);

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; category?: string }>;
}) {
  const pageSize = 12;
  const resolvedSearchParams = (await searchParams) || {};
  const currentPage = Math.max(1, Number(resolvedSearchParams.page || 1));
  const currentCategory = resolvedSearchParams.category || 'all';

  const client = await clientPromise;
  const db = client.db('yellowsingam_epaper');

  // Fetch settings directly
  const settingsRaw = await db.collection('settings').findOne({ type: 'global' });
  const settings = (settingsRaw || {}) as GlobalSettings;

  // Fetch active categories from DB
  const categoriesRaw = await db.collection('categories').find({ isActive: true }).sort({ createdAt: 1 }).toArray();
  let categories = categoriesRaw.map(cat => ({
    _id: String(cat._id),
    name: cat.name,
    slug: cat.slug,
  }));

  if (categories.length === 0) {
    categories = [
      { _id: '1', name: 'Main Edition', slug: 'main' },
      { _id: '2', name: 'City Edition', slug: 'city' },
      { _id: '3', name: 'Sports Edition', slug: 'sports' },
      { _id: '4', name: 'Business Edition', slug: 'business' },
    ];
  }

  let editions: Edition[] = [];
  let totalCount = 0;
  let categoriesWithEditions: { _id: string; name: string; slug: string; editions: Edition[] }[] = [];

  if (currentCategory === 'all') {
    categoriesWithEditions = await Promise.all(
      categories.map(async (cat) => {
        const categoryFilter: any = {
          $or: [
            { status: 'published' },
            { status: 'scheduled', date: { $lte: new Date() } },
          ],
        };

        if (cat.slug === 'main') {
          categoryFilter.$and = [
            {
              $or: [
                { category: 'main' },
                { category: { $exists: false } },
                { category: null },
                { category: '' }
              ]
            }
          ];
        } else {
          categoryFilter.category = cat.slug;
        }

        const editionsRaw = await db
          .collection('editions')
          .find(categoryFilter, {
            projection: {
              name: 1,
              alias: 1,
              date: 1,
              pages: { $slice: 1 },
              status: 1,
              category: 1,
            },
          })
          .sort({ date: -1 })
          .limit(12) // Limit to 12 editions per category in Home grid list
          .toArray();

        const catEditions: Edition[] = editionsRaw.map((edition: any) => ({
          _id: String(edition._id),
          name: edition.name || '',
          alias: edition.alias || '',
          date:
            edition.date instanceof Date
              ? edition.date.toISOString()
              : String(edition.date || ''),
          pages: Array.isArray(edition.pages) ? edition.pages : [],
          status: edition.status || '',
          category: edition.category || 'main',
        }));

        return {
          _id: cat._id,
          name: cat.name,
          slug: cat.slug,
          editions: catEditions,
        };
      })
    );

    // Only display categories that have editions
    categoriesWithEditions = categoriesWithEditions.filter(group => group.editions.length > 0);
  } else {
    // If specific category selected, fetch dynamic paginated list
    const result = await getHomeData(
      currentPage,
      pageSize,
      currentCategory
    );
    editions = result.editions;
    totalCount = result.totalCount;
  }

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  const isNew = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 2;
  };

  const getProxyUrl = (rawUrl: string) => {
    if (!rawUrl) return '';
    return rawUrl;
  };

  const renderAd = () => {
    if (!settings?.adEnabled) return null;
    return (
      <div className="w-full flex justify-center group relative bg-white p-1 pb-1.5 border border-gray-100 shadow-sm mt-2 lg:mt-0">
        <div className="absolute -top-2 -right-2 bg-white/80 backdrop-blur-sm shadow-sm text-gray-400 text-[9px] uppercase px-1.5 py-0.5 rounded border border-gray-100 z-10 select-none">
          Sponsored
        </div>
        
        {settings.adType === 'google' && settings.googleAdCode ? (
          <div 
            className="w-full h-auto overflow-hidden text-center min-h-[100px] flex items-center justify-center bg-gray-50" 
            dangerouslySetInnerHTML={{ __html: settings.googleAdCode }} 
          />
        ) : settings.adType === 'custom' && settings.customAdImage ? (
          <Link href={settings.customAdLink || '#'} target="_blank" rel="noopener noreferrer" className="block w-full max-w-[350px] mx-auto">
            <Image 
              src={settings.customAdImage} 
              alt="Advertisement" 
              width={300} 
              height={250} 
              className="w-full h-auto object-cover rounded-sm hover:opacity-95 transition-opacity mx-auto" 
            />
          </Link>
        ) : null}
      </div>
    );
  };

  return (
    <div className="pb-4" suppressHydrationWarning>
      {/* Mobile Section Header - App Style */}
      <div className="md:hidden flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-[#1721d8] rounded-full"></div>
          <h2 className="text-lg font-bold text-gray-900">Latest Editions</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {currentCategory === 'all'
              ? `${categoriesWithEditions.reduce((sum, g) => sum + g.editions.length, 0)} issues`
              : `${editions.length} issues`
            }
          </span>
        </div>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content - Grid */}
        <div className="flex-1">
          {currentCategory === 'all' ? (
            /* Home page: show categories one by one */
            categoriesWithEditions.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">No editions available yet</p>
                <p className="text-gray-400 text-sm mt-2">Check back soon!</p>
              </div>
            ) : (
              categoriesWithEditions.map((group) => (
                <div key={group.slug} className="mb-10">
                  {/* Category Title with divider line */}
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-sm md:text-base font-bold text-[#1721d8] uppercase tracking-wider">
                      {group.name}
                    </h2>
                    <div className="flex-1 h-[2px] bg-gradient-to-r from-gray-200 to-transparent"></div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                    {group.editions.map((edition, index) => (
                      <Link 
                        href={`/edition/${edition.alias}`} 
                        key={edition._id} 
                        className="group block bg-white rounded-xl md:rounded-sm overflow-hidden elevation-1 md:shadow-sm active:scale-[0.98] transition-all duration-150 touch-ripple relative"
                      >

                        
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-100" suppressHydrationWarning>
                          {edition.pages && edition.pages[0]?.url ? (
                            <Image
                              src={getProxyUrl(edition.pages[0].previewUrl || edition.pages[0].url)}
                              alt={edition.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                              priority={index < 2}
                              referrerPolicy="no-referrer"
                              loading={index < 2 ? 'eager' : 'lazy'}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <CalendarIcon size={32} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Mobile: Rounded bottom with date */}
                        <div className="md:hidden p-3 bg-white">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <CalendarIcon size={14} className="text-[#1721d8]" />
                            <span className="text-sm font-medium">{formatDate(edition.date)}</span>
                          </div>
                        </div>
                        
                        {/* Desktop: Overlay style */}
                        <div className="hidden md:flex absolute bottom-0 left-0 right-0 bg-black/70 text-white text-center py-1.5 text-sm items-center justify-center gap-2 backdrop-blur-sm">
                          <CalendarIcon size={14} />
                          {formatDate(edition.date)}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ))
            )
          ) : (
            /* Specific Category filtered view with pagination */
            <div>
              {/* Category Title with divider line */}
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-sm md:text-base font-bold text-[#1721d8] uppercase tracking-wider">
                  {categories.find(c => c.slug === currentCategory)?.name || currentCategory}
                </h2>
                <div className="flex-1 h-[2px] bg-gradient-to-r from-gray-200 to-transparent"></div>
              </div>

              {editions.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <CalendarIcon size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">No editions available in this category yet</p>
                  <p className="text-gray-400 text-sm mt-1">Check back soon!</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                    {editions.map((edition, index) => (
                      <Link 
                        href={`/edition/${edition.alias}`} 
                        key={edition._id} 
                        className="group block bg-white rounded-xl md:rounded-sm overflow-hidden elevation-1 md:shadow-sm active:scale-[0.98] transition-all duration-150 touch-ripple relative"
                      >

                        
                        <div className="relative aspect-[2/3] w-full overflow-hidden bg-gray-100" suppressHydrationWarning>
                          {edition.pages && edition.pages[0]?.url ? (
                            <Image
                              src={getProxyUrl(edition.pages[0].previewUrl || edition.pages[0].url)}
                              alt={edition.name}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                              priority={index < 2}
                              referrerPolicy="no-referrer"
                              loading={index < 2 ? 'eager' : 'lazy'}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-200">
                              <CalendarIcon size={32} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        
                        {/* Mobile: Rounded bottom with date */}
                        <div className="md:hidden p-3 bg-white">
                          <div className="flex items-center gap-1.5 text-gray-700">
                            <CalendarIcon size={14} className="text-[#1721d8]" />
                            <span className="text-sm font-medium">{formatDate(edition.date)}</span>
                          </div>
                        </div>
                        
                        {/* Desktop: Overlay style */}
                        <div className="hidden md:flex absolute bottom-0 left-0 right-0 bg-black/70 text-white text-center py-1.5 text-sm items-center justify-center gap-2 backdrop-blur-sm">
                          <CalendarIcon size={14} />
                          {formatDate(edition.date)}
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Pagination - Hidden on mobile */}
                  <div className="hidden md:block mt-6">
                    <Pagination currentPage={safePage} totalPages={totalPages} />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Mobile Ad Render (Below Editions) */}
          <div className="lg:hidden mt-8 mb-4 flex justify-center w-full">
            {renderAd()}
          </div>
        </div>

        {/* Sidebar - Calendar & Ads (Hidden on Mobile) */}
        <div className="hidden lg:flex w-[240px] shrink-0 lg:sticky lg:top-[140px] self-start flex-col gap-4">
          <EditionCalendar />

          {/* Right Sidebar Ad Space */}
          {renderAd()}
        </div>
      </div>

    </div>
  );
}
