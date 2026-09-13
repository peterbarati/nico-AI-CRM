import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { formatLabel } from "../customers/formatting";
import { createUser, fetchUsers, setUserActive, updateUser } from "./api";
import { UserFormModal } from "./UserFormModal";
import type { UserAdminItem, UserAdminValues, UserListFilters, UserListResult } from "./types";

export const initialUserFilters: UserListFilters = {
  page: 1,
  pageSize: 20,
  search: "",
  role: "",
  active: "",
  sort: "name",
  direction: "asc"
};

export function UsersPage() {
  const { refresh } = useAuth();
  const [filters, setFilters] = useState(initialUserFilters);
  const [result, setResult] = useState<UserListResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UserAdminItem | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setResult(await fetchUsers(filters));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Users could not be loaded.");
    }
  }, [filters]);

  useEffect(() => void load(), [load]);

  async function save(values: UserAdminValues) {
    setSaving(true);
    setFormError(null);
    try {
      if (editing) await updateUser(editing.id, values);
      else await createUser(values);
      setEditing(undefined);
      await Promise.all([load(), refresh()]);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "User could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function changeActive(user: UserAdminItem, active: boolean) {
    if (!active && !confirmDeactivation(user)) {
      return;
    }
    setError(null);
    try {
      await setUserActive(user.id, active);
      await Promise.all([load(), refresh()]);
    } catch (error) {
      setError(error instanceof Error ? error.message : "User status could not be changed.");
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h2>Users</h2>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setEditing(null);
          }}
          type="button"
        >
          Add user
        </button>
      </div>
      <UserFilters filters={filters} onChange={setFilters} />
      {error ? <p className="form-error">{error}</p> : null}
      {!result ? (
        <div className="loading-state">Loading CRM users...</div>
      ) : (
        <UserTable
          users={result.items}
          onEdit={(user) => {
            setFormError(null);
            setEditing(user);
          }}
          onActiveChange={(user, active) => void changeActive(user, active)}
        />
      )}
      {result ? (
        <div className="pagination" aria-label="User list pagination">
          <button
            disabled={result.pagination.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            type="button"
          >
            Previous
          </button>
          <span>
            Page {result.pagination.page} of {result.pagination.totalPages || 1} ·{" "}
            {result.pagination.total} users
          </span>
          <button
            disabled={result.pagination.page >= result.pagination.totalPages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            type="button"
          >
            Next
          </button>
        </div>
      ) : null}
      {editing !== undefined ? (
        <UserFormModal
          user={editing}
          saving={saving}
          error={formError}
          onCancel={() => setEditing(undefined)}
          onSave={save}
        />
      ) : null}
    </section>
  );
}

export function confirmDeactivation(
  user: Pick<UserAdminItem, "name">,
  confirm: (message: string) => boolean = window.confirm
) {
  return confirm(`Deactivate ${user.name}? Their CRM history will be preserved.`);
}

export function UserFilters({
  filters,
  onChange
}: {
  filters: UserListFilters;
  onChange: (filters: UserListFilters) => void;
}) {
  return (
    <div className="filter-panel users-filter-panel">
      <label>
        <span>Search</span>
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value, page: 1 })}
          placeholder="Name, email, or auth subject"
        />
      </label>
      <label>
        <span>Role</span>
        <select
          value={filters.role}
          onChange={(event) =>
            onChange({ ...filters, role: event.target.value as UserListFilters["role"], page: 1 })
          }
        >
          <option value="">All roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="customer_service">Customer Service</option>
          <option value="sales_rep">Sales Representative</option>
        </select>
      </label>
      <label>
        <span>Status</span>
        <select
          value={filters.active}
          onChange={(event) =>
            onChange({
              ...filters,
              active: event.target.value as UserListFilters["active"],
              page: 1
            })
          }
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </label>
      <label>
        <span>Sort</span>
        <select
          value={filters.sort}
          onChange={(event) =>
            onChange({ ...filters, sort: event.target.value as UserListFilters["sort"], page: 1 })
          }
        >
          <option value="name">Name</option>
          <option value="email">Email</option>
          <option value="role">Role</option>
          <option value="active">Status</option>
          <option value="created_at">Created</option>
          <option value="updated_at">Updated</option>
        </select>
      </label>
      <label>
        <span>Direction</span>
        <select
          value={filters.direction}
          onChange={(event) =>
            onChange({
              ...filters,
              direction: event.target.value as UserListFilters["direction"],
              page: 1
            })
          }
        >
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>
      </label>
    </div>
  );
}

export function UserTable({
  users,
  onEdit,
  onActiveChange
}: {
  users: UserAdminItem[];
  onEdit: (user: UserAdminItem) => void;
  onActiveChange: (user: UserAdminItem, active: boolean) => void;
}) {
  if (!users.length) return <div className="empty-state">No users match the selected filters.</div>;
  return (
    <div className="table-wrap">
      <table className="crm-table users-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Identity</th>
            <th>Created</th>
            <th>Updated</th>
            <th>Actions</th>
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
              <td>
                <span className={`badge ${user.active ? "badge--success" : "badge--muted"}`}>
                  {user.active ? "Active" : "Inactive"}
                </span>
              </td>
              <td>
                {user.identityMapped ? (
                  <>
                    <strong>{user.authProvider}</strong>
                    <span>{user.authSubject}</span>
                  </>
                ) : (
                  "Not mapped"
                )}
              </td>
              <td>{formatDate(user.createdAt)}</td>
              <td>{formatDate(user.updatedAt)}</td>
              <td>
                <div className="action-group">
                  <button className="secondary-button" onClick={() => onEdit(user)} type="button">
                    Edit
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => onActiveChange(user, !user.active)}
                    type="button"
                  >
                    {user.active ? "Deactivate" : "Activate"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}
