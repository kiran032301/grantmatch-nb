'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Profile = {
  id: string
  business_name: string | null
  industry: string | null
  stage: string | null
  employees: number | null
  does_rd: boolean | null
  goal: string | null
}

type Grant = {
  id: string
  name: string
  organization: string | null
  amount_max: number | null
  type: string | null
  repayable: boolean | null
  description: string | null
  eligibility: string | null
  industry_tags: string[] | string | null
  intake_status: string | null
  url: string | null
}

type ScoredGrant = Grant & {
  score: number
  reasons: string[]
}

function mapIndustryToTag(industry: string | null) {
  if (!industry) return null

  const value = industry.toLowerCase()

  if (value.includes('technology') || value.includes('software')) return 'technology'
  if (value.includes('manufacturing')) return 'manufacturing'
  if (value.includes('agriculture')) return 'agriculture'
  if (value.includes('health')) return 'health'
  if (value.includes('clean energy') || value.includes('cleantech')) return 'cleantech'
  if (value.includes('retail')) return 'retail'
  if (value.includes('hospitality')) return 'hospitality'
  if (value.includes('professional services')) return 'services'

  return null
}

function normalizeIndustryTags(tags: string[] | string | null): string[] {
  if (!tags) return []

  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim().toLowerCase())
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  }

  return []
}

function scoreGrant(profile: Profile, grant: Grant): ScoredGrant {
  let score = 0
  const reasons: string[] = []

  const industryTag = mapIndustryToTag(profile.industry)
  const grantTags = normalizeIndustryTags(grant.industry_tags)
  const searchableText =
    `${grant.name ?? ''} ${grant.description ?? ''} ${grant.eligibility ?? ''}`.toLowerCase()

  if (industryTag && grantTags.includes(industryTag)) {
    score += 40
    reasons.push(`Matches your industry: ${profile.industry}`)
  }

  if (profile.does_rd === true) {
    if (
      searchableText.includes('r&d') ||
      searchableText.includes('research') ||
      searchableText.includes('innovation') ||
      searchableText.includes('technology') ||
      searchableText.includes('development')
    ) {
      score += 30
      reasons.push('Strong fit for R&D / innovation activity')
    }
  }

  if (profile.goal) {
    const goal = profile.goal.toLowerCase()

    if (
      (goal.includes('hiring') && (searchableText.includes('hiring') || searchableText.includes('staff'))) ||
      (goal.includes('r&d') &&
        (searchableText.includes('r&d') ||
          searchableText.includes('research') ||
          searchableText.includes('development') ||
          searchableText.includes('innovation'))) ||
      (goal.includes('equipment') &&
        (searchableText.includes('equipment') ||
          searchableText.includes('capital') ||
          searchableText.includes('expansion'))) ||
      (goal.includes('training') && searchableText.includes('training')) ||
      (goal.includes('growth') &&
        (searchableText.includes('growth') ||
          searchableText.includes('commercialization') ||
          searchableText.includes('expansion'))) ||
      (goal.includes('export') &&
        (searchableText.includes('export') || searchableText.includes('market')))
    ) {
      score += 20
      reasons.push(`Supports your funding goal: ${profile.goal}`)
    }
  }

  if ((grant.intake_status ?? '').toLowerCase() === 'open') {
    score += 10
    reasons.push('Currently open')
  }

  return {
    ...grant,
    score,
    reasons,
  }
}

function getScoreMeta(score: number) {
  if (score >= 70) {
    return {
      label: 'Strong Match',
      className: 'strong',
    }
  }

  if (score >= 40) {
    return {
      label: 'Good Match',
      className: 'good',
    }
  }

  return {
    label: 'Possible Match',
    className: 'possible',
  }
}

function formatAmount(amount: number | null) {
  if (!amount) return 'Not specified'
  return `$${amount.toLocaleString()}`
}

function LoadingState() {
  return (
    <div className="page">
      <div className="loadingWrap">
        <div className="spinner" />
        <h1 className="loadingTitle">Finding your best grant matches...</h1>
        <p className="loadingText">
          We are reviewing funding programs based on your answers.
        </p>
      </div>

      <style>{baseStyles}</style>
    </div>
  )
}

function ErrorState({ error }: { error: string }) {
  return (
    <div className="page">
      <div className="shell">
        <div className="brandTop">GrantMatch NB</div>

        <div className="errorCard">
          <h1 className="errorTitle">Something went wrong</h1>
          <p className="errorText">{error}</p>
        </div>
      </div>

      <style>{baseStyles}</style>
    </div>
  )
}

function ResultsContent() {
  const searchParams = useSearchParams()
  const profileId = searchParams.get('profileId')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<ScoredGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function saveMatches(profileIdValue: string, scoredMatches: ScoredGrant[]) {
      try {
        const { error: deleteError } = await supabase
          .from('profile_matches')
          .delete()
          .eq('profile_id', profileIdValue)

        console.log('Delete old matches error:', deleteError)

        const rows = scoredMatches.map((grant) => ({
          profile_id: profileIdValue,
          grant_id: grant.id,
          score: grant.score,
          reasons: grant.reasons,
        }))

        const { data, error } = await supabase
          .from('profile_matches')
          .insert(rows)
          .select()

        console.log('Inserted rows:', data)
        console.log('Insert error:', error)
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

        console.log('profileId from URL:', profileId)
        console.log('profileData:', profileData)
        console.log('profileError:', profileError)

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          setError(`Could not load your profile: ${profileError.message}`)
          setLoading(false)
          return
        }

        if (!profileData) {
          setError('Could not load your profile. No matching profile was found.')
          setLoading(false)
          return
        }

        setProfile(profileData)

        const { data: grantsData, error: grantsError } = await supabase
          .from('grants')
          .select('*')
          .eq('intake_status', 'open')

        console.log('grantsData:', grantsData)
        console.log('grantsError:', grantsError)

        if (grantsError) {
          console.error('Grant fetch error:', grantsError)
          setError(`Could not load grants: ${grantsError.message}`)
          setLoading(false)
          return
        }

        if (!grantsData || grantsData.length === 0) {
          setMatches([])
          setLoading(false)
          return
        }

        const scored = grantsData
          .map((grant) => scoreGrant(profileData, grant))
          .sort((a, b) => b.score - a.score)

        setMatches(scored)
        setLoading(false)
        await saveMatches(profileId, scored)
      } catch (err) {
        console.error('Unexpected results page error:', err)
        setError('Something went wrong while loading matches.')
        setLoading(false)
      }
    }

    loadMatches()
  }, [profileId])

  if (loading) {
    return <LoadingState />
  }

  if (error) {
    return <ErrorState error={error} />
  }

  return (
    <div className="page">
      <div className="shell">
        <div className="brandTop">GrantMatch NB</div>

        <div className="heroBlock">
          <div className="heroBadge">✓ Results Ready</div>
          <h1 className="heroTitle">Your Grant Matches</h1>
          <p className="heroText">
            Based on your quiz answers, here are the most relevant funding programs for your business.
          </p>
          <div className="heroNotice">
            ✓ Your details have been saved. These recommendations are personalized for you.
          </div>
        </div>

        {profile && (
          <div className="panel">
            <div className="panelHeader">
              <div>
                <h2 className="panelTitle">Your profile</h2>
                <p className="panelSubtitle">
                  This is the information used to calculate your funding matches.
                </p>
              </div>

              <div className="profileBadge">Personalized Match Profile</div>
            </div>

            <div className="profileGrid">
              {[
                ['Industry', profile.industry || '-'],
                ['Stage', profile.stage || '-'],
                ['Employees', profile.employees ?? '-'],
                ['Does R&D', profile.does_rd ? 'Yes' : 'No'],
                ['Goal', profile.goal || '-'],
              ].map(([label, value]) => (
                <div key={String(label)} className="profileItem">
                  <div className="profileLabel">{label}</div>
                  <div className="profileValue">{value}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {matches.length === 0 ? (
          <div className="panel">
            <p className="emptyText">No grants are available in the database yet.</p>
          </div>
        ) : (
          <div className="resultsList">
            {matches.map((grant, index) => {
              const scoreMeta = getScoreMeta(grant.score)

              return (
                <div key={grant.id} className="grantCard">
                  <div className="grantTop">
                    <div className="grantTopLeft">
                      <div className="grantBadges">
                        {index === 0 && <span className="topMatchBadge">TOP MATCH</span>}
                        <span className="typeBadge">{grant.type || 'Program'}</span>
                      </div>

                      <h2 className="grantTitle">{grant.name}</h2>
                      <p className="grantOrg">{grant.organization || 'Organization not specified'}</p>
                    </div>

                    <div className={`scoreCard ${scoreMeta.className}`}>
                      <div className="scoreLabel">{scoreMeta.label}</div>
                      <div className="scoreValue">{grant.score}</div>
                    </div>
                  </div>

                  <p className="grantDescription">
                    {grant.description || 'No description available.'}
                  </p>

                  <div className="infoGrid">
                    <div className="infoItem">
                      <div className="infoLabel">Maximum Amount</div>
                      <div className="infoValue">{formatAmount(grant.amount_max)}</div>
                    </div>

                    <div className="infoItem">
                      <div className="infoLabel">Repayable</div>
                      <div className="infoValue">{grant.repayable ? 'Yes' : 'No'}</div>
                    </div>

                    <div className="infoItem">
                      <div className="infoLabel">Status</div>
                      <div className="infoValue">{grant.intake_status || 'Unknown'}</div>
                    </div>
                  </div>

                  <div className="sectionCard">
                    <div className="sectionTitle">Eligibility</div>
                    <div className="sectionBody">{grant.eligibility || 'Not specified'}</div>
                  </div>

                  {grant.reasons.length > 0 ? (
                    <div className="matchWhyCard">
                      <div className="sectionTitle matchWhyTitle">Why this matches</div>
                      <ul className="reasonsList">
                        {grant.reasons.map((reason, index2) => (
                          <li key={index2}>{reason}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div className="sectionCard mutedSection">
                      Low match based on your current profile, but this program may still be worth reviewing.
                    </div>
                  )}

                  {grant.url && (
                    <a
                      href={grant.url}
                      target="_blank"
                      rel="noreferrer"
                      className="grantButton"
                    >
                      View Grant Details →
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style>{baseStyles}</style>
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

const baseStyles = `
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

  .scoreCard.possible {
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

  .mutedSection {
    color: rgba(255,255,255,0.62);
    line-height: 1.65;
    font-size: 15px;
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

  .emptyText {
    margin: 0;
    color: rgba(255,255,255,0.68);
    font-size: 15px;
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
    .errorCard {
      padding: 18px 16px;
      border-radius: 18px;
    }

    .scoreCard {
      width: 100%;
      min-width: 0;
    }

    .grantButton {
      width: 100%;
    }

    .heroText,
    .grantDescription,
    .sectionBody,
    .mutedSection {
      font-size: 14px;
    }
  }
`