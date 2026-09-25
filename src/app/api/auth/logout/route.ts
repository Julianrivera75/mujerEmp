import { NextResponse } from 'next/server';
import { withErrors } from '@/lib/api';
import { clearSessionCookie } from '@/lib/auth';

export const POST = withErrors('auth/logout', async () => {
  clearSessionCookie();
  return NextResponse.json({ success: true, message: 'Sesión cerrada correctamente' });
});
