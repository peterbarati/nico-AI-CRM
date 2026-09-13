import type { ReactNode } from "react";
import type { CurrentActor } from "../features/auth/types";
import { displayLabel, t } from "../i18n";

export interface NavItem {
  label: string;
  path: string;
}

interface AppShellProps {
  activePath: string;
  actor: CurrentActor;
  children: ReactNode;
  navItems: NavItem[];
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export function AppShell({
  activePath,
  actor,
  children,
  navItems,
  onLogout,
  onNavigate
}: AppShellProps) {
  return (
    <div className="app-frame">
      <aside className="sidebar" aria-label={t("Primary navigation")}>
        <div className="brand">
          <span className="brand-mark">N</span>
          <div>
            <strong>NICO AI CRM</strong>
            <span>{t("Internal commercial desk")}</span>
          </div>
        </div>
        <nav className="nav-list">
          {navItems.map((item) => (
            <button
              className={item.path === activePath ? "nav-item nav-item--active" : "nav-item"}
              key={item.path}
              onClick={() => onNavigate(item.path)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">NICO AI CRM</p>
            <h1>{t("Customer operations")}</h1>
          </div>
          <div className="actor-menu">
            <div>
              <strong>{actor.name}</strong>
              <span>{displayLabel(actor.role)}</span>
            </div>
            <button onClick={onLogout} type="button">
              {t("Log out")}
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
