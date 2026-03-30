import type { AppConfig, DeductionConfig, TaxBracketConfig, TaxBracketModel, TaxModel } from './types.ts'

type TaxSlice = {
  lower: number
  upper: number | null
  rate: number
}

const CPP_BASIC_EXEMPTION_2026 = 3_500
const CPP_YMPE_2026 = 74_600
const CPP2_YAMPE_2026 = 85_000
const CPP2_RATE_2026 = 4
const EI_MAX_INSURABLE_EARNINGS_2026 = 68_900

export const FEDERAL_TAX_BRACKETS_2026: readonly TaxSlice[] = [
  { lower: 0, upper: 58_523, rate: 14 },
  { lower: 58_523, upper: 117_045, rate: 20.5 },
  { lower: 117_045, upper: 181_440, rate: 26 },
  { lower: 181_440, upper: 258_482, rate: 29 },
  { lower: 258_482, upper: null, rate: 33 },
]

export const ONTARIO_TAX_BRACKETS_2026: readonly TaxSlice[] = [
  { lower: 0, upper: 53_891, rate: 5.05 },
  { lower: 53_891, upper: 107_785, rate: 9.15 },
  { lower: 107_785, upper: 150_000, rate: 11.16 },
  { lower: 150_000, upper: 220_000, rate: 12.16 },
  { lower: 220_000, upper: null, rate: 13.16 },
]

const DEFAULT_BRACKETS: TaxBracketConfig[] = [
  { id: 'bracket-1', size: 58_523, rate: 14 },
  { id: 'bracket-2', size: 58_522, rate: 20.5 },
  { id: 'bracket-3', size: 64_395, rate: 26 },
  { id: 'bracket-4', size: 77_042, rate: 29 },
  { id: 'bracket-5', size: 10_000_000, rate: 33 },
]

export const DEFAULT_CONFIG: AppConfig = {
  income: 100_000,
  marbleCount: 200,
  deductions: {
    cppRate: 5.95,
    eiRate: 1.63,
  },
  brackets: DEFAULT_BRACKETS,
}

let nextBracketId = DEFAULT_BRACKETS.length + 1

export function createBracket(): TaxBracketConfig {
  const id = `bracket-${nextBracketId}`
  nextBracketId += 1
  return {
    id,
    size: 20_000,
    rate: 25,
  }
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

function sanitizeBracket(bracket: TaxBracketConfig, index: number): TaxBracketConfig {
  return {
    id: typeof bracket.id === 'string' && bracket.id.length > 0 ? bracket.id : `bracket-${index + 1}`,
    size: Math.round(clampNumber(bracket.size, 1, 10_000_000)),
    rate: Math.round(clampNumber(bracket.rate, 0, 100) * 100) / 100,
  }
}

function sanitizeDeductions(deductions: DeductionConfig | null | undefined): DeductionConfig {
  return {
    cppRate: Math.round(clampNumber(deductions?.cppRate ?? DEFAULT_CONFIG.deductions.cppRate, 0, 100) * 100) / 100,
    eiRate: Math.round(clampNumber(deductions?.eiRate ?? DEFAULT_CONFIG.deductions.eiRate, 0, 100) * 100) / 100,
  }
}

export function sanitizeConfig(input: AppConfig | null | undefined): AppConfig {
  const base = input ?? DEFAULT_CONFIG
  const brackets =
    Array.isArray(base.brackets) && base.brackets.length === DEFAULT_BRACKETS.length
      ? base.brackets
      : DEFAULT_BRACKETS

  return {
    income: Math.round(clampNumber(base.income, 0, 10_000_000)),
    marbleCount: Math.round(clampNumber(base.marbleCount, 10, 480)),
    deductions: sanitizeDeductions(base.deductions),
    brackets: brackets.map(sanitizeBracket),
  }
}

function computeTaxWithinInterval(start: number, end: number, slices: readonly TaxSlice[]): number {
  if (end <= start) return 0

  let total = 0

  slices.forEach((slice) => {
    const sliceUpper = slice.upper ?? end
    const overlap = Math.max(0, Math.min(end, sliceUpper) - Math.max(start, slice.lower))
    if (overlap <= 0) return
    total += overlap * (slice.rate / 100)
  })

  return total
}

function largestRemainderAllocation(
  exacts: number[],
  target: number,
  capacities: number[] = [],
): number[] {
  const allocations = exacts.map((value, index) => {
    const floor = Math.max(0, Math.floor(value + 1e-9))
    const capacity = capacities[index]
    return Number.isFinite(capacity) ? Math.min(floor, capacity) : floor
  })

  let remaining = Math.max(0, target - allocations.reduce((sum, value) => sum + value, 0))

  const remainderOrder = exacts
    .map((value, index) => ({
      index,
      remainder: value - Math.floor(value + 1e-9),
      exact: value,
    }))
    .sort((left, right) => {
      if (right.remainder !== left.remainder) return right.remainder - left.remainder
      return right.exact - left.exact
    })

  while (remaining > 0) {
    let advanced = false

    for (const candidate of remainderOrder) {
      const capacity = capacities[candidate.index]
      if (Number.isFinite(capacity) && allocations[candidate.index] >= capacity) {
        continue
      }
      allocations[candidate.index] += 1
      remaining -= 1
      advanced = true
      if (remaining === 0) break
    }

    if (!advanced) break
  }

  return allocations
}

export function computeTaxModel(configInput: AppConfig): TaxModel {
  const config = sanitizeConfig(configInput)
  const visualMarbleCount = config.income > 0 ? config.marbleCount : 0
  const dollarsPerMarble = visualMarbleCount > 0 ? config.income / visualMarbleCount : 0
  const cppRateFraction = config.deductions.cppRate / 100
  const eiRateFraction = config.deductions.eiRate / 100
  const cppPensionableEarnings = clampNumber(
    config.income - CPP_BASIC_EXEMPTION_2026,
    0,
    CPP_YMPE_2026 - CPP_BASIC_EXEMPTION_2026,
  )
  const cppContribution = cppPensionableEarnings * cppRateFraction
  const cpp2PensionableEarnings = clampNumber(config.income - CPP_YMPE_2026, 0, CPP2_YAMPE_2026 - CPP_YMPE_2026)
  const cpp2Contribution = cpp2PensionableEarnings * (CPP2_RATE_2026 / 100)
  const eiInsurableEarnings = clampNumber(config.income, 0, EI_MAX_INSURABLE_EARNINGS_2026)
  const eiContribution = eiInsurableEarnings * eiRateFraction
  const deductionDollars = cppContribution + cpp2Contribution + eiContribution
  const deductionRate = config.income > 0 ? deductionDollars / config.income : 0
  const exactDeductionMarbles = dollarsPerMarble > 0 ? deductionDollars / dollarsPerMarble : 0
  const deductionMarbles = clampNumber(Math.round(exactDeductionMarbles), 0, visualMarbleCount)
  const postDeductionMarbleCount = Math.max(0, visualMarbleCount - deductionMarbles)
  const configuredBracketCapacity = config.brackets.reduce((sum, bracket) => sum + bracket.size, 0)
  const overflowIncome = Math.max(0, config.income - configuredBracketCapacity)

  const bracketConfigs: Array<TaxBracketConfig & { isOverflow: boolean }> = config.brackets.map((bracket, index) => ({
    ...bracket,
    isOverflow: index === config.brackets.length - 1,
  }))

  let lowerBound = 0
  let remainingIncome = config.income
  let totalTaxDollars = 0

  const bracketDrafts = bracketConfigs.map((bracket, index) => {
    const taxableIncome = Math.min(Math.max(remainingIncome, 0), bracket.size)
    const segmentEnd = lowerBound + taxableIncome
    const upperBound = lowerBound + bracket.size
    const taxDollars =
      computeTaxWithinInterval(lowerBound, segmentEnd, FEDERAL_TAX_BRACKETS_2026) +
      computeTaxWithinInterval(lowerBound, segmentEnd, ONTARIO_TAX_BRACKETS_2026)
    totalTaxDollars += taxDollars
    remainingIncome -= taxableIncome

    const exactGrossMarbles =
      config.income > 0 && postDeductionMarbleCount > 0 ? (taxableIncome / config.income) * postDeductionMarbleCount : 0
    const exactTaxedMarbles =
      config.income > 0 && visualMarbleCount > 0 ? (taxDollars / config.income) * visualMarbleCount : 0

    const draft = {
      id: bracket.id,
      index,
      lowerBound,
      upperBound,
      size: bracket.size,
      rate: bracket.rate,
      taxableIncome,
      taxDollars,
      exactGrossMarbles,
      exactTaxedMarbles,
      isOverflow: bracket.isOverflow,
    }

    lowerBound = upperBound
    return draft
  })

  const grossAllocations = largestRemainderAllocation(
    bracketDrafts.map((bracket) => bracket.exactGrossMarbles),
    postDeductionMarbleCount,
  )

  const exactTotalTaxedMarbles = dollarsPerMarble > 0 ? totalTaxDollars / dollarsPerMarble : 0
  const taxedTarget = Math.min(postDeductionMarbleCount, Math.max(0, Math.round(exactTotalTaxedMarbles)))
  const taxedAllocations = largestRemainderAllocation(
    bracketDrafts.map((bracket) => bracket.exactTaxedMarbles),
    taxedTarget,
    grossAllocations,
  )

  const brackets: TaxBracketModel[] = bracketDrafts.map((bracket, index) => {
    const grossMarbles = grossAllocations[index] ?? 0
    const taxedMarbles = taxedAllocations[index] ?? 0
    return {
      ...bracket,
      grossMarbles,
      taxedMarbles,
      untaxedMarbles: Math.max(0, grossMarbles - taxedMarbles),
    }
  })

  const totalTaxedMarbles = taxedAllocations.reduce((sum, value) => sum + value, 0)
  const totalGrossMarbles = grossAllocations.reduce((sum, value) => sum + value, 0)

  return {
    config,
    visualMarbleCount,
    postDeductionMarbleCount,
    dollarsPerMarble,
    cppContribution,
    cpp2Contribution,
    eiContribution,
    deductionDollars,
    deductionMarbles,
    deductionRate,
    totalTaxDollars,
    totalTaxedMarbles,
    totalUntaxedMarbles: totalGrossMarbles - totalTaxedMarbles,
    effectiveRate: config.income > 0 ? totalTaxDollars / config.income : 0,
    netIncome: Math.max(0, config.income - deductionDollars - totalTaxDollars),
    overflowIncome,
    configuredBracketCapacity,
    brackets,
  }
}

export function formatCurrency(value: number): string {
  const roundedValue = Math.round(value * 100) / 100
  const hasCents = Math.abs(roundedValue - Math.round(roundedValue)) > 0.000001
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(roundedValue)
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatBracketRange(lower: number, upper: number, isOverflow: boolean): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })

  if (isOverflow) {
    return `${formatter.format(lower)}+`
  }

  return `${formatter.format(lower)} to ${formatter.format(upper)}`
}
