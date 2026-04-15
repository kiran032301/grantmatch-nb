import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

type DraftRequestBody = {
  profileId: string
  grantId: string
  language?: 'en' | 'fr'
}

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function buildPrompt(profile: any, grant: any, language: 'en' | 'fr') {
  const businessName = clean(profile.business_name) || 'The business'
  const industry = clean(profile.industry) || 'Not specified'
  const stage = clean(profile.stage) || 'Not specified'
  const employees =
    typeof profile.employees === 'number' ? String(profile.employees) : 'Not specified'
  const doesRd = profile.does_rd ? 'Yes' : 'No'
  const goal = clean(profile.goal) || 'Not specified'

  const grantName = clean(grant.name) || 'Funding Program'
  const organization = clean(grant.organization) || 'Unknown organization'
  const description =
    clean(grant.short_description) || clean(grant.description) || 'Not specified'
  const eligibility =
    clean(grant.eligibility_summary) || clean(grant.eligibility) || 'Not specified'
  const fundingType = clean(grant.funding_type) || clean(grant.type) || 'Program'
  const deadline = clean(grant.application_deadline) || 'Not specified'

  const languageInstruction =
    language === 'fr'
      ? 'Write the entire draft in professional natural French suitable for a New Brunswick funding application.'
      : 'Write the entire draft in professional natural English suitable for a New Brunswick funding application.'

  return `
You are a senior grant consultant preparing a polished first-draft funding application.

Your task:
Write a realistic, persuasive, professional application draft in natural human-sounding language.

STRICT RULES:
- Use ONLY the information provided below.
- Do NOT invent revenue, customers, contracts, awards, certifications, export history, partnerships, locations, patents, financial projections, or measurable outcomes unless explicitly provided.
- Do NOT use exaggerated language.
- Do NOT sound robotic, repetitive, or overly generic.
- Do NOT mention AI or that the draft was generated.
- Keep the writing credible, practical, and suitable for a real funding application.
- If some information is missing, write carefully around it in a professional way rather than inventing facts.

LANGUAGE REQUIREMENT:
- ${languageInstruction}

WRITING STYLE:
- polished and professional
- natural and human
- concise but persuasive
- specific to the funding opportunity
- specific to the business goal
- sounds like it was drafted by an experienced consultant

OUTPUT:
Return valid JSON only with these keys:
{
  "title": "...",
  "executive_summary": "...",
  "business_overview": "...",
  "project_alignment": "...",
  "use_of_funds": "...",
  "expected_impact": "...",
  "closing_statement": "..."
}

BUSINESS PROFILE
- Business Name: ${businessName}
- Industry: ${industry}
- Stage: ${stage}
- Employees: ${employees}
- Does R&D: ${doesRd}
- Goal: ${goal}

GRANT INFORMATION
- Grant Name: ${grantName}
- Organization: ${organization}
- Funding Type: ${fundingType}
- Description: ${description}
- Eligibility: ${eligibility}
- Application Deadline: ${deadline}

SECTION GUIDANCE

1. title
Write a professional title suitable for a funding application.

2. executive_summary
Summarize the business need, funding purpose, and why this opportunity is relevant now.

3. business_overview
Describe the business in a grounded and credible way using only the profile information.

4. project_alignment
Explain why the business and proposed direction are a strong fit for this funding opportunity.

5. use_of_funds
Explain how the funding would realistically be used in support of the stated business goal.

6. expected_impact
Describe likely business benefits in careful, professional language without inventing numbers.

7. closing_statement
Write a strong closing paragraph expressing readiness, fit, and intent to use the support effectively.

IMPORTANT:
This should read like a real consultant-prepared draft that still leaves room for business-specific editing before submission.
`.trim()
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as DraftRequestBody
    const profileId = clean(body.profileId)
    const grantId = clean(body.grantId)
    const language: 'en' | 'fr' = body.language === 'fr' ? 'fr' : 'en'

    if (!profileId || !grantId) {
      return NextResponse.json(
        { error: 'Missing profileId or grantId' },
        { status: 400 }
      )
    }

    const [{ data: profile, error: profileError }, { data: grant, error: grantError }] =
      await Promise.all([
        supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('id', profileId)
          .maybeSingle(),
        supabaseAdmin
          .from('grants')
          .select('*')
          .eq('id', grantId)
          .maybeSingle(),
      ])

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (grantError) {
      return NextResponse.json({ error: grantError.message }, { status: 500 })
    }

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (!grant) {
      return NextResponse.json({ error: 'Grant not found' }, { status: 404 })
    }

    const { data: premiumAccess, error: premiumError } = await supabaseAdmin
      .from('premium_access')
      .select('is_active')
      .eq('profile_id', profileId)
      .maybeSingle()

    if (premiumError) {
      return NextResponse.json({ error: premiumError.message }, { status: 500 })
    }

    if (!premiumAccess?.is_active) {
      return NextResponse.json(
        { error: 'Draft generation is available only for premium access.' },
        { status: 403 }
      )
    }

    const prompt = buildPrompt(profile, grant, language)

    const response = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You write polished, professional funding application drafts that are factual, grounded, natural-sounding, and suitable for real business use.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const content = response.choices[0]?.message?.content || '{}'

    let parsed: Record<string, string> = {}
    try {
      parsed = JSON.parse(content)
    } catch {
      return NextResponse.json(
        { error: 'Draft generation returned invalid JSON.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      draft: {
        title: parsed.title || `Application Draft for ${grant.name || 'Funding Program'}`,
        executive_summary: parsed.executive_summary || '',
        business_overview: parsed.business_overview || '',
        project_alignment: parsed.project_alignment || '',
        use_of_funds: parsed.use_of_funds || '',
        expected_impact: parsed.expected_impact || '',
        closing_statement: parsed.closing_statement || '',
      },
      profile,
      grant,
      language,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate application draft'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}