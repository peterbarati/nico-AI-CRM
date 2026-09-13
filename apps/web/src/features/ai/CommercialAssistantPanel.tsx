import { useState } from "react";
import { formatCurrency } from "../customers/formatting";
import { prepareCustomerAssistant } from "./api";
import type { CustomerAssistantData } from "./types";
import { apiErrorMessage, displayLabel, formatDays, priorityLabel, t } from "../../i18n";

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
      setError(apiErrorMessage(error, "AI asistent momentálne nie je dostupný."));
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className={compact ? "assistant-panel assistant-panel--compact" : "assistant-panel"}>
      <div className="assistant-heading">
        <div>
          <p className="eyebrow">{t("Advisory")}</p>
          <h3>{t("Commercial assistant")}</h3>
          <p className="muted">{customerName}</p>
        </div>
        <button disabled={loading} onClick={() => void generate()} type="button">
          {loading ? t("Preparing...") : data ? t("Refresh") : t("Prepare call")}
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
      <div className="assistant-neutral">
        {t("Preparing grounded recommendations from CRM facts...")}
      </div>
    );
  if (error)
    return (
      <div className="assistant-neutral">
        <strong>{t("AI assistance unavailable")}</strong>
        <p>
          {error} {t("Continue with the deterministic queue recommendation.")}
        </p>
      </div>
    );
  if (!data)
    return (
      <div className="assistant-neutral">
        {t("Not generated yet. Deterministic CRM facts remain authoritative.")}
      </div>
    );
  return (
    <>
      <section className="assistant-facts">
        <p className="assistant-label">{t("Facts")}</p>
        <div className="assistant-fact-grid">
          <span>
            {t("Priority")}{" "}
            <strong>
              {priorityLabel(data.deterministic.priority.priorityLevel)} ·{" "}
              {data.deterministic.priority.priorityScore}
            </strong>
          </span>
          <span>
            {t("90d turnover")}{" "}
            <strong>{formatCurrency(data.deterministic.commercial?.turnover90d ?? 0)}</strong>
          </span>
          <span>
            {t("Inactive days")}{" "}
            <strong>{formatDays(data.deterministic.commercial?.daysSinceLastOrder)}</strong>
          </span>
          <span>
            {t("Actions")}{" "}
            <strong>
              {data.deterministic.priority.recommendedActions.map(displayLabel).join(", ") ||
                t("Review customer status")}
            </strong>
          </span>
        </div>
      </section>
      {data.assistance ? (
        <section className="assistant-advice">
          <p className="assistant-label">{t("AI recommendation")}</p>
          <dl>
            <dt>{t("Customer summary")}</dt>
            <dd>{data.assistance.customerSummary}</dd>
            <dt>{t("Why contact now")}</dt>
            <dd>{data.assistance.priorityExplanation}</dd>
            <dt>{t("Call reason")}</dt>
            <dd>{data.assistance.callReason}</dd>
            <dt>{t("Call objective")}</dt>
            <dd>{data.assistance.callObjective}</dd>
            <dt>{t("Recommended action")}</dt>
            <dd>{data.assistance.recommendedAction}</dd>
            <dt>{t("Suggested opening")}</dt>
            <dd>{data.assistance.suggestedOpening}</dd>
            <dt>{t("Objections to prepare for")}</dt>
            <dd>
              {data.assistance.objectionsToPrepareFor.join("; ") ||
                t("None identified from available facts.")}
            </dd>
            <dt>{t("Cross-sell opportunity")}</dt>
            <dd>
              {data.assistance.crossSellOpportunity ?? t("Insufficient structured evidence.")}
            </dd>
            <dt>{t("Risk summary")}</dt>
            <dd>{data.assistance.riskSummary ?? t("No additional AI risk summary.")}</dd>
          </dl>
          <span className="badge">
            {t("Confidence")}: {displayLabel(data.assistance.confidence)} ·{" "}
            {displayLabel(data.meta?.provider)}
            {data.meta?.cached ? ` · ${t("cached")}` : ""}
          </span>
        </section>
      ) : (
        <div className="assistant-neutral">
          <strong>
            {data.status === "DISABLED" ? t("AI disabled") : t("Provider unavailable")}
          </strong>
          <p>{t("AI assistance unavailable")}</p>
        </div>
      )}
    </>
  );
}
