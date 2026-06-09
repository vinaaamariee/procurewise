"use client";

import { useState, useMemo } from "react";
import {
  OfficeItem,
  Supplier,
  PriceQuote,
  getBestQuote,
  getWorstQuote,
} from "@/lib/mock-price-data";

interface ComparisonTableProps {
  items: OfficeItem[];
  suppliers: Supplier[];
  selectedSuppliers: string[];
}

type SortKey = "name" | "category" | string; // string for supplierId
type SortDir = "asc" | "desc";

function formatPeso(amount: number) {
  return `₱${amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
}

function AvailabilityBadge({ status }: { status: PriceQuote["availability"] }) {
  const map: Record<PriceQuote["availability"], { label: string; cls: string }> = {
    "in-stock": { label: "In Stock", cls: "badge-instock" },
    "limited": { label: "Limited", cls: "badge-limited" },
    "out-of-stock": { label: "Unavailable", cls: "badge-oos" },
  };
  const { label, cls } = map[status];
  return <span className={`avail-badge ${cls}`}>{label}</span>;
}

export default function ComparisonTable({
  items,
  suppliers,
  selectedSuppliers,
}: ComparisonTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const visibleSuppliers = useMemo(
    () =>
      selectedSuppliers.length > 0
        ? suppliers.filter(s => selectedSuppliers.includes(s.id))
        : suppliers,
    [suppliers, selectedSuppliers]
  );

  const sortedItems = useMemo(() => {
    return [...items].sort((a: OfficeItem, b: OfficeItem) => {
      let aVal: number | string = "";
      let bVal: number | string = "";

      if (sortKey === "name") { aVal = a.name; bVal = b.name; }
      else if (sortKey === "category") { aVal = a.category; bVal = b.category; }
      else {
        const aQ = a.quotes.find((q: PriceQuote) => q.supplierId === sortKey);
        const bQ = b.quotes.find((q: PriceQuote) => q.supplierId === sortKey);
        aVal = aQ?.unitPrice ?? Infinity;
        bVal = bQ?.unitPrice ?? Infinity;
      }

      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ colKey }: { colKey: SortKey }) {
    if (sortKey !== colKey) return <span className="sort-icon-inactive">⇅</span>;
    return <span className="sort-icon-active">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  return (
    <div className="comparison-table-wrapper" id="comparison-table-wrapper">
      <div className="comparison-table-scroll">
        <table className="comparison-table" id="comparison-table">
          <thead>
            <tr>
              <th
                className="col-sticky col-item"
                onClick={() => handleSort("name")}
                id="col-header-name"
              >
                Item <SortIcon colKey="name" />
              </th>
              <th
                className="col-category"
                onClick={() => handleSort("category")}
                id="col-header-category"
              >
                Category <SortIcon colKey="category" />
              </th>
              <th className="col-unit">Unit</th>
              {visibleSuppliers.map(s => (
                <th
                  key={s.id}
                  className="col-supplier"
                  onClick={() => handleSort(s.id)}
                  id={`col-header-${s.id}`}
                >
                  <div className="supplier-header">
                    <span className="supplier-header-name">{s.name}</span>
                    <span className="supplier-header-rating">★ {s.rating}</span>
                  </div>
                  <SortIcon colKey={s.id} />
                </th>
              ))}
              <th className="col-best" id="col-header-best">Best Price</th>
              <th className="col-savings" id="col-header-savings">Savings</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item) => {
              const bestQ = getBestQuote(item);
              const worstQ = getWorstQuote(item);
              const savings = worstQ && bestQ
                ? Math.round(((worstQ.unitPrice - bestQ.unitPrice) / worstQ.unitPrice) * 100)
                : 0;
              const isExpanded = expandedItem === item.id;

              return (
                <>
                  <tr
                    key={item.id}
                    id={`row-${item.id}`}
                    className={`table-row ${isExpanded ? "row-expanded" : ""}`}
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                  >
                    <td className="col-sticky col-item-cell">
                      <div className="item-name">{item.name}</div>
                    </td>
                    <td className="col-category-cell">
                      <span className="category-chip">{item.category}</span>
                    </td>
                    <td className="col-unit-cell">{item.unit}</td>

                    {visibleSuppliers.map((s: Supplier) => {
                      const quote = item.quotes.find((q: PriceQuote) => q.supplierId === s.id);
                      const isBest = bestQ && quote?.supplierId === bestQ.supplierId;
                      const isWorst = worstQ && quote?.supplierId === worstQ.supplierId;

                      return (
                        <td
                          key={s.id}
                          className={`price-cell ${isBest ? "cell-best" : ""} ${isWorst ? "cell-worst" : ""} ${!quote || quote.availability === "out-of-stock" ? "cell-oos" : ""}`}
                          id={`cell-${item.id}-${s.id}`}
                        >
                          {quote && quote.availability !== "out-of-stock" ? (
                            <div className="price-cell-inner">
                              <span className="price-value">{formatPeso(quote.unitPrice)}</span>
                              <AvailabilityBadge status={quote.availability} />
                            </div>
                          ) : (
                            <span className="price-na">—</span>
                          )}
                        </td>
                      );
                    })}

                    <td className="col-best-cell">
                      <span className="best-price-tag">
                        {bestQ ? formatPeso(bestQ.unitPrice) : "—"}
                      </span>
                    </td>
                    <td className="col-savings-cell">
                      <span className={`savings-tag ${savings > 0 ? "savings-positive" : ""}`}>
                        {savings > 0 ? `-${savings}%` : "—"}
                      </span>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr key={`${item.id}-detail`} id={`row-detail-${item.id}`} className="detail-row">
                      <td colSpan={3 + visibleSuppliers.length + 2}>
                        <div className="detail-panel">
                          <p className="detail-description">{item.description}</p>
                          <div className="detail-delivery">
                            {visibleSuppliers.map((s: Supplier) => {
                              const quote = item.quotes.find((q: PriceQuote) => q.supplierId === s.id);
                              if (!quote || quote.availability === "out-of-stock") return null;
                              return (
                                <div key={s.id} className="delivery-chip">
                                  <strong>{s.name}:</strong> {quote.deliveryDays} day{quote.deliveryDays !== 1 ? "s" : ""} delivery
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {sortedItems.length === 0 && (
        <div className="table-empty" id="table-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="empty-icon">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <p>No items match your filters.</p>
        </div>
      )}
    </div>
  );
}
