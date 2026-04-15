import { loadEnvConfig } from '@next/env'
loadEnvConfig(process.cwd())

console.log('SUPABASE URL loaded:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SERVICE ROLE loaded:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

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
  stackable?: boolean
  funding_percentage?: number | null
  program_level?: string | null
  stack_notes?: string | null
  max_stack_cap?: number | null
}

type ExistingGrantRow = {
  id: string
  source_name: string | null
  source_program_id: string | null
  is_active: boolean | null
  verification_status: string | null
}

const nowIso = new Date().toISOString()

function buildUniqueProgramUrl(sourceUrl: string, sourceProgramId: string): string {
  return `${sourceUrl}#${sourceProgramId}`
}

const ACOA_PROGRAMS: ImportedGrant[] = [
  {
    name: 'ACOA Business Development Program',
    organization: 'Atlantic Canada Opportunities Agency (ACOA)',
    amount_min: null,
    amount_max: 500000,
    type: 'loan',
    funding_type: 'loan',
    provider_type: 'federal_agency',
    repayable: true,
    description:
      'Provides funding support to help Atlantic Canadian businesses improve competitiveness, expand operations, invest in capital projects, and strengthen long-term growth.',
    short_description:
      'Supports Atlantic Canadian businesses with growth, expansion, and competitiveness projects.',
    eligibility:
      'Eligible Atlantic Canadian businesses, including New Brunswick companies, with projects focused on growth, expansion, productivity, or capital investment.',
    eligibility_summary:
      'Atlantic Canadian businesses with eligible growth, expansion, or investment projects.',
    industry_tags: ['general'],
    stage_tags: ['startup', 'growth', 'established'],
    goal_tags: ['investment', 'productivity', 'market_expansion'],
    supports_rd: false,
    intake_status: 'open',
    url: buildUniqueProgramUrl(
      'https://www.canada.ca/en/atlantic-canada-opportunities/services/business-development-program.html',
      'acoa-business-development-program'
    ),
    source_name: 'ACOA',
    source_url:
      'https://www.canada.ca/en/atlantic-canada-opportunities/services/business-development-program.html',
    source_program_id: 'acoa-business-development-program',
    verification_status: 'review_pending',
    is_active: false,
    last_verified_at: nowIso,
    sort_priority: 20,
    updated_at: nowIso,
    business_relevance: 'high',
    stackable: true,
    funding_percentage: 50,
    program_level: 'federal',
    stack_notes:
      'Often works well as anchor federal support when combined with provincial programs, subject to stacking limits.',
    max_stack_cap: 75,
  },
  {
    name: 'ACOA Regional Economic Growth through Innovation (REGI)',
    organization: 'Atlantic Canada Opportunities Agency (ACOA)',
    amount_min: null,
    amount_max: 300000,
    type: 'grant',
    funding_type: 'grant',
    provider_type: 'federal_agency',
    repayable: false,
    description:
      'Supports innovation, commercialization, productivity, and growth-focused projects across Atlantic Canada, including New Brunswick businesses.',
    short_description:
      'Supports innovation, commercialization, and business growth across Atlantic Canada.',
    eligibility:
      'Eligible Atlantic Canadian businesses and organizations, including New Brunswick companies, with innovation, commercialization, or scale-up projects.',
    eligibility_summary:
      'Atlantic Canadian businesses with innovation, commercialization, or scale-up projects.',
    industry_tags: ['technology', 'general'],
    stage_tags: ['startup', 'growth', 'established'],
    goal_tags: ['innovation', 'r_and_d', 'product_development', 'market_expansion'],
    supports_rd: true,
    intake_status: 'open',
    url: buildUniqueProgramUrl(
      'https://www.canada.ca/en/atlantic-canada-opportunities/services/regional-economic-growth-through-innovation.html',
      'acoa-regi'
    ),
    source_name: 'ACOA',
    source_url:
      'https://www.canada.ca/en/atlantic-canada-opportunities/services/regional-economic-growth-through-innovation.html',
    source_program_id: 'acoa-regi',
    verification_status: 'review_pending',
    is_active: false,
    last_verified_at: nowIso,
    sort_priority: 21,
    updated_at: nowIso,
    business_relevance: 'high',
    stackable: true,
    funding_percentage: 50,
    program_level: 'federal',
    stack_notes:
      'Can complement provincial innovation programs where eligible, subject to government contribution caps.',
    max_stack_cap: 75,
  },
  {
    name: 'ACOA Startup Support',
    organization: 'Atlantic Canada Opportunities Agency (ACOA)',
    amount_min: null,
    amount_max: 100000,
    type: 'grant',
    funding_type: 'grant',
    provider_type: 'federal_agency',
    repayable: false,
    description:
      'Provides support for entrepreneurs and early-stage businesses starting new ventures in Atlantic Canada.',
    short_description:
      'Supports entrepreneurs and early-stage businesses launching new ventures.',
    eligibility:
      'Entrepreneurs and early-stage businesses in Atlantic Canada, including New Brunswick startups.',
    eligibility_summary:
      'Entrepreneurs and early-stage Atlantic Canadian businesses.',
    industry_tags: ['general'],
    stage_tags: ['idea', 'startup'],
    goal_tags: ['investment', 'innovation'],
    supports_rd: false,
    intake_status: 'open',
    url: buildUniqueProgramUrl(
      'https://www.canada.ca/en/atlantic-canada-opportunities/services/acoa-help-me-looking-to-start-business.html',
      'acoa-startup-support'
    ),
    source_name: 'ACOA',
    source_url:
      'https://www.canada.ca/en/atlantic-canada-opportunities/services/acoa-help-me-looking-to-start-business.html',
    source_program_id: 'acoa-startup-support',
    verification_status: 'review_pending',
    is_active: false,
    last_verified_at: nowIso,
    sort_priority: 22,
    updated_at: nowIso,
    business_relevance: 'high',
    stackable: true,
    funding_percentage: 40,
    program_level: 'federal',
    stack_notes:
      'May complement provincial startup or innovation programs depending on the project structure.',
    max_stack_cap: 75,
  },
  {
    name: 'ACOA Business Growth Support',
    organization: 'Atlantic Canada Opportunities Agency (ACOA)',
    amount_min: null,
    amount_max: 250000,
    type: 'loan',
    funding_type: 'loan',
    provider_type: 'federal_agency',
    repayable: true,
    description:
      'Supports Atlantic Canadian businesses expanding operations, improving productivity, and entering new markets.',
    short_description:
      'Supports business expansion, productivity improvements, and market growth.',
    eligibility:
      'Atlantic Canadian businesses, including New Brunswick firms, seeking expansion or market growth projects.',
    eligibility_summary:
      'Atlantic Canadian businesses with expansion or productivity initiatives.',
    industry_tags: ['general'],
    stage_tags: ['growth', 'established'],
    goal_tags: ['market_expansion', 'productivity', 'investment'],
    supports_rd: false,
    intake_status: 'open',
    url: buildUniqueProgramUrl(
      'https://www.canada.ca/en/atlantic-canada-opportunities/services/acoa-help-me-looking-to-grow-an-existing-business.html',
      'acoa-business-growth-support'
    ),
    source_name: 'ACOA',
    source_url:
      'https://www.canada.ca/en/atlantic-canada-opportunities/services/acoa-help-me-looking-to-grow-an-existing-business.html',
    source_program_id: 'acoa-business-growth-support',
    verification_status: 'review_pending',
    is_active: false,
    last_verified_at: nowIso,
    sort_priority: 23,
    updated_at: nowIso,
    business_relevance: 'high',
    stackable: true,
    funding_percentage: 50,
    program_level: 'federal',
    stack_notes:
      'Can serve as a growth-focused federal funding layer alongside provincial supports.',
    max_stack_cap: 75,
  },
  {
    name: 'ACOA Artificial Intelligence Initiative',
    organization: 'Atlantic Canada Opportunities Agency (ACOA)',
    amount_min: null,
    amount_max: 200000,
    type: 'grant',
    funding_type: 'grant',
    provider_type: 'federal_agency',
    repayable: false,
    description:
      'Supports adoption and development of artificial intelligence technologies for business growth, digital transformation, and innovation.',
    short_description:
      'Supports AI adoption and development for business growth and innovation.',
    eligibility:
      'Atlantic Canadian businesses adopting or developing AI solutions, including New Brunswick companies.',
    eligibility_summary:
      'Atlantic Canadian businesses adopting or developing AI-related projects.',
    industry_tags: ['technology'],
    stage_tags: ['startup', 'growth', 'established'],
    goal_tags: ['innovation', 'r_and_d', 'digital_adoption'],
    supports_rd: true,
    intake_status: 'open',
    url: buildUniqueProgramUrl(
      'https://www.canada.ca/en/atlantic-canada-opportunities/services/programs.html',
      'acoa-artificial-intelligence-initiative'
    ),
    source_name: 'ACOA',
    source_url: 'https://www.canada.ca/en/atlantic-canada-opportunities/services/programs.html',
    source_program_id: 'acoa-artificial-intelligence-initiative',
    verification_status: 'review_pending',
    is_active: false,
    last_verified_at: nowIso,
    sort_priority: 24,
    updated_at: nowIso,
    business_relevance: 'high',
    stackable: true,
    funding_percentage: 50,
    program_level: 'federal',
    stack_notes:
      'Strong stack candidate with provincial innovation and digital adoption supports.',
    max_stack_cap: 75,
  },
  {
    name: 'ACOA Defence Investment Initiative',
    organization: 'Atlantic Canada Opportunities Agency (ACOA)',
    amount_min: null,
    amount_max: 250000,
    type: 'grant',
    funding_type: 'grant',
    provider_type: 'federal_agency',
    repayable: false,
    description:
      'Supports defence, security, supply chain development, and innovation-related projects for Atlantic Canadian businesses.',
    short_description:
      'Supports defence, security, and supply chain-related business development.',
    eligibility:
      'Atlantic Canadian businesses in defence, security, advanced manufacturing, and related sectors.',
    eligibility_summary:
      'Atlantic Canadian businesses in defence, security, or related sectors.',
    industry_tags: ['technology', 'manufacturing'],
    stage_tags: ['growth', 'established'],
    goal_tags: ['innovation', 'market_expansion', 'investment'],
    supports_rd: true,
    intake_status: 'open',
    url: buildUniqueProgramUrl(
      'https://www.canada.ca/en/atlantic-canada-opportunities/services/programs.html',
      'acoa-defence-investment-initiative'
    ),
    source_name: 'ACOA',
    source_url: 'https://www.canada.ca/en/atlantic-canada-opportunities/services/programs.html',
    source_program_id: 'acoa-defence-investment-initiative',
    verification_status: 'review_pending',
    is_active: false,
    last_verified_at: nowIso,
    sort_priority: 25,
    updated_at: nowIso,
    business_relevance: 'high',
    stackable: true,
    funding_percentage: 50,
    program_level: 'federal',
    stack_notes:
      'Can complement sector-specific provincial funding where eligibility overlaps.',
    max_stack_cap: 75,
  },
  {
    name: 'ACOA Productivity and Competitiveness Support',
    organization: 'Atlantic Canada Opportunities Agency (ACOA)',
    amount_min: null,
    amount_max: 150000,
    type: 'grant',
    funding_type: 'grant',
    provider_type: 'federal_agency',
    repayable: false,
    description:
      'Helps businesses improve efficiency, productivity, modernization, and overall competitiveness.',
    short_description:
      'Helps businesses improve productivity and competitiveness.',
    eligibility:
      'Atlantic Canadian businesses seeking operational improvements, modernization, or productivity gains.',
    eligibility_summary:
      'Atlantic Canadian businesses pursuing productivity or modernization projects.',
    industry_tags: ['general'],
    stage_tags: ['startup', 'growth', 'established'],
    goal_tags: ['productivity'],
    supports_rd: false,
    intake_status: 'open',
    url: buildUniqueProgramUrl(
      'https://www.canada.ca/en/atlantic-canada-opportunities.html',
      'acoa-productivity-and-competitiveness-support'
    ),
    source_name: 'ACOA',
    source_url: 'https://www.canada.ca/en/atlantic-canada-opportunities.html',
    source_program_id: 'acoa-productivity-and-competitiveness-support',
    verification_status: 'review_pending',
    is_active: false,
    last_verified_at: nowIso,
    sort_priority: 26,
    updated_at: nowIso,
    business_relevance: 'high',
    stackable: true,
    funding_percentage: 40,
    program_level: 'federal',
    stack_notes:
      'Useful as a complementary productivity layer in a broader funding strategy.',
    max_stack_cap: 75,
  },
  {
    name: 'ACOA Sustainability and Green Transition Support',
    organization: 'Atlantic Canada Opportunities Agency (ACOA)',
    amount_min: null,
    amount_max: 200000,
    type: 'grant',
    funding_type: 'grant',
    provider_type: 'federal_agency',
    repayable: false,
    description:
      'Supports greener operations, emissions reduction, energy efficiency, and sustainability-focused business initiatives.',
    short_description:
      'Supports sustainability, emissions reduction, and green transition projects.',
    eligibility:
      'Atlantic Canadian businesses pursuing sustainability, clean operations, or green transition projects.',
    eligibility_summary:
      'Atlantic Canadian businesses with sustainability or green transition initiatives.',
    industry_tags: ['general', 'clean_energy'],
    stage_tags: ['growth', 'established'],
    goal_tags: ['sustainability'],
    supports_rd: false,
    intake_status: 'open',
    url: buildUniqueProgramUrl(
      'https://www.canada.ca/en/atlantic-canada-opportunities.html',
      'acoa-sustainability-and-green-transition-support'
    ),
    source_name: 'ACOA',
    source_url: 'https://www.canada.ca/en/atlantic-canada-opportunities.html',
    source_program_id: 'acoa-sustainability-and-green-transition-support',
    verification_status: 'review_pending',
    is_active: false,
    last_verified_at: nowIso,
    sort_priority: 27,
    updated_at: nowIso,
    business_relevance: 'high',
    stackable: true,
    funding_percentage: 40,
    program_level: 'federal',
    stack_notes:
      'Can pair well with provincial clean energy or sustainability support, subject to funding limits.',
    max_stack_cap: 75,
  },
]

async function syncPrograms(programs: ImportedGrant[]) {
  const programIds = programs
    .map((p) => p.source_program_id)
    .filter(Boolean) as string[]

  const { data: existingRows, error: existingError } = await supabase
    .from('grants')
    .select('id, source_name, source_program_id, is_active, verification_status')
    .eq('source_name', 'ACOA')
    .in('source_program_id', programIds)

  if (existingError) throw existingError

  const existingMap = new Map(
    ((existingRows || []) as ExistingGrantRow[]).map((row) => [row.source_program_id, row])
  )

  const newRows = programs
    .filter((p) => p.source_program_id && !existingMap.has(p.source_program_id))
    .map((p) => ({
      ...p,
      is_active: false,
      verification_status: 'review_pending',
      updated_at: new Date().toISOString(),
    }))

  const updateRows = programs
    .filter((p) => p.source_program_id && existingMap.has(p.source_program_id))
    .map((p) => {
      const existing = existingMap.get(p.source_program_id!)
      return {
        ...p,
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
  console.log(`Preparing ${ACOA_PROGRAMS.length} curated ACOA program records...`)

  const result = await syncPrograms(ACOA_PROGRAMS)

  console.log('\nACOA import complete')
  console.log(`Inserted: ${result.inserted}`)
  console.log(`Updated: ${result.updated}`)
  console.log('Failed: 0')
}

main().catch((error) => {
  console.error('ACOA importer failed:', error)
  process.exit(1)
})