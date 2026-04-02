'use client'

import { FormEvent, useEffect, useState } from 'react'
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

function getScoreStyles(score: number) {
  if (score >= 70) {
    return {
      bg: 'linear-gradient(90deg, #02C39A, #028090)',
      label: 'Strong Match',
    }
  }

  if (score >= 40) {
    return {
      bg: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
      label: 'Good Match',
    }
  }

  return {
    bg: 'rgba(255,255,255,0.14)',
    label: 'Possible Match',
  }
}

export default function ResultsPage() {
  const searchParams = useSearchParams()
  const profileId = searchParams.get('profileId')

  const [profile, setProfile] = useState<Profile | null>(null)
  const [matches, setMatches] = useState<ScoredGrant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [businessName, setBusinessName] = useState('')
  const [contactName, setContactName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [leadSaving, setLeadSaving] = useState(false)
  const [leadMessage, setLeadMessage] = useState('')

  useEffect(() => {
    async function saveMatches(profileIdValue: string, scoredMatches: ScoredGrant[]) {
      try {
        console.log('Saving matches for profile:', profileIdValue)

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

        console.log('Rows being inserted:', rows)

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
          .single()

        if (profileError || !profileData) {
          console.error('Profile fetch error:', profileError)
          setError('Could not load your profile.')
          setLoading(false)
          return
        }

        setProfile(profileData)
        setBusinessName(profileData.business_name || '')

        const { data: grantsData, error: grantsError } = await supabase
          .from('grants')
          .select('*')
          .eq('intake_status', 'open')

        if (grantsError) {
          console.error('Grant fetch error:', grantsError)
          setError('Could not load grants.')
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

 async function handleLeadSubmit(e: FormEvent<HTMLFormElement>) {
  e.preventDefault()

  try {
    setLeadSaving(true)
    setLeadMessage('')

    const payload = {
      profile_id: profile?.id ?? null,
      business_name: businessName || profile?.business_name || null,
      contact_name: contactName || null,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
    }

    console.log('Lead payload being inserted:', payload)

    const { data, error } = await supabase
      .from('leads')
      .insert([payload])
      .select()

    console.log('Inserted lead row:', data)
    console.log('Lead insert error:', error)

    if (error) {
      setLeadMessage('Could not save your details. Please try again.')
      return
    }

    setLeadMessage('Your details have been saved successfully.')
    setBusinessName('')
    setContactName('')
    setEmail('')
    setPhone('')
    setNotes('')
  } catch (err) {
    console.error('Unexpected lead save error:', err)
    setLeadMessage('Something went wrong while saving your details.')
  } finally {
    setLeadSaving(false)
  }
}

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0D1F3C',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: 980, margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.12)',
              borderTop: '3px solid #02C39A',
              margin: '0 auto 1.5rem',
              animation: 'spin 1s linear infinite',
            }}
          />
          <h1 style={{ fontSize: 32, fontWeight: 700, marginBottom: '0.75rem' }}>
            Finding your best grant matches...
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15 }}>
            We are reviewing funding programs based on your answers.
          </p>
          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0D1F3C',
          color: 'white',
          fontFamily: 'system-ui, sans-serif',
          padding: '2rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: 760, margin: '0 auto', paddingTop: '4rem' }}>
          <div
            style={{
              background: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 16,
              padding: '1.5rem',
            }}
          >
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: '0.75rem' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#fecaca', margin: 0 }}>{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0D1F3C',
        color: 'white',
        fontFamily: 'system-ui, sans-serif',
        padding: '2rem 1.5rem 4rem',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <span
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: '#02C39A',
          }}
        >
          GrantMatch NB
        </span>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 14px',
              borderRadius: 999,
              background: 'rgba(2,195,154,0.12)',
              border: '1px solid rgba(2,195,154,0.25)',
              color: '#02C39A',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: '1rem',
            }}
          >
            ✓ Results Ready
          </div>

          <h1
            style={{
              fontSize: 40,
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: '0.85rem',
              letterSpacing: '-0.02em',
            }}
          >
            Your Grant Matches
          </h1>

          <p
            style={{
              maxWidth: 720,
              fontSize: 17,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.6)',
              margin: 0,
            }}
          >
            Based on your quiz answers, here are the most relevant funding programs for your business.
          </p>
          <div
  style={{
    marginBottom: '1.5rem',
    padding: '12px 16px',
    borderRadius: 12,
    background: 'rgba(2,195,154,0.12)',
    border: '1px solid rgba(2,195,154,0.25)',
    color: '#9ff7df',
    fontSize: 14,
  }}
>
  ✓ Your details have been saved. These recommendations are personalized for you.
</div>
        </div>

        {profile && (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '1.5rem',
              marginBottom: '2rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                marginBottom: '1rem',
              }}
            >
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Your profile</h2>
                <p
                  style={{
                    marginTop: 6,
                    marginBottom: 0,
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: 14,
                  }}
                >
                  This is the information used to calculate your funding matches.
                </p>
              </div>

              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  background: 'rgba(2,128,144,0.18)',
                  border: '1px solid rgba(2,128,144,0.35)',
                  color: '#67e8f9',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Personalized Match Profile
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 14,
              }}
            >
              {[
                ['Industry', profile.industry || '-'],
                ['Stage', profile.stage || '-'],
                ['Employees', profile.employees ?? '-'],
                ['Does R&D', profile.does_rd ? 'Yes' : 'No'],
                ['Goal', profile.goal || '-'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 14,
                    padding: '1rem',
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'rgba(255,255,255,0.4)',
                      marginBottom: 8,
                    }}
                  >
                    {label}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      lineHeight: 1.4,
                      color: 'white',
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '1.5rem',
            marginBottom: '2rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
          }}
        >
        </div>

        {matches.length === 0 ? (
          <div
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '1.5rem',
            }}
          >
            No grants are available in the database yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.25rem' }}>
            {matches.map((grant, index) => {
              const scoreStyle = getScoreStyles(grant.score)

              return (
                <div
                  key={grant.id}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20,
                    padding: '1.5rem',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 240 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          flexWrap: 'wrap',
                          marginBottom: 10,
                        }}
                      >
                        {index === 0 && (
                          <span
                            style={{
                              padding: '6px 10px',
                              borderRadius: 999,
                              background: 'rgba(2,195,154,0.12)',
                              border: '1px solid rgba(2,195,154,0.25)',
                              color: '#02C39A',
                              fontSize: 12,
                              fontWeight: 700,
                              letterSpacing: '0.03em',
                            }}
                          >
                            TOP MATCH
                          </span>
                        )}

                        <span
                          style={{
                            padding: '6px 10px',
                            borderRadius: 999,
                            background: 'rgba(255,255,255,0.08)',
                            color: 'rgba(255,255,255,0.7)',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {grant.type || 'Program'}
                        </span>
                      </div>

                      <h2
                        style={{
                          fontSize: 30,
                          fontWeight: 800,
                          lineHeight: 1.15,
                          marginBottom: '0.55rem',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {grant.name}
                      </h2>

                      <p
                        style={{
                          fontSize: 16,
                          color: 'rgba(255,255,255,0.55)',
                          marginBottom: 0,
                        }}
                      >
                        {grant.organization || 'Organization not specified'}
                      </p>
                    </div>

                    <div
                      style={{
                        minWidth: 140,
                        textAlign: 'center',
                        padding: '0.8rem 1rem',
                        borderRadius: 18,
                        background: scoreStyle.bg,
                        color: 'white',
                        fontWeight: 700,
                      }}
                    >
                      <div style={{ fontSize: 12, opacity: 0.9, marginBottom: 4 }}>
                        {scoreStyle.label}
                      </div>
                      <div style={{ fontSize: 22 }}>{grant.score}</div>
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: 16,
                      lineHeight: 1.7,
                      color: 'rgba(255,255,255,0.82)',
                      marginBottom: '1.25rem',
                    }}
                  >
                    {grant.description || 'No description available.'}
                  </p>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: 12,
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 14,
                        padding: '1rem',
                      }}
                    >
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                        Maximum Amount
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {grant.amount_max ? `$${grant.amount_max.toLocaleString()}` : 'Not specified'}
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 14,
                        padding: '1rem',
                      }}
                    >
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                        Repayable
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {grant.repayable ? 'Yes' : 'No'}
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 14,
                        padding: '1rem',
                      }}
                    >
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 6 }}>
                        Status
                      </div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {grant.intake_status || 'Unknown'}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 16,
                      padding: '1rem',
                      marginBottom: '1.25rem',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        marginBottom: '0.7rem',
                      }}
                    >
                      Eligibility
                    </div>
                    <div
                      style={{
                        color: 'rgba(255,255,255,0.72)',
                        lineHeight: 1.6,
                        fontSize: 15,
                      }}
                    >
                      {grant.eligibility || 'Not specified'}
                    </div>
                  </div>

                  {grant.reasons.length > 0 ? (
                    <div
                      style={{
                        background: 'rgba(2,195,154,0.08)',
                        border: '1px solid rgba(2,195,154,0.2)',
                        borderRadius: 16,
                        padding: '1rem',
                        marginBottom: '1.25rem',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: 700,
                          marginBottom: '0.7rem',
                          color: '#9ff7df',
                        }}
                      >
                        Why this matches
                      </div>
                      <ul
                        style={{
                          paddingLeft: '1.2rem',
                          color: 'rgba(255,255,255,0.82)',
                          margin: 0,
                        }}
                      >
                        {grant.reasons.map((reason, index2) => (
                          <li key={index2} style={{ marginBottom: 6, lineHeight: 1.5 }}>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <div
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: 16,
                        padding: '1rem',
                        marginBottom: '1.25rem',
                        color: 'rgba(255,255,255,0.6)',
                        lineHeight: 1.6,
                      }}
                    >
                      Low match based on your current profile, but this program may still be worth reviewing.
                    </div>
                  )}

                  {grant.url && (
                    <a
                      href={grant.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        background: 'linear-gradient(90deg, #028090, #02C39A)',
                        color: 'white',
                        padding: '0.9rem 1.25rem',
                        borderRadius: 14,
                        textDecoration: 'none',
                        fontWeight: 700,
                        fontSize: 15,
                        boxShadow: '0 8px 20px rgba(2,195,154,0.18)',
                      }}
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
    </div>
  )
}