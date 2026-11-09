import React from "react";

export interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t-2 border-slate-200 pt-4 dark:border-slate-800">
      <button
        type="button"
        onClick={() => onPageChange(safeCurrentPage - 1)}
        disabled={safeCurrentPage <= 1}
        className="min-h-12 rounded-xl border-2 border-slate-300 bg-white px-6 text-base font-bold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        ← Previous
      </button>

      <span className="text-base font-semibold text-slate-700 dark:text-slate-300">
        Page {safeCurrentPage} of {safeTotalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(safeCurrentPage + 1)}
        disabled={safeCurrentPage >= safeTotalPages}
        className="min-h-12 rounded-xl border-2 border-slate-300 bg-white px-6 text-base font-bold text-slate-800 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        Next →
      </button>
    </div>
  );
};

export default TablePagination;

