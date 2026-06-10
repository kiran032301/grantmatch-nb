'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import {
  type Profile,
  type Grant,
  type ScoredGrant,
} from '@/lib/grantMatching'
import { jsPDF } from 'jspdf'
import { saveAs } from 'file-saver'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from 'docx'
import { useTranslation } from 'react-i18next'
import '@/lib/i18n'

// FREE ACCESS PERIOD: show all matches. Restore FREE_VISIBLE_COUNT = 2 when paid gating resumes.
const FREE_VISIBLE_COUNT = 999 // effectively unlimited
const FULL_REPORT_COUNT = 5

function getGrantName(grant: Grant, language: string) {
  if (language.startsWith('fr')) {
    return (
      (grant as Grant & { name_fr?: string | null }).name_fr ||
      grant.name ||
      'Programme sans nom'
    )
  }

  return grant.name || 'Unnamed Program'
}

function getGrantDescription(grant: Grant, language: string) {
  if (language.startsWith('fr')) {
    return (
      (grant as Grant & { description_fr?: string | null }).description_fr ||
      grant.short_description ||
      grant.description ||
      'Aucune description disponible.'
    )
  }

  return grant.short_description || grant.description || 'No description available.'
}

function getGrantEligibility(grant: Grant, language: string) {
  const g = grant as Grant & {
    eligibility_fr?: string | null
    eligibility_summary_fr?: string | null
  }

  if (language.startsWith('fr')) {
    return (
      g.eligibility_summary_fr ||
      g.eligibility_fr ||
      grant.eligibility_summary ||
      grant.eligibility ||
      'Non précisé'
    )
  }

  return grant.eligibility_summary || grant.eligibility || 'Not specified'
}

function getGrantFundingType(grant: Grant) {
  return grant.funding_type || grant.type || 'Program'
}

/* ✅ ADD THIS HERE */
function translateReason(reason: string, language: string) {
  if (!language.startsWith('fr')) return reason

  const map: Record<string, string> = {
    'Widely applicable across different business types.':
      'Applicable à différents types d’entreprises.',
    'This program supports your goal of R&D / commercialization.':
      'Ce programme soutient votre objectif de R-D / commercialisation.',
    'This program may support innovation or R&D initiatives.':
      'Ce programme peut soutenir des initiatives d’innovation ou de R-D.',
    'This aligns with your preferred type of funding.':
      'Cela correspond à votre type de financement préféré.',
    'Less aligned with your funding preference.':
      'Moins aligné avec votre préférence de financement.',
    'Applications are currently open, so you can apply now.':
      'Les demandes sont actuellement ouvertes.',
    'This program accepts applications on a rolling basis.':
      'Ce programme accepte les demandes en continu.',
    'This program will be opening for applications soon.':
      'Ce programme ouvrira bientôt.',
  }

  return map[reason] || reason
}

function getScoreMeta(percent: number, t: (key: string) => string) {
  if (percent >= 90) {
    return { label: t('results.excellentMatch'), className: 'strong' }
  }
  if (percent >= 75) {
    return { label: t('results.strongMatch'), className: 'strong' }
  }
  if (percent >= 60) {
    return { label: t('results.goodMatch'), className: 'good' }
  }
  return { label: t('results.weakMatch'), className: 'weak' }
}

function formatAmount(amount: number | null, t: (key: string) => string) {
  if (!amount) return t('common.notSpecified')
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatFundingType(grant: Grant, t: (key: string) => string) {
  const name = (grant.name || '').toLowerCase()
  const fundingType = (grant.funding_type || grant.type || '').toLowerCase()

  if (name.includes('venture') || name.includes('capital')) {
    return t('results.equityInvestment')
  }

  if (fundingType.includes('loan') || grant.repayable === true) {
    return t('results.loanRepayment')
  }

  if (fundingType.includes('tax_credit')) return t('results.taxCredit')
  if (fundingType.includes('rebate')) return t('results.rebate')

  if (fundingType.includes('grant') || grant.repayable === false) {
    return t('results.grantNoRepayment')
  }

  return getGrantFundingType(grant)
}

function LoadingState() {
  return (
    <div className="page">
      <div className="loadingWrap">
        <div className="spinner" />
        <h1 className="loadingTitle">Loading your best grant matches...</h1>
        <p className="loadingText">Please wait while we prepare your results.</p>
      </div>
      <style>{styles}</style>
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  const { t } = useTranslation()

  return (
    <div className="page">
      <div className="shell">
        <div className="brandTop">{t('common.brand')}</div>
        <div className="errorCard">
          <h1 className="errorTitle">{t('results.errorTitle')}</h1>
          <p className="errorText">{error}</p>
        </div>
      </div>
      <style>{styles}</style>
    </div>
  )
}

function getFundingMixBuckets(
  grants: Array<{
    id: string
    name?: string | null
    goal_tags?: string[] | string | null
    description?: string | null
    short_description?: string | null
  }>
) {
  const buckets: {
    hiring: (typeof grants)[number] | null
    equipment: (typeof grants)[number] | null
    innovation: (typeof grants)[number] | null
    growth: (typeof grants)[number] | null
  } = {
    hiring: null,
    equipment: null,
    innovation: null,
    growth: null,
  }

  function normalizeGoalTags(tags: string[] | string | null | undefined): string[] {
    if (!tags) return []
    if (Array.isArray(tags)) return tags.map((t) => String(t).toLowerCase())

    return String(tags)
      .replace(/[{}"]/g, '')
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
  }

  for (const grant of grants) {
    const tags = normalizeGoalTags(grant.goal_tags)
    const text =
      `${grant.name || ''} ${grant.short_description || ''} ${grant.description || ''}`.toLowerCase()

    if (
      !buckets.hiring &&
      (
        tags.includes('hiring') ||
        tags.includes('training') ||
        text.includes('hire') ||
        text.includes('hiring') ||
        text.includes('staff') ||
        text.includes('workforce') ||
        text.includes('training')
      )
    ) {
      buckets.hiring = grant
      continue
    }

    if (
      !buckets.equipment &&
      (
        tags.includes('equipment') ||
        tags.includes('investment') ||
        text.includes('equipment') ||
        text.includes('machinery') ||
        text.includes('capital') ||
        text.includes('investment')
      )
    ) {
      buckets.equipment = grant
      continue
    }

    if (
      !buckets.innovation &&
      (
        tags.includes('innovation') ||
        tags.includes('r_and_d') ||
        tags.includes('product_development') ||
        text.includes('innovation') ||
        text.includes('research') ||
        text.includes('r&d') ||
        text.includes('technology') ||
        text.includes('product development')
      )
    ) {
      buckets.innovation = grant
      continue
    }

    if (
      !buckets.growth &&
      (
        tags.includes('market_expansion') ||
        tags.includes('export') ||
        tags.includes('working_capital') ||
        text.includes('growth') ||
        text.includes('expand') ||
        text.includes('expansion') ||
        text.includes('export')
      )
    ) {
      buckets.growth = grant
    }
  }

  return [
    buckets.hiring && { label: 'Hiring Support', grant: buckets.hiring },
    buckets.equipment && { label: 'Equipment / Investment', grant: buckets.equipment },
    buckets.innovation && { label: 'Innovation / R&D', grant: buckets.innovation },
    buckets.growth && { label: 'Growth / Expansion', grant: buckets.growth },
  ].filter(Boolean) as Array<{ label: string; grant: NonNullable<(typeof grants)[number]> }>
}

function ResultsContent() {
  const searchParams = useSearchParams()
  const profileId = searchParams.get('profileId')
  const { t, i18n } = useTranslation()

  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<ScoredGrant[]>([])
  const [evaluatedProgramsCount, setEvaluatedProgramsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showDraftModal, setShowDraftModal] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [selectedDraftGrant, setSelectedDraftGrant] = useState<ScoredGrant | null>(null)
  const [draftLanguage, setDraftLanguage] = useState<'en' | 'fr'>('en')
  const [draftDetails, setDraftDetails] = useState({
    founderName: '',
    registrationNumber: '',
    incorporationDate: '',
    fundingAmount: '',
    projectTimeline: '',
    measurableOutcome: '',
    founderBio: '',
  })
  const [draftContent, setDraftContent] = useState<{
    title: string
    executive_summary: string
    business_overview: string
    project_alignment: string
    use_of_funds: string
    expected_impact: string
    closing_statement: string
  } | null>(null)

  const [showRequestModal, setShowRequestModal] = useState(false)
  const [requestNotes, setRequestNotes] = useState('')
  const [requestLoading, setRequestLoading] = useState(false)
  const [requestSuccess, setRequestSuccess] = useState(false)
  const [requestError, setRequestError] = useState<string | null>(null)

  const [alertEmail, setAlertEmail] = useState('')
  const [alertDaysBefore, setAlertDaysBefore] = useState(7)
  const [alertsLoading, setAlertsLoading] = useState(false)
  const [alertsSuccess, setAlertsSuccess] = useState<string | null>(null)
  const [alertsError, setAlertsError] = useState<string | null>(null)

  const [hasPremiumAccess, setHasPremiumAccess] = useState(false)
  const [premiumChecked, setPremiumChecked] = useState(false)

  useEffect(() => {
    async function saveMatches(profileIdValue: string, scoredMatches: ScoredGrant[]) {
      try {
        const uniqueByGrantKey = Array.from(
          new Map(
            scoredMatches.map((grant) => [
              grant.url || `${grant.name}-${grant.organization || ''}`,
              grant,
            ])
          ).values()
        )

        const topMatches = uniqueByGrantKey.slice(0, FULL_REPORT_COUNT)

        if (topMatches.length === 0) {
          return
        }

        const rows = topMatches.map((grant) => ({
          profile_id: profileIdValue,
          grant_id: grant.id,
          score: grant.score,
          reasons: grant.reasons,
        }))

        const { error: upsertError } = await supabase
          .from('profile_matches')
          .upsert(rows, {
            onConflict: 'profile_id,grant_id',
          })

        if (upsertError) {
          console.error('Save matches upsert failed:', upsertError)
        }
      } catch (err) {
        console.error('Save matches failed:', err)
      }
    }

    async function loadMatches() {
      try {
        if (!profileId) {
          setError('Missing profile ID.')
          setLoading(false)
          return
        }

        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', profileId)
          .maybeSingle()

        const premiumRes = await fetch(
          `/api/premium-access?profileId=${encodeURIComponent(profileId)}`,
          { cache: 'no-store' }
        )

        const premiumJson = await premiumRes.json()

        if (!premiumRes.ok) {
          console.error('Could not load premium access:', premiumJson?.error)
        }

        setHasPremiumAccess(!!premiumJson?.isActive)
        setPremiumChecked(true)

        if (profileError) {
          setError(`Could not load your profile: ${profileError.message}`)
          setLoading(false)
          return
        }

        if (!profileData) {
          setError('Could not load your profile. No matching profile was found.')
          setLoading(false)
          return
        }

        setPremiumChecked(true)
        setProfile(profileData as Profile)
        setAlertEmail((profileData as { email?: string | null }).email || '')

        const matchRes = await fetch('/api/match-grants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId }),
        })

        const matchJson = await matchRes.json()

        if (!matchRes.ok) {
          setError(matchJson?.error || 'Could not calculate matches.')
          setLoading(false)
          return
        }

        const hybridMatches = (matchJson.matches || []) as ScoredGrant[]

        setEvaluatedProgramsCount(
          typeof matchJson.evaluatedProgramsCount === 'number'
            ? matchJson.evaluatedProgramsCount
            : hybridMatches.length
        )
        setMatches(hybridMatches)
        setLoading(false)

        await saveMatches(profileId, hybridMatches)
      } catch (err) {
        console.error('Unexpected results page error:', err)
        setError('Something went wrong while loading matches.')
        setLoading(false)
      }
    }

    loadMatches()
  }, [profileId])

  // FREE ACCESS PERIOD: show all matches and always grant premium access.
  const visibleMatches = useMemo(() => matches, [matches])
  const totalMatchesCount = matches.length
  const fullReportCount = totalMatchesCount
  const lockedMatchesCount = 0 // no locks during free period
  const showPremiumSection = false // hide paywall during free period
  const fundingMixItems = useMemo(() => getFundingMixBuckets(visibleMatches), [visibleMatches])

  async function handleRequestFullReport() {
  try {
    if (!profileId) {
      setRequestError('Missing profile ID.')
      return
    }

    if (!profile) {
      setRequestError('Missing profile details.')
      return
    }

    const profileWithContact = profile as Profile & {
      email?: string | null
      phone?: string | null
      contact_name?: string | null
    }

    if (!profile.business_name?.trim()) {
      setRequestError('Missing business name in your saved profile.')
      return
    }

    if (!profileWithContact.email?.trim()) {
      setRequestError('Missing email in your saved profile.')
      return
    }

    if (!profileWithContact.phone?.trim()) {
      setRequestError('Missing phone number in your saved profile.')
      return
    }

    setRequestLoading(true)
    setRequestError(null)

    const { error } = await supabase.from('report_requests').insert([
      {
        profile_id: profileId,
        business_name: profile.business_name || null,
        email: profileWithContact.email || null,
        phone: profileWithContact.phone || null,
        notes: requestNotes || null,
        status: 'new',
      },
    ])

    if (error) {
      setRequestError('Could not submit your request. Please try again.')
      return
    }

    setRequestSuccess(true)
  } catch (err) {
    console.error('Request full report error:', err)
    setRequestError('Something went wrong while sending your request.')
  } finally {
    setRequestLoading(false)
  }
}

  async function handleEnableDeadlineAlerts() {
    try {
      if (!profileId) {
        setAlertsError('Missing profile ID.')
        return
      }

      if (!alertEmail.trim()) {
        setAlertsError('Please enter an email address for alerts.')
        return
      }

      setAlertsLoading(true)
      setAlertsError(null)
      setAlertsSuccess(null)

      const res = await fetch('/api/deadline-alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          email: alertEmail,
          daysBefore: alertDaysBefore,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setAlertsError(json?.error || 'Could not enable alerts.')
        return
      }

      setAlertsSuccess(t('results.deadlineAlertsEnabled'))
    } catch (err) {
      console.error('Deadline alert subscription error:', err)
      setAlertsError('Something went wrong while enabling alerts.')
    } finally {
      setAlertsLoading(false)
    }
  }

  function handleOpenDraftModal(grant: ScoredGrant) {
    setSelectedDraftGrant(grant)
    setShowDraftModal(true)
    setDraftLoading(false)
    setDraftError(null)
    setDraftContent(null)
  }

  async function handleGenerateDraft(grant: ScoredGrant) {
    try {
      if (!profileId) {
        setDraftError('Missing profile ID.')
        return
      }

      setDraftLoading(true)
      setDraftError(null)
      setDraftContent(null)

      const res = await fetch('/api/generate-application-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profileId,
          grantId: grant.id,
          language: draftLanguage,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setDraftError(json?.error || 'Could not generate draft.')
        return
      }

      setDraftContent(json.draft)
    } catch (error) {
      console.error('Draft generation error:', error)
      setDraftError('Something went wrong while generating the draft.')
    } finally {
      setDraftLoading(false)
    }
  }

  function getDraftFileBaseName() {
    const business = (profile?.business_name || 'business').replace(/[^\w\-]+/g, '_')
    const grant = (selectedDraftGrant?.name || 'grant').replace(/[^\w\-]+/g, '_')
    const suffix = draftLanguage === 'fr' ? 'demande_financement' : 'application_draft'
    return `${business}_${grant}_${suffix}`
  }

  async function handleDownloadDraftPdf() {
    if (!draftContent) return

    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const marginL = 20
    const marginR = 20
    const marginTop = 24
    const marginBottom = 20
    const contentWidth = pageWidth - marginL - marginR
    let y = marginTop

    const isFr = draftLanguage === 'fr'
    const TEAL: [number, number, number] = [2, 144, 130]
    const DARK: [number, number, number] = [13, 31, 60]
    const GRAY: [number, number, number] = [100, 110, 125]
    const LIGHT_GRAY: [number, number, number] = [220, 225, 232]

    const checkPage = (needed: number) => {
      if (y + needed > pageHeight - marginBottom) {
        doc.addPage()
        y = marginTop
      }
    }

    // ── Data variables ───────────────────────────────────────────
    const companyName = (profile as any)?.business_name || 'Business'
    const founderName = (draftDetails as any)?.founderName || ''
    const regNum = (draftDetails as any)?.registrationNumber || ''
    const grantName = selectedDraftGrant?.name || ''

    const today = new Date().toLocaleDateString(isFr ? 'fr-CA' : 'en-CA', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

    // ── Header band ──────────────────────────────────────────────
    doc.setFillColor(...DARK)
    doc.rect(0, 0, pageWidth, 28, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(255, 255, 255)
    doc.text(String(companyName), marginL, 12)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(180, 200, 220)
    doc.text(isFr ? 'Brouillon de demande de financement' : 'Grant Application Draft', marginL, 19)
    doc.text(today, pageWidth - marginR, 19, { align: 'right' })
    y = 36

    // ── Application info block ───────────────────────────────────
    doc.setFillColor(240, 244, 248)
    doc.roundedRect(marginL, y, contentWidth, 30, 2, 2, 'F')
    doc.setDrawColor(...LIGHT_GRAY)
    doc.setLineWidth(0.3)
    doc.roundedRect(marginL, y, contentWidth, 30, 2, 2, 'S')

    const col1x = marginL + 6
    const col2x = marginL + contentWidth / 2 + 4

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(...GRAY)
    const lbl = isFr
      ? { co: 'ENTREPRISE', fn: 'FONDATEUR / DEMANDEUR', rn: "N° D'ENREGISTREMENT", gr: 'PROGRAMME DE FINANCEMENT' }
      : { co: 'COMPANY', fn: 'FOUNDER / APPLICANT', rn: 'REGISTRATION NUMBER', gr: 'FUNDING PROGRAM' }

    doc.text(lbl.co, col1x, y + 7)
    doc.text(lbl.fn, col2x, y + 7)
    doc.text(lbl.rn, col1x, y + 20)
    doc.text(lbl.gr, col2x, y + 20)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...DARK)
    doc.text(String(companyName), col1x, y + 14)
    doc.text(founderName || '—', col2x, y + 14)
    doc.text(regNum || '—', col1x, y + 27)
    const grantNameLines = doc.splitTextToSize(String(grantName) || '—', contentWidth / 2 - 8)
    doc.text(grantNameLines[0] || '—', col2x, y + 27)
    y += 38

    // ── Teal accent line ─────────────────────────────────────────
    doc.setDrawColor(...TEAL)
    doc.setLineWidth(1.2)
    doc.line(marginL, y, pageWidth - marginR, y)
    y += 6

    // ── Document title ───────────────────────────────────────────
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(15)
    doc.setTextColor(...DARK)
    const titleLines = doc.splitTextToSize(draftContent.title || (isFr ? 'Demande de financement' : 'Funding Application'), contentWidth)
    doc.text(titleLines, marginL, y)
    y += titleLines.length * 7 + 8

    // ── Section renderer ─────────────────────────────────────────
    const addSection = (heading: string, body: string) => {
      if (!body?.trim()) return
      checkPage(20)
      doc.setFillColor(...TEAL)
      doc.rect(marginL, y, 3, 5.5, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(10)
      doc.setTextColor(...TEAL)
      doc.text(heading.toUpperCase(), marginL + 6, y + 4.5)
      y += 10
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10.5)
      doc.setTextColor(40, 50, 65)
      const lines = doc.splitTextToSize(body, contentWidth)
      lines.forEach((line: string) => {
        checkPage(6)
        doc.text(line, marginL, y)
        y += 6
      })
      y += 4
      doc.setDrawColor(...LIGHT_GRAY)
      doc.setLineWidth(0.25)
      doc.line(marginL, y, pageWidth - marginR, y)
      y += 6
    }

    const labels = isFr
      ? { executive_summary: 'Résumé exécutif', business_overview: "Présentation de l'entreprise", project_alignment: 'Alignement du projet', use_of_funds: 'Utilisation des fonds', expected_impact: 'Impact attendu', closing_statement: 'Conclusion' }
      : { executive_summary: 'Executive Summary', business_overview: 'Business Overview', project_alignment: 'Project Alignment', use_of_funds: 'Use of Funds', expected_impact: 'Expected Impact', closing_statement: 'Closing Statement' }

    addSection(labels.executive_summary, draftContent.executive_summary)
    addSection(labels.business_overview, draftContent.business_overview)
    addSection(labels.project_alignment, draftContent.project_alignment)
    addSection(labels.use_of_funds, draftContent.use_of_funds)
    addSection(labels.expected_impact, draftContent.expected_impact)
    addSection(labels.closing_statement, draftContent.closing_statement)

    // ── Signature block ──────────────────────────────────────────
    checkPage(70)
    y += 6
    doc.setDrawColor(...LIGHT_GRAY)
    doc.setLineWidth(0.3)
    doc.line(marginL, y, pageWidth - marginR, y)
    y += 10

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(...DARK)
    doc.text(isFr ? 'Déclaration et signature' : 'Declaration & Signature', marginL, y)
    y += 8

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...GRAY)
    const declText = isFr
      ? "Je soussigné(e) déclare que les renseignements fournis dans cette demande sont véridiques et exacts à ma connaissance."
      : "I, the undersigned, declare that the information provided in this application is true and accurate to the best of my knowledge."
    const declLines = doc.splitTextToSize(declText, contentWidth)
    doc.text(declLines, marginL, y)
    y += declLines.length * 5.5 + 14

    const sigColW = (contentWidth - 20) / 2
    const col1sig = marginL
    const col2sig = marginL + sigColW + 20

    // Signature line
    doc.setDrawColor(...DARK)
    doc.setLineWidth(0.5)
    doc.line(col1sig, y, col1sig + sigColW, y)
    if (founderName) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(9)
      doc.setTextColor(160, 170, 180)
      doc.text(founderName, col1sig, y - 4)
    }
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(isFr ? 'Signature du demandeur' : 'Applicant Signature', col1sig, y + 5)

    // Date line
    doc.setDrawColor(...DARK)
    doc.setLineWidth(0.5)
    doc.line(col2sig, y, col2sig + sigColW, y)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.setTextColor(160, 170, 180)
    doc.text(today, col2sig, y - 4)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text('Date', col2sig, y + 5)
    y += 20

    // Company stamp box
    doc.setDrawColor(...LIGHT_GRAY)
    doc.setLineWidth(0.4)
    doc.setLineDashPattern([2, 2], 0)
    doc.rect(col1sig, y, sigColW, 22)
    doc.setLineDashPattern([], 0)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(isFr ? "Cachet de l'entreprise (si applicable)" : 'Company Stamp (if applicable)', col1sig + sigColW / 2, y + 12, { align: 'center' })

    // Prepared by
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(7.5)
    doc.text(`${isFr ? 'Préparé par' : 'Prepared by'} ${String(companyName)} · ${today}`, col2sig, y + 8)
    y += 30

    // ── Final footer on every page ───────────────────────────────
    const totalPages = (doc as any).internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      const footerLine = isFr
        ? `${String(companyName)} · Brouillon de demande · Page ${i} / ${totalPages}`
        : `${String(companyName)} · Application Draft · Page ${i} / ${totalPages}`
      doc.text(footerLine, pageWidth / 2, pageHeight - 10, { align: 'center' })
      doc.setDrawColor(...LIGHT_GRAY)
      doc.setLineWidth(0.3)
      doc.line(marginL, pageHeight - 14, pageWidth - marginR, pageHeight - 14)
    }

    doc.save(`${getDraftFileBaseName()}.pdf`)
  }

  async function handleDownloadDraftWord() {
    if (!draftContent) return

    const labels =
      draftLanguage === 'fr'
        ? {
            executive_summary: 'Résumé exécutif',
            business_overview: "Présentation de l'entreprise",
            project_alignment: 'Alignement du projet',
            use_of_funds: 'Utilisation des fonds',
            expected_impact: 'Impact attendu',
            closing_statement: 'Conclusion',
          }
        : {
            executive_summary: 'Executive Summary',
            business_overview: 'Business Overview',
            project_alignment: 'Project Alignment',
            use_of_funds: 'Use of Funds',
            expected_impact: 'Expected Impact',
            closing_statement: 'Closing Statement',
          }

    const doc = new Document({
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: draftContent.title || 'Application Draft',
              heading: HeadingLevel.TITLE,
            }),

            new Paragraph({
              children: [new TextRun({ text: labels.executive_summary, bold: true })],
            }),
            new Paragraph(draftContent.executive_summary || ''),

            new Paragraph({
              children: [new TextRun({ text: labels.business_overview, bold: true })],
            }),
            new Paragraph(draftContent.business_overview || ''),

            new Paragraph({
              children: [new TextRun({ text: labels.project_alignment, bold: true })],
            }),
            new Paragraph(draftContent.project_alignment || ''),

            new Paragraph({
              children: [new TextRun({ text: labels.use_of_funds, bold: true })],
            }),
            new Paragraph(draftContent.use_of_funds || ''),

            new Paragraph({
              children: [new TextRun({ text: labels.expected_impact, bold: true })],
            }),
            new Paragraph(draftContent.expected_impact || ''),

            new Paragraph({
              children: [new TextRun({ text: labels.closing_statement, bold: true })],
            }),
            new Paragraph(draftContent.closing_statement || ''),
          ],
        },
      ],
    })

    const blob = await Packer.toBlob(doc)
    saveAs(blob, `${getDraftFileBaseName()}.docx`)
  }

  async function handleCopyDraft() {
    if (!draftContent) return

    const labels =
      draftLanguage === 'fr'
        ? {
            executive_summary: 'Résumé exécutif',
            business_overview: "Présentation de l'entreprise",
            project_alignment: 'Alignement du projet',
            use_of_funds: 'Utilisation des fonds',
            expected_impact: 'Impact attendu',
            closing_statement: 'Conclusion',
          }
        : {
            executive_summary: 'Executive Summary',
            business_overview: 'Business Overview',
            project_alignment: 'Project Alignment',
            use_of_funds: 'Use of Funds',
            expected_impact: 'Expected Impact',
            closing_statement: 'Closing Statement',
          }

    const text = `
${draftContent.title}

${labels.executive_summary}
${draftContent.executive_summary}

${labels.business_overview}
${draftContent.business_overview}

${labels.project_alignment}
${draftContent.project_alignment}

${labels.use_of_funds}
${draftContent.use_of_funds}

${labels.expected_impact}
${draftContent.expected_impact}

${labels.closing_statement}
${draftContent.closing_statement}
`.trim()

    try {
      await navigator.clipboard.writeText(text)
      alert(draftLanguage === 'fr' ? 'Brouillon copié dans le presse-papiers' : 'Draft copied to clipboard')
    } catch (err) {
      alert(draftLanguage === 'fr' ? 'Échec de la copie du brouillon' : 'Failed to copy draft')
    }
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} />

  const sectionLabels =
    draftLanguage === 'fr'
      ? {
          draftGenerator: 'Générateur de brouillon de demande',
          draftGeneratorSubtitle:
            'Générez un brouillon professionnel basé sur votre profil et vos opportunités correspondantes.',
          draftLanguage: 'Langue du brouillon',
          generateDraft: 'Générer le brouillon',
          applicationDraft: 'Brouillon de demande',
          draftIntro:
            "Ce brouillon est basé sur le profil de votre entreprise et l'opportunité de financement sélectionnée. Relisez-le et ajustez-le avant de le soumettre.",
          generatingDraft: 'Génération du brouillon...',
          executive_summary: 'Résumé exécutif',
          business_overview: "Présentation de l'entreprise",
          project_alignment: 'Alignement du projet',
          use_of_funds: 'Utilisation des fonds',
          expected_impact: 'Impact attendu',
          closing_statement: 'Conclusion',
          copyDraft: 'Copier le brouillon',
          downloadWord: 'Télécharger Word',
          downloadPdf: 'Télécharger PDF',
          close: 'Fermer',
        }
      : {
          draftGenerator: 'Application Draft Generator',
          draftGeneratorSubtitle:
            'Generate a professional application draft based on your profile and matched opportunities.',
          draftLanguage: 'Draft language',
          generateDraft: 'Generate Draft',
          applicationDraft: 'Application Draft',
          draftIntro:
            'This draft is based on your business profile and the selected funding opportunity. Review and refine it before submitting.',
          generatingDraft: 'Generating your draft...',
          executive_summary: 'Executive Summary',
          business_overview: 'Business Overview',
          project_alignment: 'Project Alignment',
          use_of_funds: 'Use of Funds',
          expected_impact: 'Expected Impact',
          closing_statement: 'Closing Statement',
          copyDraft: 'Copy Draft',
          downloadWord: 'Download Word',
          downloadPdf: 'Download PDF',
          close: 'Close',
        }

  return (
    <div className="page">
      <div className="shell">
        <div className="brandTop">{t('common.brand')}</div>

        <div className="heroBlock">
          <div className="heroBadge">{t('results.resultsReady')}</div>
          <h1 className="heroTitle">{t('results.heroTitle')}</h1>
          <p className="heroText">{t('results.heroText')}</p>
          <div className="heroNotice">
            {t('results.heroNotice', {
              count: evaluatedProgramsCount,
              visible: matches.length,
              suffix:
                matches.length === 1
                  ? ''
                  : i18n.language.startsWith('fr')
                  ? 's'
                  : 'es',
            })}
          </div>
        </div>

        {profile && (
          <div className="panel">
            <div className="panelHeader">
              <div>
                <h2 className="panelTitle">{t('results.yourProfile')}</h2>
                <p className="panelSubtitle">{t('results.yourProfileSubtitle')}</p>
              </div>
              <div className="profileBadge">{t('results.personalizedMatchProfile')}</div>
            </div>

            <div className="profileGrid">
              {[
                [t('results.industry'), profile.industry || '-'],
                [t('results.stage'), profile.stage || '-'],
                [t('results.employees'), profile.employees ?? '-'],
                [t('results.doesRd'), profile.does_rd ? t('common.yes') : t('common.no')],
                [t('results.goal'), profile.goal || '-'],
              ].map(([label, value]) => (
                <div key={String(label)} className="profileItem">
                  <div className="profileLabel">{label}</div>
                  <div className="profileValue">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="panel">
          <div className="panelHeader">
            <div>
              <h2 className="panelTitle">{t('results.deadlineAlerts')}</h2>
              <p className="panelSubtitle">{t('results.deadlineAlertsSubtitle')}</p>
            </div>
            <div className="profileBadge">{t('results.retentionFeature')}</div>
          </div>

          <div className="modalForm">
  <div className="sectionCard">
    <div className="sectionTitle">Saved Contact Details</div>
    <div className="sectionBody">
      <div><strong>Business:</strong> {profile?.business_name || '-'}</div>
      <div><strong>Email:</strong> {(profile as { email?: string | null })?.email || '-'}</div>
      <div><strong>Phone:</strong> {(profile as { phone?: string | null })?.phone || '-'}</div>
    </div>
  </div>

  <textarea
    placeholder={t('results.optionalNotes')}
    value={requestNotes}
    onChange={(e) => setRequestNotes(e.target.value)}
    className="modalTextarea"
    rows={4}
  />

  {requestError && <div className="modalError">{requestError}</div>}

  <div className="modalActions">
    <button
      type="button"
      className="secondaryModalBtn"
      onClick={() => setShowRequestModal(false)}
    >
      {t('common.cancel')}
    </button>

    <button
      type="button"
      className="primaryModalBtn"
      onClick={handleRequestFullReport}
      disabled={requestLoading}
    >
      {requestLoading ? t('results.submitting') : t('results.submitRequest')}
    </button>
  </div>
</div>
        </div>

        {matches.length === 0 ? (
          <div className="panel">
            <p className="emptyText">{t('results.noPrograms')}</p>
          </div>
        ) : (
          <>
            <div className="resultsList">
             <div className="disclaimerBox">
  {t('results.stackingDisclaimer')}
</div>

{fundingMixItems.length > 0 && (
  <div className="fundingMixBox">
    <div className="fundingMixTitle">{t('results.suggestedFundingMix')}</div>
    <div className="fundingMixSubtext">
      {t('results.suggestedFundingMixText')}
    </div>

    <div className="fundingMixGrid">
      {fundingMixItems.map((item) => (
        <div key={`${item.label}-${item.grant.id}`} className="fundingMixCard">
          <div className="fundingMixCardLabel">
            {item.label === 'Hiring Support'
              ? t('results.fundingMixHiring')
              : item.label === 'Equipment / Investment'
              ? t('results.fundingMixEquipment')
              : item.label === 'Innovation / R&D'
              ? t('results.fundingMixInnovation')
              : t('results.fundingMixGrowth')}
          </div>
          <div className="fundingMixCardName">{item.grant.name || t('common.unnamedProgram')}</div>
        </div>
      ))}
    </div>
  </div>
)}

              {visibleMatches.map((grant, index) => {
                const scoreMeta = getScoreMeta(grant.matchPercent, t)
                console.log('LANG', i18n.language)
console.log('GRANT NAME EN', grant.name)
console.log('GRANT NAME FR', (grant as Grant & { name_fr?: string | null }).name_fr)
console.log('GRANT DESC FR', (grant as Grant & { description_fr?: string | null }).description_fr)

                return (
                  <div key={grant.id} className="grantCard">
                    <div className="grantTop">
                      <div className="grantTopLeft">
                        <div className="grantBadges">
                          {index === 0 && (
                            <span className="topMatchBadge">{t('results.topMatch')}</span>
                          )}
                         <span className="typeBadge">{formatFundingType(grant, t)}</span>
                        </div>

                        <h2 className="grantTitle">
                          {getGrantName(grant, i18n.language)}
                        </h2>
                        <p className="grantOrg">
                          {grant.organization || t('common.organizationNotSpecified')}
                        </p>
                      </div>

                      <div className={`scoreCard ${scoreMeta.className}`}>
 <div className="scoreLabel">{scoreMeta.label}</div>
  <div className="scoreValue">{grant.matchPercent ?? 0}%</div>
</div>
                    </div>

                 <p className="grantDescription">
  {getGrantDescription(grant, i18n.language)}
</p>

                    <div className="infoGrid">
                      <div className="infoItem">
                        <div className="infoLabel">{t('results.maximumAmount')}</div>
                        <div className="infoValue">{formatAmount(grant.amount_max, t)}</div>
                      </div>

                      <div className="infoItem">
                        <div className="infoLabel">{t('results.fundingType')}</div>
                        <div className="infoValue">{formatFundingType(grant, t)}</div>
                      </div>

                      <div className="infoItem">
                        <div className="infoLabel">{t('results.status')}</div>
                        <div className="infoValue">
                         {grant.intake_status === 'open'
  ? t('results.statusOpen')
  : grant.intake_status === 'rolling'
  ? t('results.statusRolling')
  : grant.intake_status === 'upcoming'
  ? t('results.statusUpcoming')
  : grant.intake_status || t('common.unknown')}
                        </div>
                      </div>
                    </div>

                    <div className="sectionCard">
                      <div className="sectionTitle">{t('results.eligibility')}</div>
                      <div className="sectionBody">{getGrantEligibility(grant, i18n.language)}</div>
                    </div>

                    {grant.reasons.length > 0 && (
                      <div className="matchWhyCard">
                        <div className="sectionTitle matchWhyTitle">
                          {t('results.whyThisMatches')}
                        </div>
                        <ul className="reasonsList">
                          {grant.reasons.map((reason, index2) => (
                           <li key={index2}>{translateReason(reason, i18n.language)}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="grantActions">
                      {grant.url && (
                        <a
                          href={grant.url}
                          target="_blank"
                          rel="noreferrer"
                          className="grantButton"
                        >
                          {t('results.viewGrantDetails')}
                        </a>
                      )}
                      <button
                        type="button"
                        className="secondaryActionBtn"
                        onClick={() => handleOpenDraftModal(grant)}
                      >
                        {sectionLabels.generateDraft}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {showPremiumSection && (
              <>
                <div className="paywallCard">
                  <div className="paywallBadge">{t('results.premiumReport')}</div>
                  <h2 className="paywallTitle">{t('results.unlockTitle')}</h2>
                  <p className="paywallText">
                    {t('results.unlockText', {
                      count: matches.length,
                      suffix:
                        matches.length === 1
                          ? ''
                          : i18n.language.startsWith('fr')
                          ? 's'
                          : 's',
                      visible: Math.min(FREE_VISIBLE_COUNT, matches.length),
                      remaining: Math.max(matches.length - FREE_VISIBLE_COUNT, 0),
                    })}
                  </p>

                  <div className="paywallFeatures">
                    <div className="payFeature">{t('results.payFeature1')}</div>
                    <div className="payFeature">{t('results.payFeature2')}</div>
                    <div className="payFeature">{t('results.payFeature3')}</div>
                    <div className="payFeature">{t('results.payFeature4')}</div>
                    <div className="payFeature">{t('results.payFeature5')}</div>
                    <div className="payFeature">{t('results.payFeature6')}</div>
                    <div className="payFeature">{t('results.payFeature7')}</div>
                    <div className="payFeature">{t('results.payFeature8')}</div>
                    <div className="payFeature">{t('results.payFeature9')}</div>
                  </div>

                  <div className="paywallTrust">{t('results.paywallTrust')}</div>

                  <div className="priceRow">
                    <div>
                      <div className="priceLabel">{t('results.premiumAccess')}</div>
                      <div className="priceValue">{t('results.requestFullReport')}</div>
                      <div className="priceNote">{t('results.nextSteps')}</div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setRequestSuccess(false)
                        setRequestError(null)
                        setShowRequestModal(true)
                      }}
                      className="unlockButton"
                    >
                      {t('results.requestFullReportButton')}
                    </button>
                  </div>
                </div>

                <div className="lockedPreviewSingle">
                  <div className="lockedTitle">{t('results.moreOpportunities')}</div>
                  <div className="lockedText">
                    {t('results.moreOpportunitiesText', {
                      visible: Math.min(FREE_VISIBLE_COUNT, matches.length),
                      remaining: Math.max(matches.length - FREE_VISIBLE_COUNT, 0),
                      suffix:
                        Math.min(FREE_VISIBLE_COUNT, matches.length) === 1
                          ? ''
                          : i18n.language.startsWith('fr')
                          ? 's'
                          : 'es',
                      opSuffix:
                        Math.max(matches.length - FREE_VISIBLE_COUNT, 0) === 1 ? '' : 's',
                    })}
                  </div>
                </div>
              </>
            )}
          </>
        )}


      </div>

      {showRequestModal && (
        <div className="modalBackdrop" onClick={() => setShowRequestModal(false)}>
          <div className="modalCard" onClick={(e) => e.stopPropagation()}>
            {!requestSuccess ? (
              <>
                <h3 className="modalTitle">{t('results.requestModalTitle')}</h3>
               <p className="modalText">
  This request will be processed based on your profile and available funding programs.  
  You can add an optional note below if needed.
</p>
<p className="modalSubText">
  Results are generated automatically and may require verification with the funding provider.
</p>

                <div className="modalForm">
  <div className="sectionCard">
    <div className="sectionTitle">Saved Contact Details</div>
    <div className="sectionBody">
      <div><strong>Business:</strong> {profile?.business_name || '-'}</div>
      <div><strong>Email:</strong> {(profile as { email?: string | null })?.email || '-'}</div>
      <div><strong>Phone:</strong> {(profile as { phone?: string | null })?.phone || '-'}</div>
    </div>
  </div>

  <textarea
    placeholder={t('results.optionalNotes')}
    value={requestNotes}
    onChange={(e) => setRequestNotes(e.target.value)}
    className="modalTextarea"
    rows={4}
  />

  {requestError && <div className="modalError">{requestError}</div>}

  <div className="modalActions">
    <button
      type="button"
      className="secondaryModalBtn"
      onClick={() => setShowRequestModal(false)}
    >
      {t('common.cancel')}
    </button>

    <button
      type="button"
      className="primaryModalBtn"
      onClick={handleRequestFullReport}
      disabled={requestLoading}
    >
      {requestLoading ? t('results.submitting') : t('results.submitRequest')}
    </button>
  </div>
</div>
              </>
            ) : (
              <>
                <h3 className="modalTitle">{t('results.requestSubmitted')}</h3>
                <p className="modalText">{t('results.requestSubmittedText')}</p>

                <div className="modalActions single">
                  <button
                    type="button"
                    className="primaryModalBtn"
                    onClick={() => setShowRequestModal(false)}
                  >
                    {t('common.close')}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showDraftModal && (
        <div className="modalBackdrop" onClick={() => setShowDraftModal(false)}>
          <div className="modalCard draftModalCard" onClick={(e) => e.stopPropagation()}>
            <h3 className="modalTitle">
             {selectedDraftGrant
  ? `${sectionLabels.applicationDraft} — ${getGrantName(selectedDraftGrant, i18n.language)}`
  : sectionLabels.applicationDraft}
            </h3>

            <p className="modalText">{sectionLabels.draftIntro}</p>

            {!draftContent && !draftLoading && (
              <div className="draftLanguageRow">
                <label className="draftLanguageLabel">{sectionLabels.draftLanguage}</label>
                <select
                  value={draftLanguage}
                  onChange={(e) => setDraftLanguage(e.target.value as 'en' | 'fr')}
                  className="modalInput draftLanguageSelect"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                </select>
                {selectedDraftGrant && (
                  <button
                    type="button"
                    className="primaryModalBtn"
                    onClick={() => handleGenerateDraft(selectedDraftGrant)}
                  >
                    {sectionLabels.generateDraft}
                  </button>
                )}
              </div>
            )}

            {draftLoading && (
              <div className="panel">
                <div className="panelSubtitle">{sectionLabels.generatingDraft}</div>
              </div>
            )}

            {draftError && <div className="modalError">{draftError}</div>}

            {draftContent && (
              <div className="draftContent">
                <div className="sectionCard">
                  <div className="sectionTitle">{draftContent.title}</div>
                </div>

                <div className="sectionCard">
                  <div className="sectionTitle">{sectionLabels.executive_summary}</div>
                  <div className="sectionBody">{draftContent.executive_summary}</div>
                </div>

                <div className="sectionCard">
                  <div className="sectionTitle">{sectionLabels.business_overview}</div>
                  <div className="sectionBody">{draftContent.business_overview}</div>
                </div>

                <div className="sectionCard">
                  <div className="sectionTitle">{sectionLabels.project_alignment}</div>
                  <div className="sectionBody">{draftContent.project_alignment}</div>
                </div>

                <div className="sectionCard">
                  <div className="sectionTitle">{sectionLabels.use_of_funds}</div>
                  <div className="sectionBody">{draftContent.use_of_funds}</div>
                </div>

                <div className="sectionCard">
                  <div className="sectionTitle">{sectionLabels.expected_impact}</div>
                  <div className="sectionBody">{draftContent.expected_impact}</div>
                </div>

                <div className="sectionCard">
                  <div className="sectionTitle">{sectionLabels.closing_statement}</div>
                  <div className="sectionBody">{draftContent.closing_statement}</div>
                </div>
              </div>
            )}

            <div className="modalActions">
              {draftContent && (
                <>
                  <button
                    type="button"
                    className="secondaryModalBtn"
                    onClick={handleCopyDraft}
                  >
                    {sectionLabels.copyDraft}
                  </button>

                  <button
                    type="button"
                    className="secondaryModalBtn"
                    onClick={handleDownloadDraftWord}
                  >
                    {sectionLabels.downloadWord}
                  </button>

                  <button
                    type="button"
                    className="secondaryModalBtn"
                    onClick={handleDownloadDraftPdf}
                  >
                    {sectionLabels.downloadPdf}
                  </button>
                </>
              )}

              <button
                type="button"
                className="primaryModalBtn"
                onClick={() => setShowDraftModal(false)}
              >
                {sectionLabels.close}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ResultsContent />
    </Suspense>
  )
}

const styles = `
  .draftModalCard {
    max-width: 820px;
    max-height: 88vh;
    overflow-y: auto;
  }

  .draftContent {
    display: grid;
    gap: 12px;
  }

  .draftLanguageRow {
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .draftLanguageLabel {
    font-size: 14px;
    color: rgba(255,255,255,0.72);
    font-weight: 600;
  }

  .draftLanguageSelect {
    max-width: 220px;
  }

  .page {
    min-height: 100vh;
    background: #0d1f3c;
    color: white;
    font-family: system-ui, sans-serif;
    padding: 24px 16px 40px;
  }

  .shell {
    max-width: 1040px;
    margin: 0 auto;
  }

  .brandTop {
    text-align: center;
    margin-bottom: 28px;
    font-size: 20px;
    font-weight: 700;
    color: #02c39a;
  }

  .loadingWrap {
    max-width: 820px;
    margin: 0 auto;
    text-align: center;
    padding-top: 80px;
  }

  .spinner {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.12);
    border-top: 3px solid #02c39a;
    margin: 0 auto 24px;
    animation: spin 1s linear infinite;
  }

  .loadingTitle {
    font-size: clamp(1.8rem, 4vw, 2.4rem);
    font-weight: 800;
    margin: 0 0 12px;
  }

  .loadingText {
    color: rgba(255,255,255,0.58);
    font-size: 15px;
    margin: 0;
  }

  .errorCard {
    max-width: 760px;
    margin: 60px auto 0;
    background: rgba(239,68,68,0.12);
    border: 1px solid rgba(239,68,68,0.35);
    border-radius: 20px;
    padding: 24px 22px;
  }

  .errorTitle {
    font-size: clamp(1.8rem, 4vw, 2.4rem);
    font-weight: 800;
    margin: 0 0 10px;
  }

  .errorText {
    color: #fecaca;
    margin: 0;
    line-height: 1.6;
    font-size: 15px;
  }

  .heroBlock {
    margin-bottom: 24px;
  }

  .heroBadge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(2,195,154,0.12);
    border: 1px solid rgba(2,195,154,0.25);
    color: #02c39a;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 14px;
  }

  .heroTitle {
    font-size: clamp(2rem, 5vw, 3rem);
    font-weight: 800;
    line-height: 1.08;
    margin: 0 0 12px;
    letter-spacing: -0.03em;
  }

  .heroText {
    max-width: 760px;
    font-size: 16px;
    line-height: 1.7;
    color: rgba(255,255,255,0.62);
    margin: 0 0 16px;
  }

  .heroNotice {
    padding: 12px 16px;
    border-radius: 14px;
    background: rgba(2,195,154,0.12);
    border: 1px solid rgba(2,195,154,0.25);
    color: #9ff7df;
    font-size: 14px;
    line-height: 1.5;
  }

  .panel {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 22px;
    padding: 22px;
    margin-bottom: 22px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.18);
  }

  .panelHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .panelTitle {
    margin: 0;
    font-size: clamp(1.25rem, 3vw, 1.7rem);
    font-weight: 800;
  }

  .panelSubtitle {
    margin: 6px 0 0;
    color: rgba(255,255,255,0.52);
    font-size: 14px;
    line-height: 1.5;
  }

  .profileBadge {
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(2,128,144,0.18);
    border: 1px solid rgba(2,128,144,0.35);
    color: #67e8f9;
    font-size: 13px;
    font-weight: 700;
  }

  .profileGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
  }

  .profileItem {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px;
    padding: 16px;
  }

  .profileLabel {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255,255,255,0.4);
    margin-bottom: 8px;
  }

  .profileValue {
    font-size: 16px;
    font-weight: 600;
    line-height: 1.45;
    color: white;
  }

  .stackSummary {
    background: rgba(2,195,154,0.08);
    border: 1px solid rgba(2,195,154,0.18);
    border-radius: 18px;
    padding: 18px;
    margin-bottom: 16px;
  }

  .stackAmountLabel {
    font-size: 12px;
    color: rgba(255,255,255,0.55);
    margin-bottom: 6px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .stackAmountValue {
    font-size: 30px;
    font-weight: 800;
    color: #9ff7df;
  }

  .stackPrograms {
    display: grid;
    gap: 12px;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    margin-bottom: 16px;
  }

  .stackProgramCard {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px;
    padding: 16px;
  }

  .stackProgramName {
    font-size: 16px;
    font-weight: 700;
    margin-bottom: 6px;
  }

  .stackProgramMeta {
    font-size: 14px;
    color: rgba(255,255,255,0.6);
    line-height: 1.5;
  }

  .resultsList {
    display: grid;
    gap: 18px;
  }

  .grantCard {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 22px;
    padding: 22px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.18);
  }

  .grantTop {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }

  .grantTopLeft {
    flex: 1;
    min-width: 0;
  }

  .grantBadges {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-bottom: 12px;
  }

  .topMatchBadge {
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(2,195,154,0.12);
    border: 1px solid rgba(2,195,154,0.25);
    color: #02c39a;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.03em;
  }

  .typeBadge {
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.72);
    font-size: 12px;
    font-weight: 700;
  }

  .grantTitle {
    font-size: clamp(1.45rem, 4vw, 2rem);
    font-weight: 800;
    line-height: 1.15;
    margin: 0 0 8px;
    letter-spacing: -0.02em;
  }

  .grantOrg {
    font-size: 15px;
    color: rgba(255,255,255,0.58);
    margin: 0;
    line-height: 1.5;
  }

  .scoreCard {
    min-width: 140px;
    text-align: center;
    padding: 14px 16px;
    border-radius: 18px;
    color: white;
    font-weight: 800;
    flex: 0 0 auto;
  }

  .scoreCard.strong {
    background: linear-gradient(90deg, #02c39a, #028090);
  }

  .scoreCard.good {
    background: linear-gradient(90deg, #2563eb, #1d4ed8);
  }

  .scoreCard.weak {
    background: rgba(255,255,255,0.14);
  }

  .scoreLabel {
    font-size: 12px;
    opacity: 0.95;
    margin-bottom: 4px;
  }

  .scoreValue {
    font-size: 24px;
    line-height: 1;
  }

  .grantDescription {
    font-size: 15px;
    line-height: 1.75;
    color: rgba(255,255,255,0.82);
    margin: 0 0 16px;
  }

  .infoGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .infoItem {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px;
    padding: 16px;
  }

  .infoLabel {
    font-size: 12px;
    color: rgba(255,255,255,0.4);
    margin-bottom: 6px;
  }

  .infoValue {
    font-size: 18px;
    font-weight: 700;
    line-height: 1.4;
  }

  .sectionCard {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .sectionTitle {
    font-size: 15px;
    font-weight: 800;
    margin-bottom: 10px;
  }

  .sectionBody {
    color: rgba(255,255,255,0.74);
    line-height: 1.65;
    font-size: 15px;
  }

  .matchWhyCard {
    background: rgba(2,195,154,0.08);
    border: 1px solid rgba(2,195,154,0.2);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 16px;
  }

  .matchWhyTitle {
    color: #9ff7df;
  }

  .reasonsList {
    padding-left: 18px;
    margin: 0;
    color: rgba(255,255,255,0.84);
  }

  .reasonsList li {
    margin-bottom: 6px;
    line-height: 1.55;
  }

  .grantButton {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: linear-gradient(90deg, #028090, #02c39a);
    color: white;
    padding: 14px 18px;
    border-radius: 14px;
    text-decoration: none;
    font-weight: 800;
    font-size: 15px;
    box-shadow: 0 8px 20px rgba(2,195,154,0.18);
    max-width: 100%;
  }

  .paywallCard {
    margin-top: 18px;
    background: linear-gradient(180deg, rgba(2,195,154,0.12), rgba(2,128,144,0.08));
    border: 1px solid rgba(2,195,154,0.22);
    border-radius: 24px;
    padding: 24px;
    box-shadow: 0 14px 40px rgba(0,0,0,0.2);
  }

  .paywallBadge {
    display: inline-block;
    margin-bottom: 14px;
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255,255,255,0.12);
    color: #9ff7df;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.03em;
  }

  .paywallTitle {
    margin: 0 0 10px;
    font-size: clamp(1.5rem, 4vw, 2rem);
    font-weight: 800;
    line-height: 1.15;
  }

  .paywallText {
    margin: 0 0 16px;
    color: rgba(255,255,255,0.78);
    font-size: 15px;
    line-height: 1.7;
  }

  .paywallFeatures {
    display: grid;
    gap: 10px;
    margin-bottom: 12px;
  }

  .payFeature {
    color: rgba(255,255,255,0.92);
    font-size: 15px;
  }

  .paywallTrust {
    margin-top: 10px;
    margin-bottom: 16px;
    font-size: 13px;
    color: rgba(255,255,255,0.6);
  }

  .priceRow {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    flex-wrap: wrap;
  }

  .priceLabel {
    font-size: 13px;
    color: rgba(255,255,255,0.55);
    margin-bottom: 4px;
  }

  .priceValue {
    font-size: 32px;
    font-weight: 800;
    line-height: 1;
  }

  .priceNote {
    font-size: 13px;
    color: rgba(255,255,255,0.6);
    margin-top: 4px;
  }

  .unlockButton {
    border: none;
    cursor: pointer;
    padding: 14px 20px;
    border-radius: 14px;
    background: white;
    color: #062344;
    font-size: 15px;
    font-weight: 800;
    min-height: 48px;
  }

  .lockedPreviewSingle {
    margin-top: 18px;
    padding: 28px 20px;
    border-radius: 22px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    text-align: center;
  }

  .lockedTitle {
    font-size: 20px;
    font-weight: 800;
    margin-bottom: 8px;
  }

  .lockedText {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(255,255,255,0.72);
  }

  .emptyText {
    margin: 0;
    color: rgba(255,255,255,0.68);
    font-size: 15px;
  }

  .modalBackdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    z-index: 1000;
  }

  .modalCard {
    width: 100%;
    max-width: 560px;
    background: #10284c;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 22px;
    padding: 22px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.35);
  }

  .modalTitle {
    margin: 0 0 10px;
    font-size: 28px;
    font-weight: 800;
  }

  .modalText {
    margin: 0 0 18px;
    color: rgba(255,255,255,0.72);
    line-height: 1.6;
    font-size: 15px;
  }

  .modalForm {
    display: grid;
    gap: 12px;
  }

  .modalInput,
  .modalTextarea {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    color: white;
    border-radius: 14px;
    padding: 14px 16px;
    font-size: 15px;
    outline: none;
  }

  .modalTextarea {
    resize: vertical;
    min-height: 110px;
  }

  .modalError {
    background: rgba(239,68,68,0.12);
    border: 1px solid rgba(239,68,68,0.35);
    color: #fecaca;
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 14px;
  }

  .modalSuccess {
    background: rgba(16,185,129,0.12);
    border: 1px solid rgba(16,185,129,0.35);
    color: #bbf7d0;
    border-radius: 12px;
    padding: 12px 14px;
    font-size: 14px;
  }

  .modalActions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 4px;
  }

  .modalActions.single {
    justify-content: center;
  }

  .primaryModalBtn,
  .secondaryModalBtn {
    min-height: 46px;
    padding: 12px 18px;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 800;
    cursor: pointer;
    border: none;
  }

  .primaryModalBtn {
    background: linear-gradient(90deg, #028090, #02c39a);
    color: white;
  }

  .secondaryModalBtn {
    background: rgba(255,255,255,0.08);
    color: white;
    border: 1px solid rgba(255,255,255,0.12);
  }

  .grantActions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 12px;
  }

  .secondaryActionBtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: rgba(255,255,255,0.08);
    color: white;
    padding: 14px 18px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.12);
    font-weight: 800;
    font-size: 15px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .secondaryActionBtn:hover {
    background: rgba(255,255,255,0.18);
    transform: translateY(-1px);
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 640px) {
    .page {
      padding: 18px 14px 32px;
    }

    .brandTop {
      font-size: 18px;
      margin-bottom: 22px;
    }

    .panel,
    .grantCard,
    .errorCard,
    .paywallCard,
    .modalCard {
      padding: 18px 16px;
      border-radius: 18px;
    }

    .scoreCard,
    .unlockButton,
    .grantButton,
    .primaryModalBtn,
    .secondaryModalBtn,
    .secondaryActionBtn {
      width: 100%;
      min-width: 0;
    }

    .heroText,
    .grantDescription,
    .sectionBody,
    .paywallText,
    .modalText {
      font-size: 14px;
    }

    .priceRow,
    .modalActions {
      align-items: stretch;
    }

    .modalTitle {
      font-size: 24px;
    }
      .disclaimerBox {
  max-width: 820px;
  margin: 0 auto 18px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 193, 7, 0.12);
  border: 1px solid rgba(255, 193, 7, 0.35);
  color: #fde68a;
  font-size: 13px;
  line-height: 1.5;
}

.fundingMixBox {
  max-width: 820px;
  margin: 0 auto 20px;
  padding: 18px;
  border-radius: 16px;
  background: rgba(2, 195, 154, 0.08);
  border: 1px solid rgba(2, 195, 154, 0.25);
}

.fundingMixTitle {
  font-size: 15px;
  font-weight: 700;
  color: #02c39a;
  margin-bottom: 8px;
}

.fundingMixList {
  padding-left: 18px;
  font-size: 14px;
  color: rgba(255,255,255,0.85);
  line-height: 1.6;
}
  }
`