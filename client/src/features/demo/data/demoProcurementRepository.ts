// Procwise Defense — Demo Procurement Repository
// Asynchronous boundary between UI components and synthetic fixture data.
// Day 4 will wire the reset() action to the top-bar Reset button.
// Later sprints may replace this with an API call without changing callers.

import type { DemoProcurementRepository, PurchaseRequest } from "../domain/procurement.types";
import { SEEDED_REQUEST } from "./procurement.seed";

// Internal mutable state — reset() restores from the original seed
let _requests: PurchaseRequest[] = [structuredClone(SEEDED_REQUEST)];

export const demoProcurementRepository: DemoProcurementRepository = {
  async listRequests(): Promise<PurchaseRequest[]> {
    return structuredClone(_requests);
  },

  async getRequestById(id: string): Promise<PurchaseRequest | null> {
    return structuredClone(_requests.find((r) => r.id === id) ?? null);
  },

  async reset(): Promise<void> {
    _requests = [structuredClone(SEEDED_REQUEST)];
  },
};
