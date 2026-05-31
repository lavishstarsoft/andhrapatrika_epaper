import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  
  if (host === 'andhrapatrikaa.com') {
    const url = request.nextUrl.clone();
    url.hostname = 'www.andhrapatrikaa.com';
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|logo.png|manifest.json).*)',
  ],
};
