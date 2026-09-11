import { useState } from "react";
import { formatCurrency, formatLabel } from "../customers/formatting";
import { prepareCustomerAssistant } from "./api";
import type { CustomerAssistantData } from "./types";

export function CommercialAssistantPanel({
  customerId,
  customerName,
  compact = false
}: {
  customerId: string;
  customerName: string;
  compact?: boolean;
}) {
  const [data, setData] = useState<CustomerAssistantData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function generate() {
    setLoading(true);
    setError(null);
    try {
      setData(await prepareCustomerAssistant(customerId));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Commercial assistant is unavailable.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className={compact ? "assistant-panel assistant-panel--compact" : "assistant-panel"}>
      <div className="assistant-heading">
        <div>
          <p className="eyebrow">Advisory</p>
          <h3>Commercial assistant</h3>
          <p className="muted">{customerName}</p>
        </div>
        <button disabled={loading} onClick={() => void generate()} type="button">
          {loading ? "Preparing..." : data ? "Refresh" : "Prepare call"}
        </button>
      </div>
      <CommercialAssistantContent data={data} error={error} loading={loading} />
    </section>
  );
}

export function CommercialAssistantContent({
  data,
  error,
  loading
}: {
  data: CustomerAssistantData | null;
  error: string | null;
  loading: boolean;
}) {
  if (loading)
    return (
      <div className="assistant-neutral">Preparing grounded recommendations from CRM facts...</div>
    );
  if (error)
    return (
      <div className="assistant-neutral">
        <strong>AI assistance unavailable</strong>
        <p>{error} Continue with the deterministic queue recommendation.</p>
      </div>
    );
  if (!data)
    return (
      <div className="assistant-neutral">
        Not generated yet. Deterministic CRM facts remain authoritative.
      </div>
    );
  return (
    <>
      <section className="assistant-facts">
        <p className="assistant-label">Facts</p>
        <div className="assistant-fact-grid">
          <span>
            Priority{" "}
            <strong>
              {data.deterministic.priority.priorityLevel} ·{" "}
              {data.deterministic.priority.priorityScore}
            </strong>
          </span>
          <span>
            90d turnover{" "}
            <strong>{formatCurrency(data.deterministic.commercial?.turnover90d ?? 0)}</strong>
          </span>
          <span>
            Inactive{" "}
            <strong>{data.deterministic.commercial?.daysSinceLastOrder ?? "Unknown"} days</strong>
          </span>
          <span>
            Actions{" "}
            <strong>{data.deterministic.priority.recommendedActions.join(", ") || "Review"}</strong>
          </span>
        </div>
      </section>
      {data.assistance ? (
        <section className="assistant-advice">
          <p className="assistant-label">AI recommendation</p>
          <dl>
            <dt>Customer summary</dt>
            <dd>{data.assistance.customerSummary}</dd>
            <dt>Why contact now</dt>
            <dd>{data.assistance.priorityExplanation}</dd>
            <dt>Call reason</dt>
            <dd>{data.assistance.callReason}</dd>
            <dt>Call objective</dt>
            <dd>{data.assistance.callObjective}</dd>
            <dt>Recommended action</dt>
            <dd>{data.assistance.recommendedAction}</dd>
            <dt>Suggested opening</dt>
            <dd>{data.assistance.suggestedOpening}</dd>
            <dt>Objections to prepare for</dt>
            <dd>
              {data.assistance.objectionsToPrepareFor.join("; ") ||
                "None identified from available facts."}
            </dd>
            <dt>Cross-sell opportunity</dt>
            <dd>{data.assistance.crossSellOpportunity ?? "Insufficient structured evidence."}</dd>
            <dt>Risk summary</dt>
            <dd>{data.assistance.riskSummary ?? "No additional AI risk summary."}</dd>
          </dl>
          <span className="badge">
            {formatLabel(data.assistance.confidence)} confidence · {data.meta?.provider}
            {data.meta?.cached ? " · cached" : ""}
          </span>
        </section>
      ) : (
        <div className="assistant-neutral">
          <strong>{data.status === "DISABLED" ? "AI disabled" : "Provider unavailable"}</strong>
          <p>{data.message}</p>
        </div>
      )}
    </>
  );
}
