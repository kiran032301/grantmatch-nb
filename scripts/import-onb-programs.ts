import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

console.log('SUPABASE URL loaded:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SERVICE ROLE loaded:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

import axios from 'axios'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const ONB_GROW_URL = 'https://onbcanada.ca/businesses/grow/'
const ONB_TARIFF_SUPPORT_URL =
  'https://onbcanada.ca/opportunities-nbs-support-plan-for-new-brunswick-businesses-affected-by-u-s-tariffs/'

type ImportedGrant = {
  name: string
  organization: string | null
  amount_min: number | null
  amount_max: number | null
  type: string | null
  funding_type: string | null
  provider_type: string | null
  repayable: boolean | null
  description: string | null
  short_description: string | null
  eligibility: string | null
  eligibility_summary: string | null
  industry_tags: string[]
  stage_tags: string[]
  goal_tags: string[]
  supports_rd: boolean | null
  intake_status: string | null
  url: string | null
  source_name: string | null
  source_url: string | null
  source_program_id: string | null
  verification_status: string | null
  is_active: boolean
  last_verified_at: string
  sort_priority: number | null
  updated_at: string
  business_relevance: 'high' | 'medium' | 'low'
}

type ExistingGrantRow = {
  id: string
  source_name: string | null
  source_program_id: string | null
  is_active: boolean | null
  verification_status: string | null
}

function cleanText(value?: string | null): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildUniqueProgramUrl(sourceUrl: string, sourceProgramId: string): string {
  return `${sourceUrl}#${sourceProgramId}`
}

async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      'User-Agent': 'GrantMatchNB-ONB-Importer/1.0',
    },
  })

  return response.data
}

async function extractPageSummary(url: string): Promise<string> {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)

  const paragraphs = $('p')
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean)

  const heading = cleanText($('h1').first().text())
  const summary = cleanText(
    paragraphs.find((p) =>
      /funding|job creation|productivity|market development|innovation|support/i.test(p)
    ) || paragraphs[0] || heading
  )

  return summary
}

function inferBusinessRelevance(text: string): 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase()

  const highSignals = [
    'business',
    'company',
    'companies',
    'export',
    'innovation',
    'research',
    'r&d',
    'commercialization',
    'productivity',
    'investment',
    'workforce',
    'hiring',
    'training',
    'market development',
    'job creation',
    'competitiveness',
    'tariff',
  ]

  const lowSignals = [
    'museum',
    'heritage',
    'writers',
    'publisher',
    'artists',
    'culture',
    'festival',
    'community',
    'school',
    'student',
  ]

  const highHits = highSignals.filter((term) => lower.includes(term)).length
  const lowHits = lowSignals.filter((term) => lower.includes(term)).length

  if (highHits >= 2 && lowHits === 0) return 'high'
  if (highHits >= 1) return 'medium'
  return 'low'
}

function inferIndustryTags(text: string): string[] {
  const lower = text.toLowerCase()
  const tags = new Set<string>()

  if (
    lower.includes('technology') ||
    lower.includes('software') ||
    lower.includes('digital')
  ) {
    tags.add('technology')
  }

  if (lower.includes('manufacturing')) tags.add('manufacturing')
  if (lower.includes('agriculture')) tags.add('agriculture')
  if (lower.includes('tourism')) tags.add('tourism')
  if (lower.includes('construction')) tags.add('construction')
  if (lower.includes('professional')) tags.add('professional_services')
  if (lower.includes('clean') || lower.includes('energy')) tags.add('clean_energy')

  if (tags.size === 0) tags.add('general')
  return [...tags]
}

function inferStageTags(): string[] {
  return ['startup', 'growth', 'established']
}

function baseGrant(
  name: string,
  description: string,
  goalTags: string[],
  supportsRd: boolean,
  sourceUrl: string,
  sourceProgramId: string,
  sortPriority = 50
): ImportedGrant {
  const combinedText = `${name} ${description}`
  const industryTags = inferIndustryTags(combinedText)
  const stageTags = inferStageTags()
  const businessRelevance = inferBusinessRelevance(combinedText)

  return {
    name,
    organization: 'Opportunities NB',
    amount_min: null,
    amount_max: null,
    type: 'grant',
    funding_type: 'grant',
    provider_type: 'crown_agency',
    repayable: null,
    description,
    short_description: description,
    eligibility:
      'Eligible New Brunswick companies should contact Opportunities NB to confirm program availability and fit.',
    eligibility_summary:
      'For eligible New Brunswick businesses; contact Opportunities NB for exact criteria and support details.',
    industry_tags: industryTags,
    stage_tags: stageTags,
    goal_tags: goalTags,
    supports_rd: supportsRd,
    intake_status: 'open',
    url: buildUniqueProgramUrl(sourceUrl, sourceProgramId),
    source_name: 'ONB',
    source_url: sourceUrl,
    source_program_id: sourceProgramId,
    verification_status: 'review_pending',
    is_active: false,
    last_verified_at: new Date().toISOString(),
    sort_priority: sortPriority,
    updated_at: new Date().toISOString(),
    business_relevance: businessRelevance,
  }
}

function buildOnbPrograms(growSummary: string, tariffSummary: string): ImportedGrant[] {
  return [
    baseGrant(
      'ONB Job Creation Support',
      `${growSummary} This support stream focuses on job creation and business growth in New Brunswick.`,
      ['hiring'],
      false,
      ONB_GROW_URL,
      slugify('ONB Job Creation Support'),
      15
    ),
    baseGrant(
      'ONB Productivity Improvement Support',
      `${growSummary} This support stream focuses on productivity improvement and operational competitiveness.`,
      ['productivity', 'investment'],
      false,
      ONB_GROW_URL,
      slugify('ONB Productivity Improvement Support'),
      16
    ),
    baseGrant(
      'ONB Market Development Support',
      `${growSummary} This support stream focuses on market development and helping companies expand into new markets.`,
      ['market_expansion', 'export'],
      false,
      ONB_GROW_URL,
      slugify('ONB Market Development Support'),
      17
    ),
    baseGrant(
      'ONB Innovation Support',
      `${growSummary} This support stream focuses on innovation and business development opportunities.`,
      ['innovation', 'r_and_d', 'product_development'],
      true,
      ONB_GROW_URL,
      slugify('ONB Innovation Support'),
      18
    ),
    baseGrant(
      'ONB Tariff Resilience Support',
      `${tariffSummary} This support stream is intended to help New Brunswick businesses respond to tariff-related business pressures and strengthen resilience.`,
      ['market_expansion', 'productivity', 'sustainability'],
      false,
      ONB_TARIFF_SUPPORT_URL,
      slugify('ONB Tariff Resilience Support'),
      19
    ),
  ]
}

async function syncPrograms(programs: ImportedGrant[]) {
  const programIds = programs
    .map((p) => p.source_program_id)
    .filter(Boolean) as string[]

  const { data: existingRows, error: existingError } = await supabase
    .from('grants')
    .select('id, source_name, source_program_id, is_active, verification_status')
    .eq('source_name', 'ONB')
    .in('source_program_id', programIds)

  if (existingError) {
    throw existingError
  }

  const existingMap = new Map(
    ((existingRows || []) as ExistingGrantRow[]).map((row) => [row.source_program_id, row])
  )

  const newRows = programs
    .filter((row) => row.source_program_id && !existingMap.has(row.source_program_id))
    .map((row) => ({
      ...row,
      is_active: false,
      verification_status: 'review_pending',
      updated_at: new Date().toISOString(),
    }))

  const updateRows = programs
    .filter((row) => row.source_program_id && existingMap.has(row.source_program_id))
    .map((row) => {
      const existing = existingMap.get(row.source_program_id!)
      return {
        ...row,
        id: existing!.id,
        is_active: existing!.is_active ?? false,
        verification_status: existing!.verification_status ?? 'review_pending',
        updated_at: new Date().toISOString(),
      }
    })

  if (newRows.length > 0) {
    const { error } = await supabase.from('grants').insert(newRows)
    if (error) throw error
  }

  if (updateRows.length > 0) {
    const { error } = await supabase
      .from('grants')
      .upsert(updateRows, { onConflict: 'id' })
    if (error) throw error
  }

  return {
    inserted: newRows.length,
    updated: updateRows.length,
  }
}

async function main() {
  console.log('Fetching ONB source pages...')

  const [growSummary, tariffSummary] = await Promise.all([
    extractPageSummary(ONB_GROW_URL),
    extractPageSummary(ONB_TARIFF_SUPPORT_URL),
  ])

  console.log('ONB grow summary:', growSummary)
  console.log('ONB tariff summary:', tariffSummary)

  const programs = buildOnbPrograms(growSummary, tariffSummary)
  console.log(`Prepared ${programs.length} ONB program records`)

  const result = await syncPrograms(programs)

  console.log('\nONB import complete')
  console.log(`Inserted: ${result.inserted}`)
  console.log(`Updated: ${result.updated}`)
  console.log('Failed: 0')
}

main().catch((error) => {
  console.error('ONB importer failed:', error)
  process.exit(1)
})