"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { redirectToCheckout } from "@/lib/upgrade";
import { trackClientActivity } from "@/lib/activity-client";
import { FACEBOOK_PAGE_URL, REDDIT_COMMUNITY_URL } from "@/lib/social-links";
import WorkspaceShell, { WorkspacePageHead } from "@/components/WorkspaceShell";

export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Edit name
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMessage, setNameMessage] = useState("");

  // Change password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [hasPassword, setHasPassword] = useState(true);

  // Email preferences
  const [marketingEmails, setMarketingEmails] = useState(true);
  const [productUpdates, setProductUpdates] = useState(true);
  const [emailPrefSaving, setEmailPrefSaving] = useState(false);
  const [emailPrefMessage, setEmailPrefMessage] = useState("");

  // Subscription
  const [portalLoading, setPortalLoading] = useState(false);

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Connected accounts
  const [connectedAccounts, setConnectedAccounts] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/settings");
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
      fetchAll();
    }
  }, [session]);

  const fetchAll = async () => {
    try {
      const [planRes, emailRes, profileRes] = await Promise.all([
        fetch("/api/cards/can-create"),
        fetch("/api/user/email-preferences"),
        fetch("/api/user/profile"),
      ]);

      const planData = await planRes.json();
      setPlanInfo(planData);

      const emailData = await emailRes.json();
      setMarketingEmails(emailData.marketingEmails);
      setProductUpdates(emailData.productUpdates);

      const profileData = await profileRes.json();
      setHasPassword(profileData.hasPassword ?? true);
      setConnectedAccounts(profileData.connectedProviders ?? []);
    } catch (error) {
      console.error("Failed to fetch settings data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNameSave = async () => {
    setNameSaving(true);
    setNameMessage("");
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setNameMessage(data.error || "Failed to update name");
        return;
      }
      setNameMessage("Name updated");
      setEditingName(false);
      await updateSession();
    } catch {
      setNameMessage("Failed to update name");
    } finally {
      setNameSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordMessage("");

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch("/api/user/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPasswordError(data.error || "Failed to change password");
        return;
      }
      setPasswordMessage("Password updated successfully");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setHasPassword(true);
    } catch {
      setPasswordError("Failed to change password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleEmailPrefSave = async (marketing: boolean, updates: boolean) => {
    setMarketingEmails(marketing);
    setProductUpdates(updates);
    setEmailPrefSaving(true);
    setEmailPrefMessage("");
    try {
      const response = await fetch("/api/user/email-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingEmails: marketing, productUpdates: updates }),
      });
      if (response.ok) {
        setEmailPrefMessage("Preferences saved");
        setTimeout(() => setEmailPrefMessage(""), 2000);
      }
    } catch {
      setEmailPrefMessage("Failed to save");
    } finally {
      setEmailPrefSaving(false);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const response = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open billing portal");
      }
    } catch {
      alert("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "DELETE" }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDeleteError(data.error || "Failed to delete account");
        return;
      }
      await signOut({ callbackUrl: "/login?callbackUrl=/dashboard" });
    } catch {
      setDeleteError("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const handleSignOut = () => {
    trackClientActivity("sign_out_clicked", { source: "settings" }, { keepalive: true });
    signOut({ callbackUrl: "/login?callbackUrl=/dashboard" });
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-[#fff7ed] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#7c5cff]"></div>
      </div>
    );
  }

  if (!session) return null;

  const isPremium = planInfo?.planType === "PREMIUM";
  const subscriptionEndsOn = planInfo?.currentPeriodEnd
    ? new Date(planInfo.currentPeriodEnd).toLocaleDateString()
    : null;
  const cancelPending = Boolean(planInfo?.cancelAtPeriodEnd && subscriptionEndsOn);

  return (
    <WorkspaceShell current="/settings" planLabel={isPremium ? "Premium plan" : "Free plan"}>
      <div className="workspace-settings">
        <WorkspacePageHead
          title="Account settings"
          description="Manage your profile, plan, preferences, connected accounts, and account access."
        />
        <div className="workspace-settings-grid workspace-settings-flat-grid">

        {/* Profile Section */}
        <div className="settings-card bg-white rounded-2xl border border-[#a39a88] p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#33312e] mb-4">Profile</h2>
          <div className="flex items-start gap-4">
            {session.user?.image ? (
              <img src={session.user.image} alt="Profile" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#7c5cff] to-[#7c5cff] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                {session.user?.name?.charAt(0) || session.user?.email?.charAt(0) || "?"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-[#a39a88] rounded-lg text-sm focus:ring-2 focus:ring-[#7c5cff]/20 focus:border-[#7c5cff] outline-none"
                    autoFocus
                    onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
                  />
                  <button
                    onClick={handleNameSave}
                    disabled={nameSaving || !name.trim()}
                    className="px-3 py-1.5 bg-[#7c5cff] text-white text-sm rounded-lg font-medium hover:bg-[#7c5cff] disabled:opacity-50"
                  >
                    {nameSaving ? "..." : "Save"}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setName(session.user?.name || ""); setNameMessage(""); }}
                    className="px-3 py-1.5 text-[#6b6459] text-sm hover:text-[#33312e]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-[#33312e]">{session.user?.name || "User"}</p>
                  <button
                    onClick={() => setEditingName(true)}
                    className="text-xs text-[#7c5cff] hover:text-[#7c5cff] font-medium"
                  >
                    Edit
                  </button>
                </div>
              )}
              <p className="text-[#6b6459] text-sm">{session.user?.email}</p>
              {nameMessage && (
                <p className={`text-xs mt-1 ${nameMessage.includes("Failed") ? "text-[#ff5d8f]" : "text-[#2ec4b6]"}`}>
                  {nameMessage}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div className="settings-card bg-white rounded-2xl border border-[#a39a88] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#33312e]">Password</h2>
            {!showPasswordForm && (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="text-sm font-medium text-[#7c5cff] hover:text-[#7c5cff]"
              >
                {hasPassword ? "Change Password" : "Set Password"}
              </button>
            )}
          </div>

          {!showPasswordForm ? (
            <p className="text-sm text-[#6b6459]">
              {hasPassword
                ? "Last changed — unknown. We recommend updating your password regularly."
                : "You signed up with Google. Set a password to also log in with email."}
            </p>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {hasPassword && (
                <div>
                  <label className="block text-sm font-medium text-[#33312e] mb-1">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-[#a39a88] rounded-xl bg-[#fff7ed] focus:ring-2 focus:ring-[#7c5cff]/20 focus:border-[#7c5cff] outline-none text-sm"
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[#33312e] mb-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-2.5 border border-[#a39a88] rounded-xl bg-[#fff7ed] focus:ring-2 focus:ring-[#7c5cff]/20 focus:border-[#7c5cff] outline-none text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#33312e] mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 border border-[#a39a88] rounded-xl bg-[#fff7ed] focus:ring-2 focus:ring-[#7c5cff]/20 focus:border-[#7c5cff] outline-none text-sm"
                  />
                </div>
              </div>
              {passwordError && <p className="text-sm text-[#ff5d8f]">{passwordError}</p>}
              {passwordMessage && <p className="text-sm text-[#2ec4b6]">{passwordMessage}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={passwordSaving}
                  className="px-5 py-2.5 bg-[#7c5cff] text-white text-sm rounded-xl font-semibold hover:bg-[#7c5cff] disabled:opacity-50"
                >
                  {passwordSaving ? "Updating..." : "Update Password"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                    setPasswordError("");
                    setPasswordMessage("");
                  }}
                  className="px-5 py-2.5 text-[#33312e] text-sm font-medium hover:text-[#33312e]"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Plan & Subscription Section */}
        <div className="settings-card bg-white rounded-2xl border border-[#a39a88] p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#33312e] mb-4">Plan & Billing</h2>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                isPremium
                  ? "bg-gradient-to-r from-[#7c5cff]/15 to-[#7c5cff]/15 text-[#7c5cff]"
                  : "bg-[#fff7ed] text-[#33312e]"
              }`}>
                {planInfo?.planType || "FREE"} Plan
              </span>
              {isPremium && (
                <span className={`text-xs font-medium ${cancelPending ? "text-[#ffb800]" : "text-[#2ec4b6]"}`}>
                  {cancelPending ? "Scheduled to end" :"Active"}
                </span>
              )}
            </div>
            {!isPremium && (
              <button
                onClick={redirectToCheckout}
                className="text-sm font-semibold text-[#7c5cff] hover:text-[#7c5cff]"
              >
                Upgrade
              </button>
            )}
          </div>

          {/* Usage bar */}
          <div className="bg-[#fff7ed] rounded-xl p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-[#33312e]">Cards Created This Month</span>
              <span className="text-sm font-semibold text-[#33312e]">
                {planInfo?.cardsCreatedThisMonth || 0} / {planInfo?.cardsLimit === -1 ? "Unlimited" : planInfo?.cardsLimit || 3}
              </span>
            </div>
            <div className="w-full bg-[#a39a88] rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#7c5cff] to-[#7c5cff] h-2 rounded-full transition-all duration-300"
                style={{
                  width: planInfo?.cardsLimit === -1
                    ? "10%"
                    : `${Math.min(((planInfo?.cardsCreatedThisMonth || 0) / (planInfo?.cardsLimit || 3)) * 100, 100)}%`
                }}
              ></div>
            </div>
          </div>

          {/* Manage subscription */}
          {isPremium && (
            <>
              <button
                onClick={handleManageSubscription}
                disabled={portalLoading}
                className="w-full sm:w-auto px-5 py-2.5 border border-[#a39a88] text-[#33312e] text-sm rounded-xl font-semibold hover:bg-[#fff7ed] disabled:opacity-50"
              >
                {portalLoading ? "Opening..." : "Manage Subscription & Billing"}
              </button>
              {subscriptionEndsOn && (
                <p className={`mt-3 text-sm ${cancelPending ? "text-[#ffb800]" : "text-[#6b6459]"}`}>
                  {cancelPending
                    ? `Your premium access is scheduled to end on ${subscriptionEndsOn}. It will not renew unless you restart it in billing.`
                      : `Your next renewal is ${subscriptionEndsOn}.`}
                </p>
              )}
            </>
          )}
        </div>

        {/* Email Preferences */}
        <div className="settings-card bg-white rounded-2xl border border-[#a39a88] p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[#33312e]">Email Preferences</h2>
            {emailPrefMessage && (
              <span className="text-xs text-[#2ec4b6] font-medium">{emailPrefMessage}</span>
            )}
          </div>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border border-[#a39a88] rounded-xl cursor-pointer hover:bg-[#fff7ed] transition-colors">
              <div>
                <div className="text-sm font-medium text-[#33312e]">Marketing Emails</div>
                <div className="text-xs text-[#6b6459]">Tips, promotions, and bingo inspiration</div>
              </div>
              <input
                type="checkbox"
                checked={marketingEmails}
                onChange={(e) => handleEmailPrefSave(e.target.checked, productUpdates)}
                disabled={emailPrefSaving}
                className="w-5 h-5 text-[#7c5cff] border-[#a39a88] rounded focus:ring-[#7c5cff]"
              />
            </label>

            <label className="flex items-center justify-between p-3 border border-[#a39a88] rounded-xl cursor-pointer hover:bg-[#fff7ed] transition-colors">
              <div>
                <div className="text-sm font-medium text-[#33312e]">Product Updates</div>
                <div className="text-xs text-[#6b6459]">New features and improvements</div>
              </div>
              <input
                type="checkbox"
                checked={productUpdates}
                onChange={(e) => handleEmailPrefSave(marketingEmails, e.target.checked)}
                disabled={emailPrefSaving}
                className="w-5 h-5 text-[#7c5cff] border-[#a39a88] rounded focus:ring-[#7c5cff]"
              />
            </label>
          </div>
        </div>

        {/* Community */}
        <div className="settings-card bg-white rounded-2xl border border-[#a39a88] p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#33312e] mb-4">Community</h2>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-[#a39a88] rounded-xl bg-[#fff7ed] mb-3">
            <div>
              <div className="text-sm font-medium text-[#33312e]">Facebook Page</div>
              <div className="text-xs text-[#6b6459]">Follow MyBingoCard for new templates, game ideas, and updates.</div>
            </div>
            <a
              href={FACEBOOK_PAGE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClientActivity("facebook_page_clicked", { source: "settings" })}
              className="inline-flex items-center justify-center px-4 py-2 bg-[#1877f2] text-white text-sm font-semibold rounded-xl hover:bg-[#166fe5] transition-colors"
            >
              Follow on Facebook
            </a>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-[#a39a88] rounded-xl bg-[#fff7ed]">
            <div>
              <div className="text-sm font-medium text-[#33312e]">Reddit Community</div>
              <div className="text-xs text-[#6b6459]">Ask for card ideas, share use cases, and get MyBingoCard help.</div>
            </div>
            <a
              href={REDDIT_COMMUNITY_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClientActivity("reddit_community_clicked", { source: "settings" })}
              className="inline-flex items-center justify-center px-4 py-2 bg-[#ff4500] text-white text-sm font-semibold rounded-xl hover:bg-[#e33d00] transition-colors"
            >
              Visit Reddit
            </a>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="settings-card bg-white rounded-2xl border border-[#a39a88] p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#33312e] mb-4">Connected Accounts</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border border-[#a39a88] rounded-xl">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <div>
                  <div className="text-sm font-medium text-[#33312e]">Google</div>
                  <div className="text-xs text-[#6b6459]">
                    {connectedAccounts.includes("google") ? "Connected" : "Not connected"}
                  </div>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                connectedAccounts.includes("google")
                  ? "bg-[#2ec4b6]/10 text-[#2ec4b6]"
                  : "bg-[#fff7ed] text-[#6b6459]"
              }`}>
                {connectedAccounts.includes("google") ? "Linked" : "Not linked"}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 border border-[#a39a88] rounded-xl">
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-[#33312e]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <div>
                  <div className="text-sm font-medium text-[#33312e]">Email & Password</div>
                  <div className="text-xs text-[#6b6459]">
                    {hasPassword ? "Password set" : "No password set"}
                  </div>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                hasPassword
                  ? "bg-[#2ec4b6]/10 text-[#2ec4b6]"
                  : "bg-[#ffb800]/10 text-[#ffb800]"
              }`}>
                {hasPassword ? "Active" : "Set up"}
              </span>
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="settings-card bg-white rounded-2xl border border-[#a39a88] p-6 mb-6">
          <h2 className="text-lg font-semibold text-[#33312e] mb-4">Legal</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              href="/privacy"
              className="px-4 py-3 border border-[#a39a88] rounded-xl text-sm font-semibold text-[#33312e] hover:bg-[#fff7ed] transition-colors text-center"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="px-4 py-3 border border-[#a39a88] rounded-xl text-sm font-semibold text-[#33312e] hover:bg-[#fff7ed] transition-colors text-center"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              className="px-4 py-3 border border-[#a39a88] rounded-xl text-sm font-semibold text-[#33312e] hover:bg-[#fff7ed] transition-colors text-center"
            >
              Contact Support
            </Link>
          </div>
        </div>

        {/* Sign Out & Delete Account */}
        <div className="settings-card bg-white rounded-2xl border border-[#a39a88] p-6">
          <h2 className="text-lg font-semibold text-[#33312e] mb-4">Account</h2>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleSignOut}
              className="px-6 py-3 bg-[#fff7ed] text-[#33312e] rounded-xl font-semibold hover:bg-[#a39a88] transition-colors text-sm"
            >
              Sign Out
            </button>

            <button
              onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
              className="px-6 py-3 bg-[#ff5d8f]/10 text-[#ff5d8f] rounded-xl font-semibold hover:bg-[#ff5d8f]/15 transition-colors text-sm"
            >
              Delete Account
            </button>
          </div>

          {showDeleteConfirm && (
            <div className="mt-4 p-4 bg-[#ff5d8f]/10 border border-[#ff5d8f] rounded-xl">
              <p className="text-sm text-[#ff5d8f] font-medium mb-1">
                This will permanently delete your account and all your data.
              </p>
              <p className="text-xs text-[#ff5d8f] mb-4">
                All cards, game history, and subscription will be removed. This cannot be undone.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder='Type "DELETE" to confirm'
                  className="flex-1 px-3 py-2 border border-[#ff5d8f] rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#ff5d8f]/20 focus:border-[#ff5d8f] outline-none"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE" || deleting}
                  className="px-4 py-2 bg-[#ff5d8f] text-white text-sm rounded-lg font-semibold hover:bg-[#ff5d8f] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? "Deleting..." : "Delete Forever"}
                </button>
              </div>
              {deleteError && <p className="text-sm text-[#ff5d8f] mt-2">{deleteError}</p>}
            </div>
          )}
        </div>
         </div>
      </div>
    </WorkspaceShell>
  );
}
