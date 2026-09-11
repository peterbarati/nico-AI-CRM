import type { AuthProvider, ProviderIdentity } from "./types";

export const mockAuthCookieName = "nico_mock_user";

export class MockAuthProvider implements AuthProvider {
  readonly mode = "MOCK" as const;

  async authenticate(request: Request): Promise<ProviderIdentity | null> {
    const userId =
      request.headers.get("x-mock-user-id")?.trim() ||
      readCookie(request.headers.get("cookie"), mockAuthCookieName);
    if (!userId) return null;
    return {
      provider: "mock",
      subject: userId,
      crmUserId: userId,
      email: null,
      name: null
    };
  }
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return null;
}
