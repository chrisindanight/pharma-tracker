import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const COOKIE_NAME = 'pharma-session'

// Rute publice care nu necesită autentificare
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/cron/scrape', // Are propria autentificare cu CRON_SECRET
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname.startsWith(path))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permite rute publice
  if (isPublicPath(pathname)) {
    // Dacă e pe /login și e deja autentificat, redirect la dashboard
    if (pathname === '/login') {
      const token = request.cookies.get(COOKIE_NAME)?.value
      if (token) {
        try {
          const secret = new TextEncoder().encode(process.env.AUTH_SECRET)
          await jwtVerify(token, secret)
          return NextResponse.redirect(new URL('/', request.url))
        } catch {
          // Token invalid, permite accesul la /login
        }
      }
    }
    return NextResponse.next()
  }

  // Verifică autentificarea
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET)
    await jwtVerify(token, secret)
    return NextResponse.next()
  } catch {
    // Token expirat sau invalid
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' })
    return response
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
}
