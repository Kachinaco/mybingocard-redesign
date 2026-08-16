"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import PlayfulShell from "@/components/PlayfulShell";

export default function UnsubscribePage() {
  const { status } = useSession();
  const [email, setEmail] = useState("");
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const emailParam = new URLSearchParams(window.location.search).get("email")?.trim() || "";
    setEmail(emailParam);
    if (emailParam) {
      setMarketingEmails(false);
      setProductUpdates(false);
    }
  }, []);

  useEffect(() => {
    if (status !== "authenticated") return;

    fetch("/api/user/email-preferences")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to load preferences");
        return response.json();
      })
      .then((data) => {
        setMarketingEmails(data.marketingEmails !== false);
        setProductUpdates(data.productUpdates !== false);
      })
      .catch(() => {
        setError("We could not load your current preferences.");
      });
  }, [status]);

  const savePreferences = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      if (email && status !== "authenticated") {
        const response = await fetch("/api/unsubscribe?email=" + encodeURIComponent(email), {
          method: "POST",
        });
        if (!response.ok) throw new Error("Unsubscribe failed");
        setMessage("You are unsubscribed from marketing emails.");
        return;
      }

      if (status !== "authenticated") {
        setError("Sign in or open this page from an email link to manage preferences.");
        return;
      }

      const response = await fetch("/api/user/email-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingEmails, productUpdates }),
      });
      if (!response.ok) throw new Error("Save failed");
      setMessage("Preferences saved.");
    } catch {
      setError("We could not save your preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const anonymousUnsubscribe = Boolean(email) && status !== "authenticated";

  return (
    <PlayfulShell>
      <section className="page-section">
        <div className="content-rail">
          <div className="auth-card card card-body">
            <span className="empty-icon" aria-hidden="true">✉️</span>
            <div className="page-heading">
              <span className="eyebrow">Email preferences</span>
              <h1 tabIndex={-1}>Choose which messages you receive</h1>
              <p>Control optional product messages. Account and security messages remain enabled.</p>
            </div>

            {anonymousUnsubscribe ? (
              <div className="card-soft">
                <p>Unsubscribe <strong>{email}</strong> from marketing emails.</p>
                <button className="button button-primary" type="button" onClick={savePreferences} disabled={saving}>
                  {saving ? "Saving..." : "Unsubscribe from marketing emails"}
                </button>
              </div>
            ) : status === "authenticated" ? (
              <>
                <div className="settings-list">
                  <div className="settings-row">
                    <span className="settings-copy">
                      <strong>Account and security</strong>
                      <span className="caption">Required messages about sign-in and account safety.</span>
                    </span>
                    <input type="checkbox" checked readOnly disabled aria-label="Account and security" />
                  </div>
                  <label className="settings-row">
                    <span className="settings-copy">
                      <strong>Card reminders</strong>
                      <span className="caption">Helpful reminders about unfinished cards.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={marketingEmails}
                      onChange={(event) => setMarketingEmails(event.target.checked)}
                      aria-label="Card reminders"
                    />
                  </label>
                  <label className="settings-row">
                    <span className="settings-copy">
                      <strong>Ideas and product news</strong>
                      <span className="caption">Occasional bingo ideas and new features.</span>
                    </span>
                    <input
                      type="checkbox"
                      checked={productUpdates}
                      onChange={(event) => setProductUpdates(event.target.checked)}
                      aria-label="Ideas and product news"
                    />
                  </label>
                </div>
                <button className="button button-primary" type="button" onClick={savePreferences} disabled={saving}>
                  {saving ? "Saving..." : "Save preferences"}
                </button>
              </>
            ) : (
              <div className="card-soft">
                <p>Open this page from an email link to unsubscribe, or sign in to manage account preferences.</p>
                <div className="button-row">
                  <a href="/login?callbackUrl=/unsubscribe" className="button button-primary">Sign in</a>
                  <a href="/contact" className="button">Contact support</a>
                </div>
              </div>
            )}

            {message ? <p className="notice notice-success">{message}</p> : null}
            {error ? <p className="notice notice-error">{error}</p> : null}
          </div>
        </div>
      </section>
    </PlayfulShell>
  );
}
