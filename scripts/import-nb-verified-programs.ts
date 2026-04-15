import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const programs = [
  {
    name: "Student Employment Experience Development (SEED)",
    url: "https://www2.gnb.ca/content/gnb/en/services/services_renderer.5099.Student_Employment_Experience_Development_%28SEED%29_-_Students.html",
    org: "Government of New Brunswick",
    desc: "Provides wage subsidies to employers to hire students for summer employment.",
    goals: ['hiring']
  },
  {
    name: "Canada-New Brunswick Job Grant",
    url: "https://www2.gnb.ca/content/gnb/en/services/services_renderer.201416.Canada-New_Brunswick_Job_Grant.html",
    org: "Government of New Brunswick",
    desc: "Provides funding to train employees and improve workforce skills.",
    goals: ['training']
  },
  {
    name: "Small Business Investor Tax Credit",
    url: "https://www2.gnb.ca/content/gnb/en/departments/finance/taxes/credit.html",
    org: "Government of New Brunswick",
    desc: "Encourages investment in small businesses through provincial tax credits.",
    goals: ['investment']
  },
  {
    name: "Regional Development Corporation Funding",
    url: "https://www2.gnb.ca/content/gnb/en/departments/regional_development.html",
    org: "Government of New Brunswick",
    desc: "Provides funding for economic development and infrastructure projects.",
    goals: ['investment']
  },
  {
    name: "NBIF Innovation Voucher Fund",
    url: "https://nbif.ca/innovation-voucher-fund/",
    org: "NBIF",
    desc: "Helps SMEs access R&D expertise and technical support.",
    goals: ['innovation', 'r_and_d']
  },
  {
    name: "NBIF Startup Investment Fund",
    url: "https://nbif.ca/startup-investment-fund/",
    org: "NBIF",
    desc: "Provides venture capital funding to early-stage technology companies.",
    goals: ['investment']
  },
  {
    name: "NBIF Venture Capital Fund",
    url: "https://nbif.ca/venture-capital-fund/",
    org: "NBIF",
    desc: "Supports growth-stage companies with venture capital investment.",
    goals: ['investment']
  },
  {
    name: "ONB Job Creation Support",
    url: "https://onbcanada.ca/businesses/grow/",
    org: "Opportunities NB",
    desc: "Supports job creation and workforce expansion for businesses.",
    goals: ['hiring']
  },
  {
    name: "ONB Productivity Improvement Support",
    url: "https://onbcanada.ca/businesses/grow/",
    org: "Opportunities NB",
    desc: "Supports investments in productivity improvements and efficiency.",
    goals: ['productivity']
  },
  {
    name: "ONB Market Development Support",
    url: "https://onbcanada.ca/businesses/grow/",
    org: "Opportunities NB",
    desc: "Supports expansion into new markets and export activities.",
    goals: ['market_expansion']
  },
  {
    name: "ONB Innovation Support",
    url: "https://onbcanada.ca/businesses/grow/",
    org: "Opportunities NB",
    desc: "Supports innovation and development of new products and services.",
    goals: ['innovation']
  },
  {
    name: "ACOA Business Development Program",
    url: "https://www.canada.ca/en/atlantic-canada-opportunities/services/business-development-program.html",
    org: "ACOA",
    desc: "Provides funding to help businesses grow, expand, and improve productivity.",
    goals: ['investment', 'productivity']
  },
  {
    name: "ACOA REGI Program",
    url: "https://www.canada.ca/en/atlantic-canada-opportunities/services/regional-economic-growth-through-innovation.html",
    org: "ACOA",
    desc: "Supports innovation, commercialization, and business growth.",
    goals: ['innovation']
  },
  {
    name: "NRC IRAP Program",
    url: "https://nrc.canada.ca/en/support-technology-innovation/industrial-research-assistance-program",
    org: "NRC",
    desc: "Supports R&D and innovation projects for SMEs.",
    goals: ['innovation', 'r_and_d']
  },
  {
    name: "SR&ED Tax Credit Program",
    url: "https://www.canada.ca/en/revenue-agency/services/scientific-research-experimental-development-tax-incentive-program.html",
    org: "CRA",
    desc: "Provides tax incentives for research and development activities.",
    goals: ['r_and_d']
  },
  {
    name: "Women Entrepreneurship Strategy",
    url: "https://ised-isde.canada.ca/site/women-entrepreneurship-strategy/en",
    org: "Government of Canada",
    desc: "Supports women-owned businesses with funding and resources.",
    goals: ['investment']
  },
  {
    name: "CanExport SMEs",
    url: "https://www.tradecommissioner.gc.ca/funding-financement/canexport/sme-pme/index.aspx",
    org: "Government of Canada",
    desc: "Supports businesses expanding into international markets.",
    goals: ['export']
  },
  {
    name: "BDC Small Business Loan",
    url: "https://www.bdc.ca/en/financing/small-business-loan",
    org: "BDC",
    desc: "Provides financing solutions for small businesses.",
    goals: ['investment']
  },
  {
    name: "Export Development Canada Support",
    url: "https://www.edc.ca/en",
    org: "EDC",
    desc: "Supports exporters with financing and risk management.",
    goals: ['export']
  }
]

async function main() {
  let inserted = 0

  for (const p of programs) {
    const { error } = await supabase.from('grants').insert({
      name: p.name,
      organization: p.org,
      description: p.desc,
      short_description: p.desc,
      eligibility: 'See official program website.',
      eligibility_summary: 'See official website.',
      amount_min: null,
      amount_max: null,
      type: 'grant',
      funding_type: 'grant',
      provider_type: 'government',
      repayable: false,
      intake_status: 'open',
      url: p.url,
      source_name: 'NB-VERIFIED',
      source_url: p.url,
      source_program_id: p.name.toLowerCase().replace(/\s+/g, '-'),
      verification_status: 'review_pending',
      is_active: false,
      last_verified_at: new Date().toISOString(),
      industry_tags: ['general'],
      stage_tags: ['startup', 'growth', 'established'],
      goal_tags: p.goals,
      supports_rd: p.goals.includes('innovation'),
      business_relevance: 'high',
      updated_at: new Date().toISOString(),
    })

    if (error) {
  console.error("FAILED:", p.name)
  console.error(error.message)
} else {
  inserted++
}
  }

  console.log("Inserted:", inserted)
}

main()