import { NextRequest, NextResponse } from 'next/server'
import { razorpay } from '@/lib/razorpay'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const REPORT_PRICE_INR = 1499

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const profileId = body?.profileId as string | undefined
    const customerName = body?.customerName as string | undefined
    const customerEmail = body?.customerEmail as string | undefined
    const customerPhone = body?.customerPhone as string | undefined

    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    const order = await razorpay.orders.create({
      amount: REPORT_PRICE_INR * 100, // paise
      currency: 'INR',
      receipt: `grantmatch_${profileId.slice(0, 20)}`,
      notes: {
        profile_id: profileId,
        product: 'GrantMatch NB Full Report',
        customer_name: customerName || '',
        customer_email: customerEmail || '',
        customer_phone: customerPhone || '',
      },
    })

    const { error: insertError } = await supabaseAdmin.from('report_unlocks').insert({
      profile_id: profileId,
      razorpay_order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: 'created',
    })

    if (insertError) {
      return NextResponse.json(
        { error: `Order created but DB insert failed: ${insertError.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      name: 'GrantMatch NB',
      description: 'Full Grant Report',
      prefill: {
        name: customerName || '',
        email: customerEmail || '',
        contact: customerPhone || '',
      },
    })
  } catch (error) {
    console.error('create-order error:', error)
    return NextResponse.json({ error: 'Failed to create Razorpay order' }, { status: 500 })
  }
}