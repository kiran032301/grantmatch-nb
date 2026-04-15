/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
})

type UserProfile = {
  id: string
  business_name: string | null
  industry: string | null
  stage: string | null
  employees: number | null
  does_rd: boolean | null
  goal: string | null
}

type ProfileMatch = {
  id: string
  profile_id: string
  grant_id: string
  score: number
  reasons: string[] | null
}

type Grant = {
  id: string
  name: string | null
  name_fr?: string | null
  organization: string | null
  amount_min: number | null
  amount_max: number | null
  type: string | null
  funding_type?: string | null
  provider_type?: string | null
  repayable: boolean | null
  description: string | null
  description_fr?: string | null
  short_description?: string | null
  eligibility: string | null
  eligibility_summary?: string | null
  industry_tags?: string[] | string | null
  stage_tags?: string[] | string | null
  goal_tags?: string[] | string | null
  supports_rd?: boolean | null
  intake_status: string | null
  url: string | null
  is_active?: boolean | null
  sort_priority?: number | null
  last_verified_at?: string | null
  verification_status?: string | null
}

const FULL_REPORT_COUNT = 5

function formatAmountCAD(amount: number | null) {
  if (!amount) return 'Not specified'
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatAmountRange(min: number | null, max: number | null) {
  if (min && max) {
    if (min === max) return formatAmountCAD(max)
    return `${formatAmountCAD(min)} - ${formatAmountCAD(max)}`
  }
  if (max) return formatAmountCAD(max)
  if (min) return formatAmountCAD(min)
  return 'Not specified'
}

function getGrantDescription(grant: Grant) {
  return grant.short_description || grant.description || 'No description available.'
}

function getGrantEligibility(grant: Grant) {
  return grant.eligibility_summary || grant.eligibility || 'Not specified'
}

function getGrantFundingType(grant: Grant) {
  return grant.funding_type || grant.type || 'Program'
}

function formatFundingType(grant: Grant) {
  if (grant.repayable === true) return 'Loan (Repayment required)'
  if (grant.repayable === false) return 'Grant (No repayment)'

  const type = (getGrantFundingType(grant) || '').toLowerCase()

  if (type.includes('loan')) return 'Loan (Repayment required)'
  if (type.includes('grant')) return 'Grant (No repayment)'
  if (type.includes('tax_credit')) return 'Tax Credit'
  if (type.includes('rebate')) return 'Rebate'

  return getGrantFundingType(grant)
}

function fileSafeName(value: string) {
  return value.replace(/[^a-z0-9-_]+/gi, '_')
}

function addSectionTitle(doc: any, title: string) {
  doc.moveDown(0.8)
  doc
    .font('Times-Bold')
    .fontSize(16)
    .fillColor('#0A4A6A')
    .text(title, { align: 'left' })
  doc.moveDown(0.5)
}

function addLabelLine(doc: any, label: string, value: string) {
  doc
    .font('Times-Bold')
    .fontSize(11)
    .fillColor('#142433')
    .text(`${label}: `, { continued: true })
    .font('Times-Roman')
    .text(value || '-')
}

function ensurePageSpace(doc: any, needed = 160) {
  if (doc.y > doc.page.height - needed) {
    doc.addPage()
  }
}

function drawMatchHeader(doc: any, title: string, isTop: boolean) {
  const x = doc.page.margins.left
  const y = doc.y
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right
  const height = 28

  doc
    .roundedRect(x, y, width, height, 8)
    .fill(isTop ? '#DFF6EF' : '#EEF5FA')

  doc
    .fillColor(isTop ? '#0F6B50' : '#0A4A6A')
    .font('Times-Bold')
    .fontSize(12)
    .text(title, x + 10, y + 8, {
      width: width - 20,
      lineBreak: false,
    })

  doc.y = y + height + 10
}

export async function GET(req: NextRequest) {
  try {
    const PDFDocument = (await import('pdfkit/js/pdfkit.standalone.js')).default

    const { searchParams } = new URL(req.url)
    const profileId = searchParams.get('profileId')

    if (!profileId) {
      return new Response('Missing profileId', { status: 400 })
    }

    const [profileRes, matchesRes, grantsRes] = await Promise.all([
      supabaseAdmin.from('user_profiles').select('*').eq('id', profileId).maybeSingle(),
      supabaseAdmin
        .from('profile_matches')
        .select('*')
        .eq('profile_id', profileId)
        .order('score', { ascending: false }),
      supabaseAdmin
        .from('grants')
        .select('*')
        .eq('is_active', true)
        .in('intake_status', ['open', 'rolling', 'upcoming'])
        .order('sort_priority', { ascending: true }),
    ])

    if (profileRes.error) {
      return new Response(`Could not load profile: ${profileRes.error.message}`, { status: 500 })
    }

    if (matchesRes.error) {
      return new Response(`Could not load matches: ${matchesRes.error.message}`, { status: 500 })
    }

    if (grantsRes.error) {
      return new Response(`Could not load grants: ${grantsRes.error.message}`, { status: 500 })
    }

    const profile = profileRes.data as UserProfile | null
    const matches = (matchesRes.data || []) as ProfileMatch[]
    const grants = (grantsRes.data || []) as Grant[]

    if (!profile) {
      return new Response('Profile not found', { status: 404 })
    }

    const grantMap = new Map(grants.map((grant) => [grant.id, grant]))

    const fullMatches = matches
      .map((match) => ({
        ...match,
        grant: grantMap.get(match.grant_id) || null,
      }))
      .filter((item) => item.grant)
      .slice(0, FULL_REPORT_COUNT)

    const businessName = profile.business_name || 'Business'
    const filename = `${fileSafeName(businessName)}_GrantMatch_NB_Full_Report.pdf`

    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true,
      autoFirstPage: true,
    })

    const chunks: Uint8Array[] = []

    doc.on('data', (chunk: Uint8Array) => chunks.push(chunk))

    const endPromise = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks.map((c) => Buffer.from(c)))))
      doc.on('error', reject)
    })

    // Header
    doc.rect(0, 0, doc.page.width, 95).fill('#0D1F3C')
    doc
      .fillColor('white')
      .font('Times-Bold')
      .fontSize(24)
      .text('GrantMatch NB', 50, 28)

    doc
      .font('Times-Roman')
      .fontSize(11)
      .fillColor('#B8D4E3')
      .text('Complete Funding Report', 50, 60)

    doc.y = 125

    doc
      .font('Times-Bold')
      .fontSize(22)
      .fillColor('#142433')
      .text('Personalized Funding Report')

    doc.moveDown(0.4)

    doc
      .font('Times-Roman')
      .fontSize(12)
      .fillColor('#425466')
      .text('Prepared for your business based on your profile and New Brunswick funding goals.')

    addSectionTitle(doc, 'Business Profile Summary')
    addLabelLine(doc, 'Business Name', businessName)
    addLabelLine(doc, 'Industry', profile.industry || '-')
    addLabelLine(doc, 'Stage', profile.stage || '-')
    addLabelLine(doc, 'Employees', String(profile.employees ?? '-'))
    addLabelLine(doc, 'Does R&D', profile.does_rd ? 'Yes' : 'No')
    addLabelLine(doc, 'Goal', profile.goal || '-')

    const topMatch = fullMatches[0]
    const totalMatches = fullMatches.length
    const avgScore =
      fullMatches.length > 0
        ? Math.round(fullMatches.reduce((sum, item) => sum + item.score, 0) / fullMatches.length)
        : 0

    addSectionTitle(doc, 'Funding Snapshot')
    addLabelLine(doc, 'Province', 'New Brunswick')
    addLabelLine(
      doc,
      'Summary',
      `We evaluated ${grants.length} New Brunswick programs and selected your top ${totalMatches} best-fit opportunities`
    )
    addLabelLine(doc, 'Average match score', String(avgScore))
    addLabelLine(doc, 'Top recommended opportunity', topMatch?.grant?.name || 'Not available')

    addSectionTitle(doc, 'Recommended Next Steps')
    doc.font('Times-Roman').fontSize(12).fillColor('#142433')
    doc.text('1. Review the top 3 matching opportunities first.')
    doc.text('2. Check eligibility requirements and application timing.')
    doc.text('3. Prioritize non-repayable programs where suitable.')
    doc.text('4. Prepare the business documents needed for the strongest applications.')

    addSectionTitle(doc, 'Detailed Grant Matches')

    fullMatches.forEach((item, index) => {
      const grant = item.grant as Grant

      ensurePageSpace(doc, 280)

      drawMatchHeader(
        doc,
        `${index + 1}. ${grant.name || 'Unnamed Program'}`,
        index === 0
      )

      addLabelLine(doc, 'Organization', grant.organization || 'Not specified')
      addLabelLine(doc, 'Match score', String(item.score))
      addLabelLine(doc, 'Funding type', formatFundingType(grant))
      addLabelLine(doc, 'Funding category', getGrantFundingType(grant))
      addLabelLine(doc, 'Funding amount', formatAmountRange(grant.amount_min, grant.amount_max))
      addLabelLine(doc, 'Status', grant.intake_status || 'Unknown')

      doc.moveDown(0.35)
      doc.font('Times-Bold').fontSize(11).fillColor('#142433').text('Description')
      doc
        .font('Times-Roman')
        .fontSize(11)
        .fillColor('#425466')
        .text(getGrantDescription(grant))

      doc.moveDown(0.35)
      doc.font('Times-Bold').fontSize(11).fillColor('#142433').text('Eligibility')
      doc
        .font('Times-Roman')
        .fontSize(11)
        .fillColor('#425466')
        .text(getGrantEligibility(grant))

      doc.moveDown(0.35)
      doc.font('Times-Bold').fontSize(11).fillColor('#142433').text('Why it matches')

      if (item.reasons && item.reasons.length > 0) {
        item.reasons.forEach((reason) => {
          doc
            .font('Times-Roman')
            .fontSize(11)
            .fillColor('#425466')
            .text(`• ${reason}`)
        })
      } else {
        doc
          .font('Times-Roman')
          .fontSize(11)
          .fillColor('#425466')
          .text('• General potential fit based on your business profile')
      }

      if (grant.url) {
        doc.moveDown(0.3)
        doc
          .font('Times-Bold')
          .fontSize(11)
          .fillColor('#0A4A6A')
          .text(`Official link: ${grant.url}`)
      }

      doc.moveDown(1.1)
      doc
        .moveTo(doc.page.margins.left, doc.y)
        .lineTo(doc.page.width - doc.page.margins.right, doc.y)
        .strokeColor('#D7E6EF')
        .lineWidth(1)
        .stroke()

      doc.moveDown(0.8)
    })

    // Footer
    const range = doc.bufferedPageRange()
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(i)
      doc
        .font('Times-Roman')
        .fontSize(9)
        .fillColor('#6B7B8A')
        .text(
          `GrantMatch NB - Full Funding Report - Page ${i + 1} of ${range.count}`,
          50,
          doc.page.height - 35,
          {
            align: 'center',
            width: doc.page.width - 100,
          }
        )
    }

    doc.end()
    const pdfBuffer = await endPromise
    const pdfBytes = new Uint8Array(pdfBuffer)

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('full-report route error:', error)
    return new Response(
      `Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`,
      { status: 500 }
    )
  }
}