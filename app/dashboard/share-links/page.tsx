import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";
import ShareLinksTracker from "./ShareLinksTracker";
import CopyShareLinkButton from "./CopyShareLinkButton";
import CopyGroupInviteButton from "@/components/CopyGroupInviteButton";
import { getCardById } from "@/lib/db/cards";

export const dynamic = "force-dynamic";

interface SharedLinkDTO {
  _id?: string;
  linkId: string;
  batchId: string;
  cardId: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientName?: string;
  status: "pending" | "claimed" | "expired" | "refunded";
  claimedAt?: string;
  createdAt: string;
  amountCents: number;
}

function deriveBatchTitle(rawTitle: string | null | undefined): string {
  if (!rawTitle) return "Untitled batch";
  // Strip a trailing " #N" suffix added by batch generation (e.g. "Oscar Night! #3" -> "Oscar Night!")
  return rawTitle.replace(/\s*#\d+\s*$/, "").trim() || "Untitled batch";
}

interface ShareLinksResponse {
  links: SharedLinkDTO[];
  grouped: Record<string, SharedLinkDTO[]>;
}

async function fetchShareLinks(): Promise<ShareLinksResponse> {
  const hdrs = await headers();
  const host = hdrs.get("host");
  const protocol =
    hdrs.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "development" ? "http" : "https");
  const cookie = hdrs.get("cookie") || "";

  if (!host) {
    return { links: [], grouped: {} };
  }

  try {
    const res = await fetch(`${protocol}://${host}/api/share-links?owner=me`, {
      headers: { cookie },
      cache: "no-store",
    });

    if (!res.ok) {
      return { links: [], grouped: {} };
    }

    const data = (await res.json()) as Partial<ShareLinksResponse>;
    return {
      links: Array.isArray(data.links) ? data.links : [],
      grouped:
        data.grouped && typeof data.grouped === "object" ? data.grouped : {},
    };
  } catch {
    return { links: [], grouped: {} };
  }
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "—";
  }
}

function statusStyle(status: SharedLinkDTO["status"]): string {
  switch (status) {
    case "claimed":
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    case "pending":
      return "bg-amber-50 text-amber-700 border border-amber-100";
    case "expired":
      return "bg-slate-100 text-slate-600 border border-slate-200";
    case "refunded":
      return "bg-rose-50 text-rose-700 border border-rose-100";
    default:
      return "bg-slate-100 text-slate-600 border border-slate-200";
  }
}

function getInviteSeed(links: SharedLinkDTO[]): SharedLinkDTO | null {
  return (
    links.find((link) => link.status === "pending") ||
    links.find((link) => link.status !== "expired" && link.status !== "refunded") ||
    links[0] ||
    null
  );
}

export default async function ShareLinksPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login?callbackUrl=/dashboard/share-links");
  }

  const { links, grouped } = await fetchShareLinks();

  const batches = Object.entries(grouped);
  const totalLinks = links.length;
  const claimedCount = links.filter((l) => l.status === "claimed").length;
  const pendingCount = links.filter((l) => l.status === "pending").length;
  const claimRate = totalLinks > 0 ? Math.round((claimedCount / totalLinks) * 100) : 0;

  // Resolve a friendly title for each batch from its first link's card.
  const batchTitles: Record<string, string> = {};
  await Promise.all(
    batches.map(async ([batchId, batchLinks]) => {
      const firstCardId = batchLinks[0]?.cardId;
      if (!firstCardId) {
        batchTitles[batchId] = "Untitled batch";
        return;
      }
      try {
        const card = await getCardById(firstCardId);
        batchTitles[batchId] = deriveBatchTitle(card?.title);
      } catch {
        batchTitles[batchId] = "Untitled batch";
      }
    })
  );

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      <ShareLinksTracker totalLinks={totalLinks} />

      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              MyBingoCard
            </span>
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            <Link
              href="/dashboard/cards"
              className="px-3 md:px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all duration-200"
            >
              My Cards
            </Link>
            <Link
              href="/dashboard"
              className="px-3 md:px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all duration-200"
            >
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Home</span>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="pt-28 pb-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2">
                Share Links
              </h1>
              <p className="text-slate-600">
                Copy one group invite, check who has claimed a card, and manage every player link.
              </p>
            </div>
            <Link
              href="/dashboard/cards"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-200 transition-all"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Create more links
            </Link>
          </div>

          {totalLinks > 0 && (
            <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Total links
                </p>
                <p className="text-2xl font-bold text-slate-900">{totalLinks}</p>
              </div>
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Claimed
                </p>
                <p className="text-2xl font-bold text-emerald-600">
                  {claimedCount}
                </p>
              </div>
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Pending
                </p>
                <p className="text-2xl font-bold text-amber-600">
                  {pendingCount}
                </p>
              </div>
              <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  Claim rate
                </p>
                <p className="text-2xl font-bold text-indigo-600">{claimRate}%</p>
              </div>
            </div>
          )}

          {totalLinks === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 border-dashed p-8 sm:p-12 text-center">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-10 h-10 text-indigo-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                No share links yet
              </h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Generate a batch, then send each player a unique card link. You can email recipients directly or copy the links yourself.
              </p>
              <Link
                href="/dashboard/cards"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all font-bold text-lg"
              >
                Pick a batch to share
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {batches.map(([batchId, batchLinks]) => (
                (() => {
                  const batchTitle = batchTitles[batchId] || "Untitled batch";
                  const pendingForBatch = batchLinks.filter((link) => link.status === "pending").length;
                  const claimedForBatch = batchLinks.filter((link) => link.status === "claimed").length;
                  const inviteSeed = getInviteSeed(batchLinks);

                  return (
                <div
                  key={batchId}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Batch
                      </p>
                      <p className="text-base font-semibold text-slate-900 break-words">
                        {batchTitle}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Send one group invite. Each friend gets the next unused card automatically.
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 sm:items-end">
                      <div className="flex flex-wrap gap-2 text-xs font-semibold sm:justify-end">
                        <span className="rounded-full bg-white px-3 py-1 text-slate-600 ring-1 ring-slate-200">
                          {batchLinks.length} link{batchLinks.length !== 1 ? "s" : ""}
                        </span>
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 ring-1 ring-emerald-100">
                          {claimedForBatch} claimed
                        </span>
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700 ring-1 ring-amber-100">
                          {pendingForBatch} left
                        </span>
                      </div>
                      {inviteSeed && (
                        <CopyGroupInviteButton
                          inviteCode={inviteSeed.linkId}
                          batchId={batchId}
                          batchTitle={batchTitle}
                          totalLinks={batchLinks.length}
                          pendingLinks={pendingForBatch}
                        />
                      )}
                    </div>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {batchLinks.map((link) => (
                      <div
                        key={link.linkId}
                        className="px-6 py-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono text-slate-900 truncate">
                              {link.linkId}
                            </code>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${statusStyle(link.status)}`}
                            >
                              {link.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {link.recipientEmail ||
                              link.recipientPhone ||
                              "No recipient — sent to you"}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Created {formatDate(link.createdAt)}
                            {link.status === "claimed" && link.claimedAt && (
                              <> · Claimed {formatDate(link.claimedAt)}</>
                            )}
                          </p>
                        </div>
                        <CopyShareLinkButton linkId={link.linkId} />
                      </div>
                    ))}
                  </div>
                </div>
                  );
                })()
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
