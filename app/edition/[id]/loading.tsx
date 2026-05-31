import { Loader2 } from 'lucide-react';

export default function EditionLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-12">
      <Loader2 className="w-10 h-10 animate-spin text-[#1721d8] mb-4" />
      <p className="text-gray-500 font-medium text-sm animate-pulse">Loading Edition...</p>
    </div>
  );
}
