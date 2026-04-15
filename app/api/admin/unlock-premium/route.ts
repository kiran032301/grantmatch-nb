import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const profileId = clean(body?.profileId)
    const requestId = clean(body?.requestId)
    const unlockedBy = clean(body?.unlockedBy) || 'admin'

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    const { error: premiumError } = await supabaseAdmin
      .from('premium_access')
      .upsert(
        {
          profile_id: profileId,
          is_active: true,
          unlocked_by: unlockedBy,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id' }
      )

    if (premiumError) {
      return NextResponse.json({ error: premiumError.message }, { status: 500 })
    }

    if (requestId) {
      const { error: requestError } = await supabaseAdmin
        .from('report_requests')
        .update({
          status: 'approved',
        })
        .eq('id', requestId)

      if (requestError) {
        return NextResponse.json({ error: requestError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Premium access unlocked successfully.',
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to unlock premium'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}