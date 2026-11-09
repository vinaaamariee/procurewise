import React from "react";
import { Search, X } from "lucide-react";

export interface DataTableToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  statusOptions: { label: string; value: string }[];
  totalCount: number;
  filteredCount: number;
}

export const DataTableToolbar: React.FC<DataTableToolbarProps> = ({
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search by tracking number, name, or description...",
  statusFilter,
  onStatusChange,
  statusOptions,
  totalCount,
  filteredCount,
}) => {
  return (
    <div className="space-y-3 pb-4 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search Input with Instant Clear [X] Button */}
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="min-h-12 w-full rounded-xl border-2 border-slate-300 bg-white pl-12 pr-10 text-base text-slate-900 placeholder:text-slate-400 focus:border-[#881337] focus:outline-none focus:ring-4 focus:ring-[#881337]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
          {searchQuery.trim().length > 0 && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search query"
              title="Clear search"
              className="absolute right-1.5 top-1/2 flex min-h-10 min-w-10 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Status Filter Dropdown */}
        {statusOptions.length > 0 && (
          <div className="w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => onStatusChange(e.target.value)}
              aria-label="Filter records by status"
              className="min-h-12 w-full sm:w-60 rounded-xl border-2 border-slate-300 bg-white px-4 text-base font-medium text-slate-800 focus:border-[#881337] focus:outline-none focus:ring-4 focus:ring-[#881337]/15 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value} className="text-base">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Result Counter */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
          Showing{" "}
          <strong className="text-slate-900 dark:text-white">{filteredCount}</strong> of{" "}
          <strong>{totalCount}</strong> records
        </p>
        {(searchQuery.trim().length > 0 || statusFilter !== "ALL") && (
          <button
            type="button"
            onClick={() => {
              onSearchChange("");
              onStatusChange("ALL");
            }}
            className="text-sm font-bold text-[#881337] underline underline-offset-4 hover:text-[#6b0f2b] dark:text-rose-400"
          >
            Reset Filters
          </button>
        )}
      </div>
    </div>
  );
};

export default DataTableToolbar;

