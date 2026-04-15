import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type ReviewAction = 'approve' | 'reject' | 'pending'

export async function GET() {
  try {
    const [pendingRes, liveRes, rejectedRes] = await Promise.all([
      supabaseAdmin
        .from('grants')
        .select('*')
        .eq('verification_status', 'review_pending')
        .eq('is_active', false)
        .order('updated_at', { ascending: false }),

      supabaseAdmin
        .from('grants')
        .select('*')
        .eq('verification_status', 'verified')
        .eq('is_active', true)
        .order('updated_at', { ascending: false }),

      supabaseAdmin
        .from('grants')
        .select('*')
        .eq('verification_status', 'rejected')
        .order('updated_at', { ascending: false }),
    ])

    if (pendingRes.error) throw pendingRes.error
    if (liveRes.error) throw liveRes.error
    if (rejectedRes.error) throw rejectedRes.error

    return NextResponse.json({
      pending: pendingRes.data || [],
      live: liveRes.data || [],
      rejected: rejectedRes.data || [],
      counts: {
        pending: pendingRes.data?.length || 0,
        live: liveRes.data?.length || 0,
        rejected: rejectedRes.data?.length || 0,
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load review data'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const grantId = String(body?.grantId || '').trim()
    const action = String(body?.action || '').trim().toLowerCase() as ReviewAction
    const reviewNotes =
      typeof body?.reviewNotes === 'string' ? body.reviewNotes.trim() : null

    if (!grantId) {
      return NextResponse.json({ error: 'grantId is required' }, { status: 400 })
    }

    if (!['approve', 'reject', 'pending'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use approve, reject, or pending.' },
        { status: 400 }
      )
    }

    let payload: Record<string, unknown> = {
      review_notes: reviewNotes,
      reviewed_at: new Date().toISOString(),
      reviewed_by: 'admin',
      updated_at: new Date().toISOString(),
    }

    if (action === 'approve') {
      payload = {
        ...payload,
        verification_status: 'verified',
        is_active: true,
      }
    }

    if (action === 'reject') {
      payload = {
        ...payload,
        verification_status: 'rejected',
        is_active: false,
      }
    }

    if (action === 'pending') {
      payload = {
        ...payload,
        verification_status: 'review_pending',
        is_active: false,
      }
    }

    const { error } = await supabaseAdmin
      .from('grants')
      .update(payload)
      .eq('id', grantId)

    if (error) throw error

    return NextResponse.json({
      success: true,
      message: `Grant ${action} action completed.`,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to update grant'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}