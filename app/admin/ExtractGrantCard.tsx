'use client'

import { useMemo, useState } from 'react'

type ExtractionMeta = {
  page_type?: 'program' | 'directory' | 'general_info'
  page_confidence?: number
  page_reasoning?: string | null
  overall_confidence?: number
  evidence?: {
    name?: string | null
    organization?: string | null
    amount?: string | null
    funding_type?: string | null
    repayable?: string | null
    eligibility?: string | null
    intake_status?: string | null
  }
}

type GrantPreview = {
  name?: string | null
  organization?: string | null
  amount_min?: number | null
  amount_max?: number | null
  type?: string | null
  funding_type?: string | null
  provider_type?: string | null
  repayable?: boolean | null
  description?: string | null
  short_description?: string | null
  eligibility?: string | null
  eligibility_summary?: string | null
  industry_tags?: string[]
  stage_tags?: string[]
  goal_tags?: string[]
  supports_rd?: boolean | null
  intake_status?: string | null
  url?: string | null
  source_name?: string | null
  source_program_id?: string | null
  business_relevance?: 'high' | 'medium' | 'low' | string | null
  stackable?: boolean | null
  funding_percentage?: number | null
  program_level?: string | null
  stack_notes?: string | null
  max_stack_cap?: number | null
}

type BatchResult = {
  url: string
  success: boolean
  status: 'inserted' | 'updated' | 'skipped' | 'failed'
  message?: string
  error?: string
  grant?: GrantPreview
  extractionMeta?: ExtractionMeta
}

type BatchResponse = {
  success?: boolean
  action?: 'inserted' | 'updated'
  message?: string
  grant?: GrantPreview
  extractionMeta?: ExtractionMeta
  results?: BatchResult[]
  summary?: {
    inserted: number
    updated: number
    skipped: number
    failed: number
  }
  error?: string
  classification?: ExtractionMeta
}

type Props = {
  onExtracted?: () => void | Promise<void>
}

function formatConfidence(value?: number) {
  if (typeof value !== 'number') return '—'
  return `${Math.round(value * 100)}%`
}

function formatBoolean(value?: boolean | null) {
  if (value === true) return 'Yes'
  if (value === false) return 'No'
  return 'Unknown'
}

function formatMoney(min?: number | null, max?: number | null) {
  if (typeof min === 'number' && typeof max === 'number') {
    return `$${min.toLocaleString()} – $${max.toLocaleString()}`
  }
  if (typeof max === 'number') {
    return `Up to $${max.toLocaleString()}`
  }
  if (typeof min === 'number') {
    return `From $${min.toLocaleString()}`
  }
  return 'Not clearly stated'
}

function EvidenceRow({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  if (!value) return null

  return (
    <div className="evidenceRow">
      <div className="evidenceLabel">{label}</div>
      <div className="evidenceValue">{value}</div>
    </div>
  )
}

function PreviewRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="previewRow">
      <div className="previewLabel">{label}</div>
      <div className="previewValue">{value}</div>
    </div>
  )
}

export default function ExtractGrantCard({ onExtracted }: Props) {
  const [urlText, setUrlText] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<GrantPreview | null>(null)
  const [meta, setMeta] = useState<ExtractionMeta | null>(null)
  const [results, setResults] = useState<BatchResult[]>([])
  const [summary, setSummary] = useState<BatchResponse['summary'] | null>(null)

  const urls = useMemo(() => {
    return urlText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
  }, [urlText])

  function clearAll() {
    setUrlText('')
    setStatus(null)
    setError(null)
    setPreview(null)
    setMeta(null)
    setResults([])
    setSummary(null)
  }

  async function handleExtract() {
    try {
      setLoading(true)
      setError(null)
      setStatus(null)
      setPreview(null)
      setMeta(null)
      setResults([])
      setSummary(null)

      if (urls.length === 0) {
        throw new Error('Please enter at least one URL.')
      }

      if (urls.length > 5) {
        throw new Error('Maximum 5 URLs allowed per batch.')
      }

      const res = await fetch('/api/admin/extract-grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls,
        }),
      })

      const json = (await res.json()) as BatchResponse

      if (!res.ok) {
        if (json.classification) setMeta(json.classification)
        if (json.results) setResults(json.results)
        if (json.summary) setSummary(json.summary)
        throw new Error(json?.error || 'Extraction failed.')
      }

      setStatus(json.message || 'Extraction completed.')
      setPreview(json.grant || null)
      setMeta(json.extractionMeta || null)
      setResults(json.results || [])
      setSummary(json.summary || null)

      if (onExtracted) {
        await onExtracted()
      }

      // Auto-clear input only when the batch ran successfully
      setUrlText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Extraction failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="extractWrap">
      <div className="extractHeader">
        <div>
          <h2 className="extractTitle">AI Grant Extraction</h2>
          <p className="extractSubtitle">
            Paste up to 5 grant URLs, one per line. AI will extract them into Pending Review.
          </p>
        </div>
      </div>

      <div className="extractRow">
        <textarea
          placeholder={`Paste up to 5 URLs, one per line

https://www.canada.ca/en/atlantic-canada-opportunities/services/business-development-program.html
https://www.canada.ca/en/atlantic-canada-opportunities/services/regional-economic-growth-through-innovation.html`}
          value={urlText}
          onChange={(e) => setUrlText(e.target.value)}
          className="extractInput"
          rows={7}
        />

        <div className="buttonRow">
          <button
            type="button"
            className="extractBtn"
            onClick={handleExtract}
            disabled={loading || urls.length === 0 || urls.length > 5}
          >
            {loading ? 'Extracting...' : `Extract ${urls.length || ''} URL${urls.length === 1 ? '' : 's'} with AI`}
          </button>

          <button
            type="button"
            className="clearBtn"
            onClick={clearAll}
            disabled={loading && !urlText && !results.length}
          >
            Clear All
          </button>
        </div>
      </div>

      <div className="helperRow">
        <span className="helperPill">Detected URLs: {urls.length}</span>
        <span className="helperNote">Maximum 5 per batch</span>
      </div>

      {status && <div className="successBox">{status}</div>}
      {error && <div className="errorBox">{error}</div>}

      {summary && (
        <div className="summaryCard">
          <div className="summaryTitle">Batch Summary</div>
          <div className="summaryGrid">
            <div className="summaryPill">
              <span className="summaryPillLabel">Inserted</span>
              <span className="summaryPillValue">{summary.inserted}</span>
            </div>
            <div className="summaryPill">
              <span className="summaryPillLabel">Updated</span>
              <span className="summaryPillValue">{summary.updated}</span>
            </div>
            <div className="summaryPill">
              <span className="summaryPillLabel">Skipped</span>
              <span className="summaryPillValue">{summary.skipped}</span>
            </div>
            <div className="summaryPill">
              <span className="summaryPillLabel">Failed</span>
              <span className="summaryPillValue">{summary.failed}</span>
            </div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="resultsCard">
          <div className="resultsTitle">Per-URL Results</div>
          <div className="resultsList">
            {results.map((result, index) => (
              <div key={`${result.url}-${index}`} className="resultItem">
                <div className="resultTop">
                  <span className={`statusBadge status-${result.status}`}>
                    {result.status}
                  </span>
                  <div className="resultUrl">{result.url}</div>
                </div>

                {result.message && <div className="resultMessage">{result.message}</div>}
                {result.error && <div className="resultError">{result.error}</div>}

                {result.extractionMeta && (
                  <div className="resultMeta">
                    <span>Page: {result.extractionMeta.page_type || '—'}</span>
                    <span>
                      Page confidence: {formatConfidence(result.extractionMeta.page_confidence)}
                    </span>
                    <span>
                      Extraction confidence:{' '}
                      {formatConfidence(result.extractionMeta.overall_confidence)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {meta && (
        <div className="metaCard">
          <div className="metaHeader">Extraction Quality</div>

          <div className="metaGrid">
            <div className="metaPill">
              <span className="metaPillLabel">Page Type</span>
              <span className="metaPillValue">{meta.page_type || '—'}</span>
            </div>

            <div className="metaPill">
              <span className="metaPillLabel">Page Confidence</span>
              <span className="metaPillValue">{formatConfidence(meta.page_confidence)}</span>
            </div>

            <div className="metaPill">
              <span className="metaPillLabel">Extraction Confidence</span>
              <span className="metaPillValue">{formatConfidence(meta.overall_confidence)}</span>
            </div>
          </div>

          {meta.page_reasoning && (
            <div className="metaReasoning">
              <div className="metaReasoningLabel">Why the page was classified this way</div>
              <div className="metaReasoningText">{meta.page_reasoning}</div>
            </div>
          )}

          {meta.evidence && (
            <div className="evidenceCard">
              <div className="evidenceTitle">Evidence used by AI</div>

              <EvidenceRow label="Name" value={meta.evidence.name} />
              <EvidenceRow label="Organization" value={meta.evidence.organization} />
              <EvidenceRow label="Amount" value={meta.evidence.amount} />
              <EvidenceRow label="Funding Type" value={meta.evidence.funding_type} />
              <EvidenceRow label="Repayable" value={meta.evidence.repayable} />
              <EvidenceRow label="Eligibility" value={meta.evidence.eligibility} />
              <EvidenceRow label="Intake Status" value={meta.evidence.intake_status} />
            </div>
          )}
        </div>
      )}

      {preview && (
        <div className="previewCard">
          <div className="previewHeader">Latest Extracted Grant Preview</div>

          <div className="previewGrid">
            <PreviewRow label="Name" value={preview.name || '—'} />
            <PreviewRow label="Organization" value={preview.organization || '—'} />
            <PreviewRow label="Type" value={preview.type || '—'} />
            <PreviewRow label="Funding Type" value={preview.funding_type || '—'} />
            <PreviewRow label="Repayable" value={formatBoolean(preview.repayable)} />
            <PreviewRow
              label="Amount"
              value={formatMoney(preview.amount_min, preview.amount_max)}
            />
            <PreviewRow label="Provider Type" value={preview.provider_type || '—'} />
            <PreviewRow label="Intake Status" value={preview.intake_status || '—'} />
            <PreviewRow label="Supports R&D" value={formatBoolean(preview.supports_rd)} />
            <PreviewRow
              label="Business Relevance"
              value={preview.business_relevance || '—'}
            />
            <PreviewRow label="Source" value={preview.source_name || '—'} />
            <PreviewRow
              label="Source Program ID"
              value={preview.source_program_id || '—'}
            />
            <PreviewRow label="Program Level" value={preview.program_level || '—'} />
            <PreviewRow label="Stackable" value={formatBoolean(preview.stackable)} />
            <PreviewRow
              label="Funding Percentage"
              value={
                typeof preview.funding_percentage === 'number'
                  ? `${preview.funding_percentage}%`
                  : '—'
              }
            />
            <PreviewRow
              label="Max Stack Cap"
              value={
                typeof preview.max_stack_cap === 'number'
                  ? `${preview.max_stack_cap}%`
                  : '—'
              }
            />
          </div>

          <div className="textSection">
            <div className="textBlock">
              <div className="textLabel">Short Description</div>
              <div className="textValue">{preview.short_description || '—'}</div>
            </div>

            <div className="textBlock">
              <div className="textLabel">Description</div>
              <div className="textValue">{preview.description || '—'}</div>
            </div>

            <div className="textBlock">
              <div className="textLabel">Eligibility Summary</div>
              <div className="textValue">{preview.eligibility_summary || '—'}</div>
            </div>

            <div className="textBlock">
              <div className="textLabel">Eligibility</div>
              <div className="textValue">{preview.eligibility || '—'}</div>
            </div>

            <div className="textBlock">
              <div className="textLabel">Stack Notes</div>
              <div className="textValue">{preview.stack_notes || '—'}</div>
            </div>

            <div className="textBlock">
              <div className="textLabel">URL</div>
              <div className="textValue linkLike">{preview.url || '—'}</div>
            </div>
          </div>

          <div className="tagSection">
            <div className="tagBlock">
              <div className="textLabel">Industry Tags</div>
              <div className="tagWrap">
                {(preview.industry_tags || []).length > 0 ? (
                  preview.industry_tags!.map((tag) => (
                    <span key={`industry-${tag}`} className="tag">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="tagEmpty">No tags</span>
                )}
              </div>
            </div>

            <div className="tagBlock">
              <div className="textLabel">Stage Tags</div>
              <div className="tagWrap">
                {(preview.stage_tags || []).length > 0 ? (
                  preview.stage_tags!.map((tag) => (
                    <span key={`stage-${tag}`} className="tag">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="tagEmpty">No tags</span>
                )}
              </div>
            </div>

            <div className="tagBlock">
              <div className="textLabel">Goal Tags</div>
              <div className="tagWrap">
                {(preview.goal_tags || []).length > 0 ? (
                  preview.goal_tags!.map((tag) => (
                    <span key={`goal-${tag}`} className="tag">
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="tagEmpty">No tags</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .extractWrap {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 24px;
          margin-bottom: 18px;
        }

        .extractHeader {
          margin-bottom: 16px;
        }

        .extractTitle {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 800;
          color: white;
        }

        .extractSubtitle {
          margin: 0;
          color: rgba(255,255,255,0.62);
          font-size: 15px;
          line-height: 1.6;
        }

        .extractRow {
          display: grid;
          gap: 12px;
        }

        .extractInput {
          width: 100%;
          box-sizing: border-box;
          min-height: 140px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: white;
          padding: 12px 14px;
          font-size: 14px;
          outline: none;
          resize: vertical;
        }

        .buttonRow {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .extractBtn,
        .clearBtn {
          border: none;
          cursor: pointer;
          border-radius: 12px;
          min-height: 46px;
          padding: 12px 18px;
          font-weight: 800;
          font-size: 14px;
          white-space: nowrap;
        }

        .extractBtn {
          background: linear-gradient(90deg, #028090, #02c39a);
          color: white;
        }

        .clearBtn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.86);
        }

        .extractBtn:disabled,
        .clearBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .helperRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-top: 12px;
        }

        .helperPill {
          display: inline-flex;
          align-items: center;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(2,195,154,0.12);
          border: 1px solid rgba(2,195,154,0.22);
          color: #9ff7df;
          font-size: 13px;
          font-weight: 700;
        }

        .helperNote {
          color: rgba(255,255,255,0.55);
          font-size: 13px;
        }

        .successBox {
          margin-top: 12px;
          background: rgba(16,185,129,0.12);
          border: 1px solid rgba(16,185,129,0.35);
          color: #bbf7d0;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
        }

        .errorBox {
          margin-top: 12px;
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.35);
          color: #fecaca;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
        }

        .summaryCard,
        .resultsCard,
        .metaCard,
        .previewCard {
          margin-top: 16px;
          padding: 16px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
        }

        .summaryTitle,
        .resultsTitle,
        .metaHeader,
        .previewHeader,
        .evidenceTitle {
          color: white;
          font-size: 16px;
          font-weight: 800;
          margin-bottom: 14px;
        }

        .summaryGrid,
        .metaGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
        }

        .summaryPill,
        .metaPill {
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .summaryPillLabel,
        .metaPillLabel {
          display: block;
          color: rgba(255,255,255,0.55);
          font-size: 12px;
          margin-bottom: 6px;
        }

        .summaryPillValue,
        .metaPillValue {
          color: white;
          font-size: 14px;
          font-weight: 700;
        }

        .resultsList {
          display: grid;
          gap: 12px;
        }

        .resultItem {
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .resultTop {
          display: flex;
          gap: 10px;
          align-items: flex-start;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .statusBadge {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .status-inserted {
          background: rgba(16,185,129,0.14);
          border: 1px solid rgba(16,185,129,0.28);
          color: #bbf7d0;
        }

        .status-updated {
          background: rgba(59,130,246,0.14);
          border: 1px solid rgba(59,130,246,0.28);
          color: #bfdbfe;
        }

        .status-skipped {
          background: rgba(245,158,11,0.14);
          border: 1px solid rgba(245,158,11,0.28);
          color: #fde68a;
        }

        .status-failed {
          background: rgba(239,68,68,0.14);
          border: 1px solid rgba(239,68,68,0.28);
          color: #fecaca;
        }

        .resultUrl {
          color: #93c5fd;
          font-size: 13px;
          word-break: break-word;
          flex: 1;
        }

        .resultMessage {
          color: white;
          font-size: 14px;
          margin-bottom: 6px;
        }

        .resultError {
          color: #fecaca;
          font-size: 14px;
          margin-bottom: 6px;
        }

        .resultMeta {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          color: rgba(255,255,255,0.6);
          font-size: 12px;
        }

        .metaReasoning {
          margin-top: 14px;
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
        }

        .metaReasoningLabel,
        .textLabel,
        .evidenceLabel,
        .previewLabel {
          color: rgba(255,255,255,0.58);
          font-size: 12px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .metaReasoningText,
        .textValue,
        .evidenceValue,
        .previewValue {
          color: white;
          font-size: 14px;
          line-height: 1.6;
        }

        .evidenceCard {
          margin-top: 14px;
          padding: 14px;
          border-radius: 12px;
          background: rgba(2,195,154,0.08);
          border: 1px solid rgba(2,195,154,0.18);
        }

        .evidenceRow + .evidenceRow {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .previewGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
          gap: 12px;
        }

        .previewRow {
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .textSection,
        .tagSection {
          margin-top: 16px;
          display: grid;
          gap: 12px;
        }

        .textBlock,
        .tagBlock {
          padding: 12px;
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
        }

        .tagWrap {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(37,99,235,0.16);
          border: 1px solid rgba(37,99,235,0.24);
          color: #bfdbfe;
          font-size: 12px;
          font-weight: 700;
        }

        .tagEmpty {
          color: rgba(255,255,255,0.5);
          font-size: 13px;
        }

        .linkLike {
          word-break: break-word;
          color: #93c5fd;
        }
      `}</style>
    </div>
  )
}