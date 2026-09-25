export const SUPPLIER_EVALUATION_AUDIENCES = ["end_user", "procurement_office"] as const;
export type SupplierEvaluationAudience = (typeof SUPPLIER_EVALUATION_AUDIENCES)[number];

export type SupplierEvaluationCriterion = { key: string; section: string; label: string };

export const END_USER_EVALUATION_CRITERIA: SupplierEvaluationCriterion[] = [
  { key: "quality_standards", section: "Quality of products/services", label: "The products/services met our quality standards." },
  { key: "delivery_term", section: "Quality of products/services", label: "The products/services were delivered following the delivery term specified." },
  { key: "accuracy_completeness", section: "Quality of products/services", label: "The products/services were accurate and complete according to the specifications." },
  { key: "responsiveness", section: "Communication and responsiveness", label: "The supplier is responsive to inquiries and requests for information." },
  { key: "issue_resolution", section: "Communication and responsiveness", label: "The supplier is willing to address issues and provide solutions." },
  { key: "communication", section: "Communication and responsiveness", label: "The supplier provides clear and concise communication throughout the ordering process." },
  { key: "competitive_pricing", section: "Cost and pricing", label: "The supplier offers competitive pricing of the products/services." },
  { key: "cost_justification", section: "Cost and pricing", label: "The products/services justify the cost." },
  { key: "recommend_supplier", section: "Overall satisfaction", label: "I would recommend this supplier to others within the institution." },
];

export const PROCUREMENT_OFFICE_EVALUATION_CRITERIA: SupplierEvaluationCriterion[] = [
  { key: "rfq_timeliness", section: "Procurement Office assessment", label: "Responds to the Request for Quotation (RFQ) within the specified date." },
  { key: "competitive_price", section: "Procurement Office assessment", label: "Products are offered at a competitive price compared with other suppliers/bidders." },
  { key: "specification_conformance", section: "Procurement Office assessment", label: "Offer conforms to product sample/specification requirements." },
  { key: "documentary_requirements", section: "Procurement Office assessment", label: "The supplier submits all prescribed documentary requirements within 1–2 days upon request or coordination by the Procurement Officer." },
  { key: "delivery_term", section: "Procurement Office assessment", label: "Delivers the goods following the delivery term specified in the Purchase Order/Contract." },
];

export const SUPPLIER_EVALUATION_RATINGS = [
  { score: 4, label: "Strongly Agree" },
  { score: 3, label: "Agree" },
  { score: 2, label: "Disagree" },
  { score: 1, label: "Strongly Disagree" },
] as const;

export function criteriaForSupplierEvaluation(audience: SupplierEvaluationAudience) {
  return audience === "end_user" ? END_USER_EVALUATION_CRITERIA : PROCUREMENT_OFFICE_EVALUATION_CRITERIA;
}

export function validateSupplierEvaluationResponses(audience: SupplierEvaluationAudience, responses: Record<string, number>) {
  const criteria = criteriaForSupplierEvaluation(audience);
  const expectedKeys = criteria.map((criterion) => criterion.key);
  const receivedKeys = Object.keys(responses).sort();
  if (receivedKeys.length !== expectedKeys.length || expectedKeys.some((key) => !receivedKeys.includes(key))) return "Every supplied evaluation criterion must receive one rating.";
  if (!expectedKeys.every((key) => Number.isInteger(responses[key]) && responses[key] >= 1 && responses[key] <= 4)) return "Every supplier evaluation rating must be an integer from 1 to 4.";
  return null;
}

function average(values: number[]) { return Math.max(1, Math.min(5, Math.round(values.reduce((total, value) => total + value, 0) / values.length))); }

export function deriveSupplierEvaluationSummary(audience: SupplierEvaluationAudience, responses: Record<string, number>) {
  if (audience === "end_user") {
    return {
      qualityScore: average([responses.quality_standards, responses.accuracy_completeness]),
      deliveryScore: responses.delivery_term,
      pricingScore: average([responses.competitive_pricing, responses.cost_justification]),
      complianceScore: average([responses.responsiveness, responses.issue_resolution, responses.communication, responses.recommend_supplier]),
    };
  }
  return {
    qualityScore: responses.specification_conformance,
    deliveryScore: responses.delivery_term,
    pricingScore: responses.competitive_price,
    complianceScore: average([responses.rfq_timeliness, responses.documentary_requirements]),
  };
}
