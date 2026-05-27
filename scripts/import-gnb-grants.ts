import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import axios from 'axios'
import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const FUNDING_INDEX_URL =
  'https://www.gnb.ca/en/topic/business-economy/funding-grants.html'

type ImportedGrant = {
  name: string
  organization: string | null
  description: string | null
  short_description: string | null
  eligibility: string | null
  eligibility_summary: string | null
  amount_min: number | null
  amount_max: number | null
  type: string | null
  funding_type: string | null
  provider_type: string | null
  repayable: boolean | null
  intake_status: string | null
  url: string
  source_name: string
  source_url: string
  source_program_id: string
  verification_status: string
  is_active: boolean
  last_verified_at: string
  industry_tags: string[]
  stage_tags: string[]
  goal_tags: string[]
  supports_rd: boolean | null
  business_relevance: 'high' | 'medium' | 'low'
}

function toAbsoluteUrl(href: string): string {
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  if (href.startsWith('/')) return `https://www.gnb.ca${href}`
  return `https://www.gnb.ca/${href}`
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function cleanText(value?: string | null): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const v of values) {
    const cleaned = cleanText(v)
    if (cleaned) return cleaned
  }
  return null
}

function normalizeSentence(text: string | null | undefined): string | null {
  const cleaned = cleanText(text)
  if (!cleaned) return null
  return cleaned
}

function getAllParagraphs($: cheerio.CheerioAPI): string[] {
  return $('p, li')
    .map((_, el) => cleanText($(el).text()))
    .get()
    .filter(Boolean)
}

function getSectionText($: cheerio.CheerioAPI, headingPatterns: RegExp[]): string | null {
  const headings = $('h1, h2, h3, h4, strong, b').toArray()

  for (const heading of headings) {
    const headingText = cleanText($(heading).text())
    if (!headingText) continue

    const matched = headingPatterns.some((pattern) => pattern.test(headingText))
    if (!matched) continue

    const collected: string[] = []
    let node = heading.nextSibling

    while (node) {
      const tagName = (node as { name?: string }).name?.toLowerCase?.() || ''
      if (['h1', 'h2', 'h3', 'h4'].includes(tagName)) break

      const nodeText = cleanText($(node).text())
      if (nodeText) collected.push(nodeText)

      node = node.nextSibling
    }

    const result = cleanText(collected.join(' '))
    if (result) return result
  }

  return null
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
  if (lower.includes('repayable')) return true
  if (lower.includes('loan')) return true
  if (lower.includes('grant')) return false
  return null
}

function inferFundingType(text: string): string | null {
  const lower = text.toLowerCase()
  if (lower.includes('tax credit')) return 'tax_credit'
  if (lower.includes('loan')) return 'loan'
  if (lower.includes('rebate')) return 'rebate'
  if (lower.includes('grant')) return 'grant'
  if (lower.includes('fund')) return 'grant'
  return null
}

function inferIntakeStatus(text: string): string {
  const lower = text.toLowerCase()
  if (
    lower.includes('deadline') ||
    lower.includes('apply by') ||
    lower.includes('applications open') ||
    lower.includes('open')
  ) {
    return 'open'
  }
  if (lower.includes('upcoming')) return 'upcoming'
  if (lower.includes('closed')) return 'closed'
  if (lower.includes('ongoing') || lower.includes('rolling')) return 'rolling'
  return 'unknown'
}

function inferGoalTags(text: string): string[] {
  const lower = text.toLowerCase()
  const tags = new Set<string>()

  if (lower.includes('training')) tags.add('training')

  if (lower.includes('export')) {
    tags.add('export')
    tags.add('market_expansion')
  }

  if (lower.includes('innovation') || lower.includes('research') || lower.includes('r&d')) {
    tags.add('innovation')
    tags.add('r_and_d')
    tags.add('product_development')
  }

  if (lower.includes('productivity')) tags.add('productivity')

  if (lower.includes('market') || lower.includes('expand') || lower.includes('expansion')) {
    tags.add('market_expansion')
  }

  if (lower.includes('investment')) tags.add('investment')

  if (lower.includes('workforce') || lower.includes('job') || lower.includes('hire')) {
    tags.add('hiring')
  }

  if (lower.includes('digital') || lower.includes('automation')) {
    tags.add('digital_adoption')
    tags.add('productivity')
  }

  if (
    lower.includes('equipment') ||
    lower.includes('machinery') ||
    lower.includes('capital')
  ) {
    tags.add('equipment')
    tags.add('investment')
  }

  if (
    lower.includes('green') ||
    lower.includes('sustainability') ||
    lower.includes('energy')
  ) {
    tags.add('sustainability')
  }

  return [...tags]
}

function inferIndustryTags(text: string): string[] {
  const lower = text.toLowerCase()
  const tags = new Set<string>()

  if (lower.includes('mining')) tags.add('mining')

  if (lower.includes('film') || lower.includes('television') || lower.includes('media')) {
    tags.add('media')
  }

  if (lower.includes('museum')) tags.add('culture')

  if (lower.includes('writer') || lower.includes('publisher')) {
    tags.add('publishing')
  }

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

  if (lower.includes('energy') || lower.includes('clean')) {
    tags.add('clean_energy')
  }

  if (tags.size === 0) tags.add('general')
  return [...tags]
}

function inferStageTags(): string[] {
  return ['startup', 'growth', 'established']
}

function inferBusinessRelevance(text: string): 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase()

  const highSignals = [
    'small business',
    'business',
    'company',
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
    'industry',
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

function pickBestDescription(
  $: cheerio.CheerioAPI,
  title: string,
  indexSummary: string,
  paragraphs: string[]
): string {
  const sectionDescription =
    getSectionText($, [/about/i, /overview/i, /description/i, /program details?/i]) || null

  const candidate =
    firstNonEmpty(
      sectionDescription,
      paragraphs.find((p) =>
        /funding|support|program|provides|helps|offers|assists|business/i.test(p)
      ),
      indexSummary,
      paragraphs[0],
      title
    ) || title

  return candidate
}

function pickBestEligibility(
  $: cheerio.CheerioAPI,
  paragraphs: string[],
  pageText: string,
  indexSummary: string
): string | null {
  const sectionEligibility =
    getSectionText($, [
      /eligibility/i,
      /who can apply/i,
      /who is eligible/i,
      /applicants?/i,
      /criteria/i,
      /requirements?/i,
    ]) || null

  const paragraphEligibility =
    paragraphs.find((p) =>
      /eligible|eligibility|applicant|businesses|organizations|must be|requirements?/i.test(p)
    ) || null

  const inlineEligibility =
    pageText.match(
      /(eligible[^.]*\.)|(applicants?[^.]*\.)|(businesses[^.]*eligible[^.]*\.)/i
    )?.[0] || null

  return (
    firstNonEmpty(
      sectionEligibility,
      paragraphEligibility,
      inlineEligibility,
      indexSummary
    ) || null
  )
}

function buildShortDescription(
  paragraphsInput: unknown,
  description: string | null,
  title: string
): string | null {
  const paragraphs = Array.isArray(paragraphsInput) ? paragraphsInput : []

  const firstParagraph = paragraphs.find(
    (p) =>
      typeof p === 'string' &&
      p.length > 40 &&
      !/eligibility|apply|deadline|contact|criteria/i.test(p)
  )

  if (typeof firstParagraph === 'string' && firstParagraph) {
    return firstParagraph.length > 200
      ? `${firstParagraph.slice(0, 197).trim()}...`
      : firstParagraph
  }

  const text = normalizeSentence(description || title)
  if (!text) return null

  return text.length > 200
    ? `${text.slice(0, 197).trim()}...`
    : text
}

function buildEligibilitySummary(eligibility: string | null): string | null {
  const text = normalizeSentence(eligibility)
  if (!text) return null

  return text.length > 220
    ? `${text.slice(0, 217).trim()}...`
    : text
}

async function fetchHtml(url: string): Promise<string> {
  const response = await axios.get(url, {
    timeout: 30000,
    headers: {
      'User-Agent': 'GrantMatchNB-Importer/1.0',
    },
  })
  return response.data
}

async function getFundingIndexLinks(): Promise<Array<{ name: string; url: string; summary: string }>> {
  const html = await fetchHtml(FUNDING_INDEX_URL)
  const $ = cheerio.load(html)

  const results: Array<{ name: string; url: string; summary: string }> = []

  $('a').each((_, el) => {
    const href = $(el).attr('href')
    const text = cleanText($(el).text())

    if (!href || !text) return

    const parentText = cleanText($(el).parent().text())
    const absolute = toAbsoluteUrl(href)

    const isFundingSectionLink =
      absolute.includes('/topic/business-economy/funding-grants/') ||
      text.toLowerCase().includes('regional development funds') ||
      text.toLowerCase().includes('small business investor tax credit') ||
      text.toLowerCase().includes('gender equity') ||
      text.toLowerCase().includes('film') ||
      text.toLowerCase().includes('mining') ||
      text.toLowerCase().includes('museum') ||
      text.toLowerCase().includes('writers') ||
      text.toLowerCase().includes('publishers')

    if (!isFundingSectionLink) return

    if (!results.find((r) => r.url === absolute)) {
      results.push({
        name: text,
        url: absolute,
        summary: parentText,
      })
    }
  })

  return results
}

async function parseProgramPage(
  indexName: string,
  url: string,
  indexSummary: string
): Promise<ImportedGrant> {
  const html = await fetchHtml(url)
  const $ = cheerio.load(html)

  const title =
    firstNonEmpty(
      $('h1').first().text(),
      $('title').first().text(),
      indexName
    ) || indexName

  const paragraphs = getAllParagraphs($)
  const pageText = cleanText($('body').text())

  const description = pickBestDescription($, title, indexSummary, paragraphs)
  const eligibility = pickBestEligibility($, paragraphs, pageText, indexSummary)
  const shortDescription = buildShortDescription(paragraphs, description, title)
  const eligibilitySummary = buildEligibilitySummary(eligibility)

  const amountText =
    firstNonEmpty(
      getSectionText($, [/funding/i, /amount/i, /financial/i, /assistance/i]),
      paragraphs.find((p) => /\$[\d,]+/.test(p)),
      pageText.match(/\$[\d,]+[^.]{0,120}/)?.[0] || null
    ) || ''

  const { min, max } = extractMoneyRange(`${amountText} ${pageText}`)

  const combinedText = `${title} ${description} ${eligibility || ''} ${pageText}`

  const fundingType = inferFundingType(combinedText)
  const repayable = inferRepayable(combinedText)
  const intakeStatus = inferIntakeStatus(pageText)
  const goalTags = inferGoalTags(combinedText)
  const industryTags = inferIndustryTags(combinedText)
  const stageTags = inferStageTags()
  const businessRelevance = inferBusinessRelevance(combinedText)
  const supportsRd =
    /r&d|research|innovation|prototype|commercialization/i.test(pageText)

  const organization = url.includes('onbcanada.ca')
    ? 'Opportunities NB'
    : 'Government of New Brunswick'

  return {
    name: title,
    organization,
    description,
    short_description: shortDescription,
    eligibility,
    eligibility_summary: eligibilitySummary,
    amount_min: min,
    amount_max: max,
    type: fundingType,
    funding_type: fundingType,
    provider_type: url.includes('onbcanada.ca') ? 'crown_agency' : 'government',
    repayable,
    intake_status: intakeStatus,
    url,
    source_name: 'GNB',
    source_url: FUNDING_INDEX_URL,
    source_program_id: slugify(title),
    verification_status: 'review_pending',
    is_active: false,
    last_verified_at: new Date().toISOString(),
    industry_tags: industryTags,
    stage_tags: stageTags,
    goal_tags: goalTags,
    supports_rd: supportsRd,
    business_relevance: businessRelevance,
  }
}

async function upsertGrant(grant: ImportedGrant) {
  const { data: existing, error: existingError } = await supabase
    .from('grants')
    .select('id')
    .or(`url.eq.${grant.url},source_program_id.eq.${grant.source_program_id}`)
    .limit(1)
    .maybeSingle()

  if (existingError) {
    throw existingError
  }

  if (existing?.id) {
    const { error } = await supabase
      .from('grants')
      .update({
        name: grant.name,
        organization: grant.organization,
        description: grant.description,
        short_description: grant.short_description,
        eligibility: grant.eligibility,
        eligibility_summary: grant.eligibility_summary,
        amount_min: grant.amount_min,
        amount_max: grant.amount_max,
        type: grant.type,
        funding_type: grant.funding_type,
        provider_type: grant.provider_type,
        repayable: grant.repayable,
        intake_status: grant.intake_status,
        url: grant.url,
        source_name: grant.source_name,
        source_url: grant.source_url,
        source_program_id: grant.source_program_id,
        last_verified_at: grant.last_verified_at,
        industry_tags: grant.industry_tags,
        stage_tags: grant.stage_tags,
        goal_tags: grant.goal_tags,
        supports_rd: grant.supports_rd,
        business_relevance: grant.business_relevance,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)

    if (error) throw error
    return { action: 'updated', id: existing.id }
  }

  const { data, error } = await supabase
    .from('grants')
    .insert({
      ...grant,
      updated_at: new Date().toISOString(),
      verification_status: 'verified',
last_verified_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) throw error
  return { action: 'inserted', id: data.id }
}

async function main() {
  console.log('Fetching GNB funding index...')
  const links = await getFundingIndexLinks()
  console.log(`Found ${links.length} candidate links`)

  let inserted = 0
  let updated = 0
  let failed = 0

  for (const item of links) {
    try {
      console.log(`Parsing: ${item.name} -> ${item.url}`)
      const grant = await parseProgramPage(item.name, item.url, item.summary)
      const result = await upsertGrant(grant)

      if (result.action === 'inserted') inserted++
      if (result.action === 'updated') updated++

      console.log(`✔ ${result.action.toUpperCase()}: ${grant.name}`)
    } catch (error) {
      failed++
      console.error(`✖ FAILED: ${item.url}`)
      console.error(error)
    }
  }

  console.log('\nImport complete')
  console.log(`Inserted: ${inserted}`)
  console.log(`Updated: ${updated}`)
  console.log(`Failed: ${failed}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})