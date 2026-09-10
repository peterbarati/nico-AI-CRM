import type { ApiPagination } from "./types";

interface PaginationControlsProps {
  pagination: ApiPagination | null;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ pagination, onPageChange }: PaginationControlsProps) {
  if (!pagination) {
    return null;
  }

  const hasPreviousPage = pagination.page > 1;
  const hasNextPage = pagination.page < pagination.totalPages;

  return (
    <div className="pagination" aria-label="Customer list pagination">
      <button
        disabled={!hasPreviousPage}
        onClick={() => onPageChange(pagination.page - 1)}
        type="button"
      >
        Previous
      </button>
      <span>
        Page {pagination.page} of {pagination.totalPages || 1} · {pagination.total} results
      </span>
      <button
        disabled={!hasNextPage}
        onClick={() => onPageChange(pagination.page + 1)}
        type="button"
      >
        Next
      </button>
    </div>
  );
}
