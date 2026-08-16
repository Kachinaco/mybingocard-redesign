import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import ShareLinksTracker from "./ShareLinksTracker";
import CopyShareLinkButton from "./CopyShareLinkButton";
import CopyGroupInviteButton from "@/components/CopyGroupInviteButton";
import { getCardById } from "@/lib/db/cards";
import WorkspaceShell, { WorkspacePageHead } from "@/components/WorkspaceShell";

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
      return "pill pill-success";
    case "pending":
      return "pill pill-local";
    case "expired":
      return "pill";
    case "refunded":
      return "pill pill-pink";
    default:
      return "pill";
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
    <WorkspaceShell current="/dashboard/share-links">
      <ShareLinksTracker totalLinks={totalLinks} />
      <WorkspacePageHead
        title="Share links"
        description="Manage player links, copy a group invite, and see who has claimed a card."
        action={<Link href="/dashboard/cards" className="button button-primary">＋ Create player batch</Link>}
      />

      {totalLinks === 0 ? (
        <section className="card empty-state">
          <div className="empty-state-inner">
            <div className="empty-icon" aria-hidden="true">↗</div>
            <h2>No share links yet</h2>
            <p>Generate a player batch from My cards. Each player then receives a unique link.</p>
            <Link href="/dashboard/cards" className="button button-primary">Pick a batch to share</Link>
          </div>
        </section>
      ) : (
        <>
          <div className="metrics-grid share-link-metrics">
            <article className="card-soft metric-card surface-purple">
              <span className="eyebrow">Total</span>
              <strong className="stat-value">{totalLinks}</strong>
              <span className="stat-label">Player links</span>
            </article>
            <article className="card-soft metric-card surface-teal">
              <span className="eyebrow">Claimed</span>
              <strong className="stat-value">{claimedCount}</strong>
              <span className="stat-label">Players in games</span>
            </article>
            <article className="card-soft metric-card surface-yellow">
              <span className="eyebrow">Pending</span>
              <strong className="stat-value">{pendingCount}</strong>
              <span className="stat-label">Links still available</span>
            </article>
            <article className="card-soft metric-card surface-pink">
              <span className="eyebrow">Claim rate</span>
              <strong className="stat-value">{claimRate}%</strong>
              <span className="stat-label">Claimed by players</span>
            </article>
          </div>

          <div className="stack">
            {batches.map(([batchId, batchLinks]) => {
              const batchTitle = batchTitles[batchId] || "Untitled batch";
              const pendingForBatch = batchLinks.filter((link) => link.status === "pending").length;
              const claimedForBatch = batchLinks.filter((link) => link.status === "claimed").length;
              const inviteSeed = getInviteSeed(batchLinks);

              return (
                <section className="card-soft share-link-batch" key={batchId}>
                  <div className="share-link-batch-head">
                    <div>
                      <span className="eyebrow">Player batch</span>
                      <h2>{batchTitle}</h2>
                      <p className="caption">One group invite assigns the next unused card automatically.</p>
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
                  <div className="share-link-batch-stats">
                    <span className="pill">{batchLinks.length} link{batchLinks.length === 1 ? "" : "s"}</span>
                    <span className="pill pill-success">{claimedForBatch} claimed</span>
                    <span className="pill pill-local">{pendingForBatch} available</span>
                  </div>
                  <div className="share-link-list">
                    {batchLinks.map((link) => (
                      <div className="share-link-row" key={link.linkId}>
                        <div className="share-link-copy">
                          <div className="share-link-id">
                            <code>{link.linkId}</code>
                            <span className={statusStyle(link.status)}>{link.status}</span>
                          </div>
                          <span className="caption">
                            {link.recipientEmail || link.recipientPhone || "No recipient — sent to you"}
                          </span>
                          <span className="caption">
                            Created {formatDate(link.createdAt)}
                            {link.status === "claimed" && link.claimedAt ? <> · Claimed {formatDate(link.claimedAt)}</> : null}
                          </span>
                        </div>
                        <CopyShareLinkButton linkId={link.linkId} />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </>
      )}
    </WorkspaceShell>
  );
}
