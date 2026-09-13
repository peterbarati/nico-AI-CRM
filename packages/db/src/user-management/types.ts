import type { UserRole } from "../users/types";
import type { PaginationInput, SortDirection } from "../types";

export type UserAdminSortField = "name" | "email" | "role" | "active" | "created_at" | "updated_at";
export type UserManagementAction = "created" | "updated" | "activated" | "deactivated";

export interface UserAdminListQuery extends PaginationInput {
  search?: string;
  role?: UserRole;
  active?: boolean;
  sort?: UserAdminSortField;
  direction?: SortDirection;
}

export interface UserAdminRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  authProvider: string | null;
  authSubject: string | null;
  identityMapped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserAdminValues {
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  authProvider: string | null;
  authSubject: string | null;
}

export interface CreateUserCommand {
  id: string;
  actorUserId: string;
  auditId: string;
  createdAt: string;
  values: UserAdminValues;
}

export interface UpdateUserCommand {
  userId: string;
  actorUserId: string;
  auditId: string;
  updatedAt: string;
  values: UserAdminValues;
}

export interface SetUserActiveCommand {
  userId: string;
  actorUserId: string;
  auditId: string;
  updatedAt: string;
  active: boolean;
}

export type UserManagementErrorCode =
  "EMAIL_ALREADY_EXISTS" | "IDENTITY_ALREADY_MAPPED" | "LAST_ADMIN_PROTECTED" | "USER_NOT_FOUND";

export class UserManagementError extends Error {
  constructor(
    public readonly code: UserManagementErrorCode,
    message: string
  ) {
    super(message);
    this.name = "UserManagementError";
  }
}
