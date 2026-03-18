import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const session = request.cookies.get('demo_session')?.value;
  const validToken = process.env.SESSION_TOKEN;

  if (!session || session !== validToken) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/demo/:path*'],
};
