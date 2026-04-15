import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { hybridMatchGrants } from '@/lib/hybridMatching'
import type { Profile } from '@/lib/grantMatching'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const profileId = String(body?.profileId || '').trim()

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('id', profileId)
      .maybeSingle()

    if (profileError) {
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      )
    }

    if (!profileData) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    const matches = await hybridMatchGrants(profileData as Profile)

    return NextResponse.json({
      profile: profileData,
      matches,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to match grants'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}