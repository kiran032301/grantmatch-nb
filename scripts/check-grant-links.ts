import axios from 'axios'
import { loadEnvConfig } from '@next/env'
import { createClient } from '@supabase/supabase-js'

loadEnvConfig(process.cwd())

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// -----------------------------
// Check single URL
// -----------------------------
async function checkUrl(url: string) {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      maxRedirects: 5,
      validateStatus: () => true,
    })

    if (response.status >= 200 && response.status < 300) {
      return { status: 'valid', error: null }
    }

    if (response.status >= 300 && response.status < 400) {
      return { status: 'redirect', error: null }
    }

    if (response.status === 404 || response.status === 410) {
      return { status: 'broken', error: `HTTP ${response.status}` }
    }

    return { status: 'error', error: `HTTP ${response.status}` }
  } catch (err: any) {
    return {
      status: 'error',
      error: err.message || 'Unknown error',
    }
  }
}

// -----------------------------
// Main runner
// -----------------------------
async function run() {
  console.log('Checking grant URLs...')

  const { data: grants, error } = await supabase
    .from('grants')
    .select('id, name, url')

  if (error) {
    throw error
  }

  let valid = 0
  let broken = 0
  let errorCount = 0

  for (const grant of grants || []) {
    if (!grant.url) continue

    console.log(`Checking: ${grant.name}`)

    const result = await checkUrl(grant.url)

    await supabase
      .from('grants')
      .update({
        url_status: result.status,
        url_checked_at: new Date().toISOString(),
        url_error: result.error,
      })
      .eq('id', grant.id)

    if (result.status === 'valid') valid++
    else if (result.status === 'broken') broken++
    else errorCount++

    console.log(`→ ${result.status}`)
  }

  console.log('--------------------------------')
  console.log(`Valid: ${valid}`)
  console.log(`Broken: ${broken}`)
  console.log(`Error: ${errorCount}`)
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})