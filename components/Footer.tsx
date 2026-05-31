import Link from 'next/link';
import Image from 'next/image';
import { Mail } from 'lucide-react';
import clientPromise from '@/lib/mongodb';
import { resolveMediaUrl } from '@/lib/r2';

export default async function Footer() {
  let logoUrl = '/logo.png';
  let footerHeight = 64; // Default footer logo height
  try {
    const client = await clientPromise;
    const db = client.db('yellowsingam_epaper');
    const settings = await db.collection('settings').findOne({ type: 'global' });
    if (settings) {
      if (settings.logoUrl) {
        logoUrl = resolveMediaUrl(settings.logoUrl);
      }
      if (settings.footerHeight) {
        footerHeight = settings.footerHeight;
      }
    }
  } catch (error) {
    console.error('Error fetching settings for footer logo:', error);
  }

  return (
    <footer className="hidden md:block bg-[#2D2D2D] mt-auto">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col lg:flex-row justify-between gap-10">
          {/* Left - Brand & Description */}
          <div className="lg:max-w-md">
            <Link href="/" className="flex items-center mb-4">
              <div className="relative" style={{ height: `${footerHeight}px`, width: `${footerHeight * 5}px` }}>
                <Image
                  src={logoUrl}
                  alt="Andhrapatrika Logo"
                  fill
                  sizes={`${footerHeight * 5}px`}
                  className="object-contain object-left"
                />
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mt-4">
              Andhrapatrika is a trusted Telugu daily newspaper bringing you authentic news with integrity. We are committed to truthful journalism and serving our readers.
            </p>
          </div>

          {/* Right - Head Office */}
          <div className="lg:text-right">
            <h3 className="text-xl font-semibold text-white mb-3">Head Office (Andhrapatrika Media)</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              Media House, MG Road,<br />
              Vijayawada, Andhra Pradesh - 520001
            </p>
            <div className="flex items-center gap-2 mt-4 lg:justify-end">
              <Mail size={16} className="text-[#FFFFFF]" />
              <a href="mailto:info@andhrapatrika.com" className="text-[#FFFFFF] hover:underline text-sm">
                info@andhrapatrika.com
              </a>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2 mt-10 pt-6 border-t border-gray-600">
          <Link href="/" className="text-white font-medium hover:text-[#1721d8] transition-colors text-sm">Home</Link>
          <Link href="/contact" className="text-white font-medium hover:text-[#1721d8] transition-colors text-sm">Contact Us</Link>
          <Link href="/terms" className="text-gray-400 hover:text-[#1721d8] transition-colors text-sm">Terms</Link>
          <Link href="/privacy" className="text-gray-400 hover:text-[#1721d8] transition-colors text-sm">Privacy</Link>
        </div>
      </div>

      {/* Disclaimer & Copyright */}
      <div className="border-t border-gray-600 bg-[#252525]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-gray-500 text-xs leading-relaxed mb-4">
            This website provides general information about Andhrapatrika and its publications for informational purposes only. All news content is subject to editorial guidelines and journalistic standards. Andhrapatrika maintains policies for accuracy, fairness, and ethical reporting. For corrections or clarifications, please contact our editorial team.
          </p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="text-gray-500 text-xs">
              © {new Date().getFullYear()} Andhrapatrika Media. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs">
              Developed by <a href="#" className="text-[#FFFFFF] hover:underline">LMJ Tech</a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
