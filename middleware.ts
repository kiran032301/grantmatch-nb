import { NextRequest, NextResponse } from 'next/server'

const ADMIN_COOKIE =
  process.env.ADMIN_SESSION_TOKEN || 'grantmatch_admin_session_token'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')
  const isAdminLogin = pathname === '/admin/login'

  if (!isAdminRoute) {
    return NextResponse.next()
  }

  const cookie = req.cookies.get(ADMIN_COOKIE)?.value
  const isLoggedIn = cookie === 'authenticated'

  if (isAdminLogin) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    return NextResponse.next()
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL('/admin/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}