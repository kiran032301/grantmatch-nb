'use client'

import { useState } from 'react'

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

type Props = {
  grant: GrantRow
  onUpdated: () => void
}

function normalizeTags(tags: string[] | string | null | undefined): string[] {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  return String(tags)
    .replace(/[{}"]/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function GrantReviewRow({ grant, onUpdated }: Props) {
  const [loading, setLoading] = useState(false)
  const [notes, setNotes] = useState(grant.review_notes || '')

  async function handleAction(action: 'approve' | 'reject' | 'pending') {
    try {
      setLoading(true)

      const res = await fetch('/api/admin/review-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grantId: grant.id,
          action,
          reviewNotes: notes,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to update grant')
      }

      onUpdated()
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update grant')
    } finally {
      setLoading(false)
    }
  }

  const industryTags = normalizeTags(grant.industry_tags)
  const stageTags = normalizeTags(grant.stage_tags)
  const goalTags = normalizeTags(grant.goal_tags)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">
            {grant.name || 'Untitled Grant'}
          </h3>
          <p className="text-sm text-white/60">
            {grant.organization || 'Unknown organization'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-300 border border-sky-500/20">
            {grant.source_name || 'source unknown'}
          </span>

          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 border border-white/10">
            {grant.intake_status || 'unknown intake'}
          </span>

          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 border border-white/10">
            {grant.verification_status || 'unknown'}
          </span>

          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 border border-white/10">
            {grant.is_active ? 'live' : 'inactive'}
          </span>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-black/10 p-3">
          <div className="text-sm font-semibold text-white mb-1">Short Description</div>
          <div className="text-sm text-white/70">
            {grant.short_description || '—'}
          </div>
        </div>

        <div className="rounded-xl bg-black/10 p-3">
          <div className="text-sm font-semibold text-white mb-1">Eligibility</div>
          <div className="text-sm text-white/70">
            {grant.eligibility_summary || '—'}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <div className="text-sm font-semibold text-white mb-2">Industry Tags</div>
          <div className="flex flex-wrap gap-2">
            {industryTags.length ? industryTags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/80">
                {tag}
              </span>
            )) : <span className="text-sm text-white/50">—</span>}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-white mb-2">Stage Tags</div>
          <div className="flex flex-wrap gap-2">
            {stageTags.length ? stageTags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/80">
                {tag}
              </span>
            )) : <span className="text-sm text-white/50">—</span>}
          </div>
        </div>

        <div>
          <div className="text-sm font-semibold text-white mb-2">Goal Tags</div>
          <div className="flex flex-wrap gap-2">
            {goalTags.length ? goalTags.map((tag) => (
              <span key={tag} className="rounded-full bg-white/10 px-2 py-1 text-xs text-white/80">
                {tag}
              </span>
            )) : <span className="text-sm text-white/50">—</span>}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-black/10 p-3">
        <div className="text-sm font-semibold text-white mb-2">Source Program ID</div>
        <div className="text-sm text-white/70 break-all">
          {grant.source_program_id || '—'}
        </div>
      </div>

      {grant.url && (
        <a
          href={grant.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 transition"
        >
          Open Source Page
        </a>
      )}

      <div>
        <label className="block text-sm font-semibold text-white mb-2">
          Review Notes
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
          placeholder="Add review notes..."
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          disabled={loading}
          onClick={() => handleAction('approve')}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
        >
          Approve
        </button>

        <button
          disabled={loading}
          onClick={() => handleAction('reject')}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
        >
          Reject
        </button>

        <button
          disabled={loading}
          onClick={() => handleAction('pending')}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition disabled:opacity-50"
        >
          Keep Pending
        </button>
      </div>
    </div>
  )
}