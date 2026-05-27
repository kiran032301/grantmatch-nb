import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export const runtime = 'nodejs'

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization')

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { error } = await supabaseAdmin
      .from('grants')
      .update({
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('is_active', true)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Grant verification dates refreshed.',
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Cron failed' },
      { status: 500 }
    )
  }
}