import { useEffect, useState } from "react";
import { opportunityStatuses, opportunityTypes } from "@nico-ai-crm/shared";
import { useAuth } from "../auth/AuthContext";
import { PaginationControls } from "../customers/PaginationControls";
import type { UserReference } from "../customers/types";
import { fetchSalesUsers } from "../sales/api";
import { apiErrorMessage, formatCurrency, formatDateTime, formatNumber } from "../../i18n";
import { fetchOpportunities, generateOpportunities, transitionOpportunity } from "./api";
import { opportunityLabels, opportunityStatusLabels, reasonLabels } from "./labels";
import type { OpportunityFilters, OpportunityItem } from "./types";

const initialFilters: OpportunityFilters = {
  page: 1,
  pageSize: 20,
  salesRepId: "",
  type: "",
  status: "OPEN",
  minimumScore: "",
  hasCoordinates: ""
};

export function OpportunitiesPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { actor } = useAuth();
  const [filters, setFilters] = useState({
    ...initialFilters,
    salesRepId: actor.role === "sales_rep" ? actor.id : ""
  });
  const [items, setItems] = useState<OpportunityItem[]>([]);
  const [pagination, setPagination] = useState<
    Awaited<ReturnType<typeof fetchOpportunities>>["pagination"] | null
  >(null);
  const [users, setUsers] = useState<UserReference[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetchOpportunities(filters)
      .then((result) => {
        if (mounted) {
          setItems(result.items);
          setPagination(result.pagination);
        }
      })
      .catch(
        (error: unknown) =>
          mounted && setError(apiErrorMessage(error, "Príležitosti momentálne nie sú dostupné."))
      )
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [filters, revision]);
  useEffect(() => {
    if (actor.role !== "sales_rep") void fetchSalesUsers().then(setUsers);
  }, [actor.role]);

  const update = (key: keyof OpportunityFilters, value: string) =>
    setFilters((current) => ({ ...current, [key]: value, page: 1 }));
  async function generate() {
    const salesRepId = actor.role === "sales_rep" ? actor.id : filters.salesRepId;
    if (!salesRepId) {
      setError("Vyberte obchodného zástupcu.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await generateOpportunities(salesRepId);
      setNotice(`Vytvorené: ${result.created}, aktualizované: ${result.refreshed}.`);
      setRevision((value) => value + 1);
    } catch (error) {
      setError(apiErrorMessage(error, "Príležitosti sa nepodarilo vygenerovať."));
    } finally {
      setBusy(false);
    }
  }
  async function action(id: string, value: "accept" | "dismiss") {
    setBusy(true);
    setError(null);
    try {
      await transitionOpportunity(id, value);
      setRevision((current) => current + 1);
    } catch (error) {
      setError(apiErrorMessage(error, "Stav príležitosti sa nepodarilo zmeniť."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Obchod</p>
          <h2>Obchodné príležitosti</h2>
        </div>
        <div className="page-heading-actions">
          <p>Deterministické odporúčania s vysvetlením skóre.</p>
          <button disabled={busy} onClick={() => void generate()} type="button">
            Generovať príležitosti
          </button>
        </div>
      </div>
      <section
        className="filter-panel opportunity-filters"
        aria-label="Filtre obchodných príležitostí"
      >
        {actor.role !== "sales_rep" ? (
          <label>
            Obchodník
            <select
              value={filters.salesRepId}
              onChange={(event) => update("salesRepId", event.target.value)}
            >
              <option value="">Všetci obchodníci</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          Typ
          <select value={filters.type} onChange={(event) => update("type", event.target.value)}>
            <option value="">Všetky typy</option>
            {opportunityTypes.map((type) => (
              <option key={type} value={type}>
                {opportunityLabels[type]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Stav
          <select value={filters.status} onChange={(event) => update("status", event.target.value)}>
            <option value="">Všetky stavy</option>
            {opportunityStatuses.map((status) => (
              <option key={status} value={status}>
                {opportunityStatusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Minimálne skóre
          <input
            min="0"
            max="100"
            type="number"
            value={filters.minimumScore}
            onChange={(event) => update("minimumScore", event.target.value)}
          />
        </label>
        <label>
          Súradnice
          <select
            value={filters.hasCoordinates}
            onChange={(event) => update("hasCoordinates", event.target.value)}
          >
            <option value="">Všetky</option>
            <option value="true">Dostupné</option>
            <option value="false">Chýbajú</option>
          </select>
        </label>
      </section>
      {notice ? <p className="success-notice">{notice}</p> : null}
      {loading ? <div className="loading-state">Načítavajú sa príležitosti...</div> : null}
      {error ? (
        <section className="error-state">
          <h2>Príležitosti nie sú dostupné</h2>
          <p>{error}</p>
        </section>
      ) : null}
      {!loading && !error ? (
        <div className="table-wrap">
          <table className="crm-table opportunity-table">
            <thead>
              <tr>
                <th>Zákazník</th>
                <th>Typ</th>
                <th>Skóre</th>
                <th>Odhad hodnoty</th>
                <th>Hlavný dôvod</th>
                <th>Posledná objednávka</th>
                <th>Posledná návšteva</th>
                <th>Obchodník</th>
                <th>Stav</th>
                <th>Vygenerované</th>
                <th>Akcie</th>
              </tr>
            </thead>
            {items.map((item) => (
              <tbody key={item.id} className="table-row-group">
                <tr>
                  <td>
                    <button
                      className="link-button"
                      onClick={() => onNavigate(`/customers/${item.customerId}`)}
                      type="button"
                    >
                      {item.customerName}
                    </button>
                    <span>
                      {item.locationName}, {item.city}
                    </span>
                  </td>
                  <td>{opportunityLabels[item.opportunityType]}</td>
                  <td>
                    <strong>{formatNumber(item.score)}</strong>/100
                  </td>
                  <td>{formatCurrency(item.estimatedValue)}</td>
                  <td>
                    <button
                      className="link-button"
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      type="button"
                    >
                      {reasonLabels[item.primaryReasonCode] ?? "Obchodný signál"}
                    </button>
                  </td>
                  <td>{factDate(item, "lastOrderDate")}</td>
                  <td>{factDate(item, "lastVisitDate")}</td>
                  <td>{item.salesRep.name}</td>
                  <td>{opportunityStatusLabels[item.status]}</td>
                  <td>{formatDateTime(item.generatedAt)}</td>
                  <td>
                    <div className="task-actions">
                      {item.status === "OPEN" ? (
                        <>
                          <button
                            disabled={busy}
                            onClick={() => void action(item.id, "accept")}
                            type="button"
                          >
                            Prijať
                          </button>
                          <button
                            className="secondary-button"
                            disabled={busy}
                            onClick={() => void action(item.id, "dismiss")}
                            type="button"
                          >
                            Zamietnuť
                          </button>
                        </>
                      ) : null}
                      <button
                        className="secondary-button"
                        disabled={!item.hasCoordinates}
                        onClick={() => onNavigate(`/sales/routes?opportunity=${item.id}`)}
                        type="button"
                      >
                        Pridať do trasy
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === item.id ? (
                  <tr className="opportunity-reasons">
                    <td colSpan={11}>
                      <strong>Prečo táto príležitosť vznikla</strong>
                      <ul>
                        {item.reasonCodes.map((reason) => (
                          <li key={reason.code}>
                            {reasonLabels[reason.code] ?? reason.code}: +
                            {formatNumber(reason.contribution)} bodov
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            ))}
          </table>
        </div>
      ) : null}
      <PaginationControls
        pagination={pagination}
        onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
      />
    </section>
  );
}

function factDate(item: OpportunityItem, key: string): string {
  const value = item.facts[key];
  return typeof value === "string" ? formatDateTime(value) : "Bez dátumu";
}
