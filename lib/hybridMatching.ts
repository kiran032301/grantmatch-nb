import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  scoreAndRankGrants,
  toMatchPercent,
  getMatchLabel,
  type Grant,
  type Profile,
  type ScoredGrant,
} from '@/lib/grantMatching'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

type VectorMatchRow = {
  id: string
  similarity: number
}

function buildProfileText(profile: Profile): string {
  return `
Business Name: ${profile.business_name || ''}
Industry: ${profile.industry || ''}
Stage: ${profile.stage || ''}
Employees: ${profile.employees ?? ''}
Does R&D: ${profile.does_rd ? 'Yes' : 'No'}
Goal: ${profile.goal || ''}
Funding Preference: ${profile.funding_preference || ''}
  `.trim()
}

function normalize(value: unknown): string {
  return String(value || '').toLowerCase().trim()
}

function arrayIncludesText(tags: unknown, text: string): boolean {
  if (!Array.isArray(tags) || !text) return false

  const normalizedText = normalize(text)

  return tags.some((tag) => {
    const normalizedTag = normalize(tag)
    return (
      normalizedText.includes(normalizedTag) ||
      normalizedTag.includes(normalizedText)
    )
  })
}

function getGrantText(grant: Grant): string {
  return normalize(`
    ${grant.name || ''}
    ${grant.organization || ''}
    ${grant.short_description || ''}
    ${grant.description || ''}
    ${grant.eligibility_summary || ''}
    ${grant.eligibility || ''}
    ${grant.funding_type || ''}
    ${grant.type || ''}
  `)
}

function addUniqueReason(reasons: string[], reason: string) {
  const cleaned = reason.trim()
  if (!cleaned) return

  const exists = reasons.some(
    (item) => item.toLowerCase().trim() === cleaned.toLowerCase()
  )

  if (!exists) reasons.push(cleaned)
}

function buildDetailedReasons(
  profile: Profile,
  grant: Grant,
  similarity: number
): string[] {
  const reasons: string[] = []
  const grantText = getGrantText(grant)
  const grantName = normalize(grant.name)

  const stage = profile.stage || ''
  const goal = profile.goal || ''
  const fundingPreference = profile.funding_preference || ''

  // Program-specific reasons FIRST
  if (grantName.includes('innovation voucher')) {
    addUniqueReason(
      reasons,
      `This program is a strong fit because it supports collaboration between SMEs and research organizations to develop or improve products, processes, or technologies.`
    )

    addUniqueReason(
      reasons,
      `Your selected goal (${goal || 'innovation/product development'}) aligns with this fund because the voucher is intended to help companies carry out innovation-focused projects.`
    )

    if (profile.does_rd) {
      addUniqueReason(
        reasons,
        `Your profile indicates R&D or innovation activity, which is directly relevant to this program’s focus on applied research and technology development.`
      )
    }
  }

  if (grantName.includes('startup investment')) {
    addUniqueReason(
      reasons,
      `This program is relevant because it supports early-stage New Brunswick companies that need investment to prove commercial viability.`
    )

    addUniqueReason(
      reasons,
      `Your business stage (${stage || 'Startup'}) fits this opportunity because the fund is designed for pre-seed or startup-stage companies.`
    )

    addUniqueReason(
      reasons,
      `This may be suitable if your priority is to demonstrate that your product, service, or business idea can succeed commercially.`
    )
  }

  if (grantName.includes('export') || grantText.includes('export')) {
    addUniqueReason(
      reasons,
      `This program may support your market expansion plans, especially if you are preparing to reach customers outside New Brunswick or Canada.`
    )
  }

  if (grantName.includes('student') || grantText.includes('student') || grantText.includes('wage')) {
    addUniqueReason(
      reasons,
      `This opportunity may be useful if your business needs hiring, student employment, wage support, or workforce development assistance.`
    )
  }

  if (grantName.includes('equipment') || grantText.includes('equipment') || grantText.includes('machinery')) {
    addUniqueReason(
      reasons,
      `This program may support investment in equipment, machinery, productivity improvement, or business assets.`
    )
  }

  // General backup reasons
  if (goal && arrayIncludesText(grant.goal_tags, goal)) {
    addUniqueReason(
      reasons,
      `Your selected goal (${goal}) aligns with the program’s funding priorities.`
    )
  }

  if (stage && arrayIncludesText(grant.stage_tags, stage)) {
    addUniqueReason(
      reasons,
      `Your current business stage (${stage}) fits the type of applicant this program is intended to support.`
    )
  }

  if (profile.does_rd && grant.supports_rd) {
    addUniqueReason(
      reasons,
      `This program may support innovation, research, product development, or technology-related work.`
    )
  }

  if (fundingPreference && grant.funding_type) {
    const grantFundingType = normalize(grant.funding_type)

    if (grantFundingType.includes(normalize(fundingPreference))) {
      addUniqueReason(
        reasons,
        `The funding structure matches your preference for ${fundingPreference}.`
      )
    }
  }

  if (grant.repayable === false) {
    addUniqueReason(
      reasons,
      `This appears to be non-repayable funding, which may reduce financial pressure on your business if approved.`
    )
  }

  if (grant.repayable === true) {
    addUniqueReason(
      reasons,
      `This is repayable support, which may still be useful if you need financing for growth, working capital, or investment.`
    )
  }

  if (grant.intake_status === 'open' || grant.intake_status === 'rolling') {
    addUniqueReason(
      reasons,
      `The intake status suggests this opportunity may currently be available or accepting applications.`
    )
  }

  if (similarity >= 0.82) {
    addUniqueReason(
      reasons,
      `The AI matching engine found strong overall alignment between your profile and this program’s description.`
    )
  }

  if (reasons.length < 2) {
    addUniqueReason(
      reasons,
      `This program may be relevant based on your business profile, stage, and funding needs.`
    )
  }

  return reasons
}

async function getEmbedding(input: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input,
  })

  return response.data[0].embedding
}

export async function hybridMatchGrants(profile: Profile): Promise<ScoredGrant[]> {
  const profileText = buildProfileText(profile)
  const profileEmbedding = await getEmbedding(profileText)

  const { data: vectorMatches, error: vectorError } = await supabaseAdmin.rpc(
    'match_grants',
    {
      query_embedding: profileEmbedding,
      match_count: 12,
    }
  )

  if (vectorError) {
    throw vectorError
  }

  const matchRows = (vectorMatches || []) as VectorMatchRow[]
  const grantIds = matchRows.map((row) => row.id)

  if (grantIds.length === 0) {
    return []
  }

  const { data: grantsData, error: grantsError } = await supabaseAdmin
    .from('grants')
    .select('*')
    .in('id', grantIds)

  if (grantsError) {
    throw grantsError
  }

  const grants = (grantsData || []) as Grant[]
  const scored = scoreAndRankGrants(profile, grants)

  const similarityMap = new Map<string, number>(
    matchRows.map((row) => [row.id, row.similarity])
  )

  const hybridRanked = scored
    .map((grant) => {
      const similarity = similarityMap.get(grant.id) || 0
      const vectorScore = Math.round(similarity * 30)
      const newScore = grant.score + vectorScore
      const matchPercent = toMatchPercent(newScore)
      const matchLabel = getMatchLabel(matchPercent)

      return {
        ...grant,
        score: newScore,
        matchPercent,
        matchLabel,
        reasons: buildDetailedReasons(profile, grant, similarity).slice(0, 3),
      }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score

      if (a.repayable !== b.repayable) {
        return a.repayable ? 1 : -1
      }

      const aPriority = a.sort_priority ?? 999
      const bPriority = b.sort_priority ?? 999
      if (aPriority !== bPriority) return aPriority - bPriority

      const aAmount = a.amount_max ?? 0
      const bAmount = b.amount_max ?? 0
      return bAmount - aAmount
    })

  return hybridRanked.slice(0, 5)
}