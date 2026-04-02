'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type UserProfile = {
  id: string
  business_name: string | null
  industry: string | null
  stage: string | null
  employees: number | null
  does_rd: boolean | null
  goal: string | null
  created_at?: string | null
}

type ProfileMatch = {
  id: string
  profile_id: string
  grant_id: string
  score: number
  reasons: string[] | null
  created_at?: string | null
}

type Grant = {
  id: string
  name: string
  organization: string | null
  type: string | null
  intake_status: string | null
}

type Lead = {
  id: string
  profile_id: string | null
  business_name: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  notes: string | null
  created_at?: string | null
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

function getAverageScore(matches: ProfileMatch[]) {
  if (!matches.length) return 0
  const total = matches.reduce((sum, item) => sum + (item.score || 0), 0)
  return Math.round(total / matches.length)
}

function getTopGrant(grants: Grant[], matches: ProfileMatch[]) {
  if (!grants.length || !matches.length) return null

  const counts: Record<string, number> = {}

  for (const match of matches) {
    counts[match.grant_id] = (counts[match.grant_id] || 0) + 1
  }

  let topGrantId: string | null = null
  let topCount = 0

  for (const [grantId, count] of Object.entries(counts)) {
    if (count > topCount) {
      topGrantId = grantId
      topCount = count
    }
  }

  if (!topGrantId) return null

  const grant = grants.find((g) => g.id === topGrantId)
  if (!grant) return null

  return {
    ...grant,
    matchCount: topCount,
  }
}

function csvEscape(value: unknown) {
  const stringValue = String(value ?? '')
  if (
    stringValue.includes(',') ||
    stringValue.includes('"') ||
    stringValue.includes('\n')
  ) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }
  return stringValue
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return

  const headers = Object.keys(rows[0])
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ]

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string
  value: string | number
  subtitle: string
}) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        padding: '1.25rem',
        boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
      }}
    >
      <div
        style={{
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'rgba(255,255,255,0.45)',
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 34,
          fontWeight: 800,
          lineHeight: 1,
          marginBottom: 10,
          color: 'white',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 14,
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.5,
        }}
      >
        {subtitle}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.04)',
  color: 'white',
  fontSize: 14,
  outline: 'none',
}

export default function AdminPage() {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [matches, setMatches] = useState<ProfileMatch[]>([])
  const [grants, setGrants] = useState<Grant[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [leadSearch, setLeadSearch] = useState('')
  const [leadFromDate, setLeadFromDate] = useState('')
  const [leadToDate, setLeadToDate] = useState('')

  const [matchSearch, setMatchSearch] = useState('')
  const [matchFromDate, setMatchFromDate] = useState('')
  const [matchToDate, setMatchToDate] = useState('')

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [profilesRes, matchesRes, grantsRes, leadsRes] = await Promise.all([
          supabase
            .from('user_profiles')
            .select('*')
            .order('created_at', { ascending: false }),

          supabase
            .from('profile_matches')
            .select('*')
            .order('created_at', { ascending: false }),

          supabase
            .from('grants')
            .select('id, name, organization, type, intake_status')
            .order('name', { ascending: true }),

          supabase
            .from('leads')
            .select('*')
            .order('created_at', { ascending: false }),
        ])

        if (profilesRes.error) {
          console.error('Profiles load error:', profilesRes.error)
          throw new Error('Could not load profiles')
        }

        if (matchesRes.error) {
          console.error('Matches load error:', matchesRes.error)
          throw new Error('Could not load matches')
        }

        if (grantsRes.error) {
          console.error('Grants load error:', grantsRes.error)
          throw new Error('Could not load grants')
        }

        if (leadsRes.error) {
          console.error('Leads load error:', leadsRes.error)
          throw new Error('Could not load leads')
        }

        setProfiles((profilesRes.data as UserProfile[]) || [])
        setMatches((matchesRes.data as ProfileMatch[]) || [])
        setGrants((grantsRes.data as Grant[]) || [])
        setLeads((leadsRes.data as Lead[]) || [])
      } catch (err) {
        console.error('Admin page error:', err)
        setError('Something went wrong while loading admin insights.')
      } finally {
        setLoading(false)
      }
    }

    loadAdminData()
  }, [])

  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles]
  )

  const grantMap = useMemo(
    () => new Map(grants.map((grant) => [grant.id, grant])),
    [grants]
  )

  const leadsWithProfile = useMemo(() => {
    return leads.map((lead) => ({
      ...lead,
      profile: lead.profile_id ? profileMap.get(lead.profile_id) || null : null,
    }))
  }, [leads, profileMap])

  const matchesWithDetails = useMemo(() => {
    return matches.map((match) => ({
      ...match,
      profile: profileMap.get(match.profile_id) || null,
      grant: grantMap.get(match.grant_id) || null,
    }))
  }, [matches, profileMap, grantMap])

  const filteredLeads = useMemo(() => {
    const searchText = leadSearch.trim().toLowerCase()

    return leadsWithProfile.filter((lead) => {
      const createdDate = lead.created_at ? new Date(lead.created_at) : null
      const createdDay =
        createdDate && !Number.isNaN(createdDate.getTime())
          ? createdDate.toISOString().slice(0, 10)
          : ''

      if (leadFromDate && createdDay && createdDay < leadFromDate) return false
      if (leadToDate && createdDay && createdDay > leadToDate) return false

      if (!searchText) return true

      const haystack = [
        lead.business_name,
        lead.contact_name,
        lead.email,
        lead.phone,
        lead.notes,
        lead.profile?.industry,
        lead.profile?.stage,
        lead.profile?.goal,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(searchText)
    })
  }, [leadsWithProfile, leadSearch, leadFromDate, leadToDate])

  const filteredMatches = useMemo(() => {
    const searchText = matchSearch.trim().toLowerCase()

    return matchesWithDetails.filter((match) => {
      const createdDate = match.created_at ? new Date(match.created_at) : null
      const createdDay =
        createdDate && !Number.isNaN(createdDate.getTime())
          ? createdDate.toISOString().slice(0, 10)
          : ''

      if (matchFromDate && createdDay && createdDay < matchFromDate) return false
      if (matchToDate && createdDay && createdDay > matchToDate) return false

      if (!searchText) return true

      const haystack = [
        match.grant?.name,
        match.grant?.organization,
        match.profile?.industry,
        match.profile?.stage,
        match.profile?.goal,
        ...(match.reasons || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(searchText)
    })
  }, [matchesWithDetails, matchSearch, matchFromDate, matchToDate])

  const totalProfiles = profiles.length
  const totalMatches = matches.length
  const totalLeads = leads.length
  const averageScore = useMemo(() => getAverageScore(matches), [matches])
  const topGrant = useMemo(() => getTopGrant(grants, matches), [grants, matches])

  function handleExportLeadsCsv() {
    if (!filteredLeads.length) return

    const exportRows = filteredLeads.map((lead) => ({
      created_at: lead.created_at || '',
      business_name: lead.business_name || '',
      contact_name: lead.contact_name || '',
      email: lead.email || '',
      phone: lead.phone || '',
      notes: lead.notes || '',
      profile_id: lead.profile_id || '',
      industry: lead.profile?.industry || '',
      stage: lead.profile?.stage || '',
      goal: lead.profile?.goal || '',
    }))

    const fromLabel = leadFromDate || 'all'
    const toLabel = leadToDate || 'all'
    downloadCsv(`leads_${fromLabel}_to_${toLabel}.csv`, exportRows)
  }

  function handleExportMatchesCsv() {
    if (!filteredMatches.length) return

    const exportRows = filteredMatches.map((match) => ({
      created_at: match.created_at || '',
      grant_name: match.grant?.name || '',
      organization: match.grant?.organization || '',
      score: match.score,
      profile_id: match.profile_id || '',
      grant_id: match.grant_id || '',
      industry: match.profile?.industry || '',
      stage: match.profile?.stage || '',
      goal: match.profile?.goal || '',
      reasons: (match.reasons || []).join(' | '),
    }))

    const fromLabel = matchFromDate || 'all'
    const toLabel = matchToDate || 'all'
    downloadCsv(`matches_${fromLabel}_to_${toLabel}.csv`, exportRows)
  }

  function clearLeadFilters() {
    setLeadSearch('')
    setLeadFromDate('')
    setLeadToDate('')
  }

  function clearMatchFilters() {
    setMatchSearch('')
    setMatchFromDate('')
    setMatchToDate('')
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
        <div style={{ maxWidth: 1100, margin: '0 auto', textAlign: 'center', paddingTop: '4rem' }}>
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
            Loading admin insights...
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 15 }}>
            Please wait while we collect leads, matches, and grant activity.
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

      <div style={{ maxWidth: 1250, margin: '0 auto' }}>
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
            Admin Dashboard
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
            Leads & Match Tables
          </h1>

          <p
            style={{
              maxWidth: 820,
              fontSize: 17,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.6)',
              margin: 0,
            }}
          >
            Use the summary cards for overview, then manage growing data in a table format with filters and CSV downloads.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: '2rem',
          }}
        >
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.9rem 1.2rem',
              borderRadius: 14,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 15,
              background: 'linear-gradient(90deg, #028090, #02C39A)',
              color: 'white',
              boxShadow: '0 8px 20px rgba(2,195,154,0.18)',
            }}
          >
            Back to Home
          </Link>

          <Link
            href="/quiz"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.9rem 1.2rem',
              borderRadius: 14,
              textDecoration: 'none',
              fontWeight: 700,
              fontSize: 15,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'white',
            }}
          >
            Run New Quiz
          </Link>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 14,
            marginBottom: '2rem',
          }}
        >
          <StatCard
            title="Total Profiles"
            value={totalProfiles}
            subtitle="Saved business profiles created from the quiz."
          />
          <StatCard
            title="Total Leads"
            value={totalLeads}
            subtitle="Captured contact records before results were shown."
          />
          <StatCard
            title="Total Matches"
            value={totalMatches}
            subtitle="Recommendation rows stored in match history."
          />
          <StatCard
            title="Average Score"
            value={averageScore}
            subtitle="Average recommendation score across all saved matches."
          />
        </div>

        {topGrant && (
          <div
            style={{
              marginBottom: '2rem',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 20,
              padding: '1.25rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 12,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 6 }}>
                  Most Matched Grant
                </div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'white', marginBottom: 6 }}>
                  {topGrant.name}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>
                  {topGrant.organization || 'Organization not specified'}
                </div>
              </div>

              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 999,
                  background: 'rgba(2,195,154,0.12)',
                  border: '1px solid rgba(2,195,154,0.25)',
                  color: '#02C39A',
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                Matched {topGrant.matchCount} time(s)
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '1.25rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Leads Table</h2>
              <p
                style={{
                  marginTop: 6,
                  marginBottom: 0,
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 14,
                }}
              >
                Filter and export lead records by date range or search text.
              </p>
            </div>

            <div
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Showing {filteredLeads.length} of {leads.length} lead(s)
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: '1rem',
            }}
          >
            <input
              type="date"
              value={leadFromDate}
              onChange={(e) => setLeadFromDate(e.target.value)}
              style={inputStyle}
            />

            <input
              type="date"
              value={leadToDate}
              onChange={(e) => setLeadToDate(e.target.value)}
              style={inputStyle}
            />

            <input
              type="text"
              placeholder="Search leads..."
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              style={{ ...inputStyle, minWidth: 220 }}
            />

            <button
              onClick={handleExportLeadsCsv}
              disabled={!filteredLeads.length}
              style={{
                border: 'none',
                borderRadius: 12,
                padding: '12px 14px',
                background: filteredLeads.length
                  ? 'linear-gradient(90deg, #028090, #02C39A)'
                  : 'rgba(255,255,255,0.08)',
                color: 'white',
                fontWeight: 700,
                cursor: filteredLeads.length ? 'pointer' : 'not-allowed',
              }}
            >
              Download CSV
            </button>

            <button
              onClick={clearLeadFilters}
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          </div>

          <div
            style={{
              overflowX: 'auto',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 1200,
              }}
            >
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {[
                    'Date',
                    'Business Name',
                    'Contact Name',
                    'Email',
                    'Phone',
                    'Industry',
                    'Stage',
                    'Goal',
                    'Notes',
                    'Profile ID',
                  ].map((header) => (
                    <th
                      key={header}
                      style={{
                        textAlign: 'left',
                        padding: '14px 12px',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'rgba(255,255,255,0.5)',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: '18px 14px',
                        color: 'rgba(255,255,255,0.6)',
                      }}
                    >
                      No leads found for the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, index) => (
                    <tr
                      key={lead.id}
                      style={{
                        background:
                          index % 2 === 0
                            ? 'rgba(255,255,255,0.02)'
                            : 'rgba(255,255,255,0.035)',
                      }}
                    >
                      <td style={cellStyle}>{formatDate(lead.created_at)}</td>
                      <td style={{ ...cellStyle, color: 'white', fontWeight: 600 }}>
                        {lead.business_name || '-'}
                      </td>
                      <td style={cellStyle}>{lead.contact_name || '-'}</td>
                      <td style={{ ...cellStyle, color: '#93c5fd' }}>{lead.email || '-'}</td>
                      <td style={{ ...cellStyle, whiteSpace: 'nowrap' }}>{lead.phone || '-'}</td>
                      <td style={cellStyle}>{lead.profile?.industry || '-'}</td>
                      <td style={cellStyle}>{lead.profile?.stage || '-'}</td>
                      <td style={cellStyle}>{lead.profile?.goal || '-'}</td>
                      <td style={{ ...cellStyle, minWidth: 220 }}>{lead.notes || '-'}</td>
                      <td style={{ ...cellStyle, fontSize: 12, minWidth: 220, wordBreak: 'break-all' }}>
                        {lead.profile_id || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20,
            padding: '1.25rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              alignItems: 'flex-start',
              flexWrap: 'wrap',
              marginBottom: '1rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Matches Table</h2>
              <p
                style={{
                  marginTop: 6,
                  marginBottom: 0,
                  color: 'rgba(255,255,255,0.55)',
                  fontSize: 14,
                }}
              >
                Track matched grants in a row-based format and export filtered match records.
              </p>
            </div>

            <div
              style={{
                color: 'rgba(255,255,255,0.65)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Showing {filteredMatches.length} of {matches.length} match(es)
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: 12,
              marginBottom: '1rem',
            }}
          >
            <input
              type="date"
              value={matchFromDate}
              onChange={(e) => setMatchFromDate(e.target.value)}
              style={inputStyle}
            />

            <input
              type="date"
              value={matchToDate}
              onChange={(e) => setMatchToDate(e.target.value)}
              style={inputStyle}
            />

            <input
              type="text"
              placeholder="Search matches..."
              value={matchSearch}
              onChange={(e) => setMatchSearch(e.target.value)}
              style={{ ...inputStyle, minWidth: 220 }}
            />

            <button
              onClick={handleExportMatchesCsv}
              disabled={!filteredMatches.length}
              style={{
                border: 'none',
                borderRadius: 12,
                padding: '12px 14px',
                background: filteredMatches.length
                  ? 'linear-gradient(90deg, #028090, #02C39A)'
                  : 'rgba(255,255,255,0.08)',
                color: 'white',
                fontWeight: 700,
                cursor: filteredMatches.length ? 'pointer' : 'not-allowed',
              }}
            >
              Download CSV
            </button>

            <button
              onClick={clearMatchFilters}
              style={{
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12,
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.04)',
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Clear Filters
            </button>
          </div>

          <div
            style={{
              overflowX: 'auto',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 16,
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
                minWidth: 1250,
              }}
            >
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  {[
                    'Date',
                    'Grant Name',
                    'Organization',
                    'Score',
                    'Industry',
                    'Stage',
                    'Goal',
                    'Reasons',
                    'Profile ID',
                    'Grant ID',
                  ].map((header) => (
                    <th
                      key={header}
                      style={{
                        textAlign: 'left',
                        padding: '14px 12px',
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                        color: 'rgba(255,255,255,0.5)',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredMatches.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      style={{
                        padding: '18px 14px',
                        color: 'rgba(255,255,255,0.6)',
                      }}
                    >
                      No matches found for the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredMatches.map((match, index) => (
                    <tr
                      key={match.id}
                      style={{
                        background:
                          index % 2 === 0
                            ? 'rgba(255,255,255,0.02)'
                            : 'rgba(255,255,255,0.035)',
                      }}
                    >
                      <td style={cellStyle}>{formatDate(match.created_at)}</td>
                      <td style={{ ...cellStyle, color: 'white', fontWeight: 600 }}>
                        {match.grant?.name || '-'}
                      </td>
                      <td style={cellStyle}>{match.grant?.organization || '-'}</td>
                      <td style={cellStyle}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '6px 10px',
                            borderRadius: 999,
                            background:
                              match.score >= 70
                                ? 'linear-gradient(90deg, #02C39A, #028090)'
                                : match.score >= 40
                                ? 'linear-gradient(90deg, #2563eb, #1d4ed8)'
                                : 'rgba(255,255,255,0.12)',
                            color: 'white',
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {match.score}
                        </span>
                      </td>
                      <td style={cellStyle}>{match.profile?.industry || '-'}</td>
                      <td style={cellStyle}>{match.profile?.stage || '-'}</td>
                      <td style={cellStyle}>{match.profile?.goal || '-'}</td>
                      <td style={{ ...cellStyle, minWidth: 260 }}>
                        {match.reasons && match.reasons.length > 0
                          ? match.reasons.join(' • ')
                          : '-'}
                      </td>
                      <td style={{ ...cellStyle, fontSize: 12, minWidth: 220, wordBreak: 'break-all' }}>
                        {match.profile_id || '-'}
                      </td>
                      <td style={{ ...cellStyle, fontSize: 12, minWidth: 220, wordBreak: 'break-all' }}>
                        {match.grant_id || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

const cellStyle: React.CSSProperties = {
  padding: '14px 12px',
  borderBottom: '1px solid rgba(255,255,255,0.06)',
  color: 'rgba(255,255,255,0.82)',
  verticalAlign: 'top',
}