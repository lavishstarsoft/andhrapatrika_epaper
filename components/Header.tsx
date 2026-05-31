'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Header() {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [logoUrl, setLogoUrl] = useState('/logo.png');
  const [headerHeight, setHeaderHeight] = useState(56);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && data?.settings) {
          if (data.settings.logoUrl) {
            setLogoUrl(data.settings.logoUrl);
          }
          if (data.settings.headerHeight) {
            setHeaderHeight(data.settings.headerHeight);
          }
        }
      })
      .catch((err) => console.error('Error fetching dynamic header settings:', err));
  }, []);

  const mobileHeight = Math.max(32, Math.round(headerHeight * 0.75));

  return (
    <header className="bg-white safe-top z-50 border-b">
      {/* Mobile App Bar - Always Sticky */}
      <div className="md:hidden flex items-center justify-center px-4 py-2">
        <Link href="/" className="flex items-center">
          <div className="relative" style={{ height: `${mobileHeight}px`, width: `${mobileHeight * 5}px` }}>
            <Image
              src={logoUrl}
              alt="Andhrapatrika Logo"
              fill
              sizes={`${mobileHeight * 5}px`}
              className="object-contain object-center"
              priority
            />
          </div>
        </Link>
      </div>

      {/* Desktop Header - Sticky on home, scrollable on other pages */}
      <div className="hidden md:block py-3 px-4 sm:px-6 lg:px-8 border-b">
        <div className="max-w-7xl mx-auto flex items-center justify-center">
          {/* Center - Logo */}
          <Link href="/" className="flex items-center">
            <div className="relative" style={{ height: `${headerHeight}px`, width: `${headerHeight * 5}px` }}>
              <Image
                src={logoUrl}
                alt="Andhrapatrika Logo"
                fill
                sizes={`${headerHeight * 5}px`}
                className="object-contain object-center"
                priority
              />
            </div>
          </Link>
        </div>
      </div>
    </header>
  );
}
