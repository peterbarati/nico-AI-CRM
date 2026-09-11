import { useEffect, useState } from "react";
import { fetchAuthConfiguration, fetchMockUsers } from "./api";
import type { AuthApiError, AuthConfiguration, MockUser } from "./types";

export function LoginPage({
  error,
  onSelect
}: {
  error: AuthApiError | null;
  onSelect: (userId: string) => Promise<void>;
}) {
  const [configuration, setConfiguration] = useState<AuthConfiguration | null>(null);
  const [users, setUsers] = useState<MockUser[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    fetchAuthConfiguration()
      .then(async (config) => {
        setConfiguration(config);
        if (config.mode === "MOCK") setUsers(await fetchMockUsers());
      })
      .catch((error: unknown) =>
        setLocalError(error instanceof Error ? error.message : "Authentication is unavailable.")
      );
  }, []);

  async function select(userId: string) {
    setSelecting(userId);
    setLocalError(null);
    try {
      await onSelect(userId);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : "User selection failed.");
      setSelecting(null);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <p className="eyebrow">NICO AI CRM</p>
        <h1>Sign in</h1>
        {error && error.code !== "UNAUTHENTICATED" ? (
          <p className="auth-message">{error.message}</p>
        ) : null}
        {localError ? <p className="auth-message">{localError}</p> : null}
        {!configuration ? <p>Loading authentication options...</p> : null}
        {configuration?.mode === "OIDC" ? (
          configuration.loginUrl ? (
            <a className="primary-link" href={configuration.loginUrl}>
              Continue with company identity
            </a>
          ) : (
            <p className="auth-message">Company sign-in URL is not configured.</p>
          )
        ) : null}
        {configuration?.mode === "MOCK" ? (
          <div className="mock-user-list">
            <p className="muted">Local development identities</p>
            {users.map((user) => (
              <button
                disabled={selecting !== null}
                key={user.id}
                onClick={() => void select(user.id)}
                type="button"
              >
                <strong>{user.name}</strong>
                <span>{user.role.replaceAll("_", " ")}</span>
                {!user.active ? <span>Inactive</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
