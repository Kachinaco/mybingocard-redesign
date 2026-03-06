"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/settings");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetchPlanInfo();
    }
  }, [session]);

  const fetchPlanInfo = async () => {
    try {
      const response = await fetch("/api/cards/can-create");
      const data = await response.json();
      setPlanInfo(data);
    } catch (error) {
      console.error("Failed to fetch plan info:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="container mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">MyBingoCard</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-indigo-600">
              Dashboard
            </Link>
            <Link href="/create" className="text-sm font-medium text-slate-600 hover:text-indigo-600">
              Create
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 lg:px-8 py-12 max-w-3xl">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Settings</h1>

        {/* Profile Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Profile</h2>
          <div className="flex items-center gap-4 mb-6">
            {session.user?.image ? (
              <img
                src={session.user.image}
                alt="Profile"
                className="w-16 h-16 rounded-full"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xl font-bold">
                {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || "?"}
              </div>
            )}
            <div>
              <p className="font-semibold text-slate-900">{session.user?.name || "User"}</p>
              <p className="text-slate-500 text-sm">{session.user?.email}</p>
            </div>
          </div>
        </div>

        {/* Plan Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Plan</h2>

          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-700">
                {planInfo?.planType || "FREE"} Plan
              </span>
            </div>
            <Link
              href="/pricing"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Upgrade Plan
            </Link>
          </div>

          {/* Usage */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600">Cards Created</span>
              <span className="text-sm font-semibold text-slate-900">
                {planInfo?.cardsCreatedThisMonth || 0} / {planInfo?.cardsLimit === -1 ? "Unlimited" : planInfo?.cardsLimit || 3}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-violet-600 to-indigo-600 h-2 rounded-full transition-all duration-300"
                style={{
                  width: planInfo?.cardsLimit === -1
                    ? "10%"
                    : `${Math.min(((planInfo?.cardsCreatedThisMonth || 0) / (planInfo?.cardsLimit || 3)) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Plan Features */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Plan Features</h2>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-sm">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-600">
                {planInfo?.cardsLimit === -1 ? "Unlimited" : planInfo?.cardsLimit || 3} bingo cards
              </span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-600">3x3 and 4x4 grids</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-600">PDF export</span>
            </li>
            <li className="flex items-center gap-3 text-sm">
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-slate-600">Share links</span>
            </li>
          </ul>
        </div>

        {/* Sign Out */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Account</h2>
          <button
            onClick={handleSignOut}
            className="w-full sm:w-auto px-6 py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </main>
    </div>
  );
}
