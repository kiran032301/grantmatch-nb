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
  url: string | null
  is_active: boolean | null
  verification_status: string | null
}

const NBIF_PROGRAMS = [
  {
    name: 'Emerging Concepts and Technologies Program',
    url: 'https://nbif.ca/emerging-concepts-and-technologies-ect-program/',
    sourceProgramId: 'nbif-emerging-concepts-and-technologies-program',
    sortPriority: 10,
  },
  {
    name: 'Cleantech Momentum Program',
    url: 'https://nbif.ca/corporate-cleantech-innovation-fund/',
    sourceProgramId: 'nbif-cleantech-momentum-program',
    sortPriority: 11,
  },
  {
    name: 'Innovation Voucher Fund',
    url: 'https://nbif.ca/innovation-voucher-fund/',
    sourceProgramId: 'nbif-innovation-voucher-fund',
    sortPriority: 12,
  },
  {
    name: 'Startup Investment Fund',
    url: 'https://nbif.ca/startup-investment-fund/',
    sourceProgramId: 'nbif-startup-investment-fund',
    sortPriority: 13,
  },
  {
    name: 'Venture Capital Fund',
    url: 'https://nbif.ca/venture-capital-fund/',
    sourceProgramId: 'nbif-venture-capital-fund',
    sortPriority: 14,
  },
]

function cleanText(value?: string | null): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function extractMoneyRange(text: string): { min: number | null; max: number | null } {
  const matches = [...text.matchAll(/\$([\d,]+)/g)].map((m) =>
    Number(m[1].replace(/,/g, ''))
  )

  if (matches.length === 0) return { min: null, max: null }
  if (matches.length === 1) return { min: null, max: matches[0] }

  return {
    min: Math.min(...matches),
    max: Math.max(...matches),
  }
}

function inferRepayable(text: string): boolean | null {
  const lower = text.toLowerCase()

  if (lower.includes('non-repayable')) return false
  if (lower.includes('non-payable')) return false
  if (lower.includes('non-dilutive')) return false
  if (lower.includes('grant')) return false

  if (lower.includes('equity')) return true
  if (lower.includes('investment fund')) return true
  if (lower.includes('venture capital')) return true
  if (lower.includes('repayable')) return true
  if (lower.includes('loan')) return true

  return null
}

function inferFundingType(text: string): string {
  const lower = text.toLowerCase()

  if (lower.includes('venture capital')) return 'loan'
  if (lower.includes('equity')) return 'loan'
  if (lower.includes('investment fund')) return 'loan'
  if (lower.includes('grant')) return 'grant'

  return 'grant'
}

function inferIntakeStatus(text: string): string {
  const lower = text.toLowerCase()

  if (lower.includes('applications are due') || lower.includes('apply') || lower.includes('open')) {
    return 'open'
  }
  if (lower.includes('rolling')) return 'rolling'
  if (lower.includes('upcoming')) return 'upcoming'
  if (lower.includes('closed')) return 'closed'

  return 'open'
}

function inferGoalTags(text: string, title: string): string[] {
  const lower = `${title} ${text}`.toLowerCase()
  const tags = new Set<string>()

  if (lower.includes('innovation')) tags.add('innovation')
  if (lower.includes('r&d') || lower.includes('research')) tags.add('r_and_d')
  if (lower.includes('commercialization')) tags.add('product_development')
  if (lower.includes('prototype')) tags.add('product_development')
  if (lower.includes('market') || lower.includes('export')) tags.add('market_expansion')
  if (lower.includes('productivity')) tags.add('productivity')
  if (lower.includes('emissions') || lower.includes('climate') || lower.includes('clean')) {
    tags.add('sustainability')
  }
  if (lower.includes('investment')) tags.add('investment')

  return [...tags]
}

function inferIndustryTags(text: string, title: string): string[] {
  const lower = `${title} ${text}`.toLowerCase()
  const tags = new Set<string>()

  if (lower.includes('cleantech') || lower.includes('climate') || lower.includes('emissions')) {
    tags.add('clean_energy')
  }
  if (lower.includes('technology')) tags.add('technology')
  if (lower.includes('small and medium-sized enterprises') || lower.includes('smes')) {
    tags.add('general')
  }

  if (tags.size === 0) tags.add('general')
  return [...tags]
}

function inferStageTags(text: string, title: string): string[] {
  const lower = `${title} ${text}`.toLowerCase()
  const tags = new Set<string>()

  if (lower.includes('early-stage')) tags.add('startup')
  if (lower.includes('startup')) tags.add('startup')
  if (lower.includes('expanding')) tags.add('growth')
  if (lower.includes('existing sme')) tags.add('growth')
  if (lower.includes('small and medium-sized enterprises')) {
    tags.add('growth')
    tags.add('established')
  }

  if (tags.size === 0) {
    tags.add('startup')
    tags.add('growth')
  }

  return [...tags]
}

function inferBusinessRelevance(text: string): 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase()

  const highSignals = [
    'innovation',
    'research',
    'r&d',
    'commercialization',
    'investment',
    'venture',
    'startup',
    'technology',
    'product',
    'sme',
    'cleantech',
  ]

  const highHits = highSignals.filter((t) => lower.includes(t)).length

  if (highHits >= 2) return 'high'
  if (highHits >= 1) return 'medium'
  return 'low'
}

async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      'User-Agent': 'GrantMatchNB-NBIF-Importer/1.0',
    },
  })

  return response.data
}

function getSectionText($: cheerio.CheerioAPI, headingText: string): string | null {
  const headings = $('h2, h3, h4').toArray()

  for (const heading of headings) {
    const text = cleanText($(heading).text()).toLowerCase()
    if (!text.includes(headingText.toLowerCase())) continue

    const collected: string[] = []
    let node = heading.nextSibling

    while (node) {
      const tagName = (node as { name?: string }).name?.toLowerCase?.() || ''
      if (['h2', 'h3', 'h4'].includes(tagName)) break

      const nodeText = cleanText($(node).text())
      if (nodeText) collected.push(nodeText)

      node = node.nextSibling
    }

    const result = cleanText(collected.join(' '))
    if (result) return result
  }

  return null
}

async function parseNbifPage(
  name: string,
  url: string,
  sourceProgramId: string,
  sortPriority: number
): Promise<ImportedGrant> {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)

  const title = cleanText($('h1').first().text()) || name

  const paragraphs = $('p')
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean)

  const pageText = cleanText($('body').text())
  const description = cleanText(paragraphs[0] || title)

  const financialStructure =
    getSectionText($, 'Financial Structure') ||
    getSectionText($, 'Financial structure') ||
    ''

  const eligibility =
    getSectionText($, 'Eligibility') ||
    paragraphs.find((p) => /eligible|eligibility|open to/i.test(p)) ||
    'See source page for detailed eligibility requirements.'

  const amountText = `${financialStructure} ${pageText}`
  const { min, max } = extractMoneyRange(amountText)

  const combinedText = `${title} ${financialStructure} ${pageText}`

  const fundingType = inferFundingType(combinedText)
  const repayable = inferRepayable(combinedText)
  const intakeStatus = inferIntakeStatus(pageText)
  const goalTags = inferGoalTags(pageText, title)
  const industryTags = inferIndustryTags(pageText, title)
  const stageTags = inferStageTags(pageText, title)
  const businessRelevance = inferBusinessRelevance(combinedText)
  const supportsRd = /r&d|research|innovation|commercialization|prototype/i.test(pageText)

  return {
    name: title,
    organization: 'New Brunswick Innovation Foundation (NBIF)',
    amount_min: min,
    amount_max: max,
    type: fundingType === 'loan' ? 'loan' : 'grant',
    funding_type: fundingType,
    provider_type: 'innovation_foundation',
    repayable,
    description,
    short_description: description,
    eligibility,
    eligibility_summary: eligibility,
    industry_tags: industryTags,
    stage_tags: stageTags,
    goal_tags: goalTags,
    supports_rd: supportsRd,
    intake_status: intakeStatus,
    url,
    source_name: 'NBIF',
    source_url: url,
    source_program_id: sourceProgramId,
    verification_status: 'review_pending',
    is_active: false,
    last_verified_at: new Date().toISOString(),
    sort_priority: sortPriority,
    updated_at: new Date().toISOString(),
    business_relevance: businessRelevance,
  }
}

async function syncPrograms(programs: ImportedGrant[]) {
  const urls = programs.map((p) => p.url).filter(Boolean) as string[]

  const { data: existingRows, error: existingError } = await supabase
    .from('grants')
    .select('id, url, is_active, verification_status')
    .in('url', urls)

  if (existingError) {
    throw existingError
  }

  const existingMap = new Map(
    ((existingRows || []) as ExistingGrantRow[]).map((row) => [row.url, row])
  )

  const newRows = programs
    .filter((row) => row.url && !existingMap.has(row.url))
    .map((row) => ({
      ...row,
      is_active: false,
      verification_status: 'review_pending',
      updated_at: new Date().toISOString(),
    }))

  const updateRows = programs
    .filter((row) => row.url && existingMap.has(row.url))
    .map((row) => {
      const existing = existingMap.get(row.url!)
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
  console.log('Fetching NBIF program pages...')

  const programs: ImportedGrant[] = []

  for (const program of NBIF_PROGRAMS) {
    console.log(`Parsing: ${program.name}`)
    const grant = await parseNbifPage(
      program.name,
      program.url,
      program.sourceProgramId,
      program.sortPriority
    )
    programs.push(grant)
  }

  const result = await syncPrograms(programs)

  console.log('\nNBIF import complete')
  console.log(`Inserted: ${result.inserted}`)
  console.log(`Updated: ${result.updated}`)
  console.log('Failed: 0')
}

main().catch((error) => {
  console.error('NBIF importer failed:', error)
  process.exit(1)
})