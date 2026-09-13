import { useEffect, useState } from "react";
import { fetchAuthConfiguration, fetchMockUsers } from "./api";
import type { AuthApiError, AuthConfiguration, MockUser } from "./types";
import { apiErrorMessage, displayLabel, t } from "../../i18n";

export function LoginPage({
  error,
  onSelect
}: {
  error: AuthApiError | null;
  onSelect: (userId: string) => Promise<void>;
}) {
  const [bootstrap, setBootstrap] = useState<LoginBootstrapState>(initialLoginBootstrapState);
  const [localError, setLocalError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadLoginBootstrap().then((state) => {
      if (active) setBootstrap(state);
    });
    return () => {
      active = false;
    };
  }, []);

  async function select(userId: string) {
    setSelecting(userId);
    setLocalError(null);
    try {
      await onSelect(userId);
    } catch (error) {
      setLocalError(apiErrorMessage(error, "Používateľa sa nepodarilo vybrať."));
      setSelecting(null);
    }
  }

  return (
    <LoginPageContent
      bootstrap={bootstrap}
      error={error}
      localError={localError}
      selecting={selecting}
      select={select}
    />
  );
}

export interface LoginBootstrapState {
  loading: boolean;
  configuration: AuthConfiguration | null;
  users: MockUser[];
  error: string | null;
}

export const initialLoginBootstrapState: LoginBootstrapState = {
  loading: true,
  configuration: null,
  users: [],
  error: null
};

export async function loadLoginBootstrap(): Promise<LoginBootstrapState> {
  try {
    const configuration = await fetchAuthConfiguration();
    const users = configuration.mode === "MOCK" ? await fetchMockUsers() : [];
    return { loading: false, configuration, users, error: null };
  } catch (error) {
    return {
      loading: false,
      configuration: null,
      users: [],
      error: apiErrorMessage(error, "Služba prihlásenia momentálne nie je dostupná.")
    };
  }
}

export function LoginPageContent({
  error,
  bootstrap,
  localError,
  selecting,
  select
}: {
  error: AuthApiError | null;
  bootstrap: LoginBootstrapState;
  localError: string | null;
  selecting: string | null;
  select: (userId: string) => Promise<void>;
}) {
  const message =
    localError ??
    bootstrap.error ??
    (error && error.code !== "UNAUTHENTICATED"
      ? apiErrorMessage(error, "Služba prihlásenia momentálne nie je dostupná.")
      : null);

  return (
    <main className="auth-screen">
      <section className="auth-panel">
        <p className="eyebrow">NICO AI CRM</p>
        <h1>{t("Sign in")}</h1>
        {message ? <p className="auth-message">{message}</p> : null}
        {bootstrap.loading ? <p>{t("Loading authentication options...")}</p> : null}
        {bootstrap.configuration?.mode === "OIDC" ? (
          bootstrap.configuration.loginUrl ? (
            <a className="primary-link" href={bootstrap.configuration.loginUrl}>
              {t("Continue with company identity")}
            </a>
          ) : (
            <p className="auth-message">{t("Company sign-in URL is not configured.")}</p>
          )
        ) : null}
        {bootstrap.configuration?.mode === "MOCK" ? (
          <div className="mock-user-list">
            <p className="muted">{t("Local development identities")}</p>
            {bootstrap.users.map((user) => (
              <button
                disabled={selecting !== null}
                key={user.id}
                onClick={() => void select(user.id)}
                type="button"
              >
                <strong>{user.name}</strong>
                <span>{displayLabel(user.role)}</span>
                {!user.active ? <span>{t("Inactive")}</span> : null}
              </button>
            ))}
          </div>
        ) : null}
      </section>
    </main>
  );
}
