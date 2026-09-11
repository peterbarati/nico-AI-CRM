import type { UserRole } from "@nico-ai-crm/auth";

export interface UserAdminItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  authProvider: string | null;
  identityMapped: boolean;
}
