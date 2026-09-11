import type { UserAdminItem } from "./types";

export async function fetchUsers(): Promise<UserAdminItem[]> {
  const response = await fetch("/api/admin/users");
  const body = (await response.json()) as {
    ok: boolean;
    data?: UserAdminItem[];
    error?: { message?: string };
  };
  if (!response.ok || !body.ok || !body.data) {
    throw new Error(body.error?.message ?? "Users could not be loaded.");
  }
  return body.data;
}
