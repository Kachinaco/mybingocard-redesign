"use client";

import { useEffect, useState, useCallback } from "react";

interface CardOwner {
  name?: string;
  email?: string;
}

interface AdminCard {
  _id: string;
  title: string;
  size: number;
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

export default function AdminCardsPage() {
  const [data, setData] = useState<CardsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchCards = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/cards?page=${pageNum}&limit=50`);
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
  }, []);

  useEffect(() => {
    fetchCards(page);
  }, [page, fetchCards]);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Cards</h1>
        <p className="text-slate-500 mt-1">
          {data
            ? `${data.totalCards.toLocaleString()} total cards`
            : "Loading cards..."}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-sm text-slate-400">Loading cards...</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Public
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.cards.map((card) => (
                    <tr
                      key={card._id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <span className="text-sm font-medium text-slate-900">
                          {card.title}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <div>
                          <p className="text-sm text-slate-700 font-medium">
                            {card.owner.name || "No name"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {card.owner.email || "Unknown"}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className="text-sm text-slate-500">
                          {card.size}x{card.size}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            card.isPublic
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              card.isPublic ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          ></span>
                          {card.isPublic ? "Public" : "Private"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-500">
                        {card.views.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-400">
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
                    </tr>
                  ))}
                  {data?.cards.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-sm text-slate-400"
                      >
                        No cards found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {data?.cards.map((card) => (
                <div key={card._id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {card.title}
                      </p>
                      <p className="mt-1 text-xs font-medium text-slate-600">
                        {card.owner.name || "No name"}
                      </p>
                      <p className="mt-1 break-all text-xs text-slate-400">
                        {card.owner.email || "Unknown"}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        card.isPublic
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          card.isPublic ? "bg-emerald-500" : "bg-slate-400"
                        }`}
                      ></span>
                      {card.isPublic ? "Public" : "Private"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                    <span>{card.size}x{card.size}</span>
                    <span>{card.views.toLocaleString()} views</span>
                    <span className="col-span-2">
                      Created{" "}
                      {card.createdAt
                        ? new Date(card.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>
                </div>
              ))}
              {data?.cards.length === 0 && (
                <div className="py-12 text-center text-sm text-slate-400">
                  No cards found.
                </div>
              )}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-slate-400">
                  Page {data.page} of {data.totalPages} ({data.totalCards} total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(data.totalPages, p + 1))
                    }
                    disabled={page >= data.totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
