import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/admin/import-grants': [
      './scripts/**/*',
      './node_modules/axios/**/*',
      './node_modules/cheerio/**/*',
      './node_modules/@supabase/supabase-js/**/*',
      './node_modules/@supabase/node-fetch/**/*',
    ],
  },
}

export default nextConfig