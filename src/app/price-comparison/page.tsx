"use client";

import { useState, useMemo } from "react";
import { officeItems, suppliers, type OfficeItem } from "@/lib/mock-price-data";
import SummaryCards from "@/components/price-comparison/SummaryCards";
import FilterBar from "@/components/price-comparison/FilterBar";
import ComparisonTable from "@/components/price-comparison/ComparisonTable";
import PriceChart from "@/components/price-comparison/PriceChart";

// Tab types
type ActiveTab = "table" | "chart";

export default function PriceComparisonPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("table");

  const filteredItems = useMemo(() => {
    return officeItems.filter((item: OfficeItem) => {
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        !selectedCategory || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="pc-page" id="price-comparison-page">
      {/* Header */}
      <header className="pc-header" id="pc-header">
        <div className="pc-header-inner">
          <div className="pc-header-brand">
            <div className="pc-logo">
              <span className="pc-logo-p">P</span>
              <span className="pc-logo-w">W</span>
            </div>
            <div>
              <h1 className="pc-title">ProcureWise</h1>
              <p className="pc-subtitle">Batanes State College — Office Supplies</p>
            </div>
          </div>
          <div className="pc-header-badge" id="pc-system-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="badge-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Intelligent Canvassing System</span>
          </div>
        </div>
      </header>

      <main className="pc-main" id="pc-main">
        {/* Page title */}
        <section className="pc-section-title" id="pc-section-title">
          <div>
            <h2 className="pc-section-heading">Price Comparison Dashboard</h2>
            <p className="pc-section-desc">
              Compare supplier quotes for office supplies across {suppliers.length} vendors. 
              Green cells indicate the best value. Click any row to see delivery details.
            </p>
          </div>
          <div className="pc-date-badge" id="pc-date-badge">
            {new Date().toLocaleDateString("en-PH", {
              year: "numeric", month: "long", day: "numeric"
            })}
          </div>
        </section>

        {/* Summary KPI Cards */}
        <section id="pc-summary-section">
          <SummaryCards />
        </section>

        {/* Filter Bar */}
        <section id="pc-filter-section">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            selectedSuppliers={selectedSuppliers}
            onSuppliersChange={setSelectedSuppliers}
          />
        </section>

        {/* Tab switcher */}
        <div className="pc-tabs" id="pc-tabs">
          <button
            id="tab-btn-table"
            className={`pc-tab-btn ${activeTab === "table" ? "pc-tab-active" : ""}`}
            onClick={() => setActiveTab("table")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="tab-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" />
            </svg>
            Comparison Table
          </button>
          <button
            id="tab-btn-chart"
            className={`pc-tab-btn ${activeTab === "chart" ? "pc-tab-active" : ""}`}
            onClick={() => setActiveTab("chart")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="tab-icon">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Price Chart
          </button>
          <div className="pc-tab-count" id="pc-result-count">
            {filteredItems.length} item{filteredItems.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Main content */}
        <section id="pc-content-section" className="pc-content">
          {activeTab === "table" ? (
            <ComparisonTable
              items={filteredItems}
              suppliers={suppliers}
              selectedSuppliers={selectedSuppliers}
            />
          ) : (
            <PriceChart items={filteredItems} selectedSuppliers={selectedSuppliers} />
          )}
        </section>

        {/* Footer note */}
        <footer className="pc-footer" id="pc-footer">
          <p>
            Data sourced from canvassing on{" "}
            {new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}.
            Prices are in Philippine Peso (₱) per unit. Best value recommendations are based on unit price only.
          </p>
          <p className="pc-footer-sys">
            PROCUREWISE: An Intelligent Procurement Analytics and Automated Canvassing System with Best-Value Recommendation Engine
          </p>
        </footer>
      </main>
    </div>
  );
}
