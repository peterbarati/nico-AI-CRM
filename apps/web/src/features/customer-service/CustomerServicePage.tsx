import { useCallback, useEffect, useState } from "react";
import type { CallReasonCode } from "@nico-ai-crm/shared";
import { LogCallForm } from "../interactions/LogCallForm";
import { CommercialAssistantPanel } from "../ai/CommercialAssistantPanel";
import { fetchCustomerServiceQueue } from "./api";
import { CustomerServiceErrorState } from "./CustomerServiceErrorState";
import { CustomerServiceQueueTable } from "./CustomerServiceQueueTable";
import { CustomerServiceSummaryCards } from "./CustomerServiceSummaryCards";
import type {
  CustomerServiceQueueItem,
  CustomerServiceQueueResponse,
  CustomerServiceSummary
} from "./types";
import { apiErrorMessage, formatDateTime, t } from "../../i18n";

interface CustomerServicePageProps {
  onNavigate: (path: string) => void;
}

export async function loadCustomerServiceQueue(loader = fetchCustomerServiceQueue): Promise<{
  loading: false;
  data: CustomerServiceQueueResponse["data"] | null;
  error: string | null;
}> {
  try {
    return { loading: false, data: await loader(), error: null };
  } catch (error) {
    return {
      loading: false,
      data: null,
      error: apiErrorMessage(error, "Zoznam zákazníckeho servisu nie je dostupný.")
    };
  }
}

export function CustomerServicePage({ onNavigate }: CustomerServicePageProps) {
  const [items, setItems] = useState<CustomerServiceQueueItem[]>([]);
  const [summary, setSummary] = useState<CustomerServiceSummary | null>(null);
  const [meta, setMeta] = useState<CustomerServiceQueueResponse["data"]["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerServiceQueueItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [assistantCustomer, setAssistantCustomer] = useState<CustomerServiceQueueItem | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    const state = await loadCustomerServiceQueue();
    if (state.data) {
      const data = state.data;
      setItems(data.items);
      setSummary(data.summary);
      setMeta(data.meta);
    } else {
      setItems([]);
      setSummary(null);
      setMeta(null);
    }
    setError(state.error);
    setLoading(state.loading);
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  function toCallReason(item: CustomerServiceQueueItem): CallReasonCode {
    const action = item.priority.primaryRecommendedAction;
    return action === "REORDER" ||
      action === "RETENTION" ||
      action === "REACTIVATION" ||
      action === "B2B_REGISTRATION" ||
      action === "CROSS_SELL" ||
      action === "CAMPAIGN_FOLLOW_UP" ||
      action === "TASK_FOLLOW_UP"
      ? action
      : "GENERAL";
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("Customer Service")}</p>
          <h2>{t("Who should I call today?")}</h2>
        </div>
        <p>
          {t(
            "Deterministic daily queue based on CRM metrics, active segments, tasks, campaigns, and recent interaction history."
          )}
        </p>
      </div>
      {notice ? <p className="success-notice">{notice}</p> : null}
      {loading ? (
        <div className="loading-state">{t("Loading Customer Service queue...")}</div>
      ) : error ? (
        <CustomerServiceErrorState message={error} />
      ) : summary ? (
        <>
          <CustomerServiceSummaryCards summary={summary} />
          {meta ? (
            <p className="queue-meta">
              {t("Ranked {evaluated} candidates · Showing {returned} calls · Updated {updated}", {
                evaluated: meta.evaluatedCandidates,
                returned: meta.returned,
                updated: formatDateTime(meta.generatedAt)
              })}
            </p>
          ) : null}
          <CustomerServiceQueueTable
            items={items}
            onLogCall={setSelectedCustomer}
            onOpenCustomer={(customerId) => onNavigate(`/customers/${customerId}`)}
            onPrepareCall={setAssistantCustomer}
          />
        </>
      ) : null}
      {selectedCustomer ? (
        <LogCallForm
          customerId={selectedCustomer.customerId}
          customerName={selectedCustomer.companyName}
          defaultSalesRepId={selectedCustomer.assignedSalesRep?.id}
          onCancel={() => setSelectedCustomer(null)}
          onSuccess={(result) => {
            setSelectedCustomer(null);
            setNotice(result.task ? t("Call and follow-up task saved.") : t("Call saved."));
            void loadQueue();
          }}
          suggestedReason={toCallReason(selectedCustomer)}
        />
      ) : null}
      {assistantCustomer ? (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card assistant-modal" role="dialog" aria-modal="true">
            <div className="modal-header">
              <button
                className="link-button"
                onClick={() => setAssistantCustomer(null)}
                type="button"
              >
                {t("Close")}
              </button>
            </div>
            <CommercialAssistantPanel
              compact
              customerId={assistantCustomer.customerId}
              customerName={assistantCustomer.companyName}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
