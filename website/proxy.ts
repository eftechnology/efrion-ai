import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('demo_session')?.value;

  if (!session) {
    return redirectToLogin(request);
  }

  const payload = await verifySession(session);
  if (!payload) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('from', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/demo/:path*'],
};
