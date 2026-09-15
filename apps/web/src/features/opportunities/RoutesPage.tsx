import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import type { UserReference } from "../customers/types";
import { fetchSalesUsers } from "../sales/api";
import { apiErrorMessage, formatCurrency, formatDate, formatNumber } from "../../i18n";
import { fetchRoutes, generateRoute, updateRoute } from "./api";
import { routeStatusLabels } from "./labels";
import type { SalesRoute } from "./types";

export function RoutesPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { actor } = useAuth();
  const [salesRepId, setSalesRepId] = useState(actor.role === "sales_rep" ? actor.id : "");
  const [routeDate, setRouteDate] = useState(new Date().toISOString().slice(0, 10));
  const [users, setUsers] = useState<UserReference[]>([]);
  const [items, setItems] = useState<SalesRoute[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedOpportunityId = new URLSearchParams(window.location.search).get("opportunity");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setItems((await fetchRoutes(salesRepId)).items);
    } catch (error) {
      setError(apiErrorMessage(error, "Denné trasy momentálne nie sú dostupné."));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [salesRepId]);
  useEffect(() => {
    if (actor.role !== "sales_rep") void fetchSalesUsers().then(setUsers);
  }, [actor.role]);

  async function create() {
    const target = actor.role === "sales_rep" ? actor.id : salesRepId;
    if (!target) {
      setError("Vyberte obchodného zástupcu.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await generateRoute(target, routeDate);
      let route = result.route;
      if (
        selectedOpportunityId &&
        !route.stops.some((stop) => stop.opportunityId === selectedOpportunityId)
      ) {
        route = await updateRoute(route.id, [
          ...route.stops.map((stop) => stop.opportunityId),
          selectedOpportunityId
        ]);
      }
      onNavigate(`/sales/routes/${route.id}`);
    } catch (error) {
      setError(apiErrorMessage(error, "Trasu sa nepodarilo vygenerovať."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Obchod</p>
          <h2>Denné trasy</h2>
        </div>
        <p>Približné plánovanie bez živých máp a dopravných údajov.</p>
      </div>
      <section className="filter-panel route-filters">
        {actor.role !== "sales_rep" ? (
          <label>
            Obchodník
            <select value={salesRepId} onChange={(event) => setSalesRepId(event.target.value)}>
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
          Dátum trasy
          <input
            type="date"
            value={routeDate}
            onChange={(event) => setRouteDate(event.target.value)}
          />
        </label>
        <button disabled={busy} onClick={() => void create()} type="button">
          Vygenerovať trasu
        </button>
      </section>
      {selectedOpportunityId ? (
        <p className="success-notice">Vybraná príležitosť bude pridaná do vytvorenej trasy.</p>
      ) : null}
      {loading ? <div className="loading-state">Načítavajú sa trasy...</div> : null}
      {error ? (
        <section className="error-state">
          <h2>Trasy nie sú dostupné</h2>
          <p>{error}</p>
        </section>
      ) : null}
      {!loading && !error ? (
        <div className="table-wrap">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Dátum</th>
                <th>Obchodník</th>
                <th>Stav</th>
                <th>Zastávky</th>
                <th>Vzdialenosť</th>
                <th>Trvanie</th>
                <th>Odhad hodnoty</th>
                <th>Akcia</th>
              </tr>
            </thead>
            <tbody>
              {items.map((route) => (
                <tr key={route.id}>
                  <td>{formatDate(route.routeDate)}</td>
                  <td>{route.salesRep.name}</td>
                  <td>{routeStatusLabels[route.status]}</td>
                  <td>{route.stopCount}</td>
                  <td>{formatNumber(route.plannedDistanceKm)} km</td>
                  <td>{route.plannedDurationMinutes} min</td>
                  <td>{formatCurrency(route.estimatedValue)}</td>
                  <td>
                    <button onClick={() => onNavigate(`/sales/routes/${route.id}`)} type="button">
                      Otvoriť trasu
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length === 0 ? (
            <div className="empty-state">
              <h3>Žiadne trasy</h3>
              <p>Pre vybraný rozsah ešte nebola vytvorená trasa.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
