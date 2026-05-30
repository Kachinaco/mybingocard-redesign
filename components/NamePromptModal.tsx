"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { trackClientActivity } from "@/lib/activity-client";
import { getBrowserStorageItem, setBrowserStorageItem } from "@/lib/browser-storage";

export default function NamePromptModal() {
  const { data: session, update: updateSession } = useSession();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Only show if logged in and name is missing
    if (!session?.user) return;
    if (session.user.name && session.user.name.trim()) return;

    // Check localStorage to avoid showing again in same browser session
    const dismissed = getBrowserStorageItem("localStorage", "name_prompt_dismissed");
    if (dismissed) return;

    // Small delay to let the page settle
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError("Please enter your name."); return; }
    if (trimmed.length > 100) { setError("Name is too long."); return; }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error || "Something went wrong.");
        setSaving(false);
        return;
      }

      // Refresh session so name appears everywhere
      await updateSession({ name: trimmed });
      trackClientActivity("name_prompt_completed");
      setBrowserStorageItem("localStorage", "name_prompt_dismissed", "1");
      setShow(false);
    } catch {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  const handleSkip = () => {
    trackClientActivity("name_prompt_skipped");
    setBrowserStorageItem("localStorage", "name_prompt_dismissed", "1");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">👋</div>
          <h2 className="text-xl font-bold text-slate-800">What should we call you?</h2>
          <p className="text-sm text-slate-500 mt-1">Just your first name is fine.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoFocus
            maxLength={100}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />

          {error && (
            <p className="text-xs text-rose-500">{error}</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl py-3 text-sm transition-colors disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save name"}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full text-slate-400 hover:text-slate-600 text-xs py-1 transition-colors"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  );
}
