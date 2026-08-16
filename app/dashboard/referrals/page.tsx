"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import WorkspaceShell, { WorkspacePageHead } from "@/components/WorkspaceShell";

interface ReferralData {
  referralCode: string;
  referralLink: string;
  stats: {
    total: number;
    signedUp: number;
    rewarded: number;
  };
  referrals: {
    email: string;
    status: "pending" | "signed_up" | "rewarded";
    createdAt: string;
  }[];
}
export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/referrals");
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch referral data");
      }

      setData(result);
    } catch (err: any) {
      console.error("Fetch referral data error:", err);
      setError(err.message || "Failed to load referral data");
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    if (!data?.referralLink) return;
    try {
      await navigator.clipboard.writeText(data.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = data.referralLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "signed_up":
        return (
          <span className="pill pill-success">
            Signed Up
          </span>
        );
      case "rewarded":
        return (
          <span className="pill pill-purple">
            Rewarded
          </span>
        );
      default:
        return (
          <span className="pill pill-local">
            Pending
          </span>
        );
    }
  };


  if (loading) {
    return (
      <WorkspaceShell current="/dashboard/referrals">
        <section className="card empty-state referral-loading-panel" role="status">
          <div className="empty-state-inner">
            <div className="empty-icon" aria-hidden="true">↗</div>
            <p>Loading referrals…</p>
          </div>
        </section>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell current="/dashboard/referrals">
      <WorkspacePageHead
        title="Referrals"
        description="Share your referral link and track sign-ups and rewards."
      />

      {error && (
        <div className="notice notice-danger" role="alert">
          <span className="notice-icon" aria-hidden="true">!</span>
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          <div className="metrics-grid referral-metrics">
            <article className="card-soft metric-card surface-purple">
              <span className="eyebrow">Total</span>
              <strong className="stat-value">{data.stats.total}</strong>
              <span className="stat-label">People invited</span>
            </article>
            <article className="card-soft metric-card surface-teal">
              <span className="eyebrow">Signed up</span>
              <strong className="stat-value">{data.stats.signedUp}</strong>
              <span className="stat-label">New accounts</span>
            </article>
            <article className="card-soft metric-card surface-yellow">
              <span className="eyebrow">Rewarded</span>
              <strong className="stat-value">{data.stats.rewarded}</strong>
              <span className="stat-label">Referral rewards</span>
            </article>
          </div>

          <section className="card referral-link-card card-body">
            <div>
              <span className="eyebrow">Your referral link</span>
              <h2>Invite a friend to make a card</h2>
              <p className="caption">Share this link with friends. New sign-ups appear in your referral history.</p>
            </div>
            <div className="field-row">
              <label className="field">
                <span>Referral link</span>
                <input className="text-input" type="text" readOnly value={data.referralLink} aria-label="Your referral link" />
              </label>
              <button type="button" className={copied ? "button button-teal" : "button button-primary"} onClick={copyReferralLink}>
                {copied ? "Copied" : "Copy link"}
              </button>
            </div>
            <p className="caption" role="status" aria-live="polite">{copied ? "Referral link copied to clipboard." : `Referral code: ${data.referralCode}`}</p>
          </section>

          <section className="card-soft referral-history card-body">
            <div className="section-title-row">
              <div>
                <span className="eyebrow">Activity</span>
                <h2>Referral history</h2>
              </div>
              <span className="pill">{data.referrals.length} record{data.referrals.length === 1 ? "" : "s"}</span>
            </div>

            {data.referrals.length === 0 ? (
              <div className="empty-state referral-empty">
                <div className="empty-state-inner">
                  <div className="empty-icon" aria-hidden="true">♧</div>
                  <h3>No referrals yet</h3>
                  <p>Share your link and new sign-ups will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="data-table referral-table">
                  <thead>
                    <tr>
                      <th scope="col">Email</th>
                      <th scope="col">Status</th>
                      <th scope="col">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.referrals.map((referral, index) => (
                      <tr key={`${referral.email}-${referral.createdAt}-${index}`}>
                        <td>{referral.email}</td>
                        <td>{getStatusBadge(referral.status)}</td>
                        <td>{new Date(referral.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </WorkspaceShell>
  );
}
