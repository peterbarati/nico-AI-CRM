import { useEffect, useState } from "react";
import { fetchSalesHandoffTasks } from "./api";
import { SalesQueueTable } from "./SalesQueueTable";
import type { SalesHandoffTask } from "./types";

export function SalesPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const [items, setItems] = useState<SalesHandoffTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    fetchSalesHandoffTasks()
      .then((data) => mounted && setItems(data))
      .catch((unknownError: unknown) => {
        if (mounted) {
          setError(
            unknownError instanceof Error ? unknownError.message : "Sales queue unavailable."
          );
        }
      })
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sales</p>
          <h2>Customer Service handoffs</h2>
        </div>
        <p>
          Open visit requests with the originating call context and responsible Sales
          Representative.
        </p>
      </div>
      {loading ? <div className="loading-state">Loading Sales work queue...</div> : null}
      {error ? (
        <section className="error-state">
          <h2>Sales queue unavailable</h2>
          <p>{error}</p>
        </section>
      ) : null}
      {!loading && !error ? (
        <SalesQueueTable items={items} onOpenCustomer={(id) => onNavigate(`/customers/${id}`)} />
      ) : null}
    </section>
  );
}
