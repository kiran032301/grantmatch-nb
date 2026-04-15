import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

import { NextRequest, NextResponse } from 'next/server'
import * as cheerio from 'cheerio'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

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

function isUsefulParagraph(text: string): boolean {
  const t = cleanText(text).toLowerCase()
  if (!t) return false
  if (t.length < 40) return false

  const blocked = [
    'skip to main content',
    'share this page',
    'report a problem',
    'date modified',
    'menu',
    'search',
    'sign in',
    'contact us',
    'follow us',
    'social media',
    'copyright',
    'terms and conditions',
    'privacy',
    'return to top',
  ]

  return !blocked.some((item) => t.includes(item))
}

function normalizeType(value: string | null | undefined): 'grant' | 'loan' | 'tax_credit' {
  const v = (value || '').toLowerCase()
  if (v === 'loan') return 'loan'
  if (v === 'tax_credit') return 'tax_credit'
  return 'grant'
}

function normalizeFundingType(
  value: string | null | undefined
): 'grant' | 'loan' | 'investment' | 'tax_credit' | 'rebate' {
  const v = (value || '').toLowerCase()
  if (v === 'loan') return 'loan'
  if (v === 'investment') return 'investment'
  if (v === 'tax_credit') return 'tax_credit'
  if (v === 'rebate') return 'rebate'
  return 'grant'
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

function normalizeBusinessRelevance(
  value: string | null | undefined
): 'high' | 'medium' | 'low' {
  const v = (value || '').toLowerCase()
  if (v === 'low') return 'low'
  if (v === 'medium') return 'medium'
  return 'high'
}

function normalizePageType(
  value: string | null | undefined
): 'program' | 'directory' | 'general_info' {
  const v = (value || '').toLowerCase()
  if (v === 'directory') return 'directory'
  if (v === 'general_info') return 'general_info'
  return 'program'
}

function normalizeConfidence(value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.5
  return Math.max(0, Math.min(1, value))
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeTagList(values: unknown, allowed: string[]): string[] {
  if (!Array.isArray(values)) return []
  const allowedSet = new Set(allowed)
  return values
    .map((v) => String(v).trim())
    .filter((v) => allowedSet.has(v))
}

async function fetchPage(url: string) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'GrantMatch-NB-AI-Extractor/1.0',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch URL: ${res.status}`)
  }

  const html = await res.text()
  const $ = cheerio.load(html)

  $('script, style, noscript, iframe, svg, nav, footer').remove()

  const title = cleanText($('h1').first().text()) || cleanText($('title').text())

  const headings = $('h1, h2, h3')
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean)
    .slice(0, 25)

  const paragraphs = $('p')
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(isUsefulParagraph)
    .slice(0, 35)

  const listItems = $('li')
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter((t) => t.length >= 25 && t.length <= 300)
    .slice(0, 20)

  const links = $('a')
    .map((_, el) => {
      const text = cleanText($(el).text())
      const href = absoluteUrl(url, $(el).attr('href'))
      if (!text || !href) return null
      return { text, href }
    })
    .get()
    .filter(Boolean)
    .slice(0, 40) as Array<{ text: string; href: string }>

  const pageText = cleanText(
    [
      title,
      ...headings.map((h) => `Heading: ${h}`),
      ...paragraphs,
      ...listItems.map((li) => `List item: ${li}`),
    ].join('\n\n')
  ).slice(0, 20000)

  return {
    title,
    headings,
    paragraphs,
    listItems,
    links,
    pageText,
  }
}

type ClassificationResult = {
  page_type: 'program' | 'directory' | 'general_info'
  confidence: number
  reasoning: string | null
}

async function classifyPage(page: Awaited<ReturnType<typeof fetchPage>>, inputUrl: string) {
  const prompt = `
Classify this webpage for a Canadian business-funding database.

Choose one:
- program = a specific funding program page
- directory = a listing or search page containing multiple programs
- general_info = general guidance, department page, or non-program information

Return JSON only.

URL:
${inputUrl}

Page title:
${page.title}

Content:
${page.pageText}

Links:
${page.links.map((l) => `- ${l.text}: ${l.href}`).join('\n')}
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content: 'You classify funding-related webpages conservatively.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'page_classification',
        strict: true,
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            page_type: {
              type: 'string',
              enum: ['program', 'directory', 'general_info'],
            },
            confidence: {
              type: 'number',
            },
            reasoning: {
              type: ['string', 'null'],
            },
          },
          required: ['page_type', 'confidence', 'reasoning'],
        },
      },
    },
    temperature: 0,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No page classification returned from model.')
  }

  const raw = JSON.parse(content) as ClassificationResult

  return {
    page_type: normalizePageType(raw.page_type),
    confidence: normalizeConfidence(raw.confidence),
    reasoning: cleanText(raw.reasoning) || null,
  }
}

const ALLOWED_INDUSTRY_TAGS = [
  'general',
  'technology',
  'manufacturing',
  'agriculture',
  'tourism',
  'construction',
  'professional_services',
  'clean_energy',
  'media',
  'culture',
  'mining',
  'health',
  'retail',
  'hospitality',
]

const ALLOWED_STAGE_TAGS = ['idea', 'startup', 'growth', 'established']

const ALLOWED_GOAL_TAGS = [
  'hiring',
  'training',
  'innovation',
  'r_and_d',
  'product_development',
  'market_expansion',
  'export',
  'investment',
  'productivity',
  'digital_adoption',
  'sustainability',
  'working_capital',
]

async function extractGrantData(page: Awaited<ReturnType<typeof fetchPage>>, inputUrl: string) {
  const schema = {
    name: 'grant_extraction',
    strict: true,
    schema: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        name_evidence: { type: ['string', 'null'] },

        organization: { type: ['string', 'null'] },
        organization_evidence: { type: ['string', 'null'] },

        amount_min: { type: ['number', 'null'] },
        amount_max: { type: ['number', 'null'] },
        amount_evidence: { type: ['string', 'null'] },

        type: { type: 'string', enum: ['grant', 'loan', 'tax_credit'] },
        funding_type: {
          type: 'string',
          enum: ['grant', 'loan', 'investment', 'tax_credit', 'rebate'],
        },
        funding_type_evidence: { type: ['string', 'null'] },

        provider_type: { type: ['string', 'null'] },

        repayable: { type: ['boolean', 'null'] },
        repayable_evidence: { type: ['string', 'null'] },

        description: { type: ['string', 'null'] },
        short_description: { type: ['string', 'null'] },

        eligibility: { type: ['string', 'null'] },
        eligibility_summary: { type: ['string', 'null'] },
        eligibility_evidence: { type: ['string', 'null'] },

        industry_tags: {
          type: 'array',
          items: { type: 'string' },
        },
        stage_tags: {
          type: 'array',
          items: { type: 'string' },
        },
        goal_tags: {
          type: 'array',
          items: { type: 'string' },
        },

        supports_rd: { type: ['boolean', 'null'] },

        intake_status: {
          type: 'string',
          enum: ['open', 'rolling', 'upcoming', 'closed', 'unknown'],
        },
        intake_status_evidence: { type: ['string', 'null'] },

        business_relevance: {
          type: 'string',
          enum: ['high', 'medium', 'low'],
        },

        stackable: { type: ['boolean', 'null'] },
        funding_percentage: { type: ['number', 'null'] },
        program_level: { type: ['string', 'null'] },
        stack_notes: { type: ['string', 'null'] },
        max_stack_cap: { type: ['number', 'null'] },

        overall_confidence: { type: 'number' },
      },
      required: [
        'name',
        'name_evidence',
        'organization',
        'organization_evidence',
        'amount_min',
        'amount_max',
        'amount_evidence',
        'type',
        'funding_type',
        'funding_type_evidence',
        'provider_type',
        'repayable',
        'repayable_evidence',
        'description',
        'short_description',
        'eligibility',
        'eligibility_summary',
        'eligibility_evidence',
        'industry_tags',
        'stage_tags',
        'goal_tags',
        'supports_rd',
        'intake_status',
        'intake_status_evidence',
        'business_relevance',
        'stackable',
        'funding_percentage',
        'program_level',
        'stack_notes',
        'max_stack_cap',
        'overall_confidence',
      ],
    },
  } as const

  const prompt = `
Extract ONE business funding program from this webpage.

Important rules:
- Use only information clearly supported by the page.
- If unclear, use null.
- Do not guess funding amounts or deadlines.
- Keep description under 500 characters.
- Keep short_description under 220 characters.
- Keep eligibility_summary under 220 characters.
- Use only allowed enum values.
- Use only allowed tags.
- Include evidence strings for major fields.
- Prefer conservative extraction over overfilling.

Allowed tags:
industry_tags: ${ALLOWED_INDUSTRY_TAGS.join(', ')}
stage_tags: ${ALLOWED_STAGE_TAGS.join(', ')}
goal_tags: ${ALLOWED_GOAL_TAGS.join(', ')}

URL:
${inputUrl}

Page title:
${page.title}

Main content:
${page.pageText}

Useful links:
${page.links.map((l) => `- ${l.text}: ${l.href}`).join('\n')}
`

  const response = await openai.chat.completions.create({
    model: 'gpt-4.1-mini',
    messages: [
      {
        role: 'system',
        content:
          'You extract structured funding-program data for a Canadian grants database. Be conservative and evidence-based.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: schema,
    },
    temperature: 0.1,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No extraction returned from model.')
  }

  return JSON.parse(content)
}

type ExtractionMeta = {
  page_type?: 'program' | 'directory' | 'general_info'
  page_confidence?: number
  page_reasoning?: string | null
  overall_confidence?: number
  evidence?: {
    name?: string | null
    organization?: string | null
    amount?: string | null
    funding_type?: string | null
    repayable?: string | null
    eligibility?: string | null
    intake_status?: string | null
  }
}

async function processSingleUrl(inputUrl: string) {
  let parsedUrl: URL
  try {
    parsedUrl = new URL(inputUrl)
  } catch {
    return {
      url: inputUrl,
      success: false,
      status: 'failed' as const,
      error: 'Invalid URL.',
    }
  }

  const normalizedUrl = parsedUrl.toString()

  // Skip AI entirely if URL already exists
  const { data: existing } = await supabaseAdmin
    .from('grants')
    .select('id, is_active, verification_status')
    .eq('url', normalizedUrl)
    .maybeSingle()

  if (existing?.id) {
    return {
      url: normalizedUrl,
      success: true,
      status: 'skipped' as const,
      message: 'Already exists. Skipped AI extraction.',
    }
  }

  const page = await fetchPage(normalizedUrl)
  const classification = await classifyPage(page, normalizedUrl)

  if (classification.page_type !== 'program' || classification.confidence < 0.55) {
    return {
      url: normalizedUrl,
      success: false,
      status: 'skipped' as const,
      error: 'This URL does not appear to be a clear single grant/program page.',
      extractionMeta: classification,
    }
  }

  const extracted = await extractGrantData(page, normalizedUrl)

  const finalName = cleanText(extracted.name) || page.title || 'Untitled Program'
  const sourceName = parsedUrl.hostname.includes('canada.ca')
    ? 'CANADA_MAIN'
    : parsedUrl.hostname.includes('gnb.ca')
    ? 'GNB'
    : parsedUrl.hostname.includes('onbcanada.ca')
    ? 'ONB'
    : parsedUrl.hostname.includes('nbif.ca')
    ? 'NBIF'
    : 'MANUAL_URL'

  const sourceProgramId = slugify(`${sourceName}-${finalName}`)

  const grantRow = {
    name: finalName,
    organization: cleanText(extracted.organization) || null,
    amount_min: typeof extracted.amount_min === 'number' ? extracted.amount_min : null,
    amount_max: typeof extracted.amount_max === 'number' ? extracted.amount_max : null,
    type: normalizeType(extracted.type),
    funding_type: normalizeFundingType(extracted.funding_type),
    provider_type: cleanText(extracted.provider_type) || null,
    repayable:
      typeof extracted.repayable === 'boolean' ? extracted.repayable : null,
    description: cleanText(extracted.description) || null,
    short_description: cleanText(extracted.short_description) || null,
    eligibility: cleanText(extracted.eligibility) || null,
    eligibility_summary: cleanText(extracted.eligibility_summary) || null,
    industry_tags: normalizeTagList(extracted.industry_tags, ALLOWED_INDUSTRY_TAGS),
    stage_tags: normalizeTagList(extracted.stage_tags, ALLOWED_STAGE_TAGS),
    goal_tags: normalizeTagList(extracted.goal_tags, ALLOWED_GOAL_TAGS),
    supports_rd:
      typeof extracted.supports_rd === 'boolean' ? extracted.supports_rd : null,
    intake_status: normalizeIntakeStatus(extracted.intake_status),
    url: normalizedUrl,
    source_name: sourceName,
    source_url: normalizedUrl,
    source_program_id: sourceProgramId,
    verification_status: 'review_pending',
    is_active: false,
    last_verified_at: new Date().toISOString(),
    sort_priority: 35,
    updated_at: new Date().toISOString(),
    business_relevance: normalizeBusinessRelevance(extracted.business_relevance),
    stackable:
      typeof extracted.stackable === 'boolean' ? extracted.stackable : null,
    funding_percentage:
      typeof extracted.funding_percentage === 'number'
        ? extracted.funding_percentage
        : null,
    program_level: cleanText(extracted.program_level) || null,
    stack_notes: cleanText(extracted.stack_notes) || null,
    max_stack_cap:
      typeof extracted.max_stack_cap === 'number'
        ? extracted.max_stack_cap
        : null,
  }

  const extractionMeta: ExtractionMeta = {
    page_type: classification.page_type,
    page_confidence: classification.confidence,
    page_reasoning: classification.reasoning,
    overall_confidence: normalizeConfidence(extracted.overall_confidence),
    evidence: {
      name: cleanText(extracted.name_evidence) || null,
      organization: cleanText(extracted.organization_evidence) || null,
      amount: cleanText(extracted.amount_evidence) || null,
      funding_type: cleanText(extracted.funding_type_evidence) || null,
      repayable: cleanText(extracted.repayable_evidence) || null,
      eligibility: cleanText(extracted.eligibility_evidence) || null,
      intake_status: cleanText(extracted.intake_status_evidence) || null,
    },
  }

  const { error } = await supabaseAdmin.from('grants').insert(grantRow)
  if (error) throw error

  return {
    url: normalizedUrl,
    success: true,
    status: 'inserted' as const,
    message: 'Grant extracted and added to Pending Review.',
    grant: grantRow,
    extractionMeta,
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const singleUrl: string =
      typeof body?.url === 'string' ? body.url.trim() : ''

    const batchUrls: string[] = Array.isArray(body?.urls)
      ? (body.urls as unknown[])
          .map((u) => String(u).trim())
          .filter((u): u is string => Boolean(u))
      : []

    const urls: string[] =
      batchUrls.length > 0 ? batchUrls : singleUrl ? [singleUrl] : []

    if (urls.length === 0) {
      return NextResponse.json(
        { error: 'At least one URL is required.' },
        { status: 400 }
      )
    }

    if (urls.length > 5) {
      return NextResponse.json(
        { error: 'Maximum 5 URLs allowed per batch.' },
        { status: 400 }
      )
    }

    const uniqueUrls: string[] = Array.from(new Set(urls))

    const results: Array<{
      url: string
      success: boolean
      status: 'inserted' | 'skipped' | 'failed'
      message?: string
      error?: string
      grant?: Record<string, unknown>
      extractionMeta?: ExtractionMeta
    }> = []

    let inserted = 0
let skipped = 0
let failed = 0

    for (const url of uniqueUrls) {
      try {
        const result = await processSingleUrl(url)
        results.push(result)

        if (result.status === 'inserted') inserted++
        else if (result.status === 'skipped') skipped++
        else failed++
      } catch (error) {
        results.push({
          url,
          success: false,
          status: 'failed',
          error: error instanceof Error ? error.message : 'AI extraction failed',
        })
        failed++
      }
    }

    const hasOnlyOne = uniqueUrls.length === 1
    const first = results[0]

    if (hasOnlyOne && first) {
      if (!first.success && first.status === 'skipped') {
        return NextResponse.json(
          {
            error: first.error || 'This URL was skipped.',
            classification: first.extractionMeta,
            results,
            summary: { inserted, updated: 0, skipped, failed }
          },
          { status: 400 }
        )
      }

      if (!first.success) {
        return NextResponse.json(
          {
            error: first.error || 'Extraction failed.',
            results,
           summary: { inserted, updated: 0, skipped, failed }
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        action: first.status,
        message: first.message,
        grant: first.grant,
        extractionMeta: first.extractionMeta,
        results,
        summary: { inserted, updated: 0, skipped, failed }
      })
    }

    return NextResponse.json({
      success: failed === 0,
      message:
        failed === 0
          ? 'Batch extraction completed.'
          : 'Batch extraction completed with some failures.',
      results,
      summary: { inserted, updated: 0, skipped, failed }
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'AI extraction failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}