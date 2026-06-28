"use client";

import { useState, useEffect, useCallback, useMemo, useRef, useId } from "react";
import { trackClientActivity } from "@/lib/activity-client";

interface ShareBatchModalProps {
  batchId: string;
  cardCount: number;
  batchTitle: string;
  onClose: () => void;
}

type RecipientMode = "email" | "self";

const PRICE_PER_LINK_CENTS = 0;
const MIN_SHARE_LINKS = 5;

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function parseRecipientLines(raw: string): string[] {
  return raw
    .split(/[\r\n,;\t]+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function clampCountValue(value: number, cardCount: number): number {
  if (Number.isNaN(value) || value < MIN_SHARE_LINKS) return MIN_SHARE_LINKS;
  if (value > cardCount) return cardCount;
  return Math.floor(value);
}

function describePackage(count: number): string {
  if (count <= MIN_SHARE_LINKS) {
    return `Free for up to ${MIN_SHARE_LINKS} links`;
  }
  return "Free for every link";
}

export default function ShareBatchModal({
  batchId,
  cardCount,
  batchTitle,
  onClose,
}: ShareBatchModalProps) {
  const initialCount = Math.max(MIN_SHARE_LINKS, Math.min(cardCount, 30));
  const [count, setCount] = useState<number>(initialCount);
  const [countInput, setCountInput] = useState<string>(String(initialCount));
  const [mode, setMode] = useState<RecipientMode>("self");
  const [emailsRaw, setEmailsRaw] = useState("");
  const [dedupNotice, setDedupNotice] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");

  const titleId = useId();
  const modalRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    trackClientActivity("share_batch_modal_opened", {
      batchId,
      cardCount,
      batchTitle,
    });
  }, [batchId, cardCount, batchTitle]);

  const attemptClose = useCallback(() => {
    if (submitting) return;
    if (emailsRaw.trim().length > 0) {
      if (!window.confirm("Discard your recipients?")) return;
    }
    onClose();
  }, [submitting, emailsRaw, onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        attemptClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        const active = document.activeElement as HTMLElement | null;
        if (e.shiftKey) {
          if (active === first || !modalRef.current.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const timer = setTimeout(() => firstInputRef.current?.focus(), 0);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [attemptClose, submitting]);

  const parsedEmails = useMemo(() => parseRecipientLines(emailsRaw), [emailsRaw]);

  const { validEmails, invalidEmails, dupesRemoved } = useMemo(() => {
    const valid: string[] = [];
    const invalid: string[] = [];
    const seen = new Set<string>();
    let dupes = 0;

    for (const raw of parsedEmails) {
      if (!isValidEmail(raw)) {
        invalid.push(raw);
        continue;
      }
      const key = raw.toLowerCase();
      if (seen.has(key)) {
        dupes += 1;
        continue;
      }
      seen.add(key);
      valid.push(raw);
    }

    return { validEmails: valid, invalidEmails: invalid, dupesRemoved: dupes };
  }, [parsedEmails]);

  useEffect(() => {
    if (dupesRemoved > 0) {
      setDedupNotice(`Removed ${dupesRemoved} duplicate${dupesRemoved !== 1 ? "s" : ""}`);
    } else {
      setDedupNotice("");
    }
  }, [dupesRemoved]);

  const clampedCount = useMemo(() => clampCountValue(count, cardCount), [count, cardCount]);
  const totalCents = clampedCount * PRICE_PER_LINK_CENTS;
  const recipientCount = mode === "email" ? Math.min(validEmails.length, clampedCount) : 0;
  const selfFallbackCount = Math.max(0, clampedCount - recipientCount);
  const recipientsOverLimit = mode === "email" ? Math.max(0, validEmails.length - clampedCount) : 0;

  const handlePay = useCallback(async () => {
    if (submitting) return;
    if (clampedCount < MIN_SHARE_LINKS) {
      setError(`Choose at least ${MIN_SHARE_LINKS} links.`);
      return;
    }
    if (mode === "email" && validEmails.length === 0 && parsedEmails.length > 0) {
      setError("Add at least one valid email or switch to 'Email me the links'.");
      return;
    }

    setSubmitting(true);
    setError("");

    const payload: { batchId: string; count: number; recipientEmails?: string[] } = {
      batchId,
      count: clampedCount,
    };

    if (mode === "email" && validEmails.length > 0) {
      payload.recipientEmails = validEmails.slice(0, clampedCount);
    }

    trackClientActivity("share_links_free_started", {
      batchId,
      count: clampedCount,
      price_cents: totalCents,
      mode,
      recipient_count: mode === "email" ? validEmails.length : 0,
    });

    try {
      const res = await fetch("/api/share-links/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !(data?.redirectUrl || data?.checkoutUrl)) {
        setError(data?.error || "Failed to generate links. Please try again.");
        setSubmitting(false);
        return;
      }

      window.location.href = (data.redirectUrl || data.checkoutUrl) as string;
    } catch {
      setError("Failed to generate links. Please try again.");
      setSubmitting(false);
    }
  }, [submitting, clampedCount, mode, validEmails, parsedEmails.length, batchId, totalCents]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={() => attemptClose()}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto relative animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={attemptClose}
          disabled={submitting}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors z-10 disabled:opacity-40"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Create Group Invite
              </span>
            </div>
            <h2 id={titleId} className="text-2xl font-bold text-slate-900 line-clamp-1">
              {batchTitle}
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Create one invite link for your group chat. Each friend gets a unique card automatically.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  How many people are you sending to?
                </label>
                <p className="text-xs text-slate-500 mb-4">
                  Create up to {cardCount} invite links from this batch.
                </p>

                <div className="flex items-center gap-4 mb-4">
                  <input
                    ref={firstInputRef}
                    type="range"
                    min={MIN_SHARE_LINKS}
                    max={cardCount}
                    value={clampedCount}
                    onChange={(e) => {
                      const next = Number(e.target.value);
                      setCount(next);
                      setCountInput(String(next));
                    }}
                    className="flex-1 accent-indigo-600"
                    aria-label="Number of share links"
                  />
                  <input
                    type="number"
                    min={MIN_SHARE_LINKS}
                    max={cardCount}
                    value={countInput}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setCountInput(raw);
                      if (raw === "") return;
                      const parsed = Number(raw);
                      if (!Number.isNaN(parsed)) setCount(parsed);
                    }}
                    onBlur={() => {
                      const parsed = Number(countInput);
                      const clamped = clampCountValue(Number.isNaN(parsed) ? MIN_SHARE_LINKS : parsed, cardCount);
                      setCount(clamped);
                      setCountInput(String(clamped));
                    }}
                    className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-center font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Number of share links"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-900 mb-2">
                  What is the easiest way to share?
                </label>
                <div className="grid grid-cols-2 gap-1 bg-slate-100 rounded-xl p-1 mb-4">
                  {([
                    { value: "self", label: "Group chat link" },
                    { value: "email", label: "Email people" },
                  ] as const).map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => {
                        setMode(tab.value);
                        setError("");
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        mode === tab.value
                          ? "bg-white text-indigo-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                    <span className="block">{tab.label}</span>
                  </button>
                ))}
                </div>

                {mode === "email" ? (
                  <div>
                    <textarea
                      value={emailsRaw}
                      onChange={(e) => setEmailsRaw(e.target.value)}
                      placeholder={"alice@example.com\nbob@example.com\ncarol@example.com"}
                      rows={6}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                      aria-label="Recipient email addresses"
                    />
                    <div className="flex items-center justify-between mt-2 text-xs gap-4">
                      <span className="text-slate-500">
                        {validEmails.length} valid
                        {invalidEmails.length > 0 && (
                          <span className="text-amber-600 ml-2">· {invalidEmails.length} invalid</span>
                        )}
                        {dedupNotice && <span className="text-slate-500 ml-2">· {dedupNotice}</span>}
                      </span>
                      <span className="text-slate-400 text-right">
                        We&rsquo;ll send any leftover links to your email.
                      </span>
                    </div>
                    {recipientsOverLimit > 0 && (
                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                        {recipientsOverLimit} valid recipient{recipientsOverLimit !== 1 ? "s" : ""} won&rsquo;t receive a link with the current count.
                        <button
                          type="button"
                          onClick={() => {
                            const next = Math.min(cardCount, validEmails.length);
                            setCount(next);
                            setCountInput(String(next));
                          }}
                          className="ml-2 font-bold underline"
                        >
                          Use {Math.min(cardCount, validEmails.length)} links
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <p className="text-sm text-indigo-900 font-medium mb-1">
                      After creating links, copy one group invite from your Share Links dashboard.
                    </p>
                    <p className="text-xs text-indigo-700">
                      Paste it in a text thread, Discord, classroom app, or email. Every player gets the next unused card.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-5 border border-indigo-100">
                <p className="text-sm font-semibold text-slate-600 mb-1">Order summary</p>
                <p className="text-3xl font-bold text-slate-900 mb-1">
                  {clampedCount} link{clampedCount !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-slate-600 mb-3">{describePackage(clampedCount)}</p>
                <p className="text-sm text-slate-600">
                  Total: <span className="font-bold text-indigo-600">{formatPrice(totalCents)}</span>
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What happens next</p>
                {mode === "self" ? (
                  <ul className="text-sm text-slate-700 space-y-2">
                    <li>We&rsquo;ll create {clampedCount} unique player links.</li>
                    <li>You&rsquo;ll copy one group invite that hands out those cards automatically.</li>
                  </ul>
                ) : (
                  <ul className="text-sm text-slate-700 space-y-2">
                    <li>We&rsquo;ll email {recipientCount} recipient{recipientCount !== 1 ? "s" : ""} directly.</li>
                    <li>{selfFallbackCount > 0 ? `${selfFallbackCount} leftover link${selfFallbackCount !== 1 ? "s" : ""} will be sent to your email.` : "Any unsent links will also be available in your Share Links dashboard."}</li>
                  </ul>
                )}
              </div>

              {error && <p className="text-sm text-red-600 text-center">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={attemptClose}
                  disabled={submitting}
                  className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePay}
                  disabled={submitting}
                  aria-busy={submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-200 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating links...
                    </>
                  ) : (
                    <>Create Links · Free</>
                  )}
                </button>
              </div>

              <p className="text-center text-xs text-slate-400">
                Your links will be ready right away.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
