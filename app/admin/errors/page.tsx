import { auth } from "@/auth";
import { isAdminSession } from "@/lib/admin";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { redirect } from "next/navigation";

type ErrorFingerprintDoc = {
  _id: string;
  type?: string;
  message?: string;
  source?: string | null;
  latestPageUrl?: string | null;
  latestPathname?: string | null;
  latestBuildId?: string | null;
  latestStack?: string | null;
  latestBreadcrumbs?: Array<{
    type?: string;
    message?: string;
    timestamp?: string;
    href?: string;
    data?: Record<string, unknown>;
  }>;
  severity?: "low" | "medium" | "high";
  status?: string;
  totalCount?: number;
  firstSeenAt?: Date;
  lastSeenAt?: Date;
  lastAlertedAt?: Date;
  lastAlertRecentCount?: number;
  lastAlertRecentSessions?: number;
  sessionIds?: Array<string | null>;
  anonymousIds?: Array<string | null>;
  pageUrls?: Array<string | null>;
  buildIds?: Array<string | null>;
};

type ErrorEventDoc = {
  _id: string;
  type?: string;
  message?: string;
  pageUrl?: string | null;
  pathname?: string | null;
  buildId?: string | null;
  userAgent?: string | null;
  sessionId?: string | null;
  anonymousId?: string | null;
  createdAt?: Date;
  breadcrumbs?: ErrorFingerprintDoc["latestBreadcrumbs"];
};

function fmtDate(value?: Date | string | null) {
  if (!value) return "Never";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function countKnown(items?: Array<string | null>) {
  return new Set((items || []).filter(Boolean)).size;
}

function severityClass(severity?: string) {
  if (severity === "high") return "border-red-200 bg-red-50 text-red-700";
  if (severity === "medium") return "border-amber-200 bg-amber-50 text-amber-700";
  return "border-slate-200 bg-slate-50 text-slate-600";
}

function shortText(value?: string | null, fallback = "Unknown", max = 180) {
  const text = value || fallback;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams?: Promise<{ fingerprint?: string }>;
}) {
  const session = await auth();
  if (!isAdminSession(session)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const selectedFingerprint = typeof params?.fingerprint === "string" ? params.fingerprint : null;
  const client = await clientPromise;
  const db = client.db("mybingocard");
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [groups, events24h, highGroups24h, selectedEvents] = await Promise.all([
    db.collection<ErrorFingerprintDoc>("error_fingerprints")
      .find({})
      .sort({ lastSeenAt: -1 })
      .limit(50)
      .toArray(),
    db.collection("error_events").countDocuments({ createdAt: { $gte: since24h } }),
    db.collection("error_fingerprints").countDocuments({
      lastSeenAt: { $gte: since24h },
      severity: "high",
    }),
    selectedFingerprint
      ? db.collection<ErrorEventDoc>("error_events")
          .find({ fingerprint: selectedFingerprint })
          .sort({ createdAt: -1 })
          .limit(25)
          .toArray()
      : Promise.resolve([]),
  ]);

  const selectedGroup = selectedFingerprint
    ? groups.find((group) => group._id === selectedFingerprint) ||
      await db.collection<ErrorFingerprintDoc>("error_fingerprints").findOne({ _id: selectedFingerprint })
    : null;
  const groups24h = groups.filter((group) =>
    group.lastSeenAt && new Date(group.lastSeenAt).getTime() >= since24h.getTime()
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-500">Error Monitoring</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Runtime Errors</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Grouped client errors with build IDs, affected sessions, latest pages, and breadcrumbs.
          </p>
        </div>
        {selectedFingerprint ? (
          <Link href="/admin/errors" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            Clear selected fingerprint
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Groups 24h</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{groups24h.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Events 24h</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{events24h.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">High Severity 24h</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{highGroups24h.toLocaleString()}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Error Groups</h2>
            <p className="mt-1 text-sm text-slate-500">Latest 50 fingerprints, newest first.</p>
          </div>

          {groups.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">No captured errors yet.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {groups.map((group) => (
                <Link
                  key={group._id}
                  href={`/admin/errors?fingerprint=${encodeURIComponent(group._id)}`}
                  className={`block px-5 py-4 transition hover:bg-slate-50 ${selectedFingerprint === group._id ? "bg-indigo-50/50" : ""}`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${severityClass(group.severity)}`}>
                          {group.severity || "low"}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                          {group.type || "unknown"}
                        </span>
                        <span className="break-all font-mono text-xs text-slate-400">{group._id}</span>
                      </div>
                      <p className="mt-2 break-words text-sm font-bold text-slate-900">{shortText(group.message, "No message", 240)}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{shortText(group.latestPageUrl || group.latestPathname, "No page", 260)}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[280px]">
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-lg font-black text-slate-900">{group.totalCount || 0}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">events</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-lg font-black text-slate-900">{countKnown(group.sessionIds)}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">sessions</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-sm font-black text-slate-900">{fmtDate(group.lastSeenAt)}</p>
                        <p className="text-[11px] uppercase tracking-wide text-slate-400">latest</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Selected Fingerprint</h2>
            {selectedGroup ? (
              <div className="mt-4 space-y-3 text-sm">
                <p className="break-all font-mono text-xs text-slate-500">{selectedGroup._id}</p>
                <p className="font-semibold text-slate-900">{shortText(selectedGroup.message, "No message", 500)}</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="font-bold text-slate-500">Build</p>
                    <p className="mt-1 break-all text-slate-700">{selectedGroup.latestBuildId || "unknown"}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="font-bold text-slate-500">Last Alert</p>
                    <p className="mt-1 text-slate-700">{fmtDate(selectedGroup.lastAlertedAt)}</p>
                  </div>
                </div>
                {selectedGroup.latestStack ? (
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-100">
                    {selectedGroup.latestStack}
                  </pre>
                ) : null}
                {selectedGroup.latestBreadcrumbs?.length ? (
                  <div>
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Latest Breadcrumbs</p>
                    <div className="space-y-2">
                      {selectedGroup.latestBreadcrumbs.slice(-8).map((crumb, index) => (
                        <div key={`${crumb.timestamp}-${index}`} className="rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs">
                          <p className="font-bold text-slate-700">{crumb.type || "event"}: {crumb.message || "event"}</p>
                          <p className="mt-1 text-slate-400">{crumb.timestamp ? fmtDate(crumb.timestamp) : ""}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">Select an error group to inspect stack and breadcrumbs.</p>
            )}
          </div>

          {selectedFingerprint ? (
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-4">
                <h2 className="text-lg font-bold text-slate-900">Recent Events</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {selectedEvents.map((event) => (
                  <div key={String(event._id)} className="px-5 py-4 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-slate-900">{event.type || "unknown"}</p>
                      <p className="shrink-0 text-xs text-slate-400">{fmtDate(event.createdAt)}</p>
                    </div>
                    <p className="mt-1 break-all text-xs text-slate-500">{event.pageUrl || event.pathname || "No page"}</p>
                    <p className="mt-1 text-xs text-slate-400">Build: {event.buildId || "unknown"} · Session: {event.sessionId || "unknown"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
