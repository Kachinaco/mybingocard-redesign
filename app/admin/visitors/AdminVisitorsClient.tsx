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
  if (type === "known") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (type === "anonymous") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-sky-200 bg-sky-50 text-sky-700";
}

function statusDot(visitor: AdminVisitorSummary) {
  if (visitor.isEngaged) return "bg-emerald-500";
  if (visitor.isActive) return "bg-amber-400";
  return "bg-slate-300";
}

function statusLabel(visitor: AdminVisitorSummary): string {
  if (visitor.isEngaged) return "Engaged";
  if (visitor.isActive && visitor.isVisible === true) return "Reading";
  if (visitor.isActive) return "Live";
  return "Recent";
}

function VisitorCard({ visitor }: { visitor: AdminVisitorSummary }) {
  return (
    <div className="border-b border-slate-100 px-5 py-5 last:border-b-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${statusDot(visitor)}`} aria-hidden="true" />
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              {statusLabel(visitor)}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${badgeClass(visitor.identityType)}`}>
              {visitor.identityType === "known" ? "user" : visitor.identityType}
            </span>
            <h3 className="break-all text-base font-bold text-slate-900">{visitor.visitorLabel}</h3>
          </div>

          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            {visitor.lastPathname && <span className="rounded bg-slate-100 px-2 py-1">Last page: {visitor.lastPathname}</span>}
            {visitor.anonymousId && <span className="rounded bg-slate-100 px-2 py-1">Anon: {visitor.anonymousId}</span>}
            {visitor.myBingoCardUserId && <span className="rounded bg-slate-100 px-2 py-1">User ID: {visitor.myBingoCardUserId}</span>}
            {visitor.sessionIds[0] && <span className="rounded bg-slate-100 px-2 py-1">Session: {visitor.sessionIds[0]}</span>}
            {visitor.tabIds[0] && <span className="rounded bg-slate-100 px-2 py-1">Tab: {visitor.tabIds[0]}</span>}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[300px]">
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-lg font-black text-slate-900">{visitor.eventCount}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">events</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-lg font-black text-slate-900">{visitor.pageViews}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">views</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2">
            <p className="text-lg font-black text-slate-900">{timeAgo(visitor.lastSeenAt)}</p>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">last seen</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_320px]">
        <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Recent Events</p>
          <div className="space-y-2">
            {visitor.recentEvents.map((event, index) => (
              <div key={`${visitor.visitorKey}-${event.event}-${event.createdAt}-${index}`} className="flex items-start justify-between gap-3 rounded bg-white px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="font-bold text-slate-700">{event.event}</p>
                  {event.pathname && <p className="truncate text-slate-400">{event.pathname}</p>}
                </div>
                <span className="shrink-0 text-slate-400">{timeAgo(event.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>

        <details className="rounded-lg border border-slate-100 bg-slate-50/60">
          <summary className="cursor-pointer px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
            Raw Visitor Data
          </summary>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words border-t border-slate-100 px-3 py-2 text-[11px] leading-relaxed text-slate-600">
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
        const response = await fetch("/api/admin/visitors?liveWindowMinutes=5&periodHours=24&limit=100", {
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
  }, []);

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
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">Visitor Tracking</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Live MyBingoCard Visitors</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Human traffic from the central tracker, grouped by signed-in user when available and anonymous browser ID otherwise.
          </p>
        </div>
        <div className="text-left text-xs text-slate-400 sm:text-right">
          <p>Updated {formatDateTime(data.generatedAt)}</p>
          <p>{isRefreshing ? "Refreshing..." : "Auto-refreshes every 10s"}</p>
          {error && <p className="mt-1 text-red-500">{error}</p>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-7">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-slate-900">{card.value}</p>
            <p className="mt-1 text-sm text-slate-500">{card.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Active Right Now</h2>
          <p className="mt-1 text-sm text-slate-500">Visitors with activity in the last {data.liveWindowMinutes} minutes, excluding ended sessions.</p>
        </div>
        {data.activeVisitors.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">No active human visitors in the live window.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.activeVisitors.map((visitor) => (
              <VisitorCard key={visitor.visitorKey} visitor={visitor} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Recent Visitor Timelines</h2>
          <p className="mt-1 text-sm text-slate-500">Latest {rows.length} known and anonymous identities from the last {data.periodHours} hours.</p>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">No visitor activity found in the last {data.periodHours} hours.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {rows.map((visitor) => (
              <VisitorCard key={visitor.visitorKey} visitor={visitor} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
