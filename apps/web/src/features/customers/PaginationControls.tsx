import type { ApiPagination } from "./types";
import { t } from "../../i18n";

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
    <div className="pagination" aria-label={t("Customer list pagination")}>
      <button
        disabled={!hasPreviousPage}
        onClick={() => onPageChange(pagination.page - 1)}
        type="button"
      >
        {t("Previous")}
      </button>
      <span>
        {t("Page {page} of {pages} · {total} results", {
          page: pagination.page,
          pages: pagination.totalPages || 1,
          total: pagination.total
        })}
      </span>
      <button
        disabled={!hasNextPage}
        onClick={() => onPageChange(pagination.page + 1)}
        type="button"
      >
        {t("Next")}
      </button>
    </div>
  );
}
