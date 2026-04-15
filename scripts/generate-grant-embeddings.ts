import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const openaiApiKey = process.env.OPENAI_API_KEY

if (!supabaseUrl || !supabaseServiceRoleKey || !openaiApiKey) {
  throw new Error('Missing required environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

const openai = new OpenAI({
  apiKey: openaiApiKey,
})

function cleanText(value?: string | null): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function normalizeTags(tags: string[] | string | null | undefined): string[] {
  if (!tags) return []

  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean)
  }

  if (typeof tags === 'string') {
    return tags
      .replace(/[{}"]/g, '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }

  return []
}

function buildGrantEmbeddingText(grant: {
  name?: string | null
  organization?: string | null
  short_description?: string | null
  description?: string | null
  eligibility_summary?: string | null
  eligibility?: string | null
  funding_type?: string | null
  type?: string | null
  intake_status?: string | null
  industry_tags?: string[] | string | null
  stage_tags?: string[] | string | null
  goal_tags?: string[] | string | null
  business_relevance?: string | null
  source_name?: string | null
}) {
  const industryTags = normalizeTags(grant.industry_tags).join(', ')
  const stageTags = normalizeTags(grant.stage_tags).join(', ')
  const goalTags = normalizeTags(grant.goal_tags).join(', ')

  return cleanText(`
Program Name: ${grant.name || ''}
Organization: ${grant.organization || ''}
Short Description: ${grant.short_description || ''}
Description: ${grant.description || ''}
Eligibility Summary: ${grant.eligibility_summary || ''}
Eligibility: ${grant.eligibility || ''}
Funding Type: ${grant.funding_type || grant.type || ''}
Status: ${grant.intake_status || ''}
Industry Tags: ${industryTags}
Stage Tags: ${stageTags}
Goal Tags: ${goalTags}
Business Relevance: ${grant.business_relevance || ''}
Source: ${grant.source_name || ''}
  `)
}

async function getEmbedding(input: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input,
  })

  return response.data[0].embedding
}

async function main() {
  console.log('Loading grants...')

  const { data: grants, error } = await supabase
    .from('grants')
    .select(`
      id,
      name,
      organization,
      short_description,
      description,
      eligibility_summary,
      eligibility,
      funding_type,
      type,
      intake_status,
      industry_tags,
      stage_tags,
      goal_tags,
      business_relevance,
      source_name,
      embedding
    `)
    .eq('is_active', true)
    .eq('verification_status', 'verified')
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  if (!grants || grants.length === 0) {
    console.log('No live verified grants found.')
    return
  }

  console.log(`Found ${grants.length} grants to process`)

  let updated = 0
  let failed = 0

  for (const grant of grants) {
    try {
      const text = buildGrantEmbeddingText(grant)

      if (!text) {
        console.log(`Skipping ${grant.id} (empty text)`)
        continue
      }

      const embedding = await getEmbedding(text)

      const { error: updateError } = await supabase
        .from('grants')
        .update({
          embedding,
          updated_at: new Date().toISOString(),
        })
        .eq('id', grant.id)

      if (updateError) {
        throw updateError
      }

      updated++
      console.log(`Updated embedding: ${grant.name || grant.id}`)
    } catch (err) {
      failed++
      console.error(`Failed embedding: ${grant.name || grant.id}`)
      console.error(err)
    }
  }

  console.log('\nEmbedding generation complete')
  console.log(`Updated: ${updated}`)
  console.log(`Failed: ${failed}`)
}

main().catch((err) => {
  console.error('Embedding script failed:', err)
  process.exit(1)
})