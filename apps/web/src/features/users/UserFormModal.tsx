import { useEffect, useState, type FormEvent } from "react";
import type { UserAdminItem, UserAdminValues } from "./types";

const emptyValues: UserAdminValues = {
  name: "",
  email: "",
  role: "sales_rep",
  active: true,
  authProvider: null,
  authSubject: null
};

interface UserFormModalProps {
  user: UserAdminItem | null;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onSave: (values: UserAdminValues) => Promise<void>;
}

export function UserFormModal({ user, saving, error, onCancel, onSave }: UserFormModalProps) {
  const [values, setValues] = useState<UserAdminValues>(() => userValues(user));
  useEffect(() => setValues(userValues(user)), [user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const authProvider = values.authProvider?.trim() || null;
    const authSubject = values.authSubject?.trim() || null;
    if (user?.role === "admin" && values.role !== "admin") {
      if (!window.confirm("Change this Admin to a less privileged role?")) return;
    }
    if (
      user &&
      (authProvider !== user.authProvider || authSubject !== user.authSubject) &&
      !window.confirm("Change this user's authentication identity mapping?")
    ) {
      return;
    }
    await onSave({
      ...values,
      name: values.name.trim(),
      email: values.email.trim(),
      authProvider,
      authSubject
    });
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <form className="modal-panel user-form" onSubmit={(event) => void submit(event)}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Administration</p>
            <h3>{user ? "Edit user" : "Add user"}</h3>
          </div>
          <button
            aria-label="Close"
            className="icon-button secondary-button"
            disabled={saving}
            onClick={onCancel}
            type="button"
          >
            ×
          </button>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="form-grid">
          <label>
            <span>Name</span>
            <input
              required
              maxLength={200}
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
            />
          </label>
          <label>
            <span>Email</span>
            <input
              required
              type="email"
              maxLength={320}
              value={values.email}
              onChange={(event) => setValues({ ...values, email: event.target.value })}
            />
          </label>
          <label>
            <span>Role</span>
            <select
              value={values.role}
              onChange={(event) =>
                setValues({ ...values, role: event.target.value as UserAdminValues["role"] })
              }
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="customer_service">Customer Service</option>
              <option value="sales_rep">Sales Representative</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={values.active}
              onChange={(event) => setValues({ ...values, active: event.target.checked })}
            />
            <span>Active</span>
          </label>
          <label>
            <span>Auth provider (optional)</span>
            <input
              maxLength={64}
              placeholder="oidc"
              value={values.authProvider ?? ""}
              onChange={(event) =>
                setValues({ ...values, authProvider: event.target.value || null })
              }
            />
          </label>
          <label>
            <span>Auth subject (optional)</span>
            <input
              maxLength={255}
              value={values.authSubject ?? ""}
              onChange={(event) =>
                setValues({ ...values, authSubject: event.target.value || null })
              }
            />
          </label>
        </div>
        <div className="modal-actions">
          <button className="secondary-button" disabled={saving} onClick={onCancel} type="button">
            Cancel
          </button>
          <button disabled={saving} type="submit">
            {saving ? "Saving..." : "Save user"}
          </button>
        </div>
      </form>
    </div>
  );
}

function userValues(user: UserAdminItem | null): UserAdminValues {
  return user
    ? {
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        authProvider: user.authProvider,
        authSubject: user.authSubject
      }
    : emptyValues;
}
