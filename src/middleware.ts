import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { buildCsp, generateNonce } from '@/lib/csp';
import { SESSION_COOKIE } from '@/lib/session-cookie';

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (secret) return new TextEncoder().encode(secret);
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET no está configurado');
  }
  return new TextEncoder().encode('dev-only-secret-no-usar-en-produccion');
}

export async function middleware(request: NextRequest) {
  const nonce = generateNonce();
  const csp = buildCsp(nonce, process.env.NODE_ENV === 'production');

  // Next lee el nonce de la CSP de la solicitud y lo aplica a sus scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = await route(request, requestHeaders);
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

async function route(request: NextRequest, requestHeaders: Headers) {
  const { pathname } = request.nextUrl;
  const next = () => NextResponse.next({ request: { headers: requestHeaders } });

  // Rutas públicas que no requieren autenticación
  if (
    pathname === '/login' ||
    pathname === '/terminos' ||
    pathname === '/privacidad' ||
    pathname === '/cookies' ||
    pathname === '/api/health' ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public')
  ) {
    return next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;

  // Si no hay cookie de sesión y se intenta acceder a una ruta protegida
  if (!sessionCookie) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url));
  }

  try {
    // Verificar firma real del JWT (no solo decodificar el payload).
    const { payload } = await jwtVerify(sessionCookie, getJwtSecretKey(), { algorithms: ['HS256'] });

    // Validar si el usuario está inactivo
    if (payload.status === 'INACTIVO') {
      const response = NextResponse.redirect(new URL('/login?error=inactive', request.url));
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }

    // Proteger rutas según el rol
    if (pathname.startsWith('/admin') && payload.role !== 'ADMIN') {
      const redirectPath = payload.role === 'MENTOR' ? '/mentor' : '/estudiante';
      return NextResponse.redirect(new URL(redirectPath, request.url));
    }

    if (pathname.startsWith('/mentor') && payload.role !== 'MENTOR' && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/estudiante', request.url));
    }

    if (pathname.startsWith('/estudiante') && payload.role !== 'STUDENT' && payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/mentor', request.url));
    }

    if (pathname === '/') {
      let defaultPath = '/estudiante';
      if (payload.role === 'ADMIN') defaultPath = '/admin';
      if (payload.role === 'MENTOR') defaultPath = '/mentor';
      return NextResponse.redirect(new URL(defaultPath, request.url));
    }

    return next();
  } catch (err) {
    // Firma inválida, token expirado o cookie corrupta.
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
