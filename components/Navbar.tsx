'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
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
  const [visibleCategories, setVisibleCategories] = useState<Category[]>([]);
  const [overflowCategories, setOverflowCategories] = useState<Category[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const navContainerRef = useRef<HTMLDivElement | null>(null);
  const measureRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setVisibleCategories(categories);
      setOverflowCategories([]);
      return;
    }

    const measure = () => {
      if (!navContainerRef.current || !measureRef.current) {
        return;
      }

      const containerWidth = navContainerRef.current.clientWidth;
      if (!containerWidth) {
        return;
      }

      const getOuterWidth = (el: HTMLElement) => {
        const style = window.getComputedStyle(el);
        return (
          el.getBoundingClientRect().width +
          parseFloat(style.marginLeft || '0') +
          parseFloat(style.marginRight || '0')
        );
      };

      const homeEl = measureRef.current.querySelector('[data-role="home"]') as HTMLElement | null;
      const moreEl = measureRef.current.querySelector('[data-role="more"]') as HTMLElement | null;
      const categoryEls = Array.from(
        measureRef.current.querySelectorAll('[data-role="category"]')
      ) as HTMLElement[];

      if (!homeEl || !moreEl || categoryEls.length !== categories.length) {
        setVisibleCategories(categories);
        setOverflowCategories([]);
        return;
      }

      const homeWidth = getOuterWidth(homeEl);
      const moreWidth = getOuterWidth(moreEl);
      const categoryWidths = categoryEls.map(getOuterWidth);

      const totalWidth = homeWidth + categoryWidths.reduce((sum, w) => sum + w, 0);
      if (totalWidth <= containerWidth) {
        setVisibleCategories(categories);
        setOverflowCategories([]);
        return;
      }

      const availableWidth = containerWidth - homeWidth - moreWidth;
      let usedWidth = 0;
      let visibleCount = 0;

      for (const width of categoryWidths) {
        if (usedWidth + width <= availableWidth) {
          usedWidth += width;
          visibleCount += 1;
        } else {
          break;
        }
      }

      setVisibleCategories(categories.slice(0, visibleCount));
      setOverflowCategories(categories.slice(visibleCount));
    };

    const rafId = requestAnimationFrame(measure);

    const observer = new ResizeObserver(measure);
    if (navContainerRef.current) {
      observer.observe(navContainerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [categories, isDesktop]);

  return (
    <nav className="bg-[#1721d8] text-white sticky top-0 z-40 shadow-sm border-t border-white/10 w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          ref={navContainerRef}
          className="relative flex items-center justify-start md:justify-center h-11 overflow-x-auto md:overflow-visible no-scrollbar scroll-smooth w-full"
        >
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
            {(isDesktop ? visibleCategories : categories).map((cat) => (
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

            {isDesktop && overflowCategories.length > 0 && (
              <div className="relative group">
                <button
                  type="button"
                  className="transition-all py-1.5 px-2.5 rounded-md text-white/80 hover:text-white hover:bg-white/5 flex items-center gap-2"
                >
                  MORE
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">
                    {overflowCategories.length}
                  </span>
                </button>
                <div className="absolute right-0 top-full mt-2 min-w-[180px] bg-white text-gray-700 rounded-xl shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  <div className="py-2">
                    {overflowCategories.map((cat) => (
                      <Link
                        key={cat.slug}
                        href={`/?category=${cat.slug}`}
                        className={`block px-4 py-2 text-sm transition-colors ${
                          currentCategory === cat.slug
                            ? 'bg-[#1721d8] text-white'
                            : 'text-gray-700 hover:bg-[#1721d8] hover:text-white'
                        }`}
                      >
                        {cat.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div
            ref={measureRef}
            className="absolute -top-full left-0 opacity-0 pointer-events-none flex space-x-4 md:space-x-6 text-[11px] md:text-[13px] font-bold uppercase tracking-wider whitespace-nowrap"
            aria-hidden="true"
          >
            <span data-role="home" className="py-1.5 px-2.5">
              HOME
            </span>
            {categories.map((cat) => (
              <span key={cat.slug} data-role="category" className="py-1.5 px-2.5">
                {cat.name}
              </span>
            ))}
            <span data-role="more" className="py-1.5 px-2.5">
              MORE
            </span>
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
