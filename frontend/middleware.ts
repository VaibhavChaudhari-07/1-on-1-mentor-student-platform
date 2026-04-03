import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const token = req.cookies.get('token')?.value
  const pathname = req.nextUrl.pathname

  // Protect dashboard route
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // Protect session routes
  if (pathname.startsWith('/session')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // Redirect authenticated users away from auth pages
  if (pathname === '/login' || pathname === '/signup') {
    if (token) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/session/:path*', '/login', '/signup'],
}