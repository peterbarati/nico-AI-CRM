import type { Permission, UserRole } from "@nico-ai-crm/auth";

export interface CurrentActor {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  provider: string;
  permissions: Permission[];
}

export interface AuthConfiguration {
  mode: "MOCK" | "OIDC";
  loginUrl: string | null;
  logoutUrl: string | null;
}

export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  identityMapped: boolean;
}

export class AuthApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number
  ) {
    super(message);
    this.name = "AuthApiError";
  }
}
