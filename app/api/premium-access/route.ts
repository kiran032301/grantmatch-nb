import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    const profileId = req.nextUrl.searchParams.get('profileId')?.trim()

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('premium_access')
      .select('is_active')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      isActive: !!data?.is_active,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load premium access'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}