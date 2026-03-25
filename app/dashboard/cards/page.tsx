"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isImageCell, parseImageCell } from "@/lib/cellContent";
import ThemedCardWrapper from "@/components/ThemedCardWrapper";
import { useSession } from "next-auth/react";
import PlaySoloButton from "@/components/PlaySoloButton";
import StartGameButton from "@/components/StartGameButton";

interface Card {
  _id: string;
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

export default function MyCardsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleDelete = async (cardId: string) => {
    try {
      const response = await fetch(`/api/cards?cardId=${cardId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete card");
      }

      // Refresh cards list
      setCards(cards.filter((card) => card._id !== cardId));
      setDeleteConfirm(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      alert(err.message || "Failed to delete card");
    }
  };

  const copyShareLink = (shareLink: string) => {
    const url = `${window.location.origin}/share/${shareLink}`;
    navigator.clipboard.writeText(url);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
            <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-slate-500 font-medium">Loading your cards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:shadow-indigo-300 transition-all duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
              MyBingoCard
            </span>
          </Link>
          
          <div className="flex gap-2 md:gap-4 items-center">
             <Link
              href="/create"
              className="bg-slate-900 text-white px-4 py-2.5 md:px-5 rounded-lg text-sm font-semibold hover:bg-slate-800 transition-all duration-200 shadow-lg shadow-slate-900/20"
            >
              <span className="hidden sm:inline">Create New</span>
              <span className="sm:hidden">+ Create</span>
            </Link>
            <Link
              href="/dashboard"
              className="px-3 md:px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-all duration-200"
            >
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Home</span>
            </Link>
             <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500 ml-2">
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || "U"}
            </div>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-24 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
             <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">My Bingo Cards</h1>
                <p className="text-slate-600">
                    Manage and share your created cards.
                </p>
             </div>
             <div className="text-sm font-medium text-slate-500 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                {cards.length} card{cards.length !== 1 ? "s" : ""} total
             </div>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-center gap-3">
               <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {cards.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 border-dashed p-16 text-center">
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
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">You haven't created any cards yet</h3>
              <p className="text-slate-500 mb-8 max-w-md mx-auto">
                Get started by creating your first custom bingo card. It only takes a minute!
              </p>
              <Link
                href="/create"
                className="inline-flex items-center justify-center px-8 py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all font-bold text-lg"
              >
                Create Your First Card
              </Link>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {cards.map((card) => (
                <div
                  key={card._id}
                  className="group bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-100 transition-all duration-300 overflow-hidden flex flex-col"
                >
                  {/* Card Preview */}
                  <div className="p-6 bg-slate-50 border-b border-slate-100 relative overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white opacity-50"></div>
                     <div className="relative z-10">
                        {renderCardPreview(card)}
                     </div>
                  </div>

                  {/* Card Info */}
                  <div className="p-5 flex flex-col flex-grow">
                    <div className="mb-4">
                       <h3 className="font-bold text-slate-900 text-lg mb-1 line-clamp-1">{card.title}</h3>
                        {card.description ? (
                            <p className="text-sm text-slate-500 line-clamp-2 min-h-[2.5em]">
                            {card.description}
                            </p>
                        ) : (
                             <p className="text-sm text-slate-400 italic min-h-[2.5em]">No description</p>
                        )}
                    </div>

                    <div className="flex items-center justify-between text-xs font-medium text-slate-400 mb-6 mt-auto">
                      <span className="bg-slate-100 px-2 py-1 rounded text-slate-500">{card.size}×{card.size}</span>
                      <span>
                        {new Date(card.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <PlaySoloButton cardId={card._id} />
                        <StartGameButton cardId={card._id} />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                          <Link
                            href={`/cards/${card._id}`}
                            className="text-center px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-lg hover:bg-indigo-100 hover:border-indigo-200 transition-colors text-sm font-semibold"
                          >
                            Open
                          </Link>
                          <Link
                            href={`/create?cardId=${card._id}`}
                            className="text-center px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors text-sm font-semibold"
                          >
                            Edit
                          </Link>
                      </div>

                      <Link
                        href={`/create?cardId=${card._id}&batchMode=1`}
                        className="w-full px-4 py-2.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-lg hover:bg-violet-100 hover:border-violet-300 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />
                        </svg>
                        Bulk Generate
                      </Link>

                      {card.isPublic && card.shareLink && (
                        <button
                          onClick={() => copyShareLink(card.shareLink!)}
                          className="w-full px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg hover:bg-emerald-100 transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                          Copy Link
                        </button>
                      )}

                      {deleteConfirm === card._id ? (
                        <div className="flex gap-2 animate-fade-in">
                          <button
                            onClick={() => handleDelete(card._id)}
                            className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-bold"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="flex-1 px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition text-xs font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(card._id)}
                          className="w-full px-4 py-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors text-xs font-medium"
                        >
                          Delete Card
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
