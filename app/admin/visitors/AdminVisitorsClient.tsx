"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AdminVisitorIdentityType,
  AdminVisitorSummary,
  AdminVisitorsData,
} from "./types";

type Props = {
  initialData: AdminVisitorsData;
};

function timeAgo(value: string): string {
  const date = new Date(value);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString();
}

function badgeClass(type: AdminVisitorIdentityType): string {
  if (type === "known") return "border-[#2ec4b6] bg-[#2ec4b6]/10 text-[#2ec4b6]";
  if (type === "anonymous") return "border-[#ffb800] bg-[#ffb800]/10 text-[#ffb800]";
  return "border-[#2ec4b6] bg-[#2ec4b6]/10 text-[#2ec4b6]";
}

function statusDot(visitor: AdminVisitorSummary) {
  if (visitor.isEngaged) return "bg-[#2ec4b6]";
  if (visitor.isActive) return "bg-[#ffb800]";
  return "bg-[#a39a88]";
}

function statusLabel(visitor: AdminVisitorSummary): string {
  if (visitor.isEngaged) return "Engaged";
  if (visitor.isActive && visitor.isVisible === true) return "Reading";
  if (visitor.isActive) return "Live";
  return "Recent";
}

function VisitorCard({ visitor }: { visitor: AdminVisitorSummary }) {
  return (
    <div className="border-b border-[#fff7ed] px-5 py-5 last:border-b-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusDot(visitor)}`} aria-hidden="true" />
            <span className="rounded-full border border-[#a39a88] bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-[#6b6459]">
              {statusLabel(visitor)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${badgeClass(visitor.identityType)}`}>
              {visitor.identityType === "known" ? "user" : visitor.identityType}
            </span>
            <h3 className="break-all text-base font-bold text-[#33312e]">{visitor.visitorLabel}</h3>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs text-[#6b6459]">
            {visitor.lastPathname && <span className="rounded bg-[#fff7ed] px-2 py-1">Last page: {visitor.lastPathname}</span>}
            {visitor.anonymousId && <span className="rounded bg-[#fff7ed] px-2 py-1">Anon: {visitor.anonymousId}</span>}
            {visitor.myBingoCardUserId && <span className="rounded bg-[#fff7ed] px-2 py-1">User ID: {visitor.myBingoCardUserId}</span>}
            {visitor.sessionIds[0] && <span className="rounded bg-[#fff7ed] px-2 py-1">Session: {visitor.sessionIds[0]}</span>}
            {visitor.tabIds[0] && <span className="rounded bg-[#fff7ed] px-2 py-1">Tab: {visitor.tabIds[0]}</span>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[300px]">
          <div className="rounded-lg bg-[#fff7ed] px-3 py-2">
            <p className="text-lg font-black text-[#33312e]">{visitor.eventCount}</p>
            <p className="text-[11px] uppercase tracking-wide text-[#6b6459]">events</p>
          </div>
          <div className="rounded-lg bg-[#fff7ed] px-3 py-2">
            <p className="text-lg font-black text-[#33312e]">{visitor.pageViews}</p>
            <p className="text-[11px] uppercase tracking-wide text-[#6b6459]">views</p>
          </div>
          <div className="rounded-lg bg-[#fff7ed] px-3 py-2">
            <p className="text-lg font-black text-[#33312e]">{timeAgo(visitor.lastSeenAt)}</p>
            <p className="text-[11px] uppercase tracking-wide text-[#6b6459]">last seen</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-[#fff7ed] bg-[#fff7ed]/60 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#6b6459]">Recent Events</p>
          <div className="space-y-2">
            {visitor.recentEvents.map((event, index) => (
              <div key={`${visitor.visitorKey}-${event.event}-${event.createdAt}-${index}`} className="flex items-start justify-between gap-3 rounded bg-white px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-[#33312e]">{event.event}</p>
                  {event.pathname && <p className="truncate text-[#6b6459]">{event.pathname}</p>}
                </div>
                <span className="shrink-0 text-[#6b6459]">{timeAgo(event.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>

        <details className="rounded-lg border border-[#fff7ed] bg-[#fff7ed]/60">
          <summary className="cursor-pointer px-3 py-2 text-xs font-bold uppercase tracking-wide text-[#6b6459]">
            Raw Visitor Data
          </summary>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words border-t border-[#fff7ed] px-3 py-2 text-[11px] leading-relaxed text-[#33312e]">
            {JSON.stringify(visitor, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}

export default function AdminVisitorsClient({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let canceled = false;

    async function refresh() {
      try {
        setIsRefreshing(true);
        const params = new URLSearchParams(window.location.search);
        params.set("liveWindowMinutes", "5");
        if (!params.has("periodHours")) params.set("periodHours", String(data.periodHours || 24));
        if (!params.has("limit")) params.set("limit", "100");
        const response = await fetch(`/api/admin/visitors?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Visitor API returned ${response.status}`);
        }
        const nextData = (await response.json()) as AdminVisitorsData;
        if (!canceled) {
          setData(nextData);
          setError(null);
        }
      } catch (nextError) {
        if (!canceled) {
          setError(nextError instanceof Error ? nextError.message : "Refresh failed");
        }
      } finally {
        if (!canceled) {
          setIsRefreshing(false);
        }
      }
    }

    const interval = window.setInterval(refresh, 10000);
    return () => {
      canceled = true;
      window.clearInterval(interval);
    };
  }, [data.periodHours]);

  const statCards = useMemo(
    () => [
      { label: "Live Now", value: data.stats.activeVisitors.toLocaleString(), description: `Active in last ${data.liveWindowMinutes} minutes` },
      { label: "Engaged", value: data.stats.engagedVisitors.toLocaleString(), description: "Interaction in last 30 seconds" },
      { label: "Live Users", value: data.stats.activeKnownVisitors.toLocaleString(), description: "Signed-in or identified visitors" },
      { label: "Live Anonymous", value: data.stats.activeAnonymousVisitors.toLocaleString(), description: "Anonymous browsers active now" },
      { label: "Visitors 24h", value: data.stats.visitors24h.toLocaleString(), description: `${data.stats.knownVisitors24h} known, ${data.stats.anonymousVisitors24h} anonymous` },
      { label: "Sessions 24h", value: data.stats.sessions24h.toLocaleString(), description: "Distinct browser sessions" },
      { label: "Events 24h", value: data.stats.events24h.toLocaleString(), description: "Human analytics events" },
    ],
    [data]
  );

  const rows = data.visitors;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#7c5cff]">Visitor Tracking</p>
          <h1 className="mt-2 text-3xl font-black text-[#33312e]">Live MyBingoCard Visitors</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6b6459]">
            Human traffic from the central tracker, grouped by signed-in user when available and anonymous browser ID otherwise.
          </p>
          {(data.filters.anonymousId || data.filters.sessionId || data.filters.visitorKey) && (
            <p className="mt-2 max-w-2xl break-all text-xs font-semibold text-[#7c5cff]">
              Filtered by {data.filters.anonymousId || data.filters.sessionId || data.filters.visitorKey}
            </p>
          )}
        </div>
        <div className="text-left text-xs text-[#6b6459] sm:text-right">
          <p>Updated {formatDateTime(data.generatedAt)}</p>
          <p>{isRefreshing ? "Refreshing..." : "Auto-refreshes every 10s"}</p>
          {error && <p className="mt-1 text-[#ff5d8f]">{error}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-[#a39a88] bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-[#6b6459]">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-[#33312e]">{card.value}</p>
            <p className="mt-1 text-sm text-[#6b6459]">{card.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-[#a39a88] bg-white shadow-sm">
        <div className="border-b border-[#fff7ed] px-5 py-4">
          <h2 className="text-lg font-bold text-[#33312e]">Active Right Now</h2>
          <p className="mt-1 text-sm text-[#6b6459]">Visitors with activity in the last {data.liveWindowMinutes} minutes, excluding ended sessions.</p>
        </div>
        {data.activeVisitors.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-[#6b6459]">No active human visitors in the live window.</div>
        ) : (
          <div className="divide-y divide-[#fff7ed]">
            {data.activeVisitors.map((visitor) => (
              <VisitorCard key={visitor.visitorKey} visitor={visitor} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-[#a39a88] bg-white shadow-sm">
        <div className="border-b border-[#fff7ed] px-5 py-4">
          <h2 className="text-lg font-bold text-[#33312e]">Recent Visitor Timelines</h2>
          <p className="mt-1 text-sm text-[#6b6459]">Latest {rows.length} known and anonymous identities from the last {data.periodHours} hours.</p>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-[#6b6459]">No visitor activity found in the last {data.periodHours} hours.</div>
        ) : (
          <div className="divide-y divide-[#fff7ed]">
            {rows.map((visitor) => (
              <VisitorCard key={visitor.visitorKey} visitor={visitor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
