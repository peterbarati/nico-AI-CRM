import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { createUser, fetchUsers, setUserActive, updateUser } from "./api";
import { UserFormModal } from "./UserFormModal";
import type { UserAdminItem, UserAdminValues, UserListFilters, UserListResult } from "./types";
import { apiErrorMessage, displayLabel, formatDate, t } from "../../i18n";

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
      setError(apiErrorMessage(error, "Používateľov sa nepodarilo načítať."));
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
      setFormError(apiErrorMessage(error, "Používateľa sa nepodarilo uložiť."));
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
      setError(apiErrorMessage(error, "Stav používateľa sa nepodarilo zmeniť."));
    }
  }

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("Administration")}</p>
          <h2>{t("Users")}</h2>
        </div>
        <button
          onClick={() => {
            setFormError(null);
            setEditing(null);
          }}
          type="button"
        >
          {t("Add user")}
        </button>
      </div>
      <UserFilters filters={filters} onChange={setFilters} />
      {error ? <p className="form-error">{error}</p> : null}
      {!result ? (
        <div className="loading-state">{t("Loading CRM users...")}</div>
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
        <div className="pagination" aria-label={t("User list pagination")}>
          <button
            disabled={result.pagination.page <= 1}
            onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
            type="button"
          >
            {t("Previous")}
          </button>
          <span>
            {t("Page {page} of {pages} · {total} users", {
              page: result.pagination.page,
              pages: result.pagination.totalPages || 1,
              total: result.pagination.total
            })}
          </span>
          <button
            disabled={result.pagination.page >= result.pagination.totalPages}
            onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
            type="button"
          >
            {t("Next")}
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
  return confirm(t("Deactivate {name}? Their CRM history will be preserved.", { name: user.name }));
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
        <span>{t("Search")}</span>
        <input
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value, page: 1 })}
          placeholder={t("Name, email, or auth subject")}
        />
      </label>
      <label>
        <span>{t("Role")}</span>
        <select
          value={filters.role}
          onChange={(event) =>
            onChange({ ...filters, role: event.target.value as UserListFilters["role"], page: 1 })
          }
        >
          <option value="">{t("All roles")}</option>
          {(["admin", "manager", "customer_service", "sales_rep"] as const).map((role) => (
            <option key={role} value={role}>
              {displayLabel(role)}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>{t("Status")}</span>
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
          <option value="">{t("All statuses")}</option>
          <option value="true">{t("Active")}</option>
          <option value="false">{t("Inactive")}</option>
        </select>
      </label>
      <label>
        <span>{t("Sort")}</span>
        <select
          value={filters.sort}
          onChange={(event) =>
            onChange({ ...filters, sort: event.target.value as UserListFilters["sort"], page: 1 })
          }
        >
          <option value="name">{t("Name")}</option>
          <option value="email">{t("Email")}</option>
          <option value="role">{t("Role")}</option>
          <option value="active">{t("Status")}</option>
          <option value="created_at">{t("Created")}</option>
          <option value="updated_at">{t("Updated")}</option>
        </select>
      </label>
      <label>
        <span>{t("Direction")}</span>
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
          <option value="asc">{t("Ascending")}</option>
          <option value="desc">{t("Descending")}</option>
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
  if (!users.length)
    return <div className="empty-state">{t("No users match the selected filters.")}</div>;
  return (
    <div className="table-wrap">
      <table className="crm-table users-table">
        <thead>
          <tr>
            <th>{t("User")}</th>
            <th>{t("Role")}</th>
            <th>{t("Status")}</th>
            <th>{t("Identity")}</th>
            <th>{t("Created")}</th>
            <th>{t("Updated")}</th>
            <th>{t("Actions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </td>
              <td>{displayLabel(user.role)}</td>
              <td>
                <span className={`badge ${user.active ? "badge--success" : "badge--muted"}`}>
                  {user.active ? t("Active") : t("Inactive")}
                </span>
              </td>
              <td>
                {user.identityMapped ? (
                  <>
                    <strong>{displayLabel(user.authProvider)}</strong>
                    <span>{user.authSubject}</span>
                  </>
                ) : (
                  t("Not mapped")
                )}
              </td>
              <td>{formatDate(user.createdAt)}</td>
              <td>{formatDate(user.updatedAt)}</td>
              <td>
                <div className="action-group">
                  <button className="secondary-button" onClick={() => onEdit(user)} type="button">
                    {t("Edit")}
                  </button>
                  <button
                    className="secondary-button"
                    onClick={() => onActiveChange(user, !user.active)}
                    type="button"
                  >
                    {user.active ? t("Deactivate") : t("Activate")}
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
