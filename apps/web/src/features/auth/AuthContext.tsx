import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { endSession, fetchCurrentActor, selectMockUser } from "./api";
import { LoginPage } from "./LoginPage";
import type { CurrentActor } from "./types";
import { AuthApiError } from "./types";

interface AuthState {
  actor: CurrentActor;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [actor, setActor] = useState<CurrentActor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthApiError | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setActor(await fetchCurrentActor());
      setError(null);
    } catch (error) {
      setActor(null);
      setError(
        error instanceof AuthApiError
          ? error
          : new AuthApiError("AUTH_REQUEST_FAILED", "Authentication is unavailable.", 0)
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AuthState | null>(
    () =>
      actor
        ? {
            actor,
            refresh,
            logout: async () => {
              const result = await endSession();
              setActor(null);
              if (result.logoutUrl) window.location.assign(result.logoutUrl);
            }
          }
        : null,
    [actor, refresh]
  );

  if (loading) return <div className="auth-screen">Checking secure session...</div>;
  if (!value) {
    return (
      <LoginPage
        error={error}
        onSelect={async (userId) => {
          await selectMockUser(userId);
          await refresh();
        }}
      />
    );
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
