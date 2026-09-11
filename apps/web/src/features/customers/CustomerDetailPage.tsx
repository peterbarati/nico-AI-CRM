import { useCallback, useEffect, useState } from "react";
import { LogCallForm } from "../interactions/LogCallForm";
import { CommercialAssistantPanel } from "../ai/CommercialAssistantPanel";
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
  const [showLogCall, setShowLogCall] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCustomer = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [overview, orders, interactions, tasks, visits] = await Promise.all([
        fetchCustomerOverview(customerId),
        fetchCustomerOrders(customerId),
        fetchCustomerInteractions(customerId),
        fetchCustomerTasks(customerId),
        fetchCustomerVisits(customerId)
      ]);
      setState({
        interactions: interactions.data,
        orders: orders.data,
        overview,
        tasks: tasks.data,
        visits: visits.data
      });
    } catch (unknownError) {
      setError(unknownError instanceof Error ? unknownError.message : "Customer unavailable");
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    void loadCustomer();
  }, [loadCustomer]);

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
      {notice ? <p className="success-notice">{notice}</p> : null}
      <CustomerDetailHeader
        onBack={onBack}
        onLogCall={() => setShowLogCall(true)}
        overview={state.overview}
      />
      <CustomerMetricsCards
        metrics={state.overview.metrics}
        salesTrend={state.overview.customer.salesTrend}
      />
      <CommercialAssistantPanel
        customerId={state.overview.customer.id}
        customerName={state.overview.customer.companyName}
      />
      <CustomerDetailSections
        interactions={state.interactions}
        locations={state.overview.locations}
        orders={state.orders}
        overview={state.overview}
        tasks={state.tasks}
        visits={state.visits}
      />
      {showLogCall ? (
        <LogCallForm
          customerId={state.overview.customer.id}
          customerName={state.overview.customer.companyName}
          defaultSalesRepId={state.overview.customer.assignedSalesRep?.id}
          onCancel={() => setShowLogCall(false)}
          onSuccess={(result) => {
            setShowLogCall(false);
            setNotice(result.task ? "Call and follow-up task saved." : "Call saved.");
            void loadCustomer();
          }}
        />
      ) : null}
    </section>
  );
}
