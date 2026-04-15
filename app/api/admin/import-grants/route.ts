import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import path from 'path'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

type ScriptRunResult = {
  stdout: string
  stderr: string
}

function runScript(scriptName: string) {
  return new Promise<ScriptRunResult>((resolve, reject) => {
    const projectRoot = process.cwd()
    const scriptPath = path.join(projectRoot, 'scripts', scriptName)

    exec(
      `npx tsx "${scriptPath}"`,
      { cwd: projectRoot },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || stdout || error.message))
          return
        }

        resolve({
          stdout: stdout || '',
          stderr: stderr || '',
        })
      }
    )
  })
}

async function getGrantReviewCounts() {
  const { data, error } = await supabaseAdmin
    .from('grants')
    .select('id, is_active, verification_status')

  if (error) {
    throw error
  }

  const rows = data || []

  const pending = rows.filter(
    (row) => row.is_active === false && row.verification_status === 'review_pending'
  ).length

  const live = rows.filter(
    (row) => row.is_active === true && row.verification_status === 'verified'
  ).length

  const rejected = rows.filter(
    (row) => row.verification_status === 'rejected'
  ).length

  return { pending, live, rejected }
}

export async function GET() {
  try {
    const [profilesRes, matchesRes, grantsRes, leadsRes, requestsRes] = await Promise.all([
      supabaseAdmin
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('profile_matches')
        .select('*')
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('grants')
        .select('id, name, organization, type, intake_status')
        .order('name', { ascending: true }),

      supabaseAdmin
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false }),

      supabaseAdmin
        .from('report_requests')
        .select('*')
        .order('created_at', { ascending: false }),
    ])

    if (profilesRes.error) throw profilesRes.error
    if (matchesRes.error) throw matchesRes.error
    if (grantsRes.error) throw grantsRes.error
    if (leadsRes.error) throw leadsRes.error
    if (requestsRes.error) throw requestsRes.error

    return NextResponse.json({
      profiles: profilesRes.data || [],
      matches: matchesRes.data || [],
      grants: grantsRes.data || [],
      leads: leadsRes.data || [],
      reportRequests: requestsRes.data || [],
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load admin data'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // -------------------------------
    // MODE 1: CSV upload -> { rows }
    // -------------------------------
    if (Array.isArray(body?.rows)) {
      const rows = body.rows

      if (!rows.length) {
        return NextResponse.json(
          { error: 'CSV is empty or has no valid rows.' },
          { status: 400 }
        )
      }

      const cleanedRows = rows.map((row: Record<string, unknown>) => ({
        ...row,
        verification_status:
          typeof row.verification_status === 'string' &&
          row.verification_status.trim() !== ''
            ? String(row.verification_status).trim().toLowerCase()
            : 'review_pending',

        is_active:
          typeof row.is_active === 'boolean'
            ? row.is_active
            : false,
      }))

      const { error } = await supabaseAdmin.from('grants').insert(cleanedRows)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      const counts = await getGrantReviewCounts()

      return NextResponse.json({
        success: true,
        imported: cleanedRows.length,
        pending: counts.pending,
        live: counts.live,
        rejected: counts.rejected,
        message: `CSV import completed. Inserted ${cleanedRows.length} row(s).`,
      })
    }

    // ---------------------------------------
    // MODE 2: Script import -> { source }
    // ---------------------------------------
    const source = String(body?.source || '')
      .trim()
      .toLowerCase()

    const allowedSources: Record<string, string> = {
      gnb: 'import-gnb-funding.ts',
      onb: 'import-onb-programs.ts',
      nbif: 'import-nbif-programs.ts',
      acoa: 'import-acoa-programs.ts',
    }

    if (source === 'all') {
      const runOrder: Array<keyof typeof allowedSources> = ['gnb', 'onb', 'nbif', 'acoa']
      const results: Array<{ source: string; ok: boolean; details?: string; error?: string }> = []

      for (const key of runOrder) {
        const scriptName = allowedSources[key]

        try {
          const result = await runScript(scriptName)
          results.push({
            source: key.toUpperCase(),
            ok: true,
            details: result.stdout || result.stderr || 'Completed',
          })
        } catch (error) {
          results.push({
            source: key.toUpperCase(),
            ok: false,
            error: error instanceof Error ? error.message : 'Import failed',
          })
        }
      }

      const failed = results.filter((r) => !r.ok)
      const counts = await getGrantReviewCounts()

      if (failed.length > 0) {
        return NextResponse.json(
          {
            error: 'One or more imports failed.',
            results,
            pending: counts.pending,
            live: counts.live,
            rejected: counts.rejected,
          },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        source: 'all',
        results,
        pending: counts.pending,
        live: counts.live,
        rejected: counts.rejected,
        message: 'All source imports completed successfully.',
      })
    }

    const scriptName = allowedSources[source]

    if (!scriptName) {
      return NextResponse.json(
        { error: 'Invalid source selected.' },
        { status: 400 }
      )
    }

    const result = await runScript(scriptName)
    const counts = await getGrantReviewCounts()

    return NextResponse.json({
      success: true,
      source,
      pending: counts.pending,
      live: counts.live,
      rejected: counts.rejected,
      details: result.stdout || result.stderr || '',
      message: `${source.toUpperCase()} import completed.`,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Import failed'

    return NextResponse.json({ error: message }, { status: 500 })
  }
}