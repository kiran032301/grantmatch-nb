import { NextRequest, NextResponse } from 'next/server'

const ADMIN_COOKIE =
  process.env.ADMIN_SESSION_TOKEN || 'grantmatch_admin_session_token'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const username = String(body?.username || '').trim()
    const password = String(body?.password || '')

    const envUsername = process.env.ADMIN_USERNAME || ''
    const envPassword = process.env.ADMIN_PASSWORD || ''

    if (!envUsername || !envPassword) {
      return NextResponse.json(
        { error: 'Admin credentials are not configured.' },
        { status: 500 }
      )
    }

    if (username !== envUsername || password !== envPassword) {
      return NextResponse.json(
        { error: 'Invalid username or password.' },
        { status: 401 }
      )
    }

    const response = NextResponse.json({ success: true })

    response.cookies.set({
      name: ADMIN_COOKIE,
      value: 'authenticated',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 8,
    })

    return response
  } catch {
    return NextResponse.json(
      { error: 'Login failed.' },
      { status: 500 }
    )
  }
}