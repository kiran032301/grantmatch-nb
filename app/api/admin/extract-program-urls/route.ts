import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

function cleanText(value?: string | null): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function absoluteUrl(inputUrl: string, href?: string | null): string | null {
  if (!href) return null
  try {
    return new URL(href, inputUrl).toString()
  } catch {
    return null
  }
}

function isLikelyJunkUrl(url: string): boolean {
  const lower = url.toLowerCase()

  const blockedParts = [
    '#',
    'javascript:',
    'mailto:',
    '/news',
    '/contact',
    '/about',
    '/privacy',
    '/terms',
    '/search',
    '/login',
    '/signin',
    '/sign-in',
    '/register',
    '/rss',
    '/facebook',
    '/linkedin',
    '/twitter',
    '/youtube',
    '/instagram',
  ]

  return blockedParts.some((part) => lower.includes(part))
}

function quickProgramHeuristic(url: string, text: string): boolean {
  const u = url.toLowerCase()
  const t = text.toLowerCase()

  const positiveSignals = [
    '/services/',
    '/program',
    '/funding',
    '/grant',
    '/innovation',
    '/business-development',
    '/research',
    '/investment',
    '/support',
  ]

  const textSignals = [
    'grant',
    'funding',
    'program',
    'support',
    'innovation',
    'investment',
    'loan',
    'business development',
    'research',
  ]

  const urlHit = positiveSignals.some((signal) => u.includes(signal))
  const textHit = textSignals.some((signal) => t.includes(signal))

  return urlHit || textHit
}

async function fetchPage(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'GrantMatch-NB-URL-Extractor/1.0',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status}`)
  }

  const html = await res.text()
  const $ = cheerio.load(html)

  $('script, style, noscript, iframe, svg').remove()

  const title = cleanText($('h1').first().text()) || cleanText($('title').text())

  const links = $('a')
    .map((_, el) => {
      const text = cleanText($(el).text())
      const href = absoluteUrl(url, $(el).attr('href'))

      if (!href) return null
      if (!text || text.length < 2) return null
      if (isLikelyJunkUrl(href)) return null

      return {
        text,
        href,
      }
    })
    .get()
    .filter(Boolean) as Array<{ text: string; href: string }>

  const deduped = Array.from(
    new Map(links.map((item) => [item.href, item])).values()
  )

  const filtered = deduped.filter((item) => quickProgramHeuristic(item.href, item.text))

  return {
    title,
    links: filtered.slice(0, 80),
  }
}

async function classifyProgramUrls(
  pageUrl: string,
  pageTitle: string,
  links: Array<{ text: string; href: string }>
) {
  const prompt = `
You are helping identify program-level funding URLs for a Canadian grants platform.

Task:
From the candidate links below, select only the links that are MOST LIKELY to be direct funding-program or grant-program pages.

Rules:
- Prefer links that appear to describe ONE program.
- Reject obvious directory pages, category pages, search pages, contact pages, and generic information pages.
- If unsure, be conservative.
- Return at most 15 links.
- Return valid JSON only.

Directory page URL:
${pageUrl}

Directory page title:
${pageTitle}

Candidate links:
${links.map((l, i) => `${i + 1}. ${l.text} -> ${l.href}`).join('\n')}
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content:
          'You select likely direct funding program URLs from a directory page. Be conservative.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'program_url_selection',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            selected_links: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  text: { type: 'string' },
                  href: { type: 'string' },
                  reason: { type: ['string', 'null'] },
                  confidence: { type: 'number' },
                },
                required: ['text', 'href', 'reason', 'confidence'],
              },
            },
          },
          required: ['selected_links'],
        },
      },
    },
    temperature: 0,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No URL classification returned from model.')
  }

  const parsed = JSON.parse(content) as {
    selected_links: Array<{
      text: string
      href: string
      reason: string | null
      confidence: number
    }>
  }

  const clean = parsed.selected_links
    .filter((item) => item.href && item.text)
    .map((item) => ({
      text: cleanText(item.text),
      href: cleanText(item.href),
      reason: cleanText(item.reason) || null,
      confidence:
        typeof item.confidence === 'number'
          ? Math.max(0, Math.min(1, item.confidence))
          : 0.5,
    }))

  return Array.from(new Map(clean.map((item) => [item.href, item])).values())
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const inputUrl = String(body?.url || '').trim()

    if (!inputUrl) {
      return NextResponse.json({ error: 'URL is required.' }, { status: 400 })
    }

    let parsedUrl: URL
    try {
      parsedUrl = new URL(inputUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid URL.' }, { status: 400 })
    }

    const page = await fetchPage(parsedUrl.toString())

    if (!page.links.length) {
      return NextResponse.json({
        success: true,
        message: 'No likely candidate links found on this page.',
        sourceUrl: parsedUrl.toString(),
        pageTitle: page.title,
        candidates: [],
      })
    }

    const selected = await classifyProgramUrls(
      parsedUrl.toString(),
      page.title,
      page.links
    )

    return NextResponse.json({
      success: true,
      message: `Found ${selected.length} likely program URL(s).`,
      sourceUrl: parsedUrl.toString(),
      pageTitle: page.title,
      candidates: selected,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'URL extraction failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}