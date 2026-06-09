"use client";

import { useState } from "react";
import { categories, suppliers, type Supplier } from "@/lib/mock-price-data";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  selectedCategory: string;
  onCategoryChange: (v: string) => void;
  selectedSuppliers: string[];
  onSuppliersChange: (v: string[]) => void;
}

export default function FilterBar({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  selectedSuppliers,
  onSuppliersChange,
}: FilterBarProps) {
  const [supplierOpen, setSupplierOpen] = useState(false);

  function toggleSupplier(id: string) {
    if (selectedSuppliers.includes(id)) {
      onSuppliersChange(selectedSuppliers.filter(s => s !== id));
    } else {
      onSuppliersChange([...selectedSuppliers, id]);
    }
  }

  return (
    <div className="filter-bar" id="filter-bar">
      {/* Search */}
      <div className="filter-search-wrapper">
        <svg className="filter-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" />
          <path strokeLinecap="round" d="M21 21l-4.35-4.35" />
        </svg>
        <input
          id="search-items-input"
          type="text"
          placeholder="Search office supplies..."
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          className="filter-search-input"
        />
        {searchQuery && (
          <button
            id="clear-search-btn"
            onClick={() => onSearchChange("")}
            className="filter-clear-btn"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>

      {/* Category filter */}
      <select
        id="category-filter-select"
        value={selectedCategory}
        onChange={e => onCategoryChange(e.target.value)}
        className="filter-select"
      >
        <option value="">All Categories</option>
        {categories.map((cat: string) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      {/* Supplier filter dropdown */}
      <div className="filter-supplier-wrapper">
        <button
          id="supplier-filter-btn"
          onClick={() => setSupplierOpen(o => !o)}
          className="filter-select filter-supplier-btn"
        >
          <span>
            {selectedSuppliers.length === 0
              ? "All Suppliers"
              : `${selectedSuppliers.length} Supplier${selectedSuppliers.length > 1 ? "s" : ""} Selected`}
          </span>
          <svg className={`filter-chevron ${supplierOpen ? "open" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {supplierOpen && (
          <div className="filter-supplier-dropdown" id="supplier-dropdown">
            {suppliers.map((s: Supplier) => (
              <label key={s.id} className="filter-supplier-option" htmlFor={`supplier-check-${s.id}`}>
                <input
                  id={`supplier-check-${s.id}`}
                  type="checkbox"
                  checked={selectedSuppliers.includes(s.id)}
                  onChange={() => toggleSupplier(s.id)}
                  className="filter-supplier-checkbox"
                />
                <span className="filter-supplier-name">{s.name}</span>
                <span className="filter-supplier-loc">{s.location}</span>
              </label>
            ))}
            {selectedSuppliers.length > 0 && (
              <button
                id="clear-suppliers-btn"
                onClick={() => { onSuppliersChange([]); setSupplierOpen(false); }}
                className="filter-clear-all-btn"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
