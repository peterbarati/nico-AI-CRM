import { useEffect, useState } from "react";
import { defaultCustomerFilters, fetchCustomerFilterOptions, fetchCustomers } from "./api";
import { CustomerFilters } from "./CustomerFilters";
import { CustomerTable } from "./CustomerTable";
import { PaginationControls } from "./PaginationControls";
import type {
  ApiPagination,
  CustomerFilterOptions,
  CustomerListFilters,
  CustomerListItem
} from "./types";

interface CustomerListPageProps {
  onOpenCustomer: (customerId: string) => void;
}

export function CustomerListPage({ onOpenCustomer }: CustomerListPageProps) {
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [filters, setFilters] = useState<CustomerListFilters>(defaultCustomerFilters);
  const [filterOptions, setFilterOptions] = useState<CustomerFilterOptions | null>(null);
  const [pagination, setPagination] = useState<ApiPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    fetchCustomerFilterOptions()
      .then((options) => {
        if (mounted) {
          setFilterOptions(options);
        }
      })
      .catch(() => {
        if (mounted) {
          setFilterOptions({ b2bStatuses: [], salesReps: [], segments: [] });
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchCustomers(filters)
      .then((response) => {
        if (mounted) {
          setCustomers(response.data);
          setPagination(response.pagination);
        }
      })
      .catch((unknownError: unknown) => {
        if (mounted) {
          setError(unknownError instanceof Error ? unknownError.message : "Customers unavailable");
          setCustomers([]);
          setPagination(null);
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [filters]);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Customers</p>
          <h2>Who should I call today?</h2>
        </div>
        <p>
          Read-only CRM view powered by D1 demo data. Sorting and filtering run through the Worker
          API.
        </p>
      </div>
      <CustomerFilters filters={filters} onChange={setFilters} options={filterOptions} />
      {loading ? <div className="loading-state">Loading customers...</div> : null}
      {error ? (
        <section className="error-state">
          <h2>Customer API error</h2>
          <p>{error}</p>
        </section>
      ) : null}
      {!loading && !error ? (
        <>
          <CustomerTable customers={customers} onOpenCustomer={onOpenCustomer} />
          <PaginationControls
            pagination={pagination}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
          />
        </>
      ) : null}
    </section>
  );
}
