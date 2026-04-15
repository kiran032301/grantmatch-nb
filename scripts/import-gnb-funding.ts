import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

console.log('SUPABASE URL loaded:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SERVICE ROLE loaded:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

import * as cheerio from 'cheerio'
import { createClient } from '@supabase/supabase-js'

type GrantRow = {
  name: string
  organization: string | null
  description: string | null
  short_description: string | null
  funding_type: string | null
  type: string | null
  provider_type: string | null
  repayable: boolean | null
  eligibility: string | null
  eligibility_summary: string | null
  intake_status: string | null
  url: string | null
  is_active: boolean
  verification_status: string
  source_name: string
  business_relevance: string
  sort_priority: number
  industry_tags: string[] | null
  stage_tags: string[] | null
  goal_tags: string[] | null
}

type ExistingGrantRow = {
  id: string
  url: string | null
  is_active: boolean | null
  verification_status: string | null
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables.')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const SOURCE_URL = 'https://www.gnb.ca/en/topic/business-economy/funding-grants.html'

function absoluteUrl(href: string | undefined): string | null {
  if (!href) return null
  if (href.startsWith('http://') || href.startsWith('https://')) return href
  if (href.startsWith('/')) return `https://www.gnb.ca${href}`
  return `https://www.gnb.ca/${href.replace(/^\.?\//, '')}`
}

function inferFundingType(name: string, description: string): {
  funding_type: string | null
  type: string | null
  repayable: boolean | null
} {
  const text = `${name} ${description}`.toLowerCase()

  if (text.includes('tax credit')) {
    return { funding_type: 'tax_credit', type: 'tax_credit', repayable: false }
  }

  if (text.includes('loan')) {
    return { funding_type: 'loan', type: 'loan', repayable: true }
  }

  if (text.includes('grant') || text.includes('funding') || text.includes('support')) {
    return { funding_type: 'grant', type: 'grant', repayable: false }
  }

  if (text.includes('investment') || text.includes('capital')) {
    return { funding_type: 'investment', type: 'grant', repayable: null }
  }

  if (text.includes('rebate')) {
    return { funding_type: 'rebate', type: 'grant', repayable: false }
  }

  return { funding_type: 'grant', type: 'grant', repayable: null }
}

function inferTags(name: string, description: string) {
  const text = `${name} ${description}`.toLowerCase()

  const industryTags = new Set<string>()
  const stageTags = new Set<string>()
  const goalTags = new Set<string>()

  if (text.includes('mining')) industryTags.add('mining')

  if (text.includes('film') || text.includes('television') || text.includes('media')) {
    industryTags.add('media')
  }

  if (text.includes('museum')) industryTags.add('culture')

  if (text.includes('writer') || text.includes('publisher') || text.includes('literary')) {
    industryTags.add('culture')
  }

  if (text.includes('innovation') || text.includes('technology')) {
    industryTags.add('technology')
  }

  if (text.includes('start-up') || text.includes('startup') || text.includes('seed')) {
    stageTags.add('startup')
  }

  if (text.includes('existing businesses') || text.includes('next level')) {
    stageTags.add('growth')
  }

  if (text.includes('investment') || text.includes('capital')) {
    goalTags.add('investment')
  }

  if (text.includes('innovation')) {
    goalTags.add('innovation')
    goalTags.add('r_and_d')
  }

  if (text.includes('grow')) {
    goalTags.add('market_expansion')
  }

  if (text.includes('community development')) {
    goalTags.add('market_expansion')
  }

  return {
    industry_tags: industryTags.size ? Array.from(industryTags) : null,
    stage_tags: stageTags.size ? Array.from(stageTags) : null,
    goal_tags: goalTags.size ? Array.from(goalTags) : null,
  }
}

function classifyOrganization(name: string, url: string | null): {
  organization: string | null
  source_name: string
  provider_type: string | null
  business_relevance: string
  sort_priority: number
} {
  const lowerName = name.toLowerCase()
  const lowerUrl = (url || '').toLowerCase()

  if (lowerName.includes('opportunities nb') || lowerUrl.includes('onbcanada')) {
    return {
      organization: 'Opportunities NB',
      source_name: 'onb',
      provider_type: 'provincial',
      business_relevance: 'high',
      sort_priority: 15,
    }
  }

  if (lowerName.includes('innovation foundation') || lowerUrl.includes('nbif')) {
    return {
      organization: 'NBIF',
      source_name: 'nbif',
      provider_type: 'innovation',
      business_relevance: 'high',
      sort_priority: 12,
    }
  }

  if (
    lowerName.includes('atlantic canada opportunities agency') ||
    lowerUrl.includes('canada.ca')
  ) {
    return {
      organization: 'ACOA',
      source_name: 'federal_partner',
      provider_type: 'federal',
      business_relevance: 'medium',
      sort_priority: 40,
    }
  }

  if (lowerName.includes('community business development')) {
    return {
      organization: 'CBDC',
      source_name: 'external_partner',
      provider_type: 'partner',
      business_relevance: 'medium',
      sort_priority: 50,
    }
  }

  return {
    organization: 'Government of New Brunswick',
    source_name: 'gnb_funding_portal',
    provider_type: 'provincial',
    business_relevance: 'high',
    sort_priority: 20,
  }
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'GrantMatch-NB-Importer/1.0',
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`)
  }

  return await res.text()
}

async function main() {
  console.log(`Fetching ${SOURCE_URL}`)
  const html = await fetchHtml(SOURCE_URL)
  const $ = cheerio.load(html)

  const rows: GrantRow[] = []

  $('a').each((_, el) => {
    const name = $(el).text().trim()

    const blockedTitles = new Set([
      'other funding and resources',
      'from provincial government',
    ])

    if (blockedTitles.has(name.toLowerCase())) return

    const href = $(el).attr('href')
    const url = absoluteUrl(href)

    if (!name || !url) return

    const parentText = $(el).parent().text().trim()
    const description = parentText.replace(name, '').trim() || null

    const lowerName = name.toLowerCase()
    const lowerUrl = url.toLowerCase()

    const isRelevant =
      lowerUrl.includes('gnb.ca') ||
      lowerUrl.includes('onbcanada.ca') ||
      lowerUrl.includes('nbif.ca') ||
      lowerUrl.includes('canada.ca') ||
      lowerUrl.includes('cbdc.ca') ||
      lowerUrl.includes('fcnb.ca')

    const looksLikeFundingItem =
      lowerName.includes('grant') ||
      lowerName.includes('fund') ||
      lowerName.includes('funding') ||
      lowerName.includes('capital') ||
      lowerName.includes('credit') ||
      lowerName.includes('innovation') ||
      lowerName.includes('development')

    if (!isRelevant || !looksLikeFundingItem) return

    const fundingMeta = inferFundingType(name, description || '')
    const tagMeta = inferTags(name, description || '')
    const orgMeta = classifyOrganization(name, url)

    rows.push({
      name,
      organization: orgMeta.organization,
      description,
      short_description: description,
      funding_type: fundingMeta.funding_type,
      type: fundingMeta.type,
      provider_type: orgMeta.provider_type,
      repayable: fundingMeta.repayable,
      eligibility: null,
      eligibility_summary: null,
      intake_status: 'unknown',
      url,
      is_active: false,
      verification_status: 'review_pending',
      source_name: orgMeta.source_name,
      business_relevance: orgMeta.business_relevance,
      sort_priority: orgMeta.sort_priority,
      industry_tags: tagMeta.industry_tags,
      stage_tags: tagMeta.stage_tags,
      goal_tags: tagMeta.goal_tags,
    })
  })

  const deduped = Array.from(new Map(rows.map((row) => [row.url, row])).values())

  console.log(`Found ${deduped.length} unique funding/resource items`)

  if (!deduped.length) {
    console.log('Nothing to import.')
    return
  }

  const urls = deduped.map((row) => row.url).filter(Boolean) as string[]

  const { data: existingRows, error: existingError } = await supabase
    .from('grants')
    .select('id, url, is_active, verification_status')
    .in('url', urls)

  if (existingError) {
    console.error('Failed to load existing grants:', existingError)
    process.exit(1)
  }

  const existingMap = new Map(
    ((existingRows || []) as ExistingGrantRow[]).map((row) => [row.url, row])
  )

  const newRows = deduped
    .filter((row) => row.url && !existingMap.has(row.url))
    .map((row) => ({
      ...row,
      is_active: false,
      verification_status: 'review_pending',
    }))

  const updateRows = deduped
    .filter((row) => row.url && existingMap.has(row.url))
    .map((row) => {
      const existing = existingMap.get(row.url!)

      return {
        ...row,
        id: existing!.id,
        is_active: existing!.is_active ?? false,
        verification_status: existing!.verification_status ?? 'review_pending',
      }
    })

  if (newRows.length > 0) {
    const { error: insertError } = await supabase.from('grants').insert(newRows)

    if (insertError) {
      console.error('Insert failed:', insertError)
      process.exit(1)
    }
  }

  if (updateRows.length > 0) {
    const { error: updateError } = await supabase
      .from('grants')
      .upsert(updateRows, { onConflict: 'id' })

    if (updateError) {
      console.error('Update failed:', updateError)
      process.exit(1)
    }
  }

  console.log(
    `Import completed successfully. New: ${newRows.length}, Updated: ${updateRows.length}`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})