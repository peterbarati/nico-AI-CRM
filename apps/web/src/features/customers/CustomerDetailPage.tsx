import { useEffect, useState } from "react";
import {
  fetchCustomerInteractions,
  fetchCustomerOrders,
  fetchCustomerOverview,
  fetchCustomerTasks,
  fetchCustomerVisits
} from "./api";
import { CustomerDetailHeader } from "./CustomerDetailHeader";
import { CustomerDetailSections } from "./CustomerDetailSections";
import { CustomerMetricsCards } from "./CustomerMetricsCards";
import type {
  CustomerInteraction,
  CustomerOverview,
  OrderSummary,
  SalesVisit,
  TaskItem
} from "./types";

interface CustomerDetailPageProps {
  customerId: string;
  onBack: () => void;
}

interface CustomerDetailState {
  interactions: CustomerInteraction[];
  orders: OrderSummary[];
  overview: CustomerOverview;
  tasks: TaskItem[];
  visits: SalesVisit[];
}

export function CustomerDetailPage({ customerId, onBack }: CustomerDetailPageProps) {
  const [state, setState] = useState<CustomerDetailState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetchCustomerOverview(customerId),
      fetchCustomerOrders(customerId),
      fetchCustomerInteractions(customerId),
      fetchCustomerTasks(customerId),
      fetchCustomerVisits(customerId)
    ])
      .then(([overview, orders, interactions, tasks, visits]) => {
        if (mounted) {
          setState({
            interactions: interactions.data,
            orders: orders.data,
            overview,
            tasks: tasks.data,
            visits: visits.data
          });
        }
      })
      .catch((unknownError: unknown) => {
        if (mounted) {
          setError(unknownError instanceof Error ? unknownError.message : "Customer unavailable");
          setState(null);
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
  }, [customerId]);

  if (loading) {
    return <div className="loading-state">Loading customer detail...</div>;
  }

  if (error) {
    return (
      <section className="error-state">
        <button className="link-button" onClick={onBack} type="button">
          Back to customers
        </button>
        <h2>Customer not found</h2>
        <p>{error}</p>
      </section>
    );
  }

  if (!state) {
    return (
      <section className="empty-state">
        <button className="link-button" onClick={onBack} type="button">
          Back to customers
        </button>
        <h2>Customer not found</h2>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <CustomerDetailHeader onBack={onBack} overview={state.overview} />
      <CustomerMetricsCards
        metrics={state.overview.metrics}
        salesTrend={state.overview.customer.salesTrend}
      />
      <CustomerDetailSections
        interactions={state.interactions}
        locations={state.overview.locations}
        orders={state.orders}
        overview={state.overview}
        tasks={state.tasks}
        visits={state.visits}
      />
    </section>
  );
}
