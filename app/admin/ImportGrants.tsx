'use client'

import { useMemo, useState } from 'react'

type ImportSource = 'gnb' | 'onb' | 'nbif' | 'acoa' | 'all'

type Props = {
  onImported?: () => void | Promise<void>
}

type ImportResult = {
  ok?: boolean
  message?: string
  imported?: number
  pending?: number
  source?: string
  error?: string
}

const SOURCE_META: Record<
  Exclude<ImportSource, 'all'>,
  { label: string; short: string }
> = {
  gnb: { label: 'Import GNB', short: 'GNB' },
  onb: { label: 'Import ONB', short: 'ONB' },
  nbif: { label: 'Import NBIF', short: 'NBIF' },
  acoa: { label: 'Import ACOA', short: 'ACOA' },
}

export default function ImportGrants({ onImported }: Props) {
  const [loadingSource, setLoadingSource] = useState<ImportSource | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastImportedAt, setLastImportedAt] = useState<string | null>(null)
  const [lastImportedSource, setLastImportedSource] = useState<string | null>(null)

  const sources = useMemo(
    () => Object.entries(SOURCE_META) as [Exclude<ImportSource, 'all'>, { label: string; short: string }][],
    []
  )

  async function runImport(source: ImportSource) {
    try {
      setLoadingSource(source)
      setError(null)
      setStatus(null)

      const res = await fetch('/api/admin/import-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })

      const json: ImportResult = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || json?.message || 'Import failed.')
      }

      const sourceLabel =
        source === 'all'
          ? 'All Sources'
          : SOURCE_META[source].short

      const importedText =
        typeof json.imported === 'number' ? `${json.imported} imported` : 'Import completed'

      const pendingText =
        typeof json.pending === 'number' ? ` • ${json.pending} pending review` : ''

      setStatus(`${sourceLabel}: ${importedText}${pendingText}`)
      setLastImportedAt(new Date().toLocaleString())
      setLastImportedSource(sourceLabel)

      if (onImported) {
        await onImported()
      }
    } catch (err) {
      console.error('Import error:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong while importing grants.')
    } finally {
      setLoadingSource(null)
    }
  }

  return (
    <div className="importWrap">
      <div className="importHeader">
        <div>
          <h2 className="importTitle">Import Funding Sources</h2>
          <p className="importSubtitle">
            Pull new grants from trusted sources, then review them before publishing live.
          </p>
        </div>

        <button
          type="button"
          className="importAllBtn"
          onClick={() => runImport('all')}
          disabled={loadingSource !== null}
        >
          {loadingSource === 'all' ? 'Importing All...' : 'Import All Sources'}
        </button>
      </div>

      <div className="sourceGrid">
        {sources.map(([key, meta]) => (
          <button
            key={key}
            type="button"
            className="sourceBtn"
            onClick={() => runImport(key)}
            disabled={loadingSource !== null}
          >
            {loadingSource === key ? `Importing ${meta.short}...` : meta.label}
          </button>
        ))}
      </div>

      <div className="importInfoRow">
        <div className="infoPill">
          Review imported grants before moving them live
        </div>

        {lastImportedAt && (
          <div className="lastImportText">
            Last import: {lastImportedSource} • {lastImportedAt}
          </div>
        )}
      </div>

      {status && <div className="successBox">{status}</div>}
      {error && <div className="errorBox">{error}</div>}

      <div className="csvBlock">
        <div className="csvTitle">CSV upload test</div>
        <div className="csvText">
          Use this only for manual testing. Source imports are recommended for production data.
        </div>

        <div className="csvRow">
          <input type="file" disabled className="fileInput" />
          <button type="button" className="csvDisabledBtn" disabled>
            Upload CSV
          </button>
        </div>
      </div>

      <style>{`
        .importWrap {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: 24px;
        }

        .importHeader {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }

        .importTitle {
          margin: 0 0 8px;
          font-size: 20px;
          font-weight: 800;
          color: white;
        }

        .importSubtitle {
          margin: 0;
          color: rgba(255,255,255,0.62);
          font-size: 15px;
          line-height: 1.6;
          max-width: 760px;
        }

        .importAllBtn {
          border: none;
          cursor: pointer;
          border-radius: 12px;
          min-height: 44px;
          padding: 12px 18px;
          background: linear-gradient(90deg, #028090, #02c39a);
          color: white;
          font-weight: 800;
          font-size: 14px;
          white-space: nowrap;
        }

        .importAllBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .sourceGrid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .sourceBtn {
          border: none;
          cursor: pointer;
          border-radius: 12px;
          min-height: 46px;
          padding: 12px 16px;
          background: linear-gradient(90deg, #2563eb, #9333ea);
          color: white;
          font-weight: 800;
          font-size: 14px;
          transition: transform 0.15s ease, opacity 0.15s ease;
        }

        .sourceBtn:hover:not(:disabled),
        .importAllBtn:hover:not(:disabled) {
          transform: translateY(-1px);
        }

        .sourceBtn:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .importInfoRow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 14px;
        }

        .infoPill {
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

        .lastImportText {
          font-size: 13px;
          color: rgba(255,255,255,0.55);
        }

        .successBox {
          margin-top: 8px;
          background: rgba(16,185,129,0.12);
          border: 1px solid rgba(16,185,129,0.35);
          color: #bbf7d0;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
        }

        .errorBox {
          margin-top: 8px;
          background: rgba(239,68,68,0.12);
          border: 1px solid rgba(239,68,68,0.35);
          color: #fecaca;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 14px;
        }

        .csvBlock {
          margin-top: 18px;
          padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .csvTitle {
          font-size: 15px;
          font-weight: 700;
          color: white;
          margin-bottom: 6px;
        }

        .csvText {
          color: rgba(255,255,255,0.58);
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .csvRow {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
        }

        .fileInput {
          color: rgba(255,255,255,0.74);
        }

        .csvDisabledBtn {
          border: 1px solid rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.06);
          color: rgba(255,255,255,0.5);
          border-radius: 12px;
          min-height: 42px;
          padding: 10px 16px;
          font-weight: 700;
          cursor: not-allowed;
        }

        @media (max-width: 640px) {
          .importWrap {
            padding: 18px;
          }

          .importAllBtn,
          .sourceBtn {
            width: 100%;
          }

          .csvRow {
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  )
}