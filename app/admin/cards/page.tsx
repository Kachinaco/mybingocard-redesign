"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface CardOwner {
  name?: string;
  email?: string;
}

interface AdminCard {
  _id: string;
  title: string;
  size: number;
  cells: string[];
  isPublic: boolean;
  views: number;
  createdAt: string;
  updatedAt: string;
  owner: CardOwner;
}

interface CardsResponse {
  cards: AdminCard[];
  totalCards: number;
  page: number;
  limit: number;
  totalPages: number;
}

function CardPreviewModal({
  card,
  onClose,
}: {
  card: AdminCard;
  onClose: () => void;
}) {
  const previewCells = card.cells.slice(0, 9);
  const gridSize = Math.min(card.size, 3);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-[#33312e]">
              {card.title}
            </h3>
            <p className="text-xs text-[#6b6459]">
              {card.size}x{card.size} &middot;{" "}
              {card.owner.email || "Unknown owner"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1 text-[#6b6459] hover:bg-[#fff7ed] hover:text-[#33312e]"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div
          className="mx-auto grid gap-1"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            maxWidth: "280px",
          }}
        >
          {previewCells.map((cell, i) => (
            <div
              key={i}
              className="flex items-center justify-center rounded border border-[#a39a88] bg-[#fff7ed] p-2 text-center"
              style={{ aspectRatio: "1", minHeight: "60px" }}
            >
              <span className="line-clamp-3 text-xs text-[#33312e]">
                {cell || "\u00A0"}
              </span>
            </div>
          ))}
        </div>
        {card.cells.length > 9 && (
          <p className="mt-3 text-center text-xs text-[#6b6459]">
            Showing 9 of {card.cells.length} cells
          </p>
        )}
        <div className="mt-4 flex items-center justify-end gap-2">
          <a
            href={`/cards/${card._id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-[#a39a88] px-3 py-1.5 text-sm font-medium text-[#33312e] hover:bg-[#fff7ed]"
          >
            Open card &rarr;
          </a>
          <button
            onClick={onClose}
            className="rounded-lg bg-[#fff7ed] px-3 py-1.5 text-sm font-medium text-[#33312e] hover:bg-[#a39a88]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmDialog({
  card,
  onConfirm,
  onCancel,
  deleting,
}: {
  card: AdminCard;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-[#33312e]">Delete card?</h3>
        <p className="mt-2 text-sm text-[#6b6459]">
          This will permanently delete{" "}
          <span className="font-medium text-[#33312e]">
            &ldquo;{card.title}&rdquo;
          </span>{" "}
          owned by {card.owner.email || "unknown"}. This action cannot be undone.
        </p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg border border-[#a39a88] px-3 py-1.5 text-sm font-medium text-[#33312e] hover:bg-[#fff7ed] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="rounded-lg bg-[#ff5d8f] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#ff5d8f] disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCardsPage() {
  const [data, setData] = useState<CardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [visibility, setVisibility] = useState<"all" | "public" | "private">(
    "all"
  );
  const [previewCard, setPreviewCard] = useState<AdminCard | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCard | null>(null);
  const [deleting, setDeleting] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCards = useCallback(
    async (pageNum: number, searchStr: string, vis: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(pageNum),
          limit: "50",
        });
        if (searchStr) params.set("search", searchStr);
        if (vis !== "all") params.set("visibility", vis);

        const res = await fetch(`/api/admin/cards?${params}`);
        if (!res.ok) {
          throw new Error("Failed to fetch cards");
        }
        const json: CardsResponse = await res.json();
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCards(page, debouncedSearch, visibility);
  }, [page, visibility, fetchCards, debouncedSearch]);

  function handleSearchChange(value: string) {
    setSearch(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  }

  function handleVisibilityChange(vis: "all" | "public" | "private") {
    setVisibility(vis);
    setPage(1);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/cards", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: deleteTarget._id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error || "Failed to delete card");
      }
      setDeleteTarget(null);
      fetchCards(page, debouncedSearch, visibility);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const visibilityOptions: { value: "all" | "public" | "private"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "public", label: "Public" },
    { value: "private", label: "Private" },
  ];

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-[#33312e]">Cards</h1>
        <p className="text-[#6b6459] mt-1">
          {data
            ? `${data.totalCards.toLocaleString()} total cards`
            : "Loading cards..."}
        </p>
      </div>

      {/* Search and filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6b6459]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by title or owner email..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full rounded-lg border border-[#a39a88] bg-white py-2 pl-10 pr-4 text-sm text-[#33312e] placeholder-[#6b6459] focus:border-[#7c5cff] focus:outline-none focus:ring-2 focus:ring-[#7c5cff]/15"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-[#a39a88] bg-white p-0.5">
          {visibilityOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleVisibilityChange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                visibility === opt.value
                  ? "bg-[#7c5cff] text-white"
                  : "text-[#6b6459] hover:bg-[#fff7ed] hover:text-[#33312e]"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[#ff5d8f]/10 border border-[#ff5d8f] rounded-xl text-sm text-[#ff5d8f]">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#a39a88] shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-[#7c5cff] border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-sm text-[#6b6459]">Loading cards...</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#fff7ed] bg-[#fff7ed]">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[#6b6459] uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[#6b6459] uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[#6b6459] uppercase tracking-wider">
                      Size
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[#6b6459] uppercase tracking-wider">
                      Public
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[#6b6459] uppercase tracking-wider">
                      Views
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-[#6b6459] uppercase tracking-wider">
                      Created
                    </th>
                    <th className="py-3 px-6 text-xs font-semibold text-[#6b6459] uppercase tracking-wider text-right">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.cards.map((card) => (
                    <tr
                      key={card._id}
                      className="border-b border-[#fff7ed] hover:bg-[#fff7ed] transition-colors cursor-pointer"
                      onClick={() => setPreviewCard(card)}
                    >
                      <td className="py-3.5 px-6">
                        <span className="text-sm font-medium text-[#33312e]">
                          {card.title}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <div>
                          <p className="text-sm text-[#33312e] font-medium">
                            {card.owner.name || "No name"}
                          </p>
                          <p className="text-xs text-[#6b6459]">
                            {card.owner.email || "Unknown"}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="text-sm text-[#6b6459]">
                          {card.size}x{card.size}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            card.isPublic
                              ? "bg-[#2ec4b6]/10 text-[#2ec4b6]"
                              : "bg-[#fff7ed] text-[#6b6459]"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              card.isPublic ? "bg-[#2ec4b6]" : "bg-[#6b6459]"
                            }`}
                          ></span>
                          {card.isPublic ? "Public" : "Private"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-sm text-[#6b6459]">
                        {card.views.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-[#6b6459]">
                        {card.createdAt
                          ? new Date(card.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "N/A"}
                      </td>
                      <td className="py-3.5 px-6">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <a
                            href={`/cards/${card._id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-md px-2 py-1 text-xs font-medium text-[#7c5cff] hover:bg-[#7c5cff]/10"
                          >
                            View
                          </a>
                          <button
                            onClick={() => setDeleteTarget(card)}
                            className="rounded-md px-2 py-1 text-xs font-medium text-[#ff5d8f] hover:bg-[#ff5d8f]/10"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {data?.cards.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-sm text-[#6b6459]"
                      >
                        No cards found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-[#fff7ed] md:hidden">
              {data?.cards.map((card) => (
                <div
                  key={card._id}
                  className="px-4 py-4 cursor-pointer"
                  onClick={() => setPreviewCard(card)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#33312e]">
                        {card.title}
                      </p>
                      <p className="mt-1 text-xs font-medium text-[#33312e]">
                        {card.owner.name || "No name"}
                      </p>
                      <p className="mt-1 break-all text-xs text-[#6b6459]">
                        {card.owner.email || "Unknown"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        card.isPublic
                          ? "bg-[#2ec4b6]/10 text-[#2ec4b6]"
                          : "bg-[#fff7ed] text-[#6b6459]"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          card.isPublic ? "bg-[#2ec4b6]" : "bg-[#6b6459]"
                        }`}
                      ></span>
                      {card.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="grid grid-cols-2 gap-2 text-xs text-[#6b6459]">
                      <span>
                        {card.size}x{card.size}
                      </span>
                      <span>{card.views.toLocaleString()} views</span>
                      <span className="col-span-2">
                        Created{" "}
                        {card.createdAt
                          ? new Date(card.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "N/A"}
                      </span>
                    </div>
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a
                        href={`/cards/${card._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md px-2 py-1 text-xs font-medium text-[#7c5cff] hover:bg-[#7c5cff]/10"
                      >
                        View
                      </a>
                      <button
                        onClick={() => setDeleteTarget(card)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-[#ff5d8f] hover:bg-[#ff5d8f]/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {data?.cards.length === 0 && (
                <div className="py-12 text-center text-sm text-[#6b6459]">
                  No cards found.
                </div>
              )}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-[#fff7ed] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-[#6b6459]">
                  Page {data.page} of {data.totalPages} ({data.totalCards}{" "}
                  total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm font-medium text-[#33312e] bg-white border border-[#a39a88] rounded-lg hover:bg-[#fff7ed] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(data.totalPages, p + 1))
                    }
                    disabled={page >= data.totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-[#33312e] bg-white border border-[#a39a88] rounded-lg hover:bg-[#fff7ed] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview modal */}
      {previewCard && (
        <CardPreviewModal
          card={previewCard}
          onClose={() => setPreviewCard(null)}
        />
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <DeleteConfirmDialog
          card={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
