import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const profileId = String(body?.profileId || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()

    if (!profileId || !email) {
      return NextResponse.json(
        { error: 'Missing profileId or email' },
        { status: 400 }
      )
    }

    const { error } = await supabaseAdmin
      .from('deadline_alert_subscriptions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId)
      .eq('email', email)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Deadline alerts disabled.',
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to unsubscribe'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}