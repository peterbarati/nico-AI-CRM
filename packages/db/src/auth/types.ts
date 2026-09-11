import type { UserRole } from "../users/types";

export interface AuthUserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  authProvider: string | null;
  authSubject: string | null;
}
