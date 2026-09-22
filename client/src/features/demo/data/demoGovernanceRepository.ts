import { SEEDED_REQUEST } from "./procurement.seed";
import { applyDecision, buildInitialGovernance, type GovernanceDecision, type GovernanceSnapshot } from "../domain/governance";

let snapshot: GovernanceSnapshot = buildInitialGovernance(SEEDED_REQUEST);

export const demoGovernanceRepository = {
  async getSnapshot(): Promise<GovernanceSnapshot> {
    return structuredClone(snapshot);
  },
  async decide(action: GovernanceDecision, reason: string): Promise<GovernanceSnapshot> {
    snapshot = applyDecision(snapshot, action, reason);
    return structuredClone(snapshot);
  },
  async reset(): Promise<void> {
    snapshot = buildInitialGovernance(SEEDED_REQUEST);
  },
};
