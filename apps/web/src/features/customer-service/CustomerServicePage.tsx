import { useEffect, useState } from "react";
import { fetchCustomerServiceQueue } from "./api";
import { CustomerServiceErrorState } from "./CustomerServiceErrorState";
import { CustomerServiceQueueTable } from "./CustomerServiceQueueTable";
import { CustomerServiceSummaryCards } from "./CustomerServiceSummaryCards";
import type {
  CustomerServiceQueueItem,
  CustomerServiceQueueResponse,
  CustomerServiceSummary
} from "./types";

interface CustomerServicePageProps {
  onNavigate: (path: string) => void;
}

export function CustomerServicePage({ onNavigate }: CustomerServicePageProps) {
  const [items, setItems] = useState<CustomerServiceQueueItem[]>([]);
  const [summary, setSummary] = useState<CustomerServiceSummary | null>(null);
  const [meta, setMeta] = useState<CustomerServiceQueueResponse["data"]["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    fetchCustomerServiceQueue()
      .then((data) => {
        if (mounted) {
          setItems(data.items);
          setSummary(data.summary);
          setMeta(data.meta);
        }
      })
      .catch((unknownError: unknown) => {
        if (mounted) {
          setError(
            unknownError instanceof Error
              ? unknownError.message
              : "Customer Service queue unavailable"
          );
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
  }, []);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Customer Service</p>
          <h2>Koho mám dnes volať?</h2>
        </div>
        <p>
          Deterministic daily queue based on CRM metrics, active segments, tasks, campaigns, and
          recent interaction history.
        </p>
      </div>
      {loading ? <div className="loading-state">Loading Customer Service queue...</div> : null}
      {error ? <CustomerServiceErrorState message={error} /> : null}
      {!loading && !error && summary ? (
        <>
          <CustomerServiceSummaryCards summary={summary} />
          {meta ? (
            <p className="queue-meta">
              Ranked {meta.evaluatedCandidates} candidates · Showing {meta.returned} calls · Updated{" "}
              {new Date(meta.generatedAt).toLocaleString("en-GB")}
            </p>
          ) : null}
          <CustomerServiceQueueTable
            items={items}
            onOpenCustomer={(customerId) => onNavigate(`/customers/${customerId}`)}
          />
        </>
      ) : null}
    </section>
  );
}
