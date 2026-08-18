import { canReserveBudget, hasReservedBudgetCommitment } from "../shared/procurementRules";

export function validatePrBudgetSubmission(input: { allottedAmount: number | string; committedAmount: number | string; purchaseRequestAmount: number | string }) {
  const allowed = canReserveBudget(input.allottedAmount, input.committedAmount, input.purchaseRequestAmount);
  return { allowed, availableAmount: Number(input.allottedAmount) - Number(input.committedAmount) };
}

export function validatePoBudgetGeneration(input: { committedAmount: number | string; purchaseRequestAmount: number | string }) {
  const allowed = hasReservedBudgetCommitment(input.committedAmount, input.purchaseRequestAmount);
  return { allowed };
}
