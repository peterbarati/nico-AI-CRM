import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { permissionForPath } from "../../App";
import { createUser, fetchUsers, setUserActive, updateUser } from "./api";
import { UserFormModal } from "./UserFormModal";
import { confirmDeactivation, initialUserFilters, UserFilters, UserTable } from "./UsersPage";
import type { UserAdminItem } from "./types";

afterEach(() => vi.unstubAllGlobals());

describe("frontend user management", () => {
  it("renders the compact user list, filters, actions, and mapping status", () => {
    const markup = renderToStaticMarkup(
      <>
        <UserFilters filters={initialUserFilters} onChange={() => undefined} />
        <UserTable users={[user()]} onEdit={() => undefined} onActiveChange={() => undefined} />
      </>
    );
    expect(markup).toContain("Development Sales");
    expect(markup).toContain("Mapped subject");
    expect(markup).toContain("Deaktivovať");
    expect(markup).toContain("Všetky roly");
  });

  it("renders create and edit forms without a hard-delete action", () => {
    const props = {
      saving: false,
      error: null,
      onCancel: () => undefined,
      onSave: async () => undefined
    };
    const createMarkup = renderToStaticMarkup(<UserFormModal {...props} user={null} />);
    const editMarkup = renderToStaticMarkup(<UserFormModal {...props} user={user()} />);
    expect(createMarkup).toContain("Pridať používateľa");
    expect(editMarkup).toContain("Upraviť používateľa");
    expect(editMarkup).toContain("Identifikátor prihlásenia");
    expect(editMarkup).not.toContain("Delete");
  });

  it("loads a paginated list and sends create, edit, deactivate, and reactivate requests", async () => {
    const managedUser = user();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          ok: true,
          data: {
            items: [managedUser],
            pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 }
          }
        })
      )
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: managedUser }, 201))
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: { ...managedUser, role: "manager" } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: { ...managedUser, active: false } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, data: managedUser }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchUsers(initialUserFilters)).resolves.toMatchObject({
      items: [{ id: managedUser.id }]
    });
    await createUser(values());
    await updateUser(managedUser.id, { ...values(), role: "manager" });
    await setUserActive(managedUser.id, false);
    await setUserActive(managedUser.id, true);
    expect(fetchMock.mock.calls[0][0]).toContain("page=1");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: "POST" });
    expect(fetchMock.mock.calls[2][1]).toMatchObject({ method: "PATCH" });
    expect(fetchMock.mock.calls[3][0]).toContain("/deactivate");
    expect(fetchMock.mock.calls[4][0]).toContain("/activate");
  });

  it("surfaces structured validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            ok: false,
            error: {
              code: "EMAIL_ALREADY_EXISTS",
              message: "Email is already in use.",
              fields: [{ field: "email", message: "Choose another email." }]
            }
          },
          409
        )
      )
    );
    await expect(createUser(values())).rejects.toMatchObject({
      message: "Choose another email.",
      details: { code: "EMAIL_ALREADY_EXISTS" }
    });
  });

  it("requires confirmation before deactivation", () => {
    const confirm = vi.fn().mockReturnValue(false);
    expect(confirmDeactivation(user(), confirm)).toBe(false);
    expect(confirm).toHaveBeenCalledWith(
      "Deaktivovať používateľa Development Sales? Historické údaje zostanú zachované."
    );
  });

  it("keeps user management behind the Admin permission", () => {
    expect(permissionForPath("/users")).toBe("USER_ADMIN");
  });
});

function user(): UserAdminItem {
  return {
    id: "usr-development-sales",
    name: "Development Sales",
    email: "development.sales@example.test",
    role: "sales_rep",
    active: true,
    authProvider: "mock",
    authSubject: "Mapped subject",
    identityMapped: true,
    createdAt: "2026-09-11T10:00:00.000Z",
    updatedAt: "2026-09-11T10:00:00.000Z"
  };
}

function values() {
  const { name, email, role, active, authProvider, authSubject } = user();
  return { name, email, role, active, authProvider, authSubject };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" }
  });
}
