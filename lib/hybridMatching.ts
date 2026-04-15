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
      reasons: [
        ...(similarity >= 0.78 ? ['Strong semantic fit to your business profile.'] : []),
        ...grant.reasons,
      ].slice(0, 3),
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