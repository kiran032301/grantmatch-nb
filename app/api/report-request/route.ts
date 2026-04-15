import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      profileId,
      businessName,
      industry,
      stage,
      goal,
      email,
      phone,
      notes,
    } = body || {}

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('report_requests').insert({
      profile_id: profileId,
      business_name: businessName || null,
      industry: industry || null,
      stage: stage || null,
      goal: goal || null,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
      status: 'new',
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('report-request error:', error)
    return NextResponse.json(
      { error: 'Failed to save report request' },
      { status: 500 }
    )
  }
}