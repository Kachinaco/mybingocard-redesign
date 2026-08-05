"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function FavoriteButton({ cardId }: { cardId: string }) {
  const { data: session } = useSession();
  const [favorited, setFavorited] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!session?.user) return;
    fetch(`/api/favorites?cardId=${cardId}`)
      .then((r) => r.json())
      .then((d) => setFavorited(d.favorited))
      .catch(() => {});
  }, [session, cardId]);

  if (!session?.user) return null;

  const toggle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId }),
      });
      const data = await res.json();
      setFavorited(data.favorited);
    } catch {}
    setLoading(false);
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`p-2 rounded-lg transition-all ${
        favorited
          ? "text-[#ff5d8f] hover:text-[#ff5d8f]"
          : "text-[#6b6459] hover:text-[#ff5d8f]"
      } ${loading ? "opacity-50" : ""}`}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <svg className="w-5 h-5" fill={favorited ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    </button>
  );
}
