import { officeItems, suppliers, getBestQuote, type Supplier, type PriceQuote, type OfficeItem } from "@/lib/mock-price-data";

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`;
}

interface PriceChartProps {
  items: typeof officeItems;
  selectedSuppliers: string[];
}

export default function PriceChart({ items, selectedSuppliers }: PriceChartProps) {
  const visibleSuppliers =
    selectedSuppliers.length > 0
      ? suppliers.filter((s: Supplier) => selectedSuppliers.includes(s.id))
      : suppliers;

  // Pick up to 5 items to avoid clutter
  const chartItems = items.slice(0, 5);

  const supplierColors = [
    "#6366f1",  // Indigo
    "#38bdf8",  // Sky Blue
    "#14b8a6",  // Teal
    "#a855f7",  // Purple
    "#f59e0b",  // Amber
  ];

  return (
    <div className="price-chart-wrapper" id="price-chart-wrapper">
      <div className="chart-legend" id="chart-legend">
        {visibleSuppliers.map((s, i) => (
          <div key={s.id} className="legend-item">
            <span
              className="legend-dot"
              style={{ background: supplierColors[i % supplierColors.length] }}
            />
            <span className="legend-label">{s.name}</span>
          </div>
        ))}
      </div>

      <div className="chart-rows" id="chart-rows">
        {chartItems.map((item: OfficeItem) => {
          const available = item.quotes.filter((q: PriceQuote) => q.availability !== "out-of-stock");
          const maxPrice = available.length
            ? Math.max(...available.map((q: PriceQuote) => q.unitPrice))
            : 1;

          const best = getBestQuote(item);

          return (
            <div key={item.id} className="chart-row" id={`chart-row-${item.id}`}>
              <div className="chart-item-label" title={item.name}>
                {item.name}
              </div>
              <div className="chart-bars">
                {visibleSuppliers.map((s: Supplier, i: number) => {
                  const quote = item.quotes.find((q: PriceQuote) => q.supplierId === s.id);
                  const isBest = best && quote?.supplierId === best.supplierId;
                  const price = quote?.unitPrice ?? 0;
                  const pct = maxPrice > 0 ? (price / maxPrice) * 100 : 0;

                  return (
                    <div key={s.id} className="chart-bar-row" id={`bar-${item.id}-${s.id}`}>
                      <div
                        className={`chart-bar ${isBest ? "chart-bar-best" : ""}`}
                        style={{
                          width: `${pct}%`,
                          background: isBest
                            ? "#22c55e"
                            : supplierColors[i % supplierColors.length],
                        }}
                        title={`${s.name}: ${formatPeso(price)}`}
                      >
                        {pct > 25 && (
                          <span className="chart-bar-label">
                            {formatPeso(price)}
                          </span>
                        )}
                      </div>
                      {pct <= 25 && price > 0 && (
                        <span className="chart-bar-label-outside">{formatPeso(price)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {chartItems.length === 0 && (
        <div className="chart-empty" id="chart-empty-state">No data to display.</div>
      )}
    </div>
  );
}
