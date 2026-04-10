import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD || 'admin';
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'rmm-secret-key-change-me');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || password !== DASHBOARD_PASSWORD) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const token = await new SignJWT({ role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .setIssuedAt()
      .sign(JWT_SECRET);

    const response = NextResponse.json({ success: true });
    response.cookies.set('rmm_session', token, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
