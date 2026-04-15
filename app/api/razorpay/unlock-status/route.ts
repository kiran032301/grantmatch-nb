import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const profileId = searchParams.get('profileId')

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('report_unlocks')
      .select('status')
      .eq('profile_id', profileId)
      .eq('status', 'paid')
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ unlocked: !!data })
  } catch (error) {
    console.error('unlock-status error:', error)
    return NextResponse.json({ error: 'Failed to get unlock status' }, { status: 500 })
  }
}