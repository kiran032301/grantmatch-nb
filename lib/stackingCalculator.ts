import type { ScoredGrant } from '@/lib/grantMatching'

export type StackResult = {
  selected: ScoredGrant[]
  totalEstimatedFunding: number | null
  explanation: string[]
}

function normalizeSource(source: string | null | undefined): string {
  return (source || '').trim().toLowerCase()
}

function isLoan(grant: ScoredGrant): boolean {
  const type = (grant.funding_type || grant.type || '').toLowerCase()
  return grant.repayable === true || type.includes('loan')
}

function isGrantNonRepayable(grant: ScoredGrant): boolean {
  const type = (grant.funding_type || grant.type || '').toLowerCase()
  return grant.repayable === false || type.includes('grant')
}

function maxAmount(grant: ScoredGrant): number {
  return grant.amount_max ?? 0
}

function hasGoalOverlap(a: ScoredGrant, b: ScoredGrant): boolean {
  const tagsA = Array.isArray(a.goal_tags)
    ? a.goal_tags
    : typeof a.goal_tags === 'string'
    ? a.goal_tags.replace(/[{}"]/g, '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    : []

  const tagsB = Array.isArray(b.goal_tags)
    ? b.goal_tags
    : typeof b.goal_tags === 'string'
    ? b.goal_tags.replace(/[{}"]/g, '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean)
    : []

  return tagsA.some((tag) => tagsB.includes(tag))
}

function canStack(a: ScoredGrant, b: ScoredGrant): boolean {
  if (a.id === b.id) return false

  const sourceA = normalizeSource(a.source_name)
  const sourceB = normalizeSource(b.source_name)

  // Avoid stacking obvious same-source sibling programs in v1
  if (sourceA && sourceB && sourceA === sourceB) return false

  // Avoid loan + loan stack in first version
  if (isLoan(a) && isLoan(b)) return false

  // If both are very similar funding paths, avoid stacking in v1
  if (hasGoalOverlap(a, b) && sourceA === sourceB) return false

  return true
}

function estimateTotalFunding(selected: ScoredGrant[]): number | null {
  const amounts = selected
    .map((grant) => grant.amount_max)
    .filter((amount): amount is number => typeof amount === 'number' && amount > 0)

  if (amounts.length === 0) return null
  return amounts.reduce((sum, amount) => sum + amount, 0)
}

function scoreStack(grants: ScoredGrant[]): number {
  let score = 0

  for (const grant of grants) {
    score += grant.score
    score += Math.min(maxAmount(grant) / 10000, 8)

    if (isGrantNonRepayable(grant)) score += 6
    if ((grant.business_relevance || '').toLowerCase() === 'high') score += 4
  }

  const uniqueSources = new Set(grants.map((g) => normalizeSource(g.source_name))).size
  score += uniqueSources * 3

  const hasFederal = grants.some((g) =>
  (g.provider_type || '').toLowerCase().includes('federal')
)

const hasProvincial = grants.some((g) =>
  (g.provider_type || '').toLowerCase().includes('provincial')
)

  if (hasFederal && hasProvincial) {
    score += 8
  }

  const hasAcoa = grants.some((g) => normalizeSource(g.source_name) === 'acoa')
  if (hasAcoa) {
    score += 5
  }

  return score
}
function sourceLabel(grant: ScoredGrant): string {
  return grant.source_name || grant.organization || grant.name || 'this program'
}

function isFederal(grant: ScoredGrant): boolean {
  return (grant.provider_type || '').toLowerCase().includes('federal')
}

function isProvincial(grant: ScoredGrant): boolean {
  return (grant.provider_type || '').toLowerCase().includes('provincial')
}

function hasAcoaGrant(grants: ScoredGrant[]): boolean {
  return grants.some((g) => normalizeSource(g.source_name) === 'acoa')
}

function hasNonRepayableGrant(grants: ScoredGrant[]): boolean {
  return grants.some((g) => isGrantNonRepayable(g))
}

function hasLoanGrant(grants: ScoredGrant[]): boolean {
  return grants.some((g) => isLoan(g))
}

function collectGoalTags(grants: ScoredGrant[]): string[] {
  const tags = new Set<string>()

  for (const grant of grants) {
    const goalTags = Array.isArray(grant.goal_tags)
      ? grant.goal_tags
      : typeof grant.goal_tags === 'string'
      ? grant.goal_tags
          .replace(/[{}"]/g, '')
          .split(',')
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean)
      : []

    goalTags.forEach((tag) => tags.add(tag))
  }

  return [...tags]
}

function humanizeGoal(tag: string): string {
  switch (tag) {
    case 'market_expansion':
      return 'market expansion'
    case 'r_and_d':
      return 'research and development'
    case 'product_development':
      return 'product development'
    case 'digital_adoption':
      return 'digital adoption'
    default:
      return tag.replace(/_/g, ' ')
  }
}

function buildStackExplanation(selected: ScoredGrant[], totalEstimatedFunding: number | null): string[] {
  const explanation: string[] = []

  const hasFederalSupport = selected.some((g) => isFederal(g))
  const hasProvincialSupport = selected.some((g) => isProvincial(g))
  const hasAcoa = hasAcoaGrant(selected)
  const hasNonRepayable = hasNonRepayableGrant(selected)
  const hasLoan = hasLoanGrant(selected)

  const sources = selected
    .map((g) => sourceLabel(g))
    .filter(Boolean)

  const uniqueSources = [...new Set(sources)]

  if (hasAcoa && hasProvincialSupport) {
    explanation.push(
      'This stack combines ACOA federal support with provincial funding pathways, which can create a stronger overall funding strategy when program rules allow.'
    )
  } else if (hasFederalSupport && hasProvincialSupport) {
    explanation.push(
      'This stack blends federal and provincial funding sources, which may improve overall coverage across different parts of the project.'
    )
  } else if (uniqueSources.length >= 2) {
    explanation.push(
      'These programs come from different funding sources and appear complementary rather than duplicative.'
    )
  }

  if (hasAcoa) {
    explanation.push(
      'ACOA appears to serve as a strong anchor program in this stack, especially for growth, investment, or innovation-oriented business activity.'
    )
  }

  if (hasNonRepayable && !hasLoan) {
    explanation.push(
      'This combination prioritizes non-repayable funding, helping reduce the need for repayment while supporting business growth.'
    )
  } else if (hasNonRepayable && hasLoan) {
    explanation.push(
      'This stack balances non-repayable support with broader financing options, which may help fund both strategic growth and implementation needs.'
    )
  }

  const goals = collectGoalTags(selected).slice(0, 3).map(humanizeGoal)
  if (goals.length > 0) {
    explanation.push(
      `Together, these programs appear aligned with business priorities such as ${goals.join(', ')}.`
    )
  }

  if (totalEstimatedFunding) {
    explanation.push(
      `Estimated combined maximum funding: ${new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: 'CAD',
        maximumFractionDigits: 0,
      }).format(totalEstimatedFunding)}.`
    )
  } else {
    explanation.push(
      'Combined funding amount is not fully specified across all selected programs.'
    )
  }

  explanation.push(
    'Final eligibility, stacking limits, and contribution caps depend on each program’s official rules and approval process.'
  )

  return explanation
}
export function calculateBestStack(matches: ScoredGrant[]): StackResult | null {
  if (!matches || matches.length < 2) return null

  const candidates = matches.slice(0, 5)
  let bestCombo: ScoredGrant[] | null = null
  let bestScore = -Infinity

  // Try all 2-grant stacks
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      const a = candidates[i]
      const b = candidates[j]

      if (!canStack(a, b)) continue

      const combo = [a, b]
      const comboScore = scoreStack(combo)

      if (comboScore > bestScore) {
        bestScore = comboScore
        bestCombo = combo
      }
    }
  }

  // Try all 3-grant stacks
  for (let i = 0; i < candidates.length; i++) {
    for (let j = i + 1; j < candidates.length; j++) {
      for (let k = j + 1; k < candidates.length; k++) {
        const combo = [candidates[i], candidates[j], candidates[k]]

        const valid =
          canStack(combo[0], combo[1]) &&
          canStack(combo[0], combo[2]) &&
          canStack(combo[1], combo[2])

        if (!valid) continue

        const comboScore = scoreStack(combo)

        if (comboScore > bestScore) {
          bestScore = comboScore
          bestCombo = combo
        }
      }
    }
  }

  if (!bestCombo) return null

  const totalEstimatedFunding = estimateTotalFunding(bestCombo)

  const explanation = buildStackExplanation(bestCombo, totalEstimatedFunding)

  return {
    selected: bestCombo,
    totalEstimatedFunding,
    explanation,
  }
}