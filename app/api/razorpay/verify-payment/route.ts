import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      profileId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body || {}

    if (!profileId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: 'Missing required payment fields' }, { status: 400 })
    }

    const secret = process.env.RAZORPAY_KEY_SECRET
    if (!secret) {
      return NextResponse.json({ error: 'Missing Razorpay secret' }, { status: 500 })
    }

    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex')

    const isValid = generatedSignature === razorpay_signature

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('report_unlocks')
      .update({
        razorpay_payment_id,
        status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('profile_id', profileId)
      .eq('razorpay_order_id', razorpay_order_id)

    if (updateError) {
      return NextResponse.json(
        { error: `Payment verified but DB update failed: ${updateError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('verify-payment error:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}