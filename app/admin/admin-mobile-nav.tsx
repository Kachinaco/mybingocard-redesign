"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  badge?: number;
}

interface QuickStats {
  mrr: number;
  activeUsers: number;
}

export function AdminMobileNav({
  navItems,
  quickStats,
}: {
  navItems: NavItem[];
  quickStats: QuickStats;
}) {
  const pathname = usePathname();

  const currentPage = navItems.find((item) =>
    item.href === "/admin"
      ? pathname === "/admin"
      : pathname.startsWith(item.href)
  );

  const pageTitle = currentPage?.label ?? "Admin";

  return (
    <div className="sm:hidden">
      {/* Page title */}
      <h1 className="text-lg font-bold text-[#33312e] mb-2">{pageTitle}</h1>

      {/* Quick Stats bar */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 rounded-lg bg-[#2ec4b6]/10 border border-[#2ec4b6]/15 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#2ec4b6]">
            MRR
          </p>
          <p className="text-base font-bold text-[#2ec4b6]">
            ${quickStats.mrr.toFixed(0)}
          </p>
        </div>
        <div className="flex-1 rounded-lg bg-[#7c5cff]/10 border border-[#7c5cff]/15 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7c5cff]">
            Active
          </p>
          <p className="text-base font-bold text-[#7c5cff]">
            {quickStats.activeUsers.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Nav pills with badges */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`relative shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                isActive
                  ? "border-[#7c5cff] bg-[#7c5cff]/10 text-[#7c5cff]"
                  : "border-[#a39a88] bg-white text-[#33312e] hover:border-[#7c5cff] hover:bg-[#7c5cff]/10 hover:text-[#7c5cff]"
              }`}
            >
              {item.label}
              {item.badge != null && item.badge > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#ff5d8f] px-1 text-[10px] font-bold text-white">
                  {item.badge > 99 ? "99+" : item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
