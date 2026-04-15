import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const profileId = String(body?.profileId || '').trim()
    const email = String(body?.email || '').trim().toLowerCase()
    const daysBefore = Number(body?.daysBefore || 7)

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const safeDaysBefore = [3, 7, 14].includes(daysBefore) ? daysBefore : 7

    const { data, error } = await supabaseAdmin
      .from('deadline_alert_subscriptions')
      .upsert(
        {
          profile_id: profileId,
          email,
          days_before: safeDaysBefore,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,email' }
      )
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      subscription: data,
      message: 'Deadline alerts enabled.',
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to subscribe'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}