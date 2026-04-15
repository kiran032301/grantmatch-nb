export type Profile = {
  id: string
  business_name: string | null
  industry: string | null
  stage: string | null
  employees: number | null
  does_rd: boolean | null
  goal: string | null
  funding_preference?: string | null

  business_location?: string | null
  expansion_investment?: string | null
  funding_need_type?: string | null
  innovation_depth?: string | null
  ownership_type?: string | null
}

export type Grant = {
  id: string
  name: string | null
  name_fr?: string | null
  organization: string | null
  amount_min: number | null
  amount_max: number | null
  type: string | null
  funding_type?: string | null
  provider_type?: string | null
  repayable: boolean | null
  description: string | null
  description_fr?: string | null
  short_description?: string | null
  eligibility: string | null
  eligibility_summary?: string | null
  industry_tags?: string[] | string | null
  stage_tags?: string[] | string | null
  goal_tags?: string[] | string | null
  supports_rd?: boolean | null
  intake_status: string | null
  url: string | null
  is_active?: boolean | null
  sort_priority?: number | null
  last_verified_at?: string | null
  verification_status?: string | null
  business_relevance?: 'high' | 'medium' | 'low' | string | null
  source_name?: string | null
}

export type ScoredGrant = Grant & {
  score: number
  matchPercent: number
  matchLabel: string
  reasons: string[]
  scoreBreakdown: {
    industry: number
    goal: number
    stage: number
    rd: number
    fundingType: number
    fundingPreference: number
    intake: number
    verification: number
    businessRelevance: number
    sourceTrust: number
    priorityAdjustment: number
    coreProgramBoost: number
    strictIndustryPenalty: number
    location: number
    expansionInvestment: number
    fundingNeedType: number
    innovationDepth: number
    ownershipType: number
  }
}

const WEIGHTS = {
  industry: 25,
  stage: 15,
  goal: 20,
  does_rd: 10,
  funding_preference: 5,

  location: 5,
  expansion_investment: 5,
  funding_need_type: 5,
  innovation_depth: 5,
  ownership_type: 5,

  fundingTypeGrantBonus: 6,
  fundingTypeLoanPenalty: -2,

  intakeOpen: 8,
  intakeRolling: 6,
  intakeUpcoming: 3,

  verification: 4,

  businessRelevanceHigh: 8,
  businessRelevanceMedium: 4,

  sourceTrustProvincial: 6,
  sourceTrustInnovation: 5,
  sourceTrustVerified: 4,
}

const MIN_MATCH_SCORE = 24

const CORE_PROGRAM_BOOST = [
  'job grant',
  'productivity',
  'investment fund',
  'innovation voucher',
  'canexport',
  'irap',
  'writers',
  'film',
  'museum',
  'publishing',
]

export function toMatchPercent(rawScore: number): number {
  const minScore = 24
  const maxScore = 120

  if (rawScore <= minScore) return 35
  if (rawScore >= maxScore) return 98

  const normalized = 35 + ((rawScore - minScore) / (maxScore - minScore)) * 63
  return Math.round(normalized)
}

export function getMatchLabel(percent: number): string {
  if (percent >= 90) return 'Excellent Match'
  if (percent >= 75) return 'Strong Match'
  if (percent >= 60) return 'Good Match'
  if (percent >= 45) return 'Possible Fit'
  return 'Low Match'
}

function scoreLocation(profile: Profile, grant: Grant): number {
  const location = (profile.business_location || '').toLowerCase()
  const text = `${grant.name || ''} ${grant.description || ''} ${grant.eligibility || ''}`.toLowerCase()

  if (!location || location.includes('outside')) return 0

  if (
    location.includes('new brunswick') ||
    location.includes('fredericton') ||
    location.includes('moncton') ||
    location.includes('saint john')
  ) {
    if (text.includes('new brunswick') || text.includes('nb')) {
      return WEIGHTS.location
    }
  }

  return 0
}

function scoreExpansionInvestment(profile: Profile, grant: Grant): number {
  const value = profile.expansion_investment || ''
  const text = `${grant.name || ''} ${grant.description || ''} ${grant.eligibility || ''}`.toLowerCase()

  if (value === 'Yes') {
    if (
      text.includes('capital') ||
      text.includes('equipment') ||
      text.includes('expansion') ||
      text.includes('investment')
    ) {
      return WEIGHTS.expansion_investment
    }
  }

  if (value === 'Not sure') {
    return Math.round(WEIGHTS.expansion_investment / 2)
  }

  return 0
}

function scoreFundingNeedType(profile: Profile, grant: Grant): number {
  const wanted = (profile.funding_need_type || '').toLowerCase()
  const type = `${grant.funding_type || ''} ${grant.type || ''}`.toLowerCase()
  const name = (grant.name || '').toLowerCase()

  if (!wanted || wanted === 'not sure') {
    return Math.round(WEIGHTS.funding_need_type / 2)
  }

  if (wanted === 'grant' && (type.includes('grant') || grant.repayable === false)) {
    return WEIGHTS.funding_need_type
  }

  if (wanted === 'loan' && (type.includes('loan') || grant.repayable === true)) {
    return WEIGHTS.funding_need_type
  }

  if (wanted === 'investment' && (name.includes('capital') || name.includes('investment'))) {
    return WEIGHTS.funding_need_type
  }

  if (wanted === 'tax credit' && type.includes('tax')) {
    return WEIGHTS.funding_need_type
  }

  return 0
}

function scoreInnovationDepth(profile: Profile, grant: Grant): number {
  const value = profile.innovation_depth || ''
  const text = `${grant.name || ''} ${grant.description || ''} ${grant.eligibility || ''}`.toLowerCase()

  if (
    text.includes('innovation') ||
    text.includes('technology') ||
    text.includes('research') ||
    text.includes('commercialization')
  ) {
    if (value === 'Yes - core focus') return WEIGHTS.innovation_depth
    if (value === 'Some innovation') return Math.round(WEIGHTS.innovation_depth * 0.7)
  }

  return 0
}

function scoreOwnershipType(profile: Profile, grant: Grant): number {
  const value = (profile.ownership_type || '').toLowerCase()
  const text = `${grant.name || ''} ${grant.description || ''} ${grant.eligibility || ''}`.toLowerCase()

  if (value.includes('women') && (text.includes('women') || text.includes('gender'))) {
    return WEIGHTS.ownership_type
  }

  if (value.includes('indigenous') && text.includes('indigenous')) {
    return WEIGHTS.ownership_type
  }

  if (value.includes('youth') && text.includes('youth')) {
    return WEIGHTS.ownership_type
  }

  return 0
}

function normalizeTags(tags: string[] | string | null | undefined): string[] {
  if (!tags) return []

  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean)
  }

  if (typeof tags === 'string') {
    return tags
      .replace(/[{}"]/g, '')
      .split(',')
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
  }

  return []
}

function normalizeIndustry(industry: string | null): string[] {
  if (!industry) return []

  const value = industry.toLowerCase()
  const tags = new Set<string>()

  if (value.includes('technology') || value.includes('software') || value.includes('it')) {
    tags.add('technology')
  }

  if (value.includes('manufacturing')) tags.add('manufacturing')
  if (value.includes('agriculture')) tags.add('agriculture')
  if (value.includes('health')) tags.add('health')
  if (value.includes('retail')) tags.add('retail')
  if (value.includes('hospitality')) tags.add('hospitality')
  if (value.includes('tourism')) tags.add('tourism')
  if (value.includes('construction')) tags.add('construction')
  if (value.includes('professional')) tags.add('professional_services')
  if (value.includes('food')) tags.add('food_processing')

  if (value.includes('clean') || value.includes('energy') || value.includes('cleantech')) {
    tags.add('clean_energy')
  }

  if (value.includes('fisher')) tags.add('fisheries')
  if (value.includes('forest')) tags.add('forestry')
  if (value.includes('transport')) tags.add('transport')
  if (value.includes('mining')) tags.add('mining')
  if (value.includes('industrial')) tags.add('manufacturing')

  if (value.includes('media')) tags.add('media')
  if (value.includes('creative')) tags.add('creative')
  if (value.includes('culture')) tags.add('culture')
  if (value.includes('arts')) tags.add('arts')
  if (value.includes('heritage')) tags.add('heritage')

  if (
    value.includes('arts, culture') ||
    value.includes('arts & culture') ||
    value.includes('arts, culture & creative industries')
  ) {
    tags.add('culture')
    tags.add('media')
    tags.add('creative')
    tags.add('heritage')
    tags.add('arts')
  }

  if (value.includes('general')) tags.add('general')

  if (tags.size === 0) tags.add(value.trim())

  return Array.from(tags)
}

function normalizeStage(stage: string | null): string[] {
  if (!stage) return []

  const value = stage.toLowerCase()
  const tags = new Set<string>()

  if (value.includes('idea')) tags.add('idea')
  if (value.includes('pre-revenue')) tags.add('idea')
  if (value.includes('startup')) tags.add('startup')
  if (value.includes('early')) tags.add('startup')
  if (value.includes('growth')) tags.add('growth')
  if (value.includes('scale')) tags.add('growth')
  if (value.includes('established')) tags.add('established')
  if (value.includes('mature')) tags.add('established')

  if (tags.size === 0) tags.add(value.trim())

  return Array.from(tags)
}

function normalizeGoal(goal: string | null): string[] {
  if (!goal) return []

  const value = goal.toLowerCase()
  const tags = new Set<string>()

  if (value.includes('hire') || value.includes('hiring') || value.includes('staff')) {
    tags.add('hiring')
  }
  if (value.includes('training')) tags.add('training')

  if (value.includes('equipment') || value.includes('machinery') || value.includes('capital')) {
    tags.add('equipment')
    tags.add('investment')
  }

  if (value.includes('r&d') || value.includes('research') || value.includes('innovation')) {
    tags.add('r_and_d')
    tags.add('innovation')
    tags.add('product_development')
  }

  if (value.includes('commercialization')) {
    tags.add('r_and_d')
    tags.add('product_development')
  }

  if (value.includes('export')) {
    tags.add('export')
    tags.add('market_expansion')
  }

  if (value.includes('growth') || value.includes('expand') || value.includes('expansion')) {
    tags.add('market_expansion')
    tags.add('investment')
  }

  if (value.includes('digital') || value.includes('automation') || value.includes('ai')) {
    tags.add('digital_adoption')
    tags.add('productivity')
  }

  if (value.includes('product')) tags.add('product_development')

  if (value.includes('energy')) {
    tags.add('energy_efficiency')
    tags.add('sustainability')
  }

  if (value.includes('sustainab')) tags.add('sustainability')
  if (value.includes('working capital')) tags.add('working_capital')
  if (value.includes('productivity')) tags.add('productivity')

  if (
    value.includes('creative') ||
    value.includes('arts') ||
    value.includes('culture') ||
    value.includes('publishing') ||
    value.includes('film') ||
    value.includes('media')
  ) {
    tags.add('product_development')
    tags.add('market_expansion')
  }

  if (tags.size === 0) tags.add(value.trim())

  return Array.from(tags)
}

function getGrantFundingType(grant: Grant): string {
  return (grant.funding_type || grant.type || 'program').toLowerCase()
}

function getSearchableText(grant: Grant): string {
  return [
    grant.name,
    grant.organization,
    grant.description,
    grant.short_description,
    grant.eligibility,
    grant.eligibility_summary,
    grant.type,
    grant.funding_type,
    grant.source_name,
    grant.business_relevance,
    ...normalizeTags(grant.industry_tags),
    ...normalizeTags(grant.goal_tags),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

function overlapScore(profileTags: string[], grantTags: string[], maxWeight: number): number {
  if (profileTags.length === 0 || grantTags.length === 0) return 0

  const matches = profileTags.filter((tag) => grantTags.includes(tag))
  if (matches.length === 0) return 0

  if (matches.length >= 2) return maxWeight
  return Math.round(maxWeight * 0.65)
}

function getFundingPreferenceScore(profile: Profile, grant: Grant): number {
  const preference = (profile.funding_preference || '').toLowerCase()
  const grantFundingType = getGrantFundingType(grant)
  const isLoan = grant.repayable === true || grantFundingType.includes('loan')
  const isGrant = grant.repayable === false || grantFundingType.includes('grant')

  if (!preference) return 0

  if (preference.includes('grants only')) {
    if (isGrant) return 4
    if (isLoan) return -12
    return 0
  }

  if (preference.includes('prefer grants')) {
    if (isGrant) return 3
    if (isLoan) return -5
    return 0
  }

  if (preference.includes('open to both')) {
    if (isGrant) return 1
    if (isLoan) return 0
    return 0
  }

  return 0
}

function getBusinessRelevanceScore(grant: Grant): number {
  const relevance = (grant.business_relevance || '').toLowerCase()

  if (relevance === 'high') return WEIGHTS.businessRelevanceHigh
  if (relevance === 'medium') return WEIGHTS.businessRelevanceMedium
  return 0
}

function getSourceTrustScore(grant: Grant): number {
  const source = (grant.source_name || '').toLowerCase()

  if (source === 'gnb' || source === 'onb') return WEIGHTS.sourceTrustProvincial
  if (source === 'nbif') return WEIGHTS.sourceTrustInnovation
  if (source === 'nb-verified') return WEIGHTS.sourceTrustVerified
  return 0
}

function isGrantLive(grant: Grant): boolean {
  return grant.is_active === true && (grant.verification_status || '').toLowerCase() === 'verified'
}

export function scoreGrant(profile: Profile, grant: Grant): ScoredGrant {
  let score = 0
  const reasons: string[] = []

  const profileIndustries = normalizeIndustry(profile.industry)
  const profileStages = normalizeStage(profile.stage)
  const profileGoals = normalizeGoal(profile.goal)

  const grantIndustries = normalizeTags(grant.industry_tags)
  const grantStages = normalizeTags(grant.stage_tags)
  const grantGoals = normalizeTags(grant.goal_tags)
  const searchableText = getSearchableText(grant)
  const grantFundingType = getGrantFundingType(grant)

  let industryScore = overlapScore(profileIndustries, grantIndustries, WEIGHTS.industry)

  const profileIsArtsCulture = profileIndustries.some((tag) =>
    ['culture', 'media', 'creative', 'heritage', 'arts'].includes(tag)
  )

  const grantLooksArtsCulture =
    grantIndustries.some((tag) =>
      ['culture', 'media', 'creative', 'heritage', 'arts'].includes(tag)
    ) ||
    searchableText.includes('culture') ||
    searchableText.includes('creative') ||
    searchableText.includes('heritage') ||
    searchableText.includes('museum') ||
    searchableText.includes('writer') ||
    searchableText.includes('publisher') ||
    searchableText.includes('film') ||
    searchableText.includes('television') ||
    searchableText.includes('new media') ||
    searchableText.includes('art ')

  if (industryScore === 0 && profileIsArtsCulture && grantLooksArtsCulture) {
    industryScore = Math.round(WEIGHTS.industry * 0.85)
  }

  if (industryScore > 0) {
    score += industryScore

    if (!grantIndustries.includes('general')) {
      reasons.push(`This program is designed for ${profile.industry} businesses like yours.`)
    } else {
      reasons.push('Widely applicable across different business types.')
    }
  } else if (grantIndustries.includes('general')) {
    industryScore = Math.round(WEIGHTS.industry * 0.1)
    score += industryScore
    reasons.push('Widely applicable across different business types.')
  }

  const stageScore = overlapScore(profileStages, grantStages, WEIGHTS.stage)
  if (stageScore > 0) {
    score += stageScore
    reasons.push(`It is well suited for a ${profile.stage} stage business.`)
  }

  let goalScore = overlapScore(profileGoals, grantGoals, WEIGHTS.goal)

  if (goalScore === 0 && profileIsArtsCulture && grantLooksArtsCulture) {
    goalScore = Math.round(WEIGHTS.goal * 0.4)
  }

  if (goalScore > 0) {
    score += goalScore
    reasons.push(`This program supports your goal of ${profile.goal}.`)
  }

  let rdScore = 0
  if (profile.does_rd === true && grant.supports_rd) {
    rdScore = WEIGHTS.does_rd
    score += rdScore
    reasons.push('This program may support innovation or R&D initiatives.')
  } else if (profile.does_rd === true && grantGoals.includes('r_and_d')) {
    rdScore = WEIGHTS.does_rd
    score += rdScore
    reasons.push('This program may support innovation or R&D initiatives.')
  } else if (
    profile.does_rd === true &&
    (
      searchableText.includes('r&d') ||
      searchableText.includes('research') ||
      searchableText.includes('innovation')
    )
  ) {
    rdScore = Math.round(WEIGHTS.does_rd / 2)
    score += rdScore
    reasons.push('This program may support innovation or R&D initiatives.')
  }

  let fundingTypeScore = 0
  if (grant.repayable === false || grantFundingType.includes('grant')) {
    fundingTypeScore = WEIGHTS.fundingTypeGrantBonus
    score += fundingTypeScore
    reasons.push('This is non-repayable funding, so you don’t need to pay it back.')
  } else if (grant.repayable === true || grantFundingType.includes('loan')) {
    fundingTypeScore = WEIGHTS.fundingTypeLoanPenalty
    score += fundingTypeScore
  }

  const fundingPreferenceScore = getFundingPreferenceScore(profile, grant)
  score += fundingPreferenceScore

  if (fundingPreferenceScore > 0) {
    reasons.push('This aligns with your preferred type of funding.')
  } else if (fundingPreferenceScore < 0) {
    reasons.push('Less aligned with your funding preference.')
  }

  let intakeScore = 0
  const intake = (grant.intake_status || '').toLowerCase()
  if (intake === 'open') {
    intakeScore = WEIGHTS.intakeOpen
    score += intakeScore
    reasons.push('Applications are currently open, so you can apply now.')
  } else if (intake === 'rolling') {
    intakeScore = WEIGHTS.intakeRolling
    score += intakeScore
    reasons.push('This program accepts applications on a rolling basis.')
  } else if (intake === 'upcoming') {
    intakeScore = WEIGHTS.intakeUpcoming
    score += intakeScore
    reasons.push('This program will be opening for applications soon.')
  }

  let verificationScore = 0
  if ((grant.verification_status || '').toLowerCase() === 'verified') {
    verificationScore = WEIGHTS.verification
    score += verificationScore
  }

  const businessRelevanceScore = getBusinessRelevanceScore(grant)
  score += businessRelevanceScore
  if (businessRelevanceScore >= WEIGHTS.businessRelevanceHigh) {
    reasons.push('Highly relevant for business growth and funding.')
  } else if (businessRelevanceScore > 0) {
    reasons.push('Relevant for business funding and development.')
  }

  const sourceTrustScore = getSourceTrustScore(grant)
  score += sourceTrustScore

  let priorityAdjustment = 0
  if (typeof grant.sort_priority === 'number') {
    if (grant.sort_priority <= 10) priorityAdjustment = 4
    else if (grant.sort_priority <= 20) priorityAdjustment = 3
    else if (grant.sort_priority <= 50) priorityAdjustment = 1
    else if (grant.sort_priority >= 200) priorityAdjustment = -2

    score += priorityAdjustment
  }

  let coreProgramBoost = 0
  const name = (grant.name || '').toLowerCase()
  if (CORE_PROGRAM_BOOST.some((keyword) => name.includes(keyword))) {
    coreProgramBoost = 15
    score += coreProgramBoost
  }

  let strictIndustryPenalty = 0
  const strictIndustryMismatch =
    grantIndustries.length > 0 &&
    !grantIndustries.includes('general') &&
    !profileIndustries.some((i) => grantIndustries.includes(i))

  const relaxPenaltyForArtsCulture =
    profileIsArtsCulture && grantLooksArtsCulture

  if (strictIndustryMismatch && !relaxPenaltyForArtsCulture) {
    strictIndustryPenalty = -40
    score += strictIndustryPenalty
  }

  const nameLower = (grant.name || '').toLowerCase()
  if (
    (nameLower.includes('cleantech') || nameLower.includes('energy')) &&
    !profileIndustries.includes('clean_energy')
  ) {
    score -= 50
  }

  const locationScore = scoreLocation(profile, grant)
  const expansionInvestmentScore = scoreExpansionInvestment(profile, grant)
  const fundingNeedTypeScore = scoreFundingNeedType(profile, grant)
  const innovationDepthScore = scoreInnovationDepth(profile, grant)
  const ownershipTypeScore = scoreOwnershipType(profile, grant)

  score += locationScore
  if (locationScore > 0) {
    reasons.push('Relevant to your business location in New Brunswick.')
  }

  score += expansionInvestmentScore
  if (expansionInvestmentScore > 0) {
    reasons.push('Supports business expansion or investment plans.')
  }

  score += fundingNeedTypeScore
  if (fundingNeedTypeScore > 0) {
    reasons.push('Matches your preferred type of funding.')
  }

  score += innovationDepthScore
  if (innovationDepthScore > 0) {
    reasons.push('Supports innovation or technology development.')
  }

  score += ownershipTypeScore
  if (ownershipTypeScore > 0) {
    reasons.push('Relevant to your business ownership profile.')
  }

  const finalReasons = reasons.slice(0, 3)
  const matchPercent = toMatchPercent(score)
  const matchLabel = getMatchLabel(matchPercent)

  return {
    ...grant,
    score,
    matchPercent,
    matchLabel,
    reasons: finalReasons,
    scoreBreakdown: {
      industry: industryScore,
      goal: goalScore,
      stage: stageScore,
      rd: rdScore,
      fundingType: fundingTypeScore,
      fundingPreference: fundingPreferenceScore,
      intake: intakeScore,
      verification: verificationScore,
      businessRelevance: businessRelevanceScore,
      sourceTrust: sourceTrustScore,
      priorityAdjustment,
      coreProgramBoost,
      strictIndustryPenalty,
      location: locationScore,
      expansionInvestment: expansionInvestmentScore,
      fundingNeedType: fundingNeedTypeScore,
      innovationDepth: innovationDepthScore,
      ownershipType: ownershipTypeScore,
    },
  }
}

export function scoreAndRankGrants(profile: Profile, grants: Grant[]): ScoredGrant[] {
  return grants
    .filter(isGrantLive)
    .map((grant) => scoreGrant(profile, grant))
    .filter((grant) => grant.score >= MIN_MATCH_SCORE)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score

      if (b.matchPercent !== a.matchPercent) return b.matchPercent - a.matchPercent

      if (a.repayable !== b.repayable) {
        return a.repayable ? 1 : -1
      }

      const aPriority = a.sort_priority ?? 999
      const bPriority = b.sort_priority ?? 999
      if (aPriority !== bPriority) return aPriority - bPriority

      const aAmount = a.amount_max ?? 0
      const bAmount = b.amount_max ?? 0
      return bAmount - aAmount
    })
}