import Link from "next/link";
import type { ReactNode } from "react";
import "@/app/confetti-site.css";
import "@/app/workspace.css";

export type WorkspaceRoute =
  | "/dashboard"
  | "/dashboard/cards"
  | "/create"
  | "/dashboard/share-links"
  | "/dashboard/referrals"
  | "/settings";

type WorkspaceShellProps = {
  children: ReactNode;
  current: WorkspaceRoute;
  planLabel?: string;
  showCreateAction?: boolean;
};

const navItems: Array<[WorkspaceRoute, string, "home" | "cards" | "create" | "share" | "users" | "settings"]> = [
  ["/dashboard", "Home", "home"],
  ["/dashboard/cards", "My cards", "cards"],
  ["/create", "Create", "create"],
  ["/dashboard/share-links", "Share links", "share"],
  ["/dashboard/referrals", "Referrals", "users"],
  ["/settings", "Settings", "settings"],
];

function WorkspaceIcon({ name }: { name: (typeof navItems)[number][2] }) {
  if (name === "home") {
    return <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z" /><path d="M9 21v-6h6v6" /></>;
  }
  if (name === "cards") {
    return <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>;
  }
  if (name === "create") {
    return <><path d="M12 5v14M5 12h14" /></>;
  }
  if (name === "share") {
    return <><path d="M10 13a5 5 0 0 0 7.07.07l2-2a5 5 0 0 0-7.07-7.07l-1.15 1.15" /><path d="M14 11a5 5 0 0 0-7.07-.07l-2 2A5 5 0 0 0 12 20l1.15-1.15" /></>;
  }
  if (name === "users") {
    return <><circle cx="9" cy="8" r="3" /><path d="M3 21v-1a6 6 0 0 1 12 0v1M16 4.5a3 3 0 0 1 0 5.8M18 14a6 6 0 0 1 3 5v2" /></>;
  }
  return <><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.64 5.64l1.42 1.42M16.94 16.94l1.42 1.42M18.36 5.64l-1.42 1.42M7.06 16.94l1.42 1.42" /><circle cx="12" cy="12" r="4" /></>;
}

function isCurrent(current: WorkspaceRoute, target: WorkspaceRoute) {
  return current === target || (target !== "/dashboard" && current.startsWith(`${target}/`));
}

function WorkspaceNav({ current, mobile = false }: { current: WorkspaceRoute; mobile?: boolean }) {
  return (
    <nav className={mobile ? "mobile-app-nav" : "app-nav"} aria-label={mobile ? "Workspace shortcuts" : "Workspace"}>
      {!mobile && <span className="app-nav-label">Workspace</span>}
      {navItems.map(([href, label, icon]) => (
        <Link key={href} href={href} aria-current={isCurrent(current, href) ? "page" : undefined}>
          <svg className="app-nav-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <WorkspaceIcon name={icon} />
          </svg>
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function WorkspaceShell({
  children,
  current,
  planLabel = "Workspace",
  showCreateAction = current !== "/create",
}: WorkspaceShellProps) {
  return (
    <div className="app-shell workspace-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="app-topbar">
        <div className="brand-group">
          <Link href="/" className="brand logo" aria-label="MyBingoCard home">
            My<span>Bingo</span>Card
          </Link>
          <span className="pill pill-local">{planLabel}</span>
        </div>
        {showCreateAction ? (
          <Link href="/create" className="button button-primary button-small workspace-create-action">
            <span aria-hidden="true">＋</span> Create card
          </Link>
        ) : (
          <Link href="/" className="button button-small">Home</Link>
        )}
      </header>
      <div className="app-layout">
        <aside className="app-sidebar">
          <WorkspaceNav current={current} />
          <div className="sidebar-tip">
            <strong>{planLabel}</strong>
            <span>Build your card first. Save it when you are ready.</span>
            <Link href="/pricing" className="button button-small">See plans</Link>
          </div>
        </aside>
        <main className="app-main" id="main">
          <div className="app-content">{children}</div>
        </main>
      </div>
      <WorkspaceNav current={current} mobile />
    </div>
  );
}

export function WorkspacePageHead({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className="app-page-head">
      <div className="app-page-head-copy">
        <span className="eyebrow">Workspace</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action ? <div className="app-page-head-actions">{action}</div> : null}
    </header>
  );
}
