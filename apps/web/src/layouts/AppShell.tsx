import type { ReactNode } from "react";
import type { CurrentActor } from "../features/auth/types";

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
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand">
          <span className="brand-mark">N</span>
          <div>
            <strong>NICO AI CRM</strong>
            <span>Internal commercial desk</span>
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
            <h1>Customer operations</h1>
          </div>
          <div className="actor-menu">
            <div>
              <strong>{actor.name}</strong>
              <span>{actor.role.replaceAll("_", " ")}</span>
            </div>
            <button onClick={onLogout} type="button">
              Log out
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}
