"use client";

import { useState, useEffect, useRef } from "react";
import { trackEmailSignup } from "@/lib/analytics";
import { trackClientActivity } from "@/lib/activity-client";
import { getBrowserStorageItem, setBrowserStorageItem } from "@/lib/browser-storage";

export function EmailCapturePopup() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const shownAtRef = useRef<number | null>(null);
  const popupCompanyRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Don't show if already dismissed or subscribed
    const dismissed = getBrowserStorageItem("localStorage", "email_popup_dismissed");
    if (dismissed) return;

    // Show after 8 seconds
    const timer = setTimeout(() => {
      setShow(true);
      shownAtRef.current = Date.now();
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "popup",
          companyName: popupCompanyRef.current?.value || "",
          captureStartedAt: shownAtRef.current || Date.now(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe");
      setStatus("success");
      trackEmailSignup("popup");
      trackClientActivity("email_capture_submitted", { source: "popup" });
      setBrowserStorageItem("localStorage", "email_popup_dismissed", "subscribed");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong");
    }
  };

  const dismiss = () => {
    const timeShownSeconds = shownAtRef.current
      ? Math.round((Date.now() - shownAtRef.current) / 1000)
      : 0;
    trackClientActivity("email_capture_dismissed", { time_shown_seconds: timeShownSeconds });
    setShow(false);
    setBrowserStorageItem("localStorage", "email_popup_dismissed", "dismissed");
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 animate-scale-in">
        {/* Close button */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {status === "success" ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">You&apos;re in!</h3>
            <p className="text-slate-500 text-sm">Check your inbox for your 5 free premium bingo templates.</p>
            <button
              onClick={dismiss}
              className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            {/* Badge */}
            <div className="flex justify-center mb-4">
              <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                Free Gift
              </span>
            </div>

            <h3 className="text-2xl font-bold text-slate-900 text-center mb-2">
              Get 5 Free Premium Templates
            </h3>
            <p className="text-slate-500 text-center text-sm mb-6">
              Professionally designed bingo templates for weddings, classrooms, and parties. Yours free, instantly.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
                <label htmlFor="popup-company-name">Company</label>
                <input
                  ref={popupCompanyRef}
                  id="popup-company-name"
                  name="companyName"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {status === "error" && (
                <p className="text-red-500 text-xs">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-60"
              >
                {status === "loading" ? "Sending..." : "Send Me The Templates"}
              </button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-4">
              No spam, ever. Unsubscribe anytime.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function EmailCaptureInline() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inlineCompanyRef = useRef<HTMLInputElement>(null);
  const inlineStartedAt = useRef(Date.now());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/email-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "inline_homepage",
          companyName: inlineCompanyRef.current?.value || "",
          captureStartedAt: inlineStartedAt.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to subscribe");
      setStatus("success");
      trackEmailSignup("inline_homepage");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center">
        <div className="text-green-600 font-bold mb-1">You&apos;re subscribed!</div>
        <p className="text-green-600/70 text-sm">Check your inbox for your free templates.</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-violet-50 to-indigo-50 border border-indigo-100 rounded-2xl p-8">
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          Free Gift
        </span>
        <h3 className="text-xl font-bold text-slate-900">Get 5 Free Premium Templates</h3>
        <p className="text-slate-500 text-sm mt-1">Wedding, classroom, and party designs. Yours free.</p>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3 max-w-md mx-auto">
        <div className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden" aria-hidden="true">
          <label htmlFor="inline-company-name">Company</label>
          <input
            ref={inlineCompanyRef}
            id="inline-company-name"
            name="companyName"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
          className="flex-1 px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition text-sm"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-6 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all disabled:opacity-60 whitespace-nowrap"
        >
          {status === "loading" ? "..." : "Get Free Templates"}
        </button>
      </form>
      {status === "error" && (
        <p className="text-red-500 text-xs text-center mt-2">{errorMsg}</p>
      )}
      <p className="text-center text-xs text-slate-400 mt-3">No spam. Unsubscribe anytime.</p>
    </div>
  );
}
