"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import SignOutButton from "@/components/SignOutButton";

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
  const { data: session } = useSession();
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#2ec4b6]/10 text-[#2ec4b6] border border-[#2ec4b6]/15">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2ec4b6]"></span>
            Signed Up
          </span>
        );
      case "rewarded":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#7c5cff]/10 text-[#7c5cff] border border-[#7c5cff]/15">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c5cff]"></span>
            Rewarded
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#ffb800]/10 text-[#ffb800] border border-[#ffb800]/15">
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffb800]"></span>
            Pending
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fff7ed] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#7c5cff] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-[#6b6459] font-medium">Loading referral data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff7ed] selection:bg-[#7c5cff]/15 selection:text-[#7c5cff]">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-[#a39a88]/50">
        <div className="container mx-auto px-4 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] rounded-xl flex items-center justify-center shadow-lg shadow-[#7c5cff] group-hover:shadow-[#7c5cff] transition-all duration-300">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#33312e] to-[#33312e]">
              MyBingoCard
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[#fff7ed] rounded-full border border-[#a39a88]">
              <div className="w-6 h-6 rounded-full bg-[#a39a88] flex items-center justify-center text-xs font-bold text-[#6b6459]">
                {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0)}
              </div>
              <span className="text-sm font-medium text-[#33312e] max-w-[100px] truncate">
                {session?.user?.name || session?.user?.email}
              </span>
            </div>

            <Link
              href="/settings"
              className="text-sm font-medium text-[#6b6459] hover:text-[#7c5cff] transition-colors px-3 py-2"
            >
              Settings
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 pb-24 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Back to Dashboard */}
          <div className="mb-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm font-medium text-[#6b6459] hover:text-[#7c5cff] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>

          <div className="mb-10 animate-fade-in-up">
            <h1 className="text-3xl font-bold text-[#33312e]">
              Refer a <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7c5cff] to-[#7c5cff]">Friend</span>
            </h1>
            <p className="text-[#6b6459] mt-2 text-lg">
              Share MyBingoCard with friends and track your referrals.
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-[#ff5d8f]/10 border border-[#ff5d8f] rounded-xl text-[#ff5d8f] flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {data && (
            <>
              {/* Referral Link Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#a39a88] p-6 md:p-8 mb-8 animate-fade-in-up animation-delay-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#7c5cff]/10 to-[#7c5cff]/10 rounded-full blur-3xl opacity-50 -mr-16 -mt-16 pointer-events-none"></div>

                <div className="relative z-10">
                  <h2 className="text-xl font-bold text-[#33312e] mb-2">Your Referral Link</h2>
                  <p className="text-[#6b6459] text-sm mb-6">
                    Share this link with friends. When they sign up, they will be tracked as your referral.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 px-4 py-3 bg-[#fff7ed] border border-[#a39a88] rounded-xl text-[#33312e] font-mono text-sm truncate">
                      {data.referralLink}
                    </div>
                    <button
                      onClick={copyReferralLink}
                      className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 whitespace-nowrap ${
                        copied
                          ? "bg-[#2ec4b6] text-white shadow-lg shadow-[#2ec4b6]"
                          : "bg-gradient-to-r from-[#7c5cff] to-[#7c5cff] text-white shadow-lg shadow-[#7c5cff] hover:shadow-xl hover:shadow-[#7c5cff] hover:-translate-y-0.5"
                      }`}
                    >
                      {copied ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-8 animate-fade-in-up animation-delay-150">
                <div className="bg-white rounded-2xl shadow-sm border border-[#a39a88] p-5 text-center">
                  <p className="text-3xl font-black text-[#7c5cff]">{data.stats.total}</p>
                  <p className="text-xs font-medium text-[#6b6459] uppercase tracking-wide mt-1">Total Referrals</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-[#a39a88] p-5 text-center">
                  <p className="text-3xl font-black text-[#2ec4b6]">{data.stats.signedUp}</p>
                  <p className="text-xs font-medium text-[#6b6459] uppercase tracking-wide mt-1">Signed Up</p>
                </div>
                <div className="bg-white rounded-2xl shadow-sm border border-[#a39a88] p-5 text-center">
                  <p className="text-3xl font-black text-[#ffb800]">{data.stats.rewarded}</p>
                  <p className="text-xs font-medium text-[#6b6459] uppercase tracking-wide mt-1">Rewarded</p>
                </div>
              </div>

              {/* Referrals Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-[#a39a88] p-6 md:p-8 animate-fade-in-up animation-delay-200">
                <h2 className="text-xl font-bold text-[#33312e] mb-6">Your Referrals</h2>

                {data.referrals.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-[#7c5cff]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-[#7c5cff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-bold text-[#33312e] mb-2">No referrals yet</h3>
                    <p className="text-[#6b6459] text-sm max-w-md mx-auto">
                      Share your referral link with friends and they will appear here once they sign up.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#fff7ed]">
                          <th className="text-left py-3 px-2 font-semibold text-[#6b6459] uppercase tracking-wide text-xs">Email</th>
                          <th className="text-left py-3 px-2 font-semibold text-[#6b6459] uppercase tracking-wide text-xs">Status</th>
                          <th className="text-left py-3 px-2 font-semibold text-[#6b6459] uppercase tracking-wide text-xs">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.referrals.map((referral, index) => (
                          <tr key={index} className="border-b border-[#fff7ed] hover:bg-[#fff7ed] transition-colors">
                            <td className="py-3 px-2 font-medium text-[#33312e]">
                              {referral.email}
                            </td>
                            <td className="py-3 px-2">
                              {getStatusBadge(referral.status)}
                            </td>
                            <td className="py-3 px-2 text-[#6b6459]">
                              {new Date(referral.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
