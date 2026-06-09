// Mock data for ProcureWise Price Comparison Dashboard
// Office Supplies — Batanes State College procurement context
// Prices in Philippine Peso (₱)

export interface Supplier {
  id: string;
  name: string;
  location: string;
  contact: string;
  rating: number; // 1-5
}

export interface PriceQuote {
  supplierId: string;
  unitPrice: number; // in PHP
  availability: "in-stock" | "limited" | "out-of-stock";
  deliveryDays: number;
  notes?: string;
}

export interface OfficeItem {
  id: string;
  name: string;
  unit: string;
  category: string;
  description: string;
  quotes: PriceQuote[];
}

export const suppliers: Supplier[] = [
  {
    id: "sup-001",
    name: "Batanes General Trading",
    location: "Basco, Batanes",
    contact: "0917-100-2001",
    rating: 4.8,
  },
  {
    id: "sup-002",
    name: "Ivana Office Supplies",
    location: "Ivana, Batanes",
    contact: "0918-200-3002",
    rating: 4.2,
  },
  {
    id: "sup-003",
    name: "North Island Merchandising",
    location: "Basco, Batanes",
    contact: "0919-300-4003",
    rating: 3.9,
  },
  {
    id: "sup-004",
    name: "Cagayan Valley Distributors",
    location: "Tuguegarao City",
    contact: "0920-400-5004",
    rating: 4.5,
  },
  {
    id: "sup-005",
    name: "Manila Central Supplies",
    location: "Manila, NCR",
    contact: "0921-500-6005",
    rating: 4.1,
  },
];

export const officeItems: OfficeItem[] = [
  {
    id: "item-001",
    name: "Bond Paper (Short)",
    unit: "ream",
    category: "Paper Products",
    description: "80gsm, 500 sheets per ream, 8.5 x 11 inches",
    quotes: [
      { supplierId: "sup-001", unitPrice: 210, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-002", unitPrice: 195, availability: "in-stock", deliveryDays: 2 },
      { supplierId: "sup-003", unitPrice: 220, availability: "limited", deliveryDays: 1 },
      { supplierId: "sup-004", unitPrice: 188, availability: "in-stock", deliveryDays: 5 },
      { supplierId: "sup-005", unitPrice: 175, availability: "in-stock", deliveryDays: 7 },
    ],
  },
  {
    id: "item-002",
    name: "Bond Paper (Long)",
    unit: "ream",
    category: "Paper Products",
    description: "80gsm, 500 sheets per ream, 8.5 x 13 inches",
    quotes: [
      { supplierId: "sup-001", unitPrice: 230, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-002", unitPrice: 215, availability: "in-stock", deliveryDays: 2 },
      { supplierId: "sup-003", unitPrice: 240, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-004", unitPrice: 200, availability: "limited", deliveryDays: 5 },
      { supplierId: "sup-005", unitPrice: 190, availability: "in-stock", deliveryDays: 7 },
    ],
  },
  {
    id: "item-003",
    name: "Ballpen (Black)",
    unit: "box",
    category: "Writing Instruments",
    description: "0.5mm, 12 pcs per box, retractable",
    quotes: [
      { supplierId: "sup-001", unitPrice: 85, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-002", unitPrice: 78, availability: "in-stock", deliveryDays: 2 },
      { supplierId: "sup-003", unitPrice: 90, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-004", unitPrice: 72, availability: "in-stock", deliveryDays: 5 },
      { supplierId: "sup-005", unitPrice: 68, availability: "in-stock", deliveryDays: 7 },
    ],
  },
  {
    id: "item-004",
    name: "Folder (Expanding, Long)",
    unit: "piece",
    category: "Filing & Storage",
    description: "Plastic accordion folder, 13 pockets, long size",
    quotes: [
      { supplierId: "sup-001", unitPrice: 55, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-002", unitPrice: 48, availability: "limited", deliveryDays: 2 },
      { supplierId: "sup-003", unitPrice: 60, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-004", unitPrice: 45, availability: "in-stock", deliveryDays: 5 },
      { supplierId: "sup-005", unitPrice: 42, availability: "in-stock", deliveryDays: 7 },
    ],
  },
  {
    id: "item-005",
    name: "Stapler (Heavy Duty)",
    unit: "unit",
    category: "Desk Equipment",
    description: "Heavy duty stapler, 50 sheet capacity",
    quotes: [
      { supplierId: "sup-001", unitPrice: 320, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-002", unitPrice: 295, availability: "in-stock", deliveryDays: 2 },
      { supplierId: "sup-003", unitPrice: 350, availability: "out-of-stock", deliveryDays: 0 },
      { supplierId: "sup-004", unitPrice: 280, availability: "in-stock", deliveryDays: 5 },
      { supplierId: "sup-005", unitPrice: 265, availability: "limited", deliveryDays: 7 },
    ],
  },
  {
    id: "item-006",
    name: "Epson 003 Ink (Black)",
    unit: "bottle",
    category: "Ink & Toner",
    description: "65ml, compatible with L-series EcoTank printers",
    quotes: [
      { supplierId: "sup-001", unitPrice: 370, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-002", unitPrice: 355, availability: "in-stock", deliveryDays: 2 },
      { supplierId: "sup-003", unitPrice: 380, availability: "limited", deliveryDays: 1 },
      { supplierId: "sup-004", unitPrice: 340, availability: "in-stock", deliveryDays: 5 },
      { supplierId: "sup-005", unitPrice: 330, availability: "in-stock", deliveryDays: 7 },
    ],
  },
  {
    id: "item-007",
    name: "Scotch Tape (1 inch)",
    unit: "roll",
    category: "Adhesives",
    description: "Transparent adhesive tape, 1 inch x 50 meters",
    quotes: [
      { supplierId: "sup-001", unitPrice: 28, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-002", unitPrice: 25, availability: "in-stock", deliveryDays: 2 },
      { supplierId: "sup-003", unitPrice: 30, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-004", unitPrice: 22, availability: "in-stock", deliveryDays: 5 },
      { supplierId: "sup-005", unitPrice: 20, availability: "in-stock", deliveryDays: 7 },
    ],
  },
  {
    id: "item-008",
    name: "Sign Pen (Blue)",
    unit: "box",
    category: "Writing Instruments",
    description: "0.5mm, 12 pcs per box, felt tip",
    quotes: [
      { supplierId: "sup-001", unitPrice: 145, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-002", unitPrice: 132, availability: "in-stock", deliveryDays: 2 },
      { supplierId: "sup-003", unitPrice: 150, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-004", unitPrice: 125, availability: "limited", deliveryDays: 5 },
      { supplierId: "sup-005", unitPrice: 120, availability: "in-stock", deliveryDays: 7 },
    ],
  },
  {
    id: "item-009",
    name: "Correction Tape",
    unit: "piece",
    category: "Correction Supplies",
    description: "5mm x 8m, roller type",
    quotes: [
      { supplierId: "sup-001", unitPrice: 38, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-002", unitPrice: 35, availability: "in-stock", deliveryDays: 2 },
      { supplierId: "sup-003", unitPrice: 40, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-004", unitPrice: 32, availability: "in-stock", deliveryDays: 5 },
      { supplierId: "sup-005", unitPrice: 30, availability: "in-stock", deliveryDays: 7 },
    ],
  },
  {
    id: "item-010",
    name: "Columnar Notebook (14 col)",
    unit: "piece",
    category: "Paper Products",
    description: "14-column accounting notebook, 100 pages",
    quotes: [
      { supplierId: "sup-001", unitPrice: 92, availability: "in-stock", deliveryDays: 1 },
      { supplierId: "sup-002", unitPrice: 85, availability: "in-stock", deliveryDays: 2 },
      { supplierId: "sup-003", unitPrice: 98, availability: "limited", deliveryDays: 1 },
      { supplierId: "sup-004", unitPrice: 80, availability: "in-stock", deliveryDays: 5 },
      { supplierId: "sup-005", unitPrice: 75, availability: "in-stock", deliveryDays: 7 },
    ],
  },
];

// Helper utilities
export function getBestQuote(item: OfficeItem): PriceQuote | null {
  const available = item.quotes.filter(q => q.availability !== "out-of-stock");
  if (!available.length) return null;
  return available.reduce((best, q) => q.unitPrice < best.unitPrice ? q : best);
}

export function getWorstQuote(item: OfficeItem): PriceQuote | null {
  const available = item.quotes.filter(q => q.availability !== "out-of-stock");
  if (!available.length) return null;
  return available.reduce((worst, q) => q.unitPrice > worst.unitPrice ? q : worst);
}

export function getSavingsPercent(item: OfficeItem): number {
  const best = getBestQuote(item);
  const worst = getWorstQuote(item);
  if (!best || !worst || worst.unitPrice === 0) return 0;
  return Math.round(((worst.unitPrice - best.unitPrice) / worst.unitPrice) * 100);
}

export function getAverageSavings(): number {
  const savingsList = officeItems.map(getSavingsPercent);
  return Math.round(savingsList.reduce((a, b) => a + b, 0) / savingsList.length);
}

export const categories = [...new Set(officeItems.map(i => i.category))];
