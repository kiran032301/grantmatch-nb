import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type DueGrant = {
  grant_id: string
  name: string | null
  organization: string | null
  application_deadline: string | null
  url: string | null
  score: number | null
}

function daysUntil(dateString: string): number {
  const now = new Date()
  const target = new Date(dateString)
  const ms = target.setHours(0, 0, 0, 0) - new Date(now.setHours(0, 0, 0, 0)).getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

async function sendEmail(params: {
  to: string
  subject: string
  html: string
}) {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.ALERTS_FROM_EMAIL

  if (!apiKey || !from) {
    return { sent: false, skipped: true, error: null as string | null }
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    return { sent: false, skipped: false, error: text }
  }

  return { sent: true, skipped: false, error: null as string | null }
}

function buildEmailHtml(email: string, grants: DueGrant[]) {
  const items = grants
    .map((grant) => {
      const deadlineText = grant.application_deadline
        ? new Date(grant.application_deadline).toLocaleDateString('en-CA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Not specified'

      const daysLeft = grant.application_deadline
        ? daysUntil(grant.application_deadline)
        : null

      return `
        <li style="margin-bottom:16px;">
          <strong>${grant.name || 'Unnamed Program'}</strong><br/>
          ${grant.organization || 'Unknown organization'}<br/>
          Deadline: ${deadlineText}${daysLeft !== null ? ` (${daysLeft} day${daysLeft === 1 ? '' : 's'} left)` : ''}<br/>
          ${grant.url ? `Official link: <a href="${grant.url}">${grant.url}</a>` : ''}
        </li>
      `
    })
    .join('')

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111;">
      <h2>GrantMatch NB Deadline Alert</h2>
      <p>Hello,</p>
      <p>These matched funding opportunities have upcoming deadlines:</p>
      <ul>
        ${items}
      </ul>
      <p>Please review the official links and application timing as soon as possible.</p>
      <p>— GrantMatch NB</p>
    </div>
  `
}

export async function GET(req: NextRequest) {
  try {
    console.log('CRON DEBUG', {
      tokenFromUrl: req.nextUrl.searchParams.get('token'),
      envSecret: process.env.CRON_SECRET,
    })

    const cronSecret = process.env.CRON_SECRET
    const token = req.nextUrl.searchParams.get('token')

    if (!cronSecret || token !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const todayIso = today.toISOString().slice(0, 10)

    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('deadline_alert_subscriptions')
      .select('*')
      .eq('is_active', true)

    if (subError) {
      throw subError
    }

    let checked = 0
    let sent = 0
    let skipped = 0
    let failed = 0

    for (const sub of subscriptions || []) {
      checked++

      const maxDate = new Date()
      maxDate.setDate(maxDate.getDate() + sub.days_before)
      const maxIso = maxDate.toISOString().slice(0, 10)

      const { data: matches, error: matchError } = await supabaseAdmin
        .from('profile_matches')
        .select(`
          grant_id,
          score,
          grants!inner (
            id,
            name,
            organization,
            application_deadline,
            url,
            is_active,
            verification_status
          )
        `)
        .eq('profile_id', sub.profile_id)

      if (matchError) {
        failed++
        continue
      }

      const dueGrants: DueGrant[] = (matches || [])
        .map((row: any) => ({
          grant_id: row.grants.id,
          name: row.grants.name,
          organization: row.grants.organization,
          application_deadline: row.grants.application_deadline,
          url: row.grants.url,
          score: row.score,
        }))
        .filter((grant) => {
          if (!grant.application_deadline) return false
          return (
            grant.application_deadline >= todayIso &&
            grant.application_deadline <= maxIso
          )
        })

      if (dueGrants.length === 0) {
        skipped++
        continue
      }

      const unsent: DueGrant[] = []

      for (const grant of dueGrants) {
        const { data: existingLog } = await supabaseAdmin
          .from('deadline_alert_logs')
          .select('id')
          .eq('subscription_id', sub.id)
          .eq('grant_id', grant.grant_id)
          .eq('alert_type', 'deadline')
          .maybeSingle()

        if (!existingLog) {
          unsent.push(grant)
        }
      }

      if (unsent.length === 0) {
        skipped++
        continue
      }

      const subject =
        unsent.length === 1
          ? `Grant deadline alert: ${unsent[0].name || 'Funding opportunity'}`
          : `Grant deadline alerts: ${unsent.length} upcoming deadlines`

      const html = buildEmailHtml(sub.email, unsent)
      const emailResult = await sendEmail({
        to: sub.email,
        subject,
        html,
      })

      for (const grant of unsent) {
        await supabaseAdmin.from('deadline_alert_logs').insert({
          subscription_id: sub.id,
          profile_id: sub.profile_id,
          grant_id: grant.grant_id,
          sent_to: sub.email,
          alert_type: 'deadline',
          status: emailResult.sent
            ? 'sent'
            : emailResult.skipped
            ? 'skipped'
            : 'failed',
          error_message: emailResult.error,
        })
      }

      if (emailResult.sent || emailResult.skipped) sent++
      else failed++
    }

    return NextResponse.json({
      success: true,
      checked,
      sent,
      skipped,
      failed,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Cron failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}