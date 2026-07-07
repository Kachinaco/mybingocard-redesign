import { auth } from "@/auth";
import { getAdminSessionEmail, isAdminSession } from "@/lib/admin";
import { getCurrentBuildInfo } from "@/lib/build-info";
import {
  getAdminErrorPageData,
  normalizeAdminErrorStatus,
  updateAdminErrorFingerprintStatus,
  type AdminErrorStatus,
} from "@/lib/db/client-errors";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const STATUS_OPTIONS: Array<{ status: AdminErrorStatus; label: string }> = [
  { status: "open", label: "Open" },
  { status: "watching", label: "Watching" },
  { status: "fixed", label: "Fixed" },
  { status: "ignored", label: "Ignored" },
];

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

function statusClass(status?: string) {
  if (status === "fixed") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "ignored") return "border-slate-200 bg-slate-100 text-slate-500";
  if (status === "watching") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-rose-200 bg-rose-50 text-rose-700";
}

function shortText(value?: string | null, fallback = "Unknown", max = 180) {
  const text = value || fallback;
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function adminErrorHref(status: string, fingerprint?: string) {
  const params = new URLSearchParams();
  if (status && status !== "unresolved") params.set("status", status);
  if (fingerprint) params.set("fingerprint", fingerprint);
  const query = params.toString();
  return query ? `/admin/errors?${query}` : "/admin/errors";
}

function visitorHref(event: { anonymousId?: string | null; sessionId?: string | null }) {
  const params = new URLSearchParams({
    periodHours: "168",
    limit: "100",
  });
  if (event.anonymousId) params.set("anonymousId", event.anonymousId);
  if (event.sessionId) params.set("sessionId", event.sessionId);
  return `/admin/visitors?${params.toString()}`;
}

async function updateErrorFingerprintStatus(formData: FormData) {
  "use server";

  const session = await auth();
  if (!isAdminSession(session)) {
    redirect("/dashboard");
  }

  const fingerprint = String(formData.get("fingerprint") || "");
  const status = String(formData.get("status") || "");
  if (!fingerprint || !STATUS_OPTIONS.some((option) => option.status === status)) {
    redirect("/admin/errors");
  }

  const now = new Date();
  await updateAdminErrorFingerprintStatus({
    fingerprint,
    status: status as AdminErrorStatus,
    updatedAt: now,
    updatedBy: getAdminSessionEmail(session),
  });

  revalidatePath("/admin/errors");
  redirect(adminErrorHref(status === "fixed" || status === "ignored" ? "all" : "unresolved", fingerprint));
}

export default async function AdminErrorsPage({
  searchParams,
}: {
  searchParams?: Promise<{ fingerprint?: string; status?: string }>;
}) {
  const session = await auth();
  if (!isAdminSession(session)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const selectedFingerprint = typeof params?.fingerprint === "string" ? params.fingerprint : null;
  const selectedStatusFilter = typeof params?.status === "string" ? params.status : "unresolved";
  const currentBuild = getCurrentBuildInfo();
  const {
    groups,
    groups24h,
    events24h,
    currentBuildEvents24h,
    eventsAfterDeploy,
    highGroups24h,
    newSinceDeployGroups,
    statusCountsRaw,
    selectedEvents,
    selectedGroup,
  } = await getAdminErrorPageData({
    selectedFingerprint,
    selectedStatusFilter,
    currentBuild,
  });
  const statusCounts = new Map(statusCountsRaw.map((item) => [normalizeAdminErrorStatus(item._id), item.count]));
  const unresolvedCount =
    (statusCounts.get("open") || 0) +
    (statusCounts.get("watching") || 0);
  const firstMappedFrame = selectedGroup?.latestSourceMappedFrames?.[0];
  const selectedStack = selectedGroup?.latestSymbolicatedStack || selectedGroup?.latestStack;

  const statusTabs = [
    { key: "unresolved", label: "Unresolved", count: unresolvedCount },
    { key: "open", label: "Open", count: statusCounts.get("open") || 0 },
    { key: "watching", label: "Watching", count: statusCounts.get("watching") || 0 },
    { key: "fixed", label: "Fixed", count: statusCounts.get("fixed") || 0 },
    { key: "ignored", label: "Ignored", count: statusCounts.get("ignored") || 0 },
    { key: "all", label: "All", count: statusCountsRaw.reduce((sum, item) => sum + item.count, 0) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-500">Error Monitoring</p>
          <h1 className="mt-2 text-3xl font-black text-slate-900">Runtime Errors</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Grouped client errors with build IDs, affected sessions, source-mapped stacks, latest pages, and breadcrumbs.
          </p>
        </div>
        {selectedFingerprint ? (
          <Link href={adminErrorHref(selectedStatusFilter)} className="text-sm font-semibold text-indigo-600 hover:text-indigo-700">
            Clear selected fingerprint
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Unresolved Groups 24h</p>
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
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Current Build Events</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{currentBuildEvents24h.toLocaleString()}</p>
          <p className="mt-1 break-all text-xs text-slate-500">{currentBuild.buildId || "unknown build"}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Since Deploy</p>
          <p className="mt-2 text-3xl font-black text-slate-900">{eventsAfterDeploy.toLocaleString()}</p>
          <p className="mt-1 text-xs text-slate-500">{newSinceDeployGroups} new unresolved groups</p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          {statusTabs.map((tab) => (
            <Link
              key={tab.key}
              href={adminErrorHref(tab.key, selectedFingerprint || undefined)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                selectedStatusFilter === tab.key || (!params?.status && tab.key === "unresolved")
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tab.label} {tab.count.toLocaleString()}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Build created {fmtDate(currentBuild.buildCreatedAt)} · Git {currentBuild.gitShortSha || "unknown"} · source {currentBuild.source}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-lg font-bold text-slate-900">Recent Error Groups</h2>
            <p className="mt-1 text-sm text-slate-500">Latest 50 fingerprints for the selected status view.</p>
          </div>

          {groups.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-slate-400">No captured errors in this view.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {groups.map((group) => (
                <Link
                  key={group._id}
                  href={adminErrorHref(selectedStatusFilter, group._id)}
                  className={`block px-5 py-4 transition hover:bg-slate-50 ${selectedFingerprint === group._id ? "bg-indigo-50/50" : ""}`}
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${severityClass(group.severity)}`}>
                          {group.severity || "low"}
                        </span>
                        <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusClass(group.status)}`}>
                          {normalizeAdminErrorStatus(group.status)}
                        </span>
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                          {group.type || "unknown"}
                        </span>
                        {group.impactArea ? (
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-sky-700">
                            {group.impactArea}
                          </span>
                        ) : null}
                        {group.alertSuppressed ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                            no discord
                          </span>
                        ) : null}
                        <span className="break-all font-mono text-xs text-slate-400">{group._id}</span>
                      </div>
                      <p className="mt-2 break-words text-sm font-bold text-slate-900">{shortText(group.message, "No message", 240)}</p>
                      <p className="mt-1 break-all text-xs text-slate-500">{shortText(group.latestPageUrl || group.latestPathname, "No page", 260)}</p>
                      {group.latestSourceMappedFrames?.[0] ? (
                        <p className="mt-1 break-all text-xs text-emerald-700">
                          Mapped: {group.latestSourceMappedFrames[0].source}:{group.latestSourceMappedFrames[0].line}
                        </p>
                      ) : null}
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
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusClass(selectedGroup.status)}`}>
                    {normalizeAdminErrorStatus(selectedGroup.status)}
                  </span>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${severityClass(selectedGroup.severity)}`}>
                    {selectedGroup.severity || "low"}
                  </span>
                </div>
                <p className="break-all font-mono text-xs text-slate-500">{selectedGroup._id}</p>
                <p className="font-semibold text-slate-900">{shortText(selectedGroup.message, "No message", 500)}</p>

                <form action={updateErrorFingerprintStatus} className="flex flex-wrap gap-2">
                  <input type="hidden" name="fingerprint" value={selectedGroup._id} />
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.status}
                      type="submit"
                      name="status"
                      value={option.status}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold uppercase tracking-wide transition ${
                        normalizeAdminErrorStatus(selectedGroup.status) === option.status
                          ? "border-indigo-300 bg-indigo-600 text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </form>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="font-bold text-slate-500">Build</p>
                    <p className="mt-1 break-all text-slate-700">{selectedGroup.latestBuildId || "unknown"}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="font-bold text-slate-500">Last Alert</p>
                    <p className="mt-1 text-slate-700">{fmtDate(selectedGroup.lastAlertedAt)}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="font-bold text-slate-500">Impact</p>
                    <p className="mt-1 break-all text-slate-700">{selectedGroup.impactArea || "application"}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="font-bold text-slate-500">Resource Host</p>
                    <p className="mt-1 break-all text-slate-700">{selectedGroup.resourceHost || "n/a"}</p>
                  </div>
                </div>

                {firstMappedFrame ? (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-xs text-emerald-800">
                    <p className="font-bold">Top source-mapped frame</p>
                    <p className="mt-1 break-all">{firstMappedFrame.source}:{firstMappedFrame.line}:{firstMappedFrame.column}</p>
                    {firstMappedFrame.contextLine ? <p className="mt-2 break-words font-mono">{firstMappedFrame.contextLine}</p> : null}
                  </div>
                ) : null}

                {selectedGroup.anonymousIds?.find(Boolean) || selectedGroup.sessionIds?.find(Boolean) ? (
                  <Link
                    href={visitorHref({
                      anonymousId: selectedGroup.anonymousIds?.find(Boolean) || null,
                      sessionId: selectedGroup.sessionIds?.find(Boolean) || null,
                    })}
                    className="inline-flex rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-indigo-700 hover:bg-indigo-100"
                  >
                    Open Visitor Timeline
                  </Link>
                ) : null}

                {selectedStack ? (
                  <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-[11px] leading-relaxed text-slate-100">
                    {selectedStack}
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
                    <p className="mt-1 text-xs text-slate-400">
                      Build: {event.buildId || "unknown"} · Session: {event.sessionId || "unknown"} · Impact: {event.impactArea || "application"}
                    </p>
                    {event.sourceMappedFrames?.[0] ? (
                      <p className="mt-1 break-all text-xs text-emerald-700">
                        Mapped: {event.sourceMappedFrames[0].source}:{event.sourceMappedFrames[0].line}
                      </p>
                    ) : null}
                    {event.anonymousId || event.sessionId ? (
                      <Link href={visitorHref(event)} className="mt-2 inline-flex text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                        View visitor context
                      </Link>
                    ) : null}
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
