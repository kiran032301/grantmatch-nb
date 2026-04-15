import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

console.log('OPENAI KEY FOUND:', !!process.env.OPENAI_API_KEY)
console.log('SUPABASE URL FOUND:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SERVICE ROLE FOUND:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type GrantRow = {
  id: string
  name: string | null
  name_fr?: string | null
  description: string | null
  description_fr?: string | null
  eligibility: string | null
  eligibility_fr?: string | null
  eligibility_summary: string | null
  eligibility_summary_fr?: string | null
}

async function translateText(text: string, fieldLabel: string): Promise<string> {
  if (!text.trim()) return ''

  const res = await openai.responses.create({
    model: 'gpt-4o-mini',
    input: [
      {
        role: 'system',
        content:
          'Translate English grant-program text into clear, professional Canadian French. Keep meaning accurate. Return only the translated text.',
      },
      {
        role: 'user',
        content: `${fieldLabel}:\n${text}`,
      },
    ],
  })

  return (res.output_text || '').trim()
}

async function main() {
  const { data, error } = await supabase
    .from('grants')
    .select(`
      id,
      name,
      name_fr,
      description,
      description_fr,
      eligibility,
      eligibility_fr,
      eligibility_summary,
      eligibility_summary_fr
    `)
    .order('name', { ascending: true })

  if (error) {
    throw error
  }

  const grants = (data || []) as GrantRow[]

  for (const grant of grants) {
    const updates: Partial<GrantRow> = {}

    console.log(`Processing: ${grant.name || grant.id}`)

    if (grant.name && !grant.name_fr) {
      updates.name_fr = await translateText(grant.name, 'Grant name')
    }

    if (grant.description && !grant.description_fr) {
      updates.description_fr = await translateText(
        grant.description,
        'Grant description'
      )
    }

    if (grant.eligibility && !grant.eligibility_fr) {
      updates.eligibility_fr = await translateText(
        grant.eligibility,
        'Eligibility details'
      )
    }

    if (grant.eligibility_summary && !grant.eligibility_summary_fr) {
      updates.eligibility_summary_fr = await translateText(
        grant.eligibility_summary,
        'Eligibility summary'
      )
    }

    if (Object.keys(updates).length === 0) {
      console.log('  Skipped: already has French fields')
      continue
    }

    const { error: updateError } = await supabase
      .from('grants')
      .update(updates)
      .eq('id', grant.id)

    if (updateError) {
      console.error(`  Update failed for ${grant.id}:`, updateError.message)
      continue
    }

    console.log('  Updated')
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})