"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { trackClientActivity } from "@/lib/activity-client";
import PlayCard, { type PlayCardData } from "./PlayCard";

interface PlayClientProps {
  linkId: string;
}

type LinkStatus = "unclaimed" | "claimed" | "expired" | "revoked";

interface ShareLinkResponse {
  link: {
    id: string;
    status: LinkStatus;
    claimedBy?: string | null;
    ownerName?: string | null;
    expiresAt?: string | null;
  };
  card: PlayCardData;
  canPlay: boolean;
}

interface ClaimResponse {
  ok: boolean;
  card?: PlayCardData;
  guestAuth?: {
    userId: string;
    guestToken: string;
  };
  error?: string;
  isOwner?: boolean;
}

type ViewState =
  | "loading"
  | "invalid"
  | "unclaimed"
  | "playing"
  | "claiming"
  | "owner";

const LINK_ID_PATTERN = /^[a-zA-Z0-9]{6,32}$/;

function trackPlayingOnce(
  linkId: string,
  payload: { cardId?: string; cardTitle?: string },
) {
  if (typeof window === "undefined") return;
  const key = `_played_${linkId}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
  } catch {
    // If sessionStorage is unavailable (private mode quirks), fall through
    // and fire once per full page load anyway.
  }
  trackClientActivity("share_link_playing", {
    linkId,
    cardId: payload.cardId,
    cardTitle: payload.cardTitle,
  });
}

export default function PlayClient({ linkId }: PlayClientProps) {
  const { data: session, status: sessionStatus } = useSession();
  const visitTrackedRef = useRef(false);
  const linkIdValid = LINK_ID_PATTERN.test(linkId);

  const [viewState, setViewState] = useState<ViewState>(
    linkIdValid ? "loading" : "invalid",
  );
  // Distinguishes the automatic signed-in claim (spinner) from an explicit
  // guest button press (keep showing the preview with a disabled button).
  const [claimMode, setClaimMode] = useState<"auto" | "guest" | null>(null);
  const [card, setCard] = useState<PlayCardData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>(
    linkIdValid ? "" : "This share link doesn't look valid.",
  );
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string>("");
  const [copyFeedback, setCopyFeedback] = useState<string>("");

  // Track initial visit exactly once
  useEffect(() => {
    if (!linkIdValid) return;
    if (visitTrackedRef.current) return;
    visitTrackedRef.current = true;
    trackClientActivity("share_link_visited", { linkId });
  }, [linkId, linkIdValid]);

  const fetchLink = useCallback(async () => {
    try {
      const response = await fetch(`/api/share-links/${encodeURIComponent(linkId)}`, {
        cache: "no-store",
      });

      if (response.status === 404) {
        setErrorMessage("This share link doesn't exist or has been removed.");
        setViewState("invalid");
        return;
      }
      if (response.status === 410) {
        setErrorMessage("This share link has expired.");
        setViewState("invalid");
        return;
      }
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setErrorMessage(body?.error || "We couldn't load this link. Please try again.");
        setViewState("invalid");
        return;
      }

      const data = (await response.json()) as ShareLinkResponse;

      if (data.link.status === "expired" || data.link.status === "revoked") {
        setErrorMessage(
          data.link.status === "expired"
            ? "This share link has expired."
            : "This share link is no longer available.",
        );
        setViewState("invalid");
        return;
      }

      if (data.link.status === "claimed" && !data.canPlay) {
        setErrorMessage("This share link has already been claimed.");
        setViewState("invalid");
        return;
      }

      setCard(data.card);
      setOwnerName(data.link.ownerName || null);

      if (data.canPlay) {
        setViewState("playing");
        trackPlayingOnce(linkId, {
          cardId: data.card._id,
          cardTitle: data.card.title,
        });
      } else if (sessionStatus === "authenticated" && session?.user?.id) {
        // Skip the flash of the unclaimed CTA for signed-in users — the
        // auto-claim effect is about to fire, so show a spinner instead.
        setClaimMode("auto");
        setViewState("claiming");
      } else {
        setViewState("unclaimed");
      }
    } catch (err) {
      console.error("Failed to fetch share link:", err);
      setErrorMessage("Something went wrong loading this link. Please try again.");
      setViewState("invalid");
    }
  }, [linkId, sessionStatus, session?.user?.id]);

  useEffect(() => {
    if (!linkIdValid) return;
    if (sessionStatus === "loading") return;
    fetchLink();
  }, [fetchLink, sessionStatus, linkIdValid]);

  const handleSignIn = () => {
    trackClientActivity("share_link_signin_clicked", { linkId });
    // linkId is alphanumeric (validated above), so a single encode on the
    // full callback path is enough — encoding it twice breaks the redirect.
    const callbackUrl = `/play/${linkId}`;
    window.location.href = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
  };

  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/play/${linkId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopyFeedback("Link copied!");
      setTimeout(() => setCopyFeedback(""), 2000);
    } catch {
      setCopyFeedback("Couldn't copy — select and copy manually.");
      setTimeout(() => setCopyFeedback(""), 3000);
    }
  };

  const handleContinueAsGuest = async () => {
    setClaimError("");
    setClaimMode("guest");
    setViewState("claiming");
    trackClientActivity("share_link_guest_clicked", { linkId });

    try {
      const response = await fetch(`/api/share-links/${encodeURIComponent(linkId)}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guest: true }),
      });

      const data = (await response.json().catch(() => ({}))) as ClaimResponse;

      if (!response.ok || !data.ok) {
        setClaimError(data.error || "Unable to join as a guest. Please try again.");
        setClaimMode(null);
        setViewState("unclaimed");
        return;
      }

      // If the API created a guest user and returned a sign-in token, authenticate the session
      if (data.guestAuth?.userId && data.guestAuth?.guestToken) {
        const result = await signIn("guest", {
          userId: data.guestAuth.userId,
          guestToken: data.guestAuth.guestToken,
          redirect: false,
        });

        if (result?.error) {
          setClaimError("We couldn't start your guest session. Please try again.");
          setClaimMode(null);
          setViewState("unclaimed");
          return;
        }
      }

      trackClientActivity("share_link_claimed", {
        linkId,
        cardId: data.card?._id,
        method: "guest",
      });

      if (data.card) {
        setCard(data.card);
      }
      setClaimMode(null);
      setViewState("playing");
      trackPlayingOnce(linkId, {
        cardId: data.card?._id,
        cardTitle: data.card?.title,
      });
    } catch (err) {
      console.error("Guest claim failed:", err);
      setClaimError("Unable to join as a guest. Please try again.");
      setClaimMode(null);
      setViewState("unclaimed");
    }
  };

  // Auto-claim when a signed-in user hits an unclaimed link.
  // If the signed-in user is actually the link's owner, the API responds with
  // { isOwner: true, status: 400 } — we flip to the owner preview instead of
  // burning the claim.
  useEffect(() => {
    if (viewState !== "claiming") return;
    if (claimMode !== "auto") return;
    if (sessionStatus !== "authenticated") return;
    if (!session?.user?.id) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/share-links/${encodeURIComponent(linkId)}/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = (await response.json().catch(() => ({}))) as ClaimResponse;
        if (cancelled) return;

        if (response.status === 400 && data.isOwner) {
          setClaimMode(null);
          setViewState("owner");
          return;
        }

        if (!response.ok || !data.ok) {
          // Drop back to the unclaimed CTA so the user can retry manually.
          setClaimMode(null);
          setViewState("unclaimed");
          return;
        }

        if (data.card) setCard(data.card);
        trackClientActivity("share_link_claimed", {
          linkId,
          cardId: data.card?._id,
          method: "signed_in",
        });
        setClaimMode(null);
        setViewState("playing");
        trackPlayingOnce(linkId, {
          cardId: data.card?._id,
          cardTitle: data.card?.title,
        });
      } catch {
        if (cancelled) return;
        setClaimMode(null);
        setViewState("unclaimed");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [viewState, claimMode, sessionStatus, session?.user?.id, linkId]);

  if (viewState === "loading" || sessionStatus === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500">Loading your bingo card...</p>
        </div>
      </div>
    );
  }

  if (viewState === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-5xl mb-4">😕</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Link Unavailable</h2>
          <p className="text-slate-500 mb-6">
            {errorMessage || "This share link is not available."}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold"
            >
              Go to Homepage
            </Link>
            <Link
              href="/create"
              className="inline-block px-6 py-3 bg-white text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition font-semibold"
            >
              Create Your Own Card
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (viewState === "owner") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
        <header className="backdrop-blur-sm border-b sticky top-0 z-10 bg-white/80 border-slate-100">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link
              href="/"
              className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              MyBingoCard
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-semibold text-sm"
            >
              Back to Dashboard
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 md:py-12 max-w-xl">
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 text-center mb-6">
            <div className="text-5xl mb-4">👀</div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
              Preview only
            </h1>
            <p className="text-slate-500 mb-6">
              This is your own share link. Recipients will see and play this card.
            </p>

            {card && (
              <div className="pointer-events-none opacity-90 select-none mb-6 scale-95 origin-top">
                <PlayCard linkId={`preview-${linkId}`} card={card} />
              </div>
            )}

            <button
              onClick={handleCopyLink}
              className="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-semibold"
            >
              Copy share link
            </button>
            {copyFeedback && (
              <p className="text-xs text-slate-500 mt-3">{copyFeedback}</p>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (viewState === "claiming" && claimMode === "auto") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500">Setting things up...</p>
        </div>
      </div>
    );
  }

  if (viewState === "unclaimed" || viewState === "claiming") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
        <header className="backdrop-blur-sm border-b sticky top-0 z-10 bg-white/80 border-slate-100">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <Link
              href="/"
              className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              MyBingoCard
            </Link>
            <Link
              href="/create"
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-semibold text-sm"
            >
              Create Your Own
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 md:py-12 max-w-xl">
          <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 text-center mb-6">
            <div className="text-5xl mb-4">🎟️</div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">
              You've been invited to play
            </h1>
            {card?.title && (
              <p className="text-lg font-semibold text-indigo-600 mb-2">{card.title}</p>
            )}
            {ownerName && (
              <p className="text-slate-500 mb-6">Sent by {ownerName}</p>
            )}
            {!ownerName && <div className="mb-6" />}

            {card && (
              <div className="pointer-events-none opacity-90 select-none mb-6 scale-95 origin-top">
                <PlayCard linkId={`preview-${linkId}`} card={card} />
              </div>
            )}

            {claimError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
                {claimError}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleSignIn}
                disabled={viewState === "claiming"}
                className="w-full px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Sign in to play
              </button>
              <button
                onClick={handleContinueAsGuest}
                disabled={viewState === "claiming"}
                className="w-full px-6 py-3 bg-white text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {viewState === "claiming" ? "Setting things up..." : "Continue as guest"}
              </button>
            </div>

            <p className="text-xs text-slate-400 mt-4">
              Signing in lets you sync your progress across devices.
            </p>
          </div>
        </main>
      </div>
    );
  }

  // playing
  if (!card) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-slate-500">Loading card...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50">
      <header className="backdrop-blur-sm border-b sticky top-0 z-10 bg-white/80 border-slate-100 print:hidden">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link
            href="/"
            className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600"
          >
            MyBingoCard
          </Link>
          <div className="flex gap-2 items-center">
            <Link
              href="/create"
              className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition font-semibold text-sm"
            >
              Create Your Own
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 md:px-4 py-6 md:py-8 max-w-2xl">
        <PlayCard linkId={linkId} card={card} />

        <div className="mt-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl shadow-lg p-6 md:p-8 text-center">
          <h2 className="text-xl font-black mb-2">Love this card?</h2>
          <p className="text-indigo-100 mb-4 text-sm">
            Design your own bingo cards for parties, classrooms, and team events.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/create"
              className="px-5 py-2.5 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition font-semibold text-sm"
            >
              Start Creating Free
            </Link>
            <Link
              href="/templates"
              className="px-5 py-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-400 transition font-semibold text-sm"
            >
              Browse Templates
            </Link>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs py-6 text-slate-400">
        © {new Date().getFullYear()} MyBingoCard.com
      </footer>
    </div>
  );
}
