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
    <div className="statCard">
      <div className="statTitle">{title}</div>
      <div className="statValue">{value}</div>
      <div className="statSubtitle">{subtitle}</div>
    </div>
  )
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
          supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
          supabase.from('profile_matches').select('*').order('created_at', { ascending: false }),
          supabase.from('grants').select('id, name, organization, type, intake_status').order('name', { ascending: true }),
          supabase.from('leads').select('*').order('created_at', { ascending: false }),
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
      <div className="page">
        <div className="loadingWrap">
          <div className="spinner" />
          <h1 className="loadingTitle">Loading admin insights...</h1>
          <p className="loadingText">
            Please wait while we collect leads, matches, and grant activity.
          </p>
        </div>
        <style>{styles}</style>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page">
        <div className="shell">
          <div className="brandTop">GrantMatch NB</div>
          <div className="errorCard">
            <h1 className="errorTitle">Something went wrong</h1>
            <p className="errorText">{error}</p>
          </div>
        </div>
        <style>{styles}</style>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="shell">
        <div className="brandTop">GrantMatch NB</div>

        <div className="heroSection">
          <div className="heroBadge">Admin Dashboard</div>
          <h1 className="heroTitle">Leads & Match Tables</h1>
          <p className="heroText">
            Use the summary cards for overview, then manage growing data in a clean responsive dashboard with filters and CSV downloads.
          </p>
        </div>

        <div className="heroActions">
          <Link href="/" className="primaryBtn">
            Back to Home
          </Link>

          <Link href="/quiz" className="secondaryBtn">
            Run New Quiz
          </Link>
        </div>

        <div className="statsGrid">
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
          <div className="panel">
            <div className="topGrantWrap">
              <div>
                <div className="smallMuted">Most Matched Grant</div>
                <div className="topGrantTitle">{topGrant.name}</div>
                <div className="topGrantOrg">{topGrant.organization || 'Organization not specified'}</div>
              </div>

              <div className="pillBadge">
                Matched {topGrant.matchCount} time(s)
              </div>
            </div>
          </div>
        )}

        <div className="panel">
          <div className="panelHeader">
            <div>
              <h2 className="panelTitle">Leads Table</h2>
              <p className="panelSubtitle">
                Filter and export lead records by date range or search text.
              </p>
            </div>

            <div className="panelCount">
              Showing {filteredLeads.length} of {leads.length} lead(s)
            </div>
          </div>

          <div className="filterGrid">
            <input
              type="date"
              value={leadFromDate}
              onChange={(e) => setLeadFromDate(e.target.value)}
              className="input"
            />

            <input
              type="date"
              value={leadToDate}
              onChange={(e) => setLeadToDate(e.target.value)}
              className="input"
            />

            <input
              type="text"
              placeholder="Search leads..."
              value={leadSearch}
              onChange={(e) => setLeadSearch(e.target.value)}
              className="input"
            />

            <button
              onClick={handleExportLeadsCsv}
              disabled={!filteredLeads.length}
              className="primaryBtn buttonReset"
            >
              Download CSV
            </button>

            <button
              onClick={clearLeadFilters}
              className="secondaryBtn buttonReset"
            >
              Clear Filters
            </button>
          </div>

          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
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
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="emptyCell">
                      No leads found for the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map((lead, index) => (
                    <tr key={lead.id} className={index % 2 === 0 ? 'rowEven' : 'rowOdd'}>
                      <td>{formatDate(lead.created_at)}</td>
                      <td className="strongCell">{lead.business_name || '-'}</td>
                      <td>{lead.contact_name || '-'}</td>
                      <td className="linkCell">{lead.email || '-'}</td>
                      <td>{lead.phone || '-'}</td>
                      <td>{lead.profile?.industry || '-'}</td>
                      <td>{lead.profile?.stage || '-'}</td>
                      <td>{lead.profile?.goal || '-'}</td>
                      <td className="wideCell">{lead.notes || '-'}</td>
                      <td className="idCell">{lead.profile_id || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panelHeader">
            <div>
              <h2 className="panelTitle">Matches Table</h2>
              <p className="panelSubtitle">
                Track matched grants in a row-based format and export filtered match records.
              </p>
            </div>

            <div className="panelCount">
              Showing {filteredMatches.length} of {matches.length} match(es)
            </div>
          </div>

          <div className="filterGrid">
            <input
              type="date"
              value={matchFromDate}
              onChange={(e) => setMatchFromDate(e.target.value)}
              className="input"
            />

            <input
              type="date"
              value={matchToDate}
              onChange={(e) => setMatchToDate(e.target.value)}
              className="input"
            />

            <input
              type="text"
              placeholder="Search matches..."
              value={matchSearch}
              onChange={(e) => setMatchSearch(e.target.value)}
              className="input"
            />

            <button
              onClick={handleExportMatchesCsv}
              disabled={!filteredMatches.length}
              className="primaryBtn buttonReset"
            >
              Download CSV
            </button>

            <button
              onClick={clearMatchFilters}
              className="secondaryBtn buttonReset"
            >
              Clear Filters
            </button>
          </div>

          <div className="tableWrap">
            <table className="dataTable">
              <thead>
                <tr>
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
                    <th key={header}>{header}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filteredMatches.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="emptyCell">
                      No matches found for the current filters.
                    </td>
                  </tr>
                ) : (
                  filteredMatches.map((match, index) => (
                    <tr key={match.id} className={index % 2 === 0 ? 'rowEven' : 'rowOdd'}>
                      <td>{formatDate(match.created_at)}</td>
                      <td className="strongCell">{match.grant?.name || '-'}</td>
                      <td>{match.grant?.organization || '-'}</td>
                      <td>
                        <span
                          className={
                            match.score >= 70
                              ? 'scoreBadge strong'
                              : match.score >= 40
                              ? 'scoreBadge good'
                              : 'scoreBadge light'
                          }
                        >
                          {match.score}
                        </span>
                      </td>
                      <td>{match.profile?.industry || '-'}</td>
                      <td>{match.profile?.stage || '-'}</td>
                      <td>{match.profile?.goal || '-'}</td>
                      <td className="wideCell">
                        {match.reasons && match.reasons.length > 0
                          ? match.reasons.join(' • ')
                          : '-'}
                      </td>
                      <td className="idCell">{match.profile_id || '-'}</td>
                      <td className="idCell">{match.grant_id || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </div>
  )
}

const styles = `
  .page {
    min-height: 100vh;
    background: #0D1F3C;
    color: white;
    font-family: system-ui, sans-serif;
    padding: 24px 14px 36px;
  }

  .shell {
    max-width: 1120px;
    margin: 0 auto;
  }

  .brandTop {
    text-align: center;
    margin-bottom: 28px;
    font-size: 20px;
    font-weight: 700;
    color: #02C39A;
  }

  .heroSection {
    margin-bottom: 20px;
  }

  .heroBadge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(2,195,154,0.12);
    border: 1px solid rgba(2,195,154,0.25);
    color: #02C39A;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 14px;
  }

  .heroTitle {
    font-size: clamp(24px, 5vw, 40px);
    font-weight: 800;
    line-height: 1.1;
    margin: 0 0 12px;
    letter-spacing: -0.02em;
  }

  .heroText {
    max-width: 820px;
    font-size: 16px;
    line-height: 1.7;
    color: rgba(255,255,255,0.62);
    margin: 0;
  }

  .heroActions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 22px;
  }

  .primaryBtn,
  .secondaryBtn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 13px 16px;
    border-radius: 14px;
    text-decoration: none;
    font-weight: 700;
    font-size: 15px;
    min-height: 46px;
  }

  .primaryBtn {
    background: linear-gradient(90deg, #028090, #02C39A);
    color: white;
    border: none;
    box-shadow: 0 8px 20px rgba(2,195,154,0.18);
  }

  .secondaryBtn {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    color: white;
  }

  .buttonReset {
    cursor: pointer;
  }

  .buttonReset:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .statsGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
    gap: 14px;
    margin-bottom: 22px;
  }

  .statCard {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    padding: 18px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.18);
  }

  .statTitle {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: rgba(255,255,255,0.45);
    margin-bottom: 10px;
  }

  .statValue {
    font-size: clamp(28px, 4vw, 34px);
    font-weight: 800;
    line-height: 1;
    margin-bottom: 10px;
    color: white;
  }

  .statSubtitle {
    font-size: 14px;
    color: rgba(255,255,255,0.55);
    line-height: 1.5;
  }

  .panel {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 18px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.18);
    margin-bottom: 18px;
  }

  .topGrantWrap {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .smallMuted {
    font-size: 14px;
    color: rgba(255,255,255,0.45);
    margin-bottom: 6px;
  }

  .topGrantTitle {
    font-size: clamp(22px, 4vw, 28px);
    font-weight: 800;
    color: white;
    margin-bottom: 6px;
    line-height: 1.2;
  }

  .topGrantOrg {
    color: rgba(255,255,255,0.65);
    font-size: 15px;
  }

  .pillBadge {
    padding: 10px 14px;
    border-radius: 999px;
    background: rgba(2,195,154,0.12);
    border: 1px solid rgba(2,195,154,0.25);
    color: #02C39A;
    font-size: 14px;
    font-weight: 700;
  }

  .panelHeader {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: flex-start;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .panelTitle {
    font-size: clamp(20px, 3vw, 24px);
    font-weight: 700;
    margin: 0;
  }

  .panelSubtitle {
    margin-top: 6px;
    margin-bottom: 0;
    color: rgba(255,255,255,0.55);
    font-size: 14px;
    line-height: 1.5;
  }

  .panelCount {
    color: rgba(255,255,255,0.65);
    font-size: 14px;
    font-weight: 600;
  }

  .filterGrid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 12px;
    margin-bottom: 16px;
  }

  .input {
    padding: 12px 14px;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.04);
    color: white;
    font-size: 14px;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }

  .tableWrap {
    overflow-x: auto;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
  }

  .dataTable {
    width: 100%;
    border-collapse: collapse;
    min-width: 900px;
  }

  .dataTable thead tr {
    background: rgba(255,255,255,0.05);
  }

  .dataTable th {
    text-align: left;
    padding: 13px 10px;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255,255,255,0.5);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    white-space: nowrap;
  }

  .dataTable td {
    padding: 13px 10px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.82);
    vertical-align: top;
    font-size: 14px;
    line-height: 1.5;
  }

  .rowEven {
    background: rgba(255,255,255,0.02);
  }

  .rowOdd {
    background: rgba(255,255,255,0.035);
  }

  .strongCell {
    color: white !important;
    font-weight: 600;
  }

  .linkCell {
    color: #93c5fd !important;
  }

  .wideCell {
    min-width: 220px;
  }

  .idCell {
    min-width: 220px;
    font-size: 12px !important;
    word-break: break-all;
  }

  .emptyCell {
    padding: 18px 14px !important;
    color: rgba(255,255,255,0.6) !important;
  }

  .scoreBadge {
    display: inline-block;
    padding: 6px 10px;
    border-radius: 999px;
    color: white;
    font-size: 12px;
    font-weight: 700;
  }

  .scoreBadge.strong {
    background: linear-gradient(90deg, #02C39A, #028090);
  }

  .scoreBadge.good {
    background: linear-gradient(90deg, #2563eb, #1d4ed8);
  }

  .scoreBadge.light {
    background: rgba(255,255,255,0.12);
  }

  .loadingWrap {
    max-width: 1100px;
    margin: 0 auto;
    text-align: center;
    padding-top: 70px;
  }

  .spinner {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: 3px solid rgba(255,255,255,0.12);
    border-top: 3px solid #02C39A;
    margin: 0 auto 24px;
    animation: spin 1s linear infinite;
  }

  .loadingTitle {
    font-size: clamp(26px, 4vw, 32px);
    font-weight: 700;
    margin-bottom: 12px;
  }

  .loadingText {
    color: rgba(255,255,255,0.55);
    font-size: 15px;
    margin: 0;
  }

   .errorCard {
    max-width: 760px;
    margin: 60px auto 0;
    background: rgba(239,68,68,0.12);
    border: 1px solid rgba(239,68,68,0.35);
    border-radius: 16px;
    padding: 24px 20px;
  }

  .errorTitle {
    font-size: clamp(24px, 4vw, 28px);
    font-weight: 700;
    margin-bottom: 12px;
  }

  .errorText {
    color: #fecaca;
    margin: 0;
    line-height: 1.6;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .page {
      padding: 18px 12px 28px;
    }

    .brandTop {
      font-size: 18px;
      margin-bottom: 22px;
    }

    .panel,
    .statCard {
      padding: 16px;
      border-radius: 16px;
    }

    .heroActions {
      display: grid;
      grid-template-columns: 1fr;
    }

    .primaryBtn,
    .secondaryBtn {
      width: 100%;
    }

    .dataTable th,
    .dataTable td {
      padding: 10px 8px;
      font-size: 13px;
    }

    .panelCount {
      width: 100%;
    }
  }
`