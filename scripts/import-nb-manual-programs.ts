import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const programs = [
  // ===== WORKFORCE / HIRING =====
  {
    name: "Student Employment Experience Development (SEED)",
    description: "Provides wage subsidies to employers to hire students for summer employment.",
    goal_tags: ['hiring'],
  },
  {
    name: "NB Workforce Training Program",
    description: "Supports employee training and skills development for New Brunswick businesses.",
    goal_tags: ['training'],
  },
  {
    name: "Canada-NB Job Grant",
    description: "Provides funding to train employees and improve workforce skills.",
    goal_tags: ['training', 'hiring'],
  },

  // ===== BUSINESS GROWTH =====
  {
    name: "NB Small Business Investor Tax Credit",
    description: "Encourages investment in small businesses through tax credits.",
    goal_tags: ['investment'],
  },
  {
    name: "Regional Development Corporation Strategic Assistance",
    description: "Supports economic development projects and business growth initiatives.",
    goal_tags: ['investment', 'market_expansion'],
  },
  {
    name: "Community Investment Fund",
    description: "Provides financial support for community and economic development projects.",
    goal_tags: ['investment'],
  },

  // ===== INNOVATION / TECH =====
  {
    name: "NBIF Startup Investment Fund",
    description: "Provides venture capital funding to early-stage technology companies.",
    goal_tags: ['innovation', 'investment'],
  },
  {
    name: "NBIF Innovation Voucher Fund",
    description: "Helps SMEs access R&D and technical expertise.",
    goal_tags: ['innovation', 'r_and_d'],
  },
  {
    name: "ACOA REGI Innovation Stream (NB applicable)",
    description: "Supports commercialization and innovation projects.",
    goal_tags: ['innovation', 'r_and_d'],
  },

  // ===== EXPORT / MARKET =====
  {
    name: "Export Development Program (NB)",
    description: "Supports businesses expanding into international markets.",
    goal_tags: ['export', 'market_expansion'],
  },
  {
    name: "ONB Market Development Support",
    description: "Helps companies grow through market expansion initiatives.",
    goal_tags: ['market_expansion'],
  },

  // ===== PRODUCTIVITY / EQUIPMENT =====
  {
    name: "ONB Productivity Improvement Support",
    description: "Supports investments in equipment and productivity improvements.",
    goal_tags: ['productivity', 'investment'],
  },
  {
    name: "NB Capital Investment Support",
    description: "Supports purchase of machinery and capital assets.",
    goal_tags: ['investment', 'equipment'],
  },

  // ===== TOURISM =====
  {
    name: "NB Tourism Development Program",
    description: "Supports tourism-related business growth and infrastructure.",
    goal_tags: ['market_expansion'],
  },
  {
    name: "Tourism Growth Program NB",
    description: "Helps tourism businesses expand and improve services.",
    goal_tags: ['investment'],
  },

  // ===== AGRICULTURE =====
  {
    name: "NB Agriculture Development Program",
    description: "Supports innovation and productivity in agriculture sector.",
    goal_tags: ['productivity', 'innovation'],
  },
  {
    name: "AgriInnovation Program NB",
    description: "Supports agricultural innovation and sustainability.",
    goal_tags: ['innovation', 'sustainability'],
  },

  // ===== CLEAN ENERGY =====
  {
    name: "NB Energy Efficiency Program",
    description: "Provides funding for energy efficiency improvements.",
    goal_tags: ['sustainability'],
  },
  {
    name: "Clean Energy Innovation Fund NB",
    description: "Supports clean energy and environmental innovation projects.",
    goal_tags: ['innovation', 'sustainability'],
  },

  // ===== DIGITAL / AI =====
  {
    name: "Digital Adoption Program NB",
    description: "Supports digital transformation and automation.",
    goal_tags: ['digital_adoption'],
  },
  {
    name: "AI Adoption Support NB",
    description: "Helps businesses implement AI technologies.",
    goal_tags: ['digital_adoption', 'innovation'],
  },

  // ===== STARTUP =====
  {
    name: "Startup NB Seed Funding",
    description: "Provides early-stage funding to startups.",
    goal_tags: ['innovation', 'investment'],
  },
  {
    name: "Entrepreneur Support Program NB",
    description: "Supports entrepreneurs launching new ventures.",
    goal_tags: ['innovation'],
  },

  // ===== MUNICIPAL =====
  {
    name: "Fredericton Business Development Program",
    description: "Supports local business growth in Fredericton.",
    goal_tags: ['investment'],
  },
  {
    name: "Moncton Economic Development Incentive",
    description: "Provides incentives for business expansion.",
    goal_tags: ['investment'],
  },

  // ===== EXPORT / GLOBAL =====
  {
    name: "Trade Accelerator Program NB",
    description: "Helps businesses scale internationally.",
    goal_tags: ['export'],
  },

  // ===== SPECIAL PROGRAMS =====
  {
    name: "Women Entrepreneurship Strategy (NB applicable)",
    description: "Supports women-led businesses with funding and mentorship.",
    goal_tags: ['investment'],
  },
  {
    name: "Indigenous Business Development Program NB",
    description: "Supports Indigenous entrepreneurs and businesses.",
    goal_tags: ['investment'],
  },
  {
    name: "Youth Entrepreneurship Program NB",
    description: "Supports young entrepreneurs starting businesses.",
    goal_tags: ['innovation'],
  },
]

async function main() {
  let inserted = 0

  for (const p of programs) {
    const { error } = await supabase.from('grants').insert({
      name: p.name,
      organization: 'Government of New Brunswick / Partners',
      description: p.description,
      short_description: p.description,
      eligibility: 'See official program website for eligibility.',
      eligibility_summary: 'See official program website.',
      amount_min: null,
      amount_max: null,
      type: 'grant',
      funding_type: 'grant',
      provider_type: 'government',
      repayable: false,
      intake_status: 'open',
      url: '',
      source_name: 'NB-MANUAL',
      source_url: '',
      source_program_id: p.name.toLowerCase().replace(/\s+/g, '-'),
      verification_status: 'review_pending',
      is_active: false,
      last_verified_at: new Date().toISOString(),
      industry_tags: ['general'],
      stage_tags: ['startup', 'growth', 'established'],
      goal_tags: p.goal_tags,
      supports_rd: p.goal_tags.includes('innovation'),
      business_relevance: 'high',
      updated_at: new Date().toISOString(),
    })

    if (!error) inserted++
  }

  console.log("Inserted:", inserted)
}

main()