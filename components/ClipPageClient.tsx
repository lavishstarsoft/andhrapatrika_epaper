'use client';

import { useState } from 'react';
import ClipActions from './ClipActions';
import ClipImagePreview from './ClipImagePreview';

interface ClipPageClientProps {
  cropImageUrl: string;
  shareUrl: string;
  downloadUrl: string;
  readUrl: string;
  date: string;
  page: string;
  cid: string;
}

export default function ClipPageClient({
  cropImageUrl,
  shareUrl,
  downloadUrl,
  readUrl,
  date,
  page,
  cid,
}: ClipPageClientProps) {
  const [loading, setLoading] = useState(true);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-10 px-4">
      {/* Branded Clip Card */}
      <div className="bg-white border-[3px] border-black shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in duration-500">

        {/* Cropped Image Area */}
        <div className="bg-white flex flex-col">
          <ClipImagePreview src={cropImageUrl} onLoaded={() => setLoading(false)} />
        </div>

        {/* Branded Footer */}
        <div className="bg-gray-50 p-4 text-center border-t border-black/10">
          <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-1 text-[#2d2d2d] font-bold text-xs sm:text-sm uppercase tracking-tight">
            <span>andhrapatrikaa.com</span>
            <span className="hidden sm:inline opacity-30">|</span>
            <span>{date}</span>
            <span className="hidden sm:inline opacity-30">|</span>
            <span>Page: {page}</span>
            <span className="hidden sm:inline opacity-30">|</span>
            <span>Clip ID: {cid}</span>
          </div>
          <p className="text-gray-500 text-[10px] sm:text-xs mt-1.5 font-medium leading-tight">
            For more details, visit andhrapatrikaa.com
          </p>
        </div>
      </div>

      {/* Page Actions (Outside of branding area) */}
      <ClipActions 
        shareUrl={shareUrl} 
        downloadUrl={downloadUrl} 
        readUrl={readUrl} 
        disabled={loading} 
      />
    </div>
  );
}
