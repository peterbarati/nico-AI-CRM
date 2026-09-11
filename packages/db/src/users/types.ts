import type { UserReference } from "../types";

export type UserRole = "admin" | "manager" | "customer_service" | "sales_rep";

export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: number;
}

export interface ActiveUser extends UserReference {
  role: UserRole;
}
