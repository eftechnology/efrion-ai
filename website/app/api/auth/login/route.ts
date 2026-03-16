import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { username, password } = await request.json();

  const validUsername = process.env.DEMO_USERNAME;
  const validPassword = process.env.DEMO_PASSWORD;
  const sessionToken = process.env.SESSION_TOKEN;

  if (!validUsername || !validPassword || !sessionToken) {
    return NextResponse.json({ error: 'Server not configured.' }, { status: 500 });
  }

  if (username === validUsername && password === validPassword) {
    const response = NextResponse.json({ success: true });
    response.cookies.set('demo_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });
    return response;
  }

  return NextResponse.json({ error: 'Invalid username or password.' }, { status: 401 });
}
