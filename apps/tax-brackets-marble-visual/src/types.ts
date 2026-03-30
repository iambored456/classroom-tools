export type TaxBracketConfig = {
  id: string
  size: number
  rate: number
}

export type DeductionConfig = {
  cppRate: number
  eiRate: number
}

export type AppConfig = {
  income: number
  marbleCount: number
  deductions: DeductionConfig
  brackets: TaxBracketConfig[]
}

export type TaxBracketModel = {
  id: string
  index: number
  lowerBound: number
  upperBound: number
  size: number
  rate: number
  taxableIncome: number
  taxDollars: number
  exactGrossMarbles: number
  grossMarbles: number
  exactTaxedMarbles: number
  taxedMarbles: number
  untaxedMarbles: number
  isOverflow: boolean
}

export type TaxModel = {
  config: AppConfig
  visualMarbleCount: number
  postDeductionMarbleCount: number
  dollarsPerMarble: number
  cppContribution: number
  cpp2Contribution: number
  eiContribution: number
  deductionDollars: number
  deductionMarbles: number
  deductionRate: number
  totalTaxDollars: number
  totalTaxedMarbles: number
  totalUntaxedMarbles: number
  effectiveRate: number
  netIncome: number
  overflowIncome: number
  configuredBracketCapacity: number
  brackets: TaxBracketModel[]
}

export type Point = {
  x: number
  y: number
}

export type Bounds = {
  x: number
  y: number
  width: number
  height: number
}

export type BucketLayout = {
  index: number
  x: number
  width: number
  topY: number
  bodyBottomY: number
  tipY: number
  outlet: Point
  slotBounds: Bounds
  labelX: number
  labelY: number
  color: string
}

export type SceneLayout = {
  width: number
  height: number
  railY: number
  spout: Point
  jarBounds: Bounds
  jarSlots: Point[]
  marbleRadius: number
  deductionBucket: BucketLayout
  deductionBucketSlots: Point[]
  buckets: BucketLayout[]
  bucketSlots: Point[][]
  deductionBounds: Bounds
  deductionSlots: Point[]
  taxBounds: Bounds
  taxSlots: Point[]
  takeHomeBounds: Bounds
  takeHomeSlots: Point[]
  funnelY: number
}

export type ScenePhase =
  | 'ready-fill'
  | 'filling'
  | 'ready-tax'
  | 'taxing'
  | 'ready-take-home'
  | 'taking-home'
  | 'complete'

export type Marble = {
  id: number
  bracketIndex: number | null
  fillOrder: number
  withholdingOrder: number | null
  takeHomeOrder: number | null
  color: string
  jarSlot: Point
  bucketSlot: Point
  isDeduction: boolean
  shouldTax: boolean
  deductionCollectorSlot: Point | null
  taxCollectorSlot: Point | null
  takeHomeSlot: Point | null
  currentPosition: Point
  element: SVGCircleElement
}
