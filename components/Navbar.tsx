'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Category {
  slug: string;
  name: string;
}

function NavbarContent() {
  const searchParams = useSearchParams();
  const currentCategory = searchParams.get('category') || 'all';

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.categories) {
          // Filter to show only active categories
          setCategories(
            data.categories
              .filter((c: any) => c.isActive)
              .map((c: any) => ({
                slug: c.slug,
                name: c.name,
              }))
          );
        }
      })
      .catch((err) => console.error('Error fetching categories for navbar:', err));
  }, []);

  return (
    <nav className="bg-[#1721d8] text-white sticky top-0 z-40 shadow-sm border-t border-white/10 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-start md:justify-center h-11 overflow-x-auto no-scrollbar scroll-smooth w-full">
          <div className="flex space-x-4 md:space-x-6 text-[11px] md:text-[13px] font-bold uppercase tracking-wider whitespace-nowrap py-1 px-4 md:px-0">
            <Link
              href="/"
              className={`transition-all py-1.5 px-2.5 rounded-md ${
                currentCategory === 'all'
                  ? 'bg-white/15 text-white'
                  : 'text-white/80 hover:text-white hover:bg-white/5'
              }`}
            >
              HOME
            </Link>
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/?category=${cat.slug}`}
                className={`transition-all py-1.5 px-2.5 rounded-md ${
                  currentCategory === cat.slug
                     ? 'bg-white/15 text-white'
                     : 'text-white/80 hover:text-white hover:bg-white/5'
                }`}
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default function Navbar() {
  return (
    <Suspense fallback={
      <nav className="bg-[#1721d8] text-white sticky top-0 z-40 shadow-sm border-t border-white/10 w-full">
        <div className="max-w-7xl mx-auto px-4 h-11 flex items-center justify-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">HOME</span>
        </div>
      </nav>
    }>
      <NavbarContent />
    </Suspense>
  );
}
