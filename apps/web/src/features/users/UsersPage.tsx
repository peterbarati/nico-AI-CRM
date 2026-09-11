import { useEffect, useState } from "react";
import { formatLabel } from "../customers/formatting";
import { fetchUsers } from "./api";
import type { UserAdminItem } from "./types";

export function UsersPage() {
  const [users, setUsers] = useState<UserAdminItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch((error: unknown) => {
        setError(error instanceof Error ? error.message : "Users could not be loaded.");
      });
  }, []);
  if (error)
    return (
      <section className="error-state">
        <h2>Users unavailable</h2>
        <p>{error}</p>
      </section>
    );
  if (!users) return <div className="loading-state">Loading CRM users...</div>;
  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Users</h2>
        </div>
        <p>Read-only CRM identity mapping status.</p>
      </div>
      <div className="table-wrap">
        <table className="crm-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Identity</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </td>
                <td>{formatLabel(user.role)}</td>
                <td>{user.active ? "Active" : "Inactive"}</td>
                <td>{user.identityMapped ? `Mapped (${user.authProvider})` : "Not mapped"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
