export const BEST_VALUE_POLICY_CODE = "BSC-BV";

export const BEST_VALUE_CRITERIA = [
  {
    criterionKey: "price_competitiveness",
    label: "Quoted price competitiveness",
    description: "Comparable eligible quotation price.",
    defaultWeight: 55,
  },
  {
    criterionKey: "delivery_commitment",
    label: "Delivery commitment",
    description: "Supplier delivery commitment against the package requirement.",
    defaultWeight: 15,
  },
  {
    criterionKey: "historical_price_reasonableness",
    label: "Historical price reasonableness",
    description: "Verified comparable historical-price evidence where sufficient data exists.",
    defaultWeight: 10,
  },
  {
    criterionKey: "delivery_performance",
    label: "Verified delivery performance",
    description: "Verified on-time and complete delivery evidence where sufficient data exists.",
    defaultWeight: 10,
  },
  {
    criterionKey: "quality_performance",
    label: "Verified quality and contract performance",
    description: "Evidence-backed post-award quality, pricing, and compliance evaluation history.",
    defaultWeight: 10,
  },
] as const;

export const BEST_VALUE_CRITERION_KEYS = BEST_VALUE_CRITERIA.map((criterion) => criterion.criterionKey) as [
  "price_competitiveness",
  "delivery_commitment",
  "historical_price_reasonableness",
  "delivery_performance",
  "quality_performance",
];

export type BestValueCriterionKey = (typeof BEST_VALUE_CRITERIA)[number]["criterionKey"];
export type BestValueCriterionWeight = { criterionKey: BestValueCriterionKey; weight: number };

export function getDefaultBestValueCriteria(): BestValueCriterionWeight[] {
  return BEST_VALUE_CRITERIA.map(({ criterionKey, defaultWeight }) => ({ criterionKey, weight: defaultWeight }));
}

export function validateBestValueCriteria(criteria: BestValueCriterionWeight[]) {
  const expectedKeys = new Set(BEST_VALUE_CRITERIA.map((criterion) => criterion.criterionKey));
  const suppliedKeys = criteria.map((criterion) => criterion.criterionKey);
  const hasExpectedCriteria = criteria.length === BEST_VALUE_CRITERIA.length
    && suppliedKeys.every((key) => expectedKeys.has(key))
    && new Set(suppliedKeys).size === BEST_VALUE_CRITERIA.length;
  if (!hasExpectedCriteria) return { valid: false as const, totalWeight: 0, error: "All required Best Value criteria must be supplied exactly once." };

  if (criteria.some((criterion) => !Number.isFinite(criterion.weight) || criterion.weight < 0 || criterion.weight > 100)) {
    return { valid: false as const, totalWeight: 0, error: "Each Best Value criterion weight must be between 0 and 100." };
  }

  const totalWeight = Math.round(criteria.reduce((sum, criterion) => sum + criterion.weight, 0) * 100) / 100;
  if (totalWeight !== 100) return { valid: false as const, totalWeight, error: "Best Value criteria weights must total exactly 100%." };
  return { valid: true as const, totalWeight, error: null };
}
