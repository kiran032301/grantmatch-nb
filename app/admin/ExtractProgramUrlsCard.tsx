'use client'

import { useState } from 'react'

type Candidate = {
  text: string
  href: string
  reason: string | null
  confidence: number
}

type ApiResponse = {
  success?: boolean
  message?: string
  sourceUrl?: string
  pageTitle?: string
  candidates?: Candidate[]
  error?: string
}

function formatConfidence(value?: number) {
  if (typeof value !== 'number') return '—'
  return `${Math.round(value * 100)}%`
}

export default function ExtractProgramUrlsCard() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pageTitle, setPageTitle] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])

  async function handleExtract() {
    try {
      setLoading(true)
      setError(null)
      setStatus(null)
      setPageTitle(null)
      setCandidates([])

      const res = await fetch('/api/admin/extract-program-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })

      const json = (await res.json()) as ApiResponse

      if (!res.ok) {
        throw new Error(json?.error || 'Program URL extraction failed.')
      }

      setStatus(json.message || 'Program URLs extracted.')
      setPageTitle(json.pageTitle || null)
      setCandidates(json.candidates || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Program URL extraction failed.')
    } finally {
      setLoading(false)
    }
  }

  function copyAllUrls() {
    const text = candidates.map((c) => c.href).join('\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="extractWrap">
      <div className="extractHeader">
        <div>
          <h2 className="extractTitle">Auto Program URL Extractor</h2>
          <p className="extractSubtitle">
            Paste a directory page URL and discover likely grant/program URLs automatically.
          </p>
        </div>
      </div>

      <div className="extractRow">
        <input
          type="url"
          placeholder="Paste directory page URL here"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="extractInput"
        />

        <div className="buttonRow">
          <button
            type="button"
            className="extractBtn"
            onClick={handleExtract}
            disabled={loading || !url.trim()}
          >
            {loading ? 'Finding URLs...' : 'Find Program URLs'}
          </button>

          <button
            type="button"
            className="copyBtn"
            onClick={copyAllUrls}
            disabled={candidates.length === 0}
          >
            Copy All URLs
          </button>
        </div>
      </div>

      {status && <div className="successBox">{status}</div>}
      {error && <div className="errorBox">{error}</div>}

      {pageTitle && (
        <div className="pageTitleBox">
          <span className="pageTitleLabel">Directory Page:</span> {pageTitle}
        </div>
      )}

      {candidates.length > 0 && (
        <div className="resultsCard">
          <div className="resultsTitle">Likely Program URLs</div>
          <div className="resultsList">
            {candidates.map((item, index) => (
              <div key={`${item.href}-${index}`} className="resultItem">
                <div className="resultTop">
                  <div className="resultName">{item.text}</div>
                  <div className="resultConfidence">
                    Confidence: {formatConfidence(item.confidence)}
                  </div>
                </div>

                <div className="resultUrl">{item.href}</div>

                {item.reason && (
                  <div className="resultReason">{item.reason}</div>
                )}
              </div>
            ))}
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
          min-height: 46px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.04);
          color: white;
          padding: 12px 14px;
          font-size: 14px;
          outline: none;
        }

        .buttonRow {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }

        .extractBtn,
        .copyBtn {
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

        .copyBtn {
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.86);
        }

        .extractBtn:disabled,
        .copyBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
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

        .pageTitleBox {
          margin-top: 12px;
          color: white;
          font-size: 14px;
        }

        .pageTitleLabel {
          color: rgba(255,255,255,0.58);
          font-weight: 700;
        }

        .resultsCard {
          margin-top: 16px;
          padding: 16px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(255,255,255,0.03);
        }

        .resultsTitle {
          color: white;
          font-size: 16px;
          font-weight: 800;
          margin-bottom: 14px;
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
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }

        .resultName {
          color: white;
          font-size: 14px;
          font-weight: 700;
        }

        .resultConfidence {
          color: rgba(255,255,255,0.6);
          font-size: 12px;
        }

        .resultUrl {
          color: #93c5fd;
          font-size: 13px;
          word-break: break-word;
          margin-bottom: 8px;
        }

        .resultReason {
          color: rgba(255,255,255,0.75);
          font-size: 13px;
          line-height: 1.5;
        }
      `}</style>
    </div>
  )
}