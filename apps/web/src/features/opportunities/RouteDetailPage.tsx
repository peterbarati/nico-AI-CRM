import { useEffect, useState } from "react";
import {
  apiErrorMessage,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber
} from "../../i18n";
import { fetchRoute, planRouteVisit, transitionRoute, updateRoute } from "./api";
import { opportunityLabels, routeStatusLabels } from "./labels";
import type { SalesRouteDetail } from "./types";

export function RouteDetailPage({
  routeId,
  onNavigate
}: {
  routeId: string;
  onNavigate: (path: string) => void;
}) {
  const [route, setRoute] = useState<SalesRouteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function load() {
    setLoading(true);
    setError(null);
    try {
      setRoute(await fetchRoute(routeId));
    } catch (error) {
      setError(apiErrorMessage(error, "Detail trasy nie je dostupný."));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [routeId]);
  async function action(value: "accept" | "start" | "complete" | "cancel" | "recalculate") {
    setBusy(true);
    setError(null);
    try {
      await transitionRoute(routeId, value);
      await load();
    } catch (error) {
      setError(apiErrorMessage(error, "Trasu sa nepodarilo aktualizovať."));
    } finally {
      setBusy(false);
    }
  }
  async function changeOrder(opportunityIds: string[]) {
    setBusy(true);
    setError(null);
    try {
      setRoute(await updateRoute(routeId, opportunityIds));
    } catch (error) {
      setError(apiErrorMessage(error, "Poradie trasy sa nepodarilo zmeniť."));
    } finally {
      setBusy(false);
    }
  }
  async function visit(stopId: string) {
    setBusy(true);
    setError(null);
    try {
      await planRouteVisit(routeId, stopId);
      await load();
    } catch (error) {
      setError(apiErrorMessage(error, "Návštevu sa nepodarilo naplánovať."));
    } finally {
      setBusy(false);
    }
  }
  if (loading) return <div className="loading-state">Načítava sa detail trasy...</div>;
  if (!route)
    return (
      <section className="error-state">
        <h2>Trasa nie je dostupná</h2>
        <p>{error}</p>
      </section>
    );
  const ids = route.stops.map((stop) => stop.opportunityId);
  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Denná trasa</p>
          <h2>
            {formatDate(route.routeDate)} · {route.salesRep.name}
          </h2>
        </div>
        <button
          className="secondary-button"
          onClick={() => onNavigate("/sales/routes")}
          type="button"
        >
          Späť na trasy
        </button>
      </div>
      {error ? <p className="error-notice">{error}</p> : null}
      <div className="metric-grid route-summary">
        <article className="metric-card">
          <span>Stav</span>
          <strong>{routeStatusLabels[route.status]}</strong>
        </article>
        <article className="metric-card">
          <span>Zastávky</span>
          <strong>{route.stopCount}</strong>
        </article>
        <article className="metric-card">
          <span>Vzdialenosť</span>
          <strong>{formatNumber(route.plannedDistanceKm)} km</strong>
        </article>
        <article className="metric-card">
          <span>Jazda</span>
          <strong>{route.plannedTravelMinutes} min</strong>
        </article>
        <article className="metric-card">
          <span>Celkom</span>
          <strong>{route.plannedDurationMinutes} min</strong>
        </article>
        <article className="metric-card">
          <span>Odhad hodnoty</span>
          <strong>{formatCurrency(route.estimatedValue)}</strong>
        </article>
      </div>
      <div className="task-actions route-actions">
        {route.status === "RECOMMENDED" ? (
          <button disabled={busy} onClick={() => void action("accept")} type="button">
            Prijať trasu
          </button>
        ) : null}
        {route.status === "ACCEPTED" ? (
          <button disabled={busy} onClick={() => void action("start")} type="button">
            Začať trasu
          </button>
        ) : null}
        {route.status === "IN_PROGRESS" ? (
          <button disabled={busy} onClick={() => void action("complete")} type="button">
            Dokončiť trasu
          </button>
        ) : null}
        {["RECOMMENDED", "ACCEPTED"].includes(route.status) ? (
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void action("recalculate")}
            type="button"
          >
            Prepočítať trasu
          </button>
        ) : null}
        {!["COMPLETED", "CANCELLED"].includes(route.status) ? (
          <button
            className="secondary-button"
            disabled={busy}
            onClick={() => void action("cancel")}
            type="button"
          >
            Zrušiť trasu
          </button>
        ) : null}
      </div>
      <div className="table-wrap">
        <table className="crm-table route-stop-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Zákazník</th>
              <th>Príchod</th>
              <th>Typ príležitosti</th>
              <th>Skóre</th>
              <th>Presun</th>
              <th>Návšteva</th>
              <th>Akcie</th>
            </tr>
          </thead>
          <tbody>
            {route.stops.map((stop, index) => (
              <tr key={stop.id}>
                <td>{stop.sequence}</td>
                <td>
                  <button
                    className="link-button"
                    onClick={() => onNavigate(`/customers/${stop.customerId}`)}
                    type="button"
                  >
                    {stop.customerName}
                  </button>
                  <span>
                    {stop.locationName}, {stop.city}
                  </span>
                </td>
                <td>{formatDateTime(stop.plannedArrival)}</td>
                <td>{opportunityLabels[stop.opportunityType]}</td>
                <td>{formatNumber(stop.opportunityScore)}</td>
                <td>
                  {formatNumber(stop.distanceFromPreviousKm)} km ·{" "}
                  {stop.travelTimeFromPreviousMinutes} min
                </td>
                <td>{stop.salesVisitId ? "Naplánovaná" : "Bez návštevy"}</td>
                <td>
                  <div className="task-actions">
                    <button
                      aria-label="Posunúť vyššie"
                      disabled={busy || index === 0}
                      onClick={() => {
                        const next = [...ids];
                        [next[index - 1], next[index]] = [next[index]!, next[index - 1]!];
                        void changeOrder(next);
                      }}
                      title="Posunúť vyššie"
                      type="button"
                    >
                      ↑
                    </button>
                    <button
                      aria-label="Posunúť nižšie"
                      disabled={busy || index === ids.length - 1}
                      onClick={() => {
                        const next = [...ids];
                        [next[index], next[index + 1]] = [next[index + 1]!, next[index]!];
                        void changeOrder(next);
                      }}
                      title="Posunúť nižšie"
                      type="button"
                    >
                      ↓
                    </button>
                    <button
                      className="secondary-button"
                      disabled={busy}
                      onClick={() =>
                        void changeOrder(ids.filter((id) => id !== stop.opportunityId))
                      }
                      type="button"
                    >
                      Odobrať
                    </button>
                    {!stop.salesVisitId && ["ACCEPTED", "IN_PROGRESS"].includes(route.status) ? (
                      <button disabled={busy} onClick={() => void visit(stop.id)} type="button">
                        Naplánovať návštevu
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {route.nearbyOpportunities?.length ? (
        <section className="settings-section">
          <h3>Návrhy po trase</h3>
          <div className="table-wrap">
            <table className="crm-table crm-table--compact">
              <thead>
                <tr>
                  <th>Zákazník</th>
                  <th>Typ</th>
                  <th>Skóre</th>
                  <th>Zachádzka</th>
                  <th>Akcia</th>
                </tr>
              </thead>
              <tbody>
                {route.nearbyOpportunities.map((item) => (
                  <tr key={item.opportunityId}>
                    <td>
                      {item.opportunity.customerName}
                      <span>{item.opportunity.city}</span>
                    </td>
                    <td>{opportunityLabels[item.opportunity.opportunityType]}</td>
                    <td>{formatNumber(item.opportunity.score)}</td>
                    <td>
                      +{item.estimatedExtraMinutes} min · {formatNumber(item.detourDistanceKm)} km
                    </td>
                    <td>
                      <button
                        disabled={busy}
                        onClick={() => void changeOrder([...ids, item.opportunityId])}
                        type="button"
                      >
                        Pridať do trasy
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
      <p className="route-disclaimer">
        Vzdialenosti a časy sú orientačné. Modul nepoužíva živé mapy, dopravné údaje ani
        geokódovanie.
      </p>
    </section>
  );
}
