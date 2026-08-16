import PlayfulShell from "@/components/PlayfulShell";
import WorkflowStatePicker from "@/components/WorkflowStatePicker";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminSessionEmail, isAdminSession } from "@/lib/admin";
import { getAdminLayoutBadges } from "@/lib/db/admin-dashboard";
import { AdminMobileNav } from "./admin-mobile-nav";

export { metadata } from "./metadata";

const navItems = [
  {
    label: "Overview",
    href: "/admin",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    label: "Visitors",
    href: "/admin/visitors",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: "Errors",
    href: "/admin/errors",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      </svg>
    ),
  },
  {
    label: "Cards",
    href: "/admin/cards",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    label: "Coupons",
    href: "/admin/coupons",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    label: "Support",
    href: "/admin/support",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const adminEmail = getAdminSessionEmail(session);
  const impersonation = (session as typeof session & {
    impersonation?: { active: boolean; targetEmail: string };
    actor?: { name?: string | null };
  })?.impersonation;
  const actorName = (session as typeof session & {
    actor?: { name?: string | null };
  })?.actor?.name;

  if (!isAdminSession(session)) {
    redirect("/dashboard");
  }

  const badges = await getAdminLayoutBadges();

  const mobileNavItems = navItems.map((item) => ({
    label: item.label,
    href: item.href,
    badge:
      item.label === "Support"
        ? badges.openTickets
        : item.label === "Users"
          ? badges.pastDueUsers
          : item.label === "Errors"
            ? badges.recentErrorGroups
          : undefined,
  }));

  return (
    <PlayfulShell>
      <WorkflowStatePicker route="/admin" />
      <div className="min-h-screen bg-[#fff7ed]">
      <header className="sticky top-0 z-50 border-b border-[#a39a88] bg-white">
        <div className="px-4 sm:px-6">
          <div className="flex min-h-16 items-center justify-between gap-3 py-3">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-[#33312e]">Admin</span>
            </Link>

            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#7c5cff]/10 text-[#7c5cff] border border-[#7c5cff]/15">
                MyBingoCard
              </span>
              <div className="w-8 h-8 rounded-full bg-[#7c5cff]/15 flex items-center justify-center text-xs font-bold text-[#7c5cff]">
                {actorName?.charAt(0) || adminEmail?.charAt(0) || "A"}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <AdminMobileNav
              navItems={mobileNavItems}
              quickStats={{ mrr: badges.mrr, activeUsers: badges.activeUsers }}
            />

            <div className="flex flex-wrap items-center gap-2">
              {impersonation?.active ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#ffb800]/10 text-[#ffb800] border border-[#ffb800]">
                  Impersonating {impersonation.targetEmail}
                </span>
              ) : null}
              <span className="text-xs text-[#6b6459]">
                Signed in as <span className="font-medium text-[#33312e] break-all">{adminEmail}</span>
              </span>
            </div>

            <Link
              href="/dashboard"
              className="text-sm font-medium text-[#6b6459] hover:text-[#7c5cff] transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1600px]">
        <aside className="sticky top-[101px] hidden h-[calc(100vh-101px)] w-60 shrink-0 overflow-y-auto border-r border-[#a39a88] bg-white lg:block">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const badge =
                item.label === "Support"
                  ? badges.openTickets
                  : item.label === "Users"
                    ? badges.pastDueUsers
                    : item.label === "Errors"
                      ? badges.recentErrorGroups
                    : 0;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#33312e] hover:bg-[#7c5cff]/10 hover:text-[#7c5cff] transition-colors"
                >
                  {item.icon}
                  {item.label}
                  {badge > 0 && (
                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ff5d8f] px-1.5 text-[11px] font-bold text-white">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-h-[calc(100vh-101px)] flex-1">
          <div className="p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
    </PlayfulShell>
  );
}
