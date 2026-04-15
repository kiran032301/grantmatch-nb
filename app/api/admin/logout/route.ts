import { NextResponse } from 'next/server'

const ADMIN_COOKIE =
  process.env.ADMIN_SESSION_TOKEN || 'grantmatch_admin_session_token'

export async function POST() {
  const response = NextResponse.json({ success: true })

  response.cookies.set({
    name: ADMIN_COOKIE,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  })

  return response
}