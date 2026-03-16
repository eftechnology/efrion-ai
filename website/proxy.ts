import { NextRequest, NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const session = request.cookies.get('demo_session')?.value;
  const sessionToken = process.env.SESSION_TOKEN;

  if (!session || !sessionToken || session !== sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/demo/:path*'],
};
