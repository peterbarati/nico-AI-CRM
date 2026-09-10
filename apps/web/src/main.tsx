import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import type { HealthResponse } from "@nico-ai-crm/shared";
import "./styles.css";

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    fetch("/api/health")
      .then((response) => {
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }

        return response.json() as Promise<HealthResponse>;
      })
      .then((data) => {
        if (mounted) {
          setHealth(data);
        }
      })
      .catch((unknownError: unknown) => {
        if (mounted) {
          setError(unknownError instanceof Error ? unknownError.message : "API unavailable");
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const statusText = health?.ok ? "Online" : error ? "Unavailable" : "Checking";

  return (
    <main className="app-shell">
      <section className="status-panel" aria-labelledby="page-title">
        <p className="eyebrow">Internal customer platform</p>
        <h1 id="page-title">NICO AI CRM</h1>
        <div className="api-status" aria-live="polite">
          <span className={`status-dot ${health?.ok ? "status-dot--online" : ""}`} />
          <span>API status: {statusText}</span>
        </div>
        {health ? <p className="detail">Mode: {health.mode}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    </main>
  );
}

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
