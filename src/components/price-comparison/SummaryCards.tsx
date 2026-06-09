// SummaryCards — KPI overview for the Price Comparison Dashboard
// Colors: Batanes State College Maroon & Gold

import { officeItems, suppliers, getBestQuote, getAverageSavings, type OfficeItem, type PriceQuote } from "@/lib/mock-price-data";

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

export default function SummaryCards() {
  const avgSavings = getAverageSavings();

  // Total potential savings: sum of (worst - best) across all items
  const totalSavings = officeItems.reduce((sum: number, item: OfficeItem) => {
    const available = item.quotes.filter((q: PriceQuote) => q.availability !== "out-of-stock");
    if (available.length < 2) return sum;
    const prices = available.map((q: PriceQuote) => q.unitPrice);
    return sum + (Math.max(...prices) - Math.min(...prices));
  }, 0);

  const cards = [
    {
      id: "card-items-compared",
      label: "Items Compared",
      value: officeItems.length.toString(),
      sublabel: "office supply items",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      accent: "#F5C400",
    },
    {
      id: "card-suppliers-evaluated",
      label: "Suppliers Evaluated",
      value: suppliers.length.toString(),
      sublabel: "local & regional",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
        </svg>
      ),
      accent: "#F5C400",
    },
    {
      id: "card-avg-savings",
      label: "Avg. Savings Potential",
      value: `${avgSavings}%`,
      sublabel: "vs. highest quote",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      accent: "#22c55e",
    },
    {
      id: "card-total-savings",
      label: "Total Savings Opportunity",
      value: formatPeso(totalSavings),
      sublabel: "choosing best suppliers",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      accent: "#22c55e",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.id}
          id={card.id}
          className="summary-card"
          style={{ "--accent": card.accent } as React.CSSProperties}
        >
          <div className="summary-card-icon" style={{ color: card.accent }}>
            {card.icon}
          </div>
          <div className="summary-card-value">{card.value}</div>
          <div className="summary-card-label">{card.label}</div>
          <div className="summary-card-sublabel">{card.sublabel}</div>
        </div>
      ))}
    </div>
  );
}
