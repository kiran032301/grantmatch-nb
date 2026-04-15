'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import GrantReviewRow from './GrantReviewRow'

type GrantRow = {
  id: string
  name?: string | null
  organization?: string | null
  source_name?: string | null
  source_program_id?: string | null
  short_description?: string | null
  eligibility_summary?: string | null
  intake_status?: string | null
  verification_status?: string | null
  is_active?: boolean | null
  review_notes?: string | null
  industry_tags?: string[] | string | null
  stage_tags?: string[] | string | null
  goal_tags?: string[] | string | null
  business_relevance?: string | null
  url?: string | null
}

type ReviewResponse = {
  pending: GrantRow[]
  live: GrantRow[]
  rejected: GrantRow[]
  counts: {
    pending: number
    live: number
    rejected: number
  }
}

type TabKey = 'pending' | 'live' | 'rejected'

export default function GrantReviewPage() {
  const [tab, setTab] = useState<TabKey>('pending')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState('all')
  const [data, setData] = useState<ReviewResponse>({
    pending: [],
    live: [],
    rejected: [],
    counts: {
      pending: 0,
      live: 0,
      rejected: 0,
    },
  })

  async function loadReviewData(showFullScreen = false) {
    try {
      if (showFullScreen) setLoading(true)
      else setRefreshing(true)

      setError(null)

      const res = await fetch('/api/admin/review-grants', {
        method: 'GET',
        cache: 'no-store',
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to load review data')
      }

      setData({
        pending: json.pending || [],
        live: json.live || [],
        rejected: json.rejected || [],
        counts: json.counts || { pending: 0, live: 0, rejected: 0 },
      })
    } catch (err) {
      console.error(err)
      setError(err instanceof Error ? err.message : 'Failed to load review data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadReviewData(true)
  }, [])

  const baseRows = useMemo(() => {
    return tab === 'live'
      ? data.live
      : tab === 'rejected'
      ? data.rejected
      : data.pending
  }, [tab, data])

  const sourceOptions = useMemo(() => {
    const uniqueSources = Array.from(
      new Set(
        baseRows
          .map((grant) => grant.source_name)
          .filter((value): value is string => Boolean(value))
      )
    ).sort()

    return ['all', ...uniqueSources]
  }, [baseRows])

  const currentRows = useMemo(() => {
    const query = search.trim().toLowerCase()

    return baseRows.filter((grant) => {
      if (sourceFilter !== 'all' && grant.source_name !== sourceFilter) {
        return false
      }

      if (!query) return true

      const haystack = [
        grant.name,
        grant.organization,
        grant.source_name,
        grant.source_program_id,
        grant.short_description,
        grant.eligibility_summary,
        grant.intake_status,
        grant.business_relevance,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [baseRows, search, sourceFilter])

  const tabLabel =
    tab === 'live' ? 'Live' : tab === 'rejected' ? 'Rejected' : 'Pending Review'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D1F3C] text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Grant Review</h1>
          <p className="text-white/60">Loading review queue...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0D1F3C] text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Grant Review</h1>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0D1F3C] text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-[#02C39A] font-semibold">Admin</div>
            <h1 className="text-3xl font-bold">Grant Review Workflow</h1>
            <p className="text-white/60 mt-2">
              Review imported grants before they go live in matching.
            </p>
          </div>

          <div className="flex gap-3">
            <Link
              href="/admin"
              className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition"
            >
              Back to Admin
            </Link>
          </div>
        </div>

        {refreshing && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-white/70">
            Refreshing review data...
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-sm text-white/60">Pending</div>
            <div className="text-3xl font-bold mt-2 text-amber-300">
              {data.counts.pending}
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-sm text-white/60">Live</div>
            <div className="text-3xl font-bold mt-2 text-emerald-300">
              {data.counts.live}
            </div>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-5">
            <div className="text-sm text-white/60">Rejected</div>
            <div className="text-3xl font-bold mt-2 text-red-300">
              {data.counts.rejected}
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setTab('pending')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === 'pending' ? 'bg-amber-500 text-white' : 'bg-white/10 text-white'
              }`}
            >
              Pending Review
            </button>

            <button
              onClick={() => setTab('live')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === 'live' ? 'bg-emerald-600 text-white' : 'bg-white/10 text-white'
              }`}
            >
              Live
            </button>

            <button
              onClick={() => setTab('rejected')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === 'rejected' ? 'bg-red-600 text-white' : 'bg-white/10 text-white'
              }`}
            >
              Rejected
            </button>
          </div>

          <div className="flex flex-col gap-3 md:flex-row">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by program name, source, org..."
              className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            />

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-sm text-white outline-none"
            >
              {sourceOptions.map((source) => (
                <option key={source} value={source} className="bg-[#0D1F3C] text-white">
                  {source === 'all' ? 'All Sources' : source}
                </option>
              ))}
            </select>

            <button
              onClick={() => loadReviewData(false)}
              className="rounded-lg bg-[#028090] px-4 py-2 text-sm font-semibold text-white hover:bg-[#026f7d] transition"
            >
              Refresh
            </button>
          </div>

          <div className="text-sm text-white/60">
            Showing {currentRows.length} of {baseRows.length} result(s) in {tabLabel}
            {search.trim() ? ` for "${search.trim()}"` : ''}
            {sourceFilter !== 'all' ? ` from ${sourceFilter}` : ''}
          </div>
        </div>

        <div className="space-y-4">
          {currentRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center text-white/60">
              No grants found in this tab.
            </div>
          ) : (
            currentRows.map((grant) => (
              <GrantReviewRow
                key={grant.id}
                grant={grant}
                onUpdated={() => loadReviewData(false)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}