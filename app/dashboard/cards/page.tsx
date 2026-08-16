"use client";

import { Suspense, useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { isImageCell, parseImageCell } from "@/lib/cellContent";
import ThemedCardWrapper from "@/components/ThemedCardWrapper";
import PlaySoloButton from "@/components/PlaySoloButton";
import StartGameButton from "@/components/StartGameButton";
import ShareBatchButton from "@/components/ShareBatchButton";
import WorkspaceShell, { WorkspacePageHead } from "@/components/WorkspaceShell";
import { trackClientActivity } from "@/lib/activity-client";
import {
  getBrowserStorageItem,
  removeBrowserStorageItem,
  setBrowserStorageItem,
} from "@/lib/browser-storage";

interface Card {
  _id: string;
  batchId?: string;
  title: string;
  description?: string;
  size: 3 | 4 | 5;
  cells: string[];
  freeSpace: boolean;
  style: {
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    fontSize?: string;
    fontFamily?: string;
    theme?: string;
  };
  isPublic: boolean;
  shareLink?: string;
  createdAt: string;
  updatedAt: string;
}
interface BatchGroup {
  batchId: string;
  title: string;
  cards: Card[];
}

// Cards created via batch generation are titled like "Oscar Night! #1", "Oscar Night! #2".
// Group them by stripping the trailing " #N" suffix so we can treat the group as a batch.
function groupCardsByBatch(cards: Card[]): BatchGroup[] {
  const groups = new Map<string, { batchId: string; title: string; cards: Card[] }>();
  for (const card of cards) {
    const explicitBatchId = typeof card.batchId === "string" ? card.batchId.trim() : "";
    const match = card.title.match(/^(.+?)\s+#\d+\s*$/);
    const title = match?.[1]?.trim() || "";

    if (!explicitBatchId && !title) continue;

    const groupKey = explicitBatchId ? `batch:${explicitBatchId}` : `legacy:${title}`;
    const resolvedBatchId = explicitBatchId || card._id;
    const resolvedTitle = title || card.title.trim() || "Untitled batch";

    const existing = groups.get(groupKey);
    if (existing) {
      existing.cards.push(card);
    } else {
      groups.set(groupKey, {
        batchId: resolvedBatchId,
        title: resolvedTitle,
        cards: [card],
      });
    }
  }

  const result: BatchGroup[] = [];
  for (const { batchId, title, cards: groupedCards } of groups.values()) {
    if (groupedCards.length <= 1) continue;
    // Sort newest first within the group so the first card is a stable representative.
    const sorted = [...groupedCards].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    result.push({
      batchId,
      title,
      cards: sorted,
    });
  }

  // Sort groups by most recent card
  result.sort(
    (a, b) =>
      new Date(b.cards[0]!.createdAt).getTime() -
      new Date(a.cards[0]!.createdAt).getTime()
  );

  return result;
}

export default function MyCardsPage() {
  return (
    <Suspense fallback={null}>
      <MyCardsPageInner />
    </Suspense>
  );
}

function MyCardsPageInner() {
  const searchParams = useSearchParams();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchDeleting, setBatchDeleting] = useState(false);
  const [sharedBanner, setSharedBanner] = useState<{
    count: number;
    recipientCount: number;
    selfCount: number;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "drafts" | "shared">("all");

  useEffect(() => {
    if (searchParams.get("shared") === "true") {
      const countParam = Number(searchParams.get("count") || "0");
      const recipientCountParam = Number(searchParams.get("recipientCount") || "0");
      const selfCountParam = Number(searchParams.get("selfCount") || "0");
      const count = Number.isFinite(countParam) && countParam > 0 ? countParam : 0;
      const recipientCount = Number.isFinite(recipientCountParam) && recipientCountParam > 0 ? recipientCountParam : 0;
      const selfCount = Number.isFinite(selfCountParam) && selfCountParam > 0 ? selfCountParam : Math.max(0, count - recipientCount);
      setSharedBanner({ count, recipientCount, selfCount });
    }
  }, [searchParams]);

  const batchGroups = useMemo(() => groupCardsByBatch(cards), [cards]);
  const filteredCards = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return cards.filter((card) => {
      const matchesQuery = !query || card.title.toLowerCase().includes(query);
      const isShared = Boolean(card.isPublic && card.shareLink);
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "shared" ? isShared : !isShared);
      return matchesQuery && matchesStatus;
    });
  }, [cards, searchQuery, statusFilter]);

  const toggleSelect = (cardId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const selectAll = () => {
    const visibleIds = filteredCards.map((card) => card._id);
    const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
    setSelected((previous) => {
      const next = new Set(previous);
      if (allVisibleSelected) visibleIds.forEach((id) => next.delete(id));
      else visibleIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleBatchDelete = async () => {
    if (selected.size === 0) return;
    setBatchDeleting(true);
    try {
      const promises = Array.from(selected).map((cardId) =>
        fetch(`/api/cards?cardId=${cardId}`, { method: "DELETE" })
      );
      await Promise.all(promises);
      cleanUpLocalStorage(Array.from(selected));
      setCards((prev) => prev.filter((c) => !selected.has(c._id)));
      exitSelectMode();
    } catch (err: any) {
      console.error("Batch delete error:", err);
      alert("Some cards failed to delete. Please try again.");
    } finally {
      setBatchDeleting(false);
    }
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/cards");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch cards");
      }

      setCards(data.cards || []);
    } catch (err: any) {
      console.error("Fetch cards error:", err);
      setError(err.message || "Failed to load cards");
    } finally {
      setLoading(false);
    }
  };

  const cleanUpLocalStorage = (deletedIds: string[]) => {
    try {
      const stored = getBrowserStorageItem("localStorage", "mybingo_recently_played");
      if (stored) {
        const items = JSON.parse(stored);
        const filtered = items.filter((item: any) => !deletedIds.includes(item.cardId));
        setBrowserStorageItem("localStorage", "mybingo_recently_played", JSON.stringify(filtered));
      }
      // Also clean up saved game states
      deletedIds.forEach((id) => {
        removeBrowserStorageItem("localStorage", `mybingo_state_${id}`);
      });
    } catch {}
  };

  const handleDelete = async (cardId: string) => {
    try {
      const response = await fetch(`/api/cards?cardId=${cardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete card");
      }

      // Refresh cards list and clean localStorage
      setCards(cards.filter((card) => card._id !== cardId));
      setDeleteConfirm(null);
      cleanUpLocalStorage([cardId]);
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(err.message || "Failed to delete card");
    }
  };

  const copyShareLink = (card: Card) => {
    if (!card.shareLink) return;
    const shareLink = card.shareLink;
    const url = `${window.location.origin}/share/${shareLink}`;
    navigator.clipboard.writeText(url);
    trackClientActivity("share_link_copied", {
      cardId: card._id,
      title: card.title,
      source: "dashboard_cards",
      context: "owner_card",
    });
    trackClientActivity("card_share_link_copied", {
      cardId: card._id,
      title: card.title,
      source: "dashboard_cards",
    });
    alert("Share link copied to clipboard!");
  };

  const renderCardPreview = (card: Card) => {
    const displayCells = card.cells.slice(0, 9);
    const freeSpaceIndex = card.freeSpace ? Math.floor((card.size * card.size) / 2) : -1;

    return (
      <ThemedCardWrapper theme={card.style?.theme} title={card.title} size="mini">
        <div
          className="grid gap-1 transform scale-95 group-hover:scale-100 transition-transform duration-300"
          style={{
            gridTemplateColumns: `repeat(3, 1fr)`,
          }}
        >
          {displayCells.map((cell, index) => {
            const isFreeSpace = card.freeSpace && index === freeSpaceIndex && index < 9;
            return (
              <div
                key={index}
                className="aspect-square flex items-center justify-center text-center text-[8px] leading-tight font-medium rounded p-0.5 overflow-hidden"
                style={{
                  backgroundColor: card.style.backgroundColor || "#fff",
                  color: card.style.textColor || "#334155",
                  border: `1px solid ${card.style.borderColor || "#e2e8f0"}`,
                }}
              >
                {isFreeSpace ? "FREE" : isImageCell(cell) ? (
                  <img src={parseImageCell(cell)?.imageUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
                ) : cell.length > 12 ? cell.substring(0, 12) + "..." : cell}
              </div>
            );
          })}
        </div>
      </ThemedCardWrapper>
    );
  };


  if (loading) {
    return (
      <WorkspaceShell current="/dashboard/cards">
        <div className="card empty-state" role="status">
          <div className="empty-state-inner">
            <div className="empty-icon" aria-hidden="true">▦</div>
            <p>Loading your cards…</p>
          </div>
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell current="/dashboard/cards">
      <WorkspacePageHead
        title="My cards"
        description="Find a saved card, reopen a draft, or share a game with players."
        action={<Link href="/create" className="button button-primary">＋ Create card</Link>}
      />

      <div className="toolbar">
        <label className="search-field">
          <span className="sr-only">Search your cards</span>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>
          <input
            className="text-input"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search by title…"
          />
        </label>
        <div className="segmented" aria-label="Card status filter">
          {(["all", "drafts", "shared"] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              aria-pressed={statusFilter === filter}
              onClick={() => setStatusFilter(filter)}
            >
              {filter === "all" ? "All cards" : filter === "drafts" ? "Drafts" : "Shared"}
            </button>
          ))}
        </div>
      </div>

      <div className="section-title-row cards-summary-row">
        <p className="caption">{filteredCards.length} of {cards.length} card{cards.length === 1 ? "" : "s"}</p>
        {cards.length > 0 && (
          <button type="button" className="button button-small" onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}>
            {selectMode ? "Cancel selection" : "Select cards"}
          </button>
        )}
      </div>

      {selectMode && (
        <div className="notice bulk-action-bar" role="region" aria-label="Bulk card actions">
          <div className="bulk-action-copy">
            <button type="button" className="button button-small button-quiet" onClick={selectAll}>
              {filteredCards.length > 0 && filteredCards.every((card) => selected.has(card._id)) ? "Deselect visible" : "Select visible"}
            </button>
            <span>{selected.size} selected</span>
          </div>
          <button type="button" className="button button-small button-danger" onClick={handleBatchDelete} disabled={selected.size === 0 || batchDeleting}>
            {batchDeleting ? "Deleting…" : `Delete selected (${selected.size})`}
          </button>
        </div>
      )}

      {error && (
        <div className="notice notice-danger" role="alert">
          <span className="notice-icon" aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {sharedBanner !== null && (
        <div className="notice notice-success" role="status">
          <span className="notice-icon" aria-hidden="true">✓</span>
          <span>
            <strong>{sharedBanner.count > 0 ? `${sharedBanner.count} share link${sharedBanner.count === 1 ? "" : "s"} created.` : "Your share links are being generated."}</strong>{" "}
            {sharedBanner.count > 0 && <Link href="/dashboard/share-links">Open Share links.</Link>}
          </span>
          <button type="button" className="button button-icon button-small button-quiet" onClick={() => setSharedBanner(null)} aria-label="Dismiss share link notice">×</button>
        </div>
      )}

      {batchGroups.length > 0 && (
        <section className="card-soft card-body surface-yellow batch-summary-card">
          <div className="section-title-row">
            <div>
              <span className="eyebrow">Batch sharing</span>
              <h2>{batchGroups.length} batch{batchGroups.length === 1 ? "" : "es"} ready</h2>
              <p className="caption">Send unique player cards from a batch. Share links stay in the workspace.</p>
            </div>
            <Link href="/dashboard/share-links" className="button button-small">View share links</Link>
          </div>
          <div className="batch-summary-list">
            {batchGroups.slice(0, 3).map((group) => (
              <div className="batch-summary-row" key={group.batchId}>
                <span><strong>{group.title}</strong><small>{group.cards.length} cards</small></span>
                <ShareBatchButton batchId={group.batchId} cardCount={group.cards.length} batchTitle={group.title} variant="subtle" />
              </div>
            ))}
          </div>
        </section>
      )}

      {cards.length === 0 ? (
        <section className="card empty-state">
          <div className="empty-state-inner">
            <div className="empty-icon" aria-hidden="true">▦</div>
            <h2>No cards yet</h2>
            <p>Create a card once, then return here to edit, play, or share it.</p>
            <Link href="/create" className="button button-primary">＋ Create your first card</Link>
          </div>
        </section>
      ) : filteredCards.length === 0 ? (
        <section className="card-soft empty-state">
          <div className="empty-state-inner">
            <div className="empty-icon" aria-hidden="true">⌕</div>
            <h2>No matching cards</h2>
            <p>Try another title or clear the current filter.</p>
            <button type="button" className="button" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}>Clear filters</button>
          </div>
        </section>
      ) : (
        <div className="card-list">
          {filteredCards.map((card) => (
            <article className={`card-soft saved-card ${selectMode ? "selectable-card" : ""}`} key={card._id}>
              {selectMode && (
                <label className="card-select-control">
                  <input type="checkbox" checked={selected.has(card._id)} onChange={() => toggleSelect(card._id)} />
                  <span className="sr-only">Select {card.title}</span>
                </label>
              )}
              <div className="saved-card-preview">{renderCardPreview(card)}</div>
              <div className="saved-card-copy">
                <h3 title={card.title}>{card.title}</h3>
                <div className="saved-card-meta">
                  <span>{card.size}×{card.size}</span>
                  <span>{new Date(card.updatedAt || card.createdAt).toLocaleDateString()}</span>
                  <span className={card.isPublic && card.shareLink ? "card-status-shared" : ""}>{card.isPublic && card.shareLink ? "Shared" : "Draft"}</span>
                </div>
                {card.description && <p className="caption saved-card-description">{card.description}</p>}
              </div>
              <div className="saved-card-actions">
                <Link href={`/cards/${card._id}`} className="button button-primary button-small">Open</Link>
                <Link href={`/cards/${card._id}?next=share`} className="button button-small">Share</Link>
                <Link href={`/create?cardId=${card._id}`} className="button button-small">Edit</Link>
                <PlaySoloButton cardId={card._id} />
                <StartGameButton cardId={card._id} label="Play with friends" compact className="button button-small button-teal" />
                {card.isPublic && card.shareLink && <button type="button" className="button button-small button-quiet" onClick={() => copyShareLink(card)}>Copy link</button>}
                <Link href={`/create?cardId=${card._id}&batchMode=1`} className="button button-small button-quiet">Bulk generate</Link>
                {deleteConfirm === card._id ? (
                  <span className="delete-confirm-group">
                    <button type="button" className="button button-small button-danger" onClick={() => handleDelete(card._id)}>Confirm delete</button>
                    <button type="button" className="button button-small" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                  </span>
                ) : (
                  <button type="button" className="button button-small button-quiet workspace-card-delete" onClick={() => setDeleteConfirm(card._id)}>Delete</button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
