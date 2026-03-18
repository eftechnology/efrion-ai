import { NextResponse } from 'next/server';
import { findActiveToken } from '@/lib/access-tokens';
import { signSession } from '@/lib/session';

export async function POST(request: Request) {
  let body: { email?: string; accessCode?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const email = (body.email ?? '').trim().toLowerCase();
  const accessCode = (body.accessCode ?? '').trim();

  if (!email || !accessCode) {
    return NextResponse.json({ error: 'Email and access code are required.' }, { status: 400 });
  }

  const token = findActiveToken(email, accessCode);
  if (!token) {
    return NextResponse.json(
      { error: 'Invalid credentials or access has expired.' },
      { status: 401 }
    );
  }

  // Issue a signed session cookie
  const sessionValue = await signSession({
    tokenId: token.id,
    expiresAt: new Date(token.expiresAt!).getTime(),
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set('demo_session', sessionValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: Math.floor((new Date(token.expiresAt!).getTime() - Date.now()) / 1000),
    path: '/',
  });
  return response;
}
