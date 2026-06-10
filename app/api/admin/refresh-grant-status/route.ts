import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Extend Vercel function timeout to 300s (Pro plan max)
export const maxDuration = 300

function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY is missing')
  return new OpenAI({ apiKey })
}

function cleanText(value?: string | null): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function normalizeIntakeStatus(
  value: string | null | undefined
): 'open' | 'rolling' | 'upcoming' | 'closed' | 'unknown' {
  const v = (value || '').toLowerCase()
  if (v === 'open') return 'open'
  if (v === 'rolling') return 'rolling'
  if (v === 'upcoming') return 'upcoming'
  if (v === 'closed') return 'closed'
  return 'unknown'
}

async function fetchPageText(url: string): Promise<string> {
  // Validate URL first
  try { new URL(url) } catch { throw new Error('Invalid URL format') }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-CA,en;q=0.9,fr-CA;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
  }

  const attemptFetch = async (timeoutMs: number) => {
    const res = await fetch(url, {
      headers,
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (res.status === 404) throw new Error('HTTP 404 — URL not found, update grant URL in database')
    if (res.status === 403) throw new Error('HTTP 403 — site blocked server access')
    if (res.status === 429) throw new Error('HTTP 429 — rate limited, try again later')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const html = await res.text()
    const $ = cheerio.load(html)
    $('script, style, noscript, iframe, svg, nav, footer, header, aside').remove()
    const text = cleanText($('main, article, .content, body').first().text()).slice(0, 5000)
    if (text.length < 50) throw new Error('Page returned no useful content')
    return text
  }

  try {
    return await attemptFetch(22000)
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    // Only retry on genuine timeouts, not on HTTP errors or fetch failures
    if (msg.includes('aborted') || msg.includes('TimeoutError') || err instanceof Error && err.name === 'TimeoutError') {
      try {
        return await attemptFetch(28000)
      } catch (retryErr) {
        throw new Error(`Timeout after retry — site too slow (${url.split('/')[2]})`)
      }
    }
    throw err
  }
}

async function detectStatus(
  pageText: string,
  grantName: string
): Promise<{
  intake_status: 'open' | 'rolling' | 'upcoming' | 'closed' | 'unknown'
  evidence: string | null
}> {
  const openai = getOpenAI()
  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: 'You detect the current application intake status of a funding program from webpage text. Be conservative.',
      },
      {
        role: 'user',
        content: `Detect the intake status of "${grantName}". Choose: open, rolling, upcoming, closed, unknown.\n- open = accepting with specific window\n- rolling = accepting continuously\n- upcoming = not yet open\n- closed = explicitly closed\n- unknown = cannot determine\n\nReturn JSON only: { "intake_status": "...", "evidence": "..." }\n\nPage text:\n${pageText}`,
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 150,
  })
  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('No AI response')
  const parsed = JSON.parse(content)
  return {
    intake_status: normalizeIntakeStatus(parsed.intake_status),
    evidence: cleanText(parsed.evidence) || null,
  }
}

type GrantRow = { id: string; name: string; url: string | null; intake_status: string | null }
type Result = {
  id: string; name: string; url: string
  previous_status: string; new_status: string
  changed: boolean; evidence: string | null; error?: string
}

async function processGrant(grant: GrantRow): Promise<Result> {
  if (!grant.url) {
    return {
      id: grant.id, name: grant.name, url: '',
      previous_status: grant.intake_status || 'unknown',
      new_status: grant.intake_status || 'unknown',
      changed: false, evidence: null, error: 'No URL',
    }
  }
  try {
    const pageText = await fetchPageText(grant.url)
    const { intake_status, evidence } = await detectStatus(pageText, grant.name)
    const changed = intake_status !== grant.intake_status

    if (changed) {
      await supabaseAdmin.from('grants').update({
        intake_status,
        last_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', grant.id)
    } else {
      await supabaseAdmin.from('grants')
        .update({ last_verified_at: new Date().toISOString() })
        .eq('id', grant.id)
    }

    return {
      id: grant.id, name: grant.name, url: grant.url,
      previous_status: grant.intake_status || 'unknown',
      new_status: intake_status, changed, evidence,
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Failed'
    // Tag 404s clearly so admin knows to update the URL in database
    const displayError = errMsg.includes('404')
      ? '⚠ URL broken (404) — update in Supabase'
      : errMsg.includes('403')
      ? '🔒 Site blocked server access'
      : errMsg.includes('rate limit') || errMsg.includes('429')
      ? '⏱ Rate limited — try again later'
      : errMsg.includes('too slow') || errMsg.includes('aborted') || errMsg.includes('timeout')
      ? '⏳ Site too slow to respond'
      : errMsg.includes('fetch failed') || errMsg.includes('ENOTFOUND') || errMsg.includes('ECONNREFUSED')
      ? '🔌 Cannot reach URL — check if site is down'
      : errMsg
    return {
      id: grant.id, name: grant.name, url: grant.url,
      previous_status: grant.intake_status || 'unknown',
      new_status: grant.intake_status || 'unknown',
      changed: false, evidence: null,
      error: displayError,
    }
  }
}

// Process in parallel batches of 3 to stay well within timeout
async function processBatch(grants: GrantRow[]): Promise<Result[]> {
  const BATCH_SIZE = 5
  const results: Result[] = []
  for (let i = 0; i < grants.length; i += BATCH_SIZE) {
    const batch = grants.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(batch.map(processGrant))
    results.push(...batchResults)
  }
  return results
}

export async function POST(req: NextRequest) {
  try {
    const cookie = req.cookies.get(
      process.env.ADMIN_SESSION_TOKEN || 'grantmatch_admin_session_token'
    )?.value
    if (cookie !== 'authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Accept optional limit from request body (default 20 per run)
    let limit = 20
    try {
      const body = await req.json()
      if (typeof body?.limit === 'number') limit = Math.min(body.limit, 50)
    } catch { /* no body — use default */ }

    // Prioritise grants not checked in the last 24 hours, oldest first
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: grants, error: fetchError } = await supabaseAdmin
      .from('grants')
      .select('id, name, url, intake_status, last_verified_at')
      .eq('is_active', true)
      .not('url', 'is', null)
      .or(`last_verified_at.is.null,last_verified_at.lt.${cutoff}`)
      .order('last_verified_at', { ascending: true, nullsFirst: true })
      .limit(limit)

    if (fetchError) throw fetchError
    if (!grants || grants.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All grants were checked within the last 24 hours. Nothing to update.',
        results: [],
        summary: { total: 0, updated: 0, unchanged: 0, failed: 0 },
      })
    }

    const results = await processBatch(grants as GrantRow[])

    const updated = results.filter(r => r.changed).length
    const failed = results.filter(r => !!r.error).length
    const unchanged = results.length - updated - failed

    return NextResponse.json({
      success: true,
      summary: { total: grants.length, updated, unchanged, failed },
      results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Status refresh failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}