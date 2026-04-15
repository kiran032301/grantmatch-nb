import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anthropicApiKey = process.env.ANTHROPIC_API_KEY

if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL in .env.local')
}

if (!supabaseServiceRoleKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

if (!anthropicApiKey) {
  throw new Error('Missing ANTHROPIC_API_KEY in .env.local')
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

const anthropic = new Anthropic({
  apiKey: anthropicApiKey,
})

type GrantRow = {
  id: string
  name: string | null
  organization: string | null
  description: string | null
  eligibility: string | null
}

type EnrichedGrant = {
  short_description: string
  eligibility_summary: string
  industry_tags: string[]
  stage_tags: string[]
  goal_tags: string[]
  supports_rd: boolean
}

function extractJson(text: string): string {
  const firstBrace = text.indexOf('{')
  const lastBrace = text.lastIndexOf('}')

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found in Claude response')
  }

  return text.slice(firstBrace, lastBrace + 1)
}

async function enrichGrant(grant: GrantRow): Promise<EnrichedGrant | null> {
  const prompt = `
You are an expert in Canadian business funding programs.

Analyze the following funding program and return STRUCTURED JSON ONLY.

Program:
Name: ${grant.name || ''}
Organization: ${grant.organization || ''}
Description: ${grant.description || ''}
Eligibility: ${grant.eligibility || ''}

Return this exact JSON shape:
{
  "short_description": "A short plain-English summary in 1 sentence",
  "eligibility_summary": "A short plain-English eligibility summary in 1 sentence",
  "industry_tags": ["general"],
  "stage_tags": ["startup"],
  "goal_tags": ["innovation"],
  "supports_rd": false
}

Allowed values guidance:
- industry_tags: general, technology, clean energy, manufacturing, retail, hospitality, professional services, media, culture, mining, agriculture
- stage_tags: idea, startup, growth, established
- goal_tags: innovation, r_and_d, export, market_expansion, hiring, training, productivity, digital_adoption, sustainability, investment

Rules:
- Return valid JSON only
- No markdown
- No explanation
- Keep summaries concise
- If the program is broadly applicable, use "general" for industry_tags
- supports_rd should be true only if the program clearly supports research, innovation, product development, or R&D
`

  console.log(`Calling Claude for: ${grant.name}`)

  const response = await anthropic.messages.create({
  model: 'claude-haiku-4-5-20251001',
  max_tokens: 500,
  temperature: 0.2,
  messages: [
    {
      role: 'user',
      content: prompt,
    },
  ],
})

 const rawText = response.content
  .map((item) => {
    if (item.type === 'text') {
      return item.text
    }
    return ''
  })
  .filter(Boolean)
  .join('\n')

console.log(`Claude responded for: ${grant.name}`)

try {
  const jsonText = extractJson(rawText)
  return JSON.parse(jsonText) as EnrichedGrant
} catch {
  console.error(`JSON parse failed for: ${grant.name}`)
  console.error(rawText)
  return null
}
}

async function run() {
  console.log('Starting grant enrichment...')

  const { data: grants, error } = await supabase
    .from('grants')
    .select('id, name, organization, description, eligibility')
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to load grants:', error)
    return
  }

  console.log(`Found ${grants?.length || 0} active grants`)

  if (!grants || grants.length === 0) {
    console.log('No grants found. Exiting.')
    return
  }

  for (const grant of grants as GrantRow[]) {
    console.log(`Enriching: ${grant.name}`)

    const enriched = await enrichGrant(grant)

    if (!enriched) {
      console.log(`Skipping update for: ${grant.name}`)
      continue
    }

    const { error: updateError } = await supabase
      .from('grants')
      .update({
        short_description: enriched.short_description,
        eligibility_summary: enriched.eligibility_summary,
        industry_tags: enriched.industry_tags,
        stage_tags: enriched.stage_tags,
        goal_tags: enriched.goal_tags,
        supports_rd: enriched.supports_rd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', grant.id)

    if (updateError) {
      console.error(`Update failed for: ${grant.name}`, updateError)
    } else {
      console.log(`Updated: ${grant.name}`)
    }

    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  console.log('Enrichment complete')
}

run().catch((error) => {
  console.error('Enrichment script failed:', error)
  process.exit(1)
})