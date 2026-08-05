"use client";

import { useEffect, useMemo, useState } from "react";
import { trackCardShared } from "@/lib/analytics";
import { trackClientActivity } from "@/lib/activity-client";
import { useCheckout } from "@/components/CheckoutModal";
import { getShareEmailPack } from "@/lib/shareEmailPacks";

interface SocialShareProps {
  url: string;
  title: string;
  cardId: string;
  userPlanType?: string | null;
  openEmailTrigger?: number;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseEmailInput(input: string) {
  return Array.from(
    new Set(
      input
        .split(/[,;\n]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export default function SocialShare({ url, title, cardId, userPlanType, openEmailTrigger = 0 }: SocialShareProps) {
  const { openCheckout } = useCheckout();
  const [copied, setCopied] = useState(false);
  const [nativeSharing, setNativeSharing] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(`Check out this bingo card: ${title}`);
  const parsedEmails = useMemo(() => parseEmailInput(emailInput), [emailInput]);
  const emailPack = getShareEmailPack(parsedEmails.length || 1);
  const isPremiumUser = userPlanType === "Premium" || userPlanType === "PREMIUM";

  const shareLinks = [
    {
      name: "WhatsApp",
      href: `https://wa.me/?text=${encodedDesc}%20${encodedUrl}`,
      color: "bg-[#2ec4b6] hover:bg-[#2ec4b6]",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4-4-4z" />
        </svg>
      ),
    },
    {
      name: "Email",
      href: `mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A%0A${encodedUrl}`,
      color: "bg-[#33312e] hover:bg-[#33312e]",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8m-18 8h18a2 2 0 002-2V6a2 2 0 00-2-2H3a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: "bg-[#1877F2] hover:bg-[#166FE5]",
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      ),
    },
  ];

  const trackShareClick = (platform: string) => {
    const platformLower = platform.toLowerCase();
    trackCardShared(cardId, platformLower);
    trackClientActivity("card_shared", {
      cardId,
      title,
      platform: platformLower,
      destination: "external_social",
    });
    trackClientActivity("social_share_clicked", {
      platform: platformLower,
      cardId,
    });
  };

  const handleShare = (platform: string, href: string) => {
    trackShareClick(platform);
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const openEmailModal = () => {
    setEmailModalOpen(true);
    setEmailStatus(null);
    trackClientActivity("share_email_modal_opened", {
      cardId,
      title,
      source: "social_share_panel",
    });
  };

  useEffect(() => {
    if (openEmailTrigger <= 0) return;

    setEmailModalOpen(true);
    setEmailStatus(null);
    trackClientActivity("share_email_modal_opened", {
      cardId,
      title,
      source: "mobile_share_shortcut",
    });
  }, [cardId, openEmailTrigger, title]);

  const closeEmailModal = () => {
    if (emailSending) return;
    setEmailModalOpen(false);
    setEmailStatus(null);
  };

  const handleSendEmailShares = async () => {
    const emails = parsedEmails;
    if (!emails.length) {
      setEmailStatus({
        type: "error",
        message: "Enter at least one email address.",
      });
      return;
    }

    const invalidEmails = emails.filter((email) => !EMAIL_PATTERN.test(email));
    if (invalidEmails.length) {
      setEmailStatus({
        type: "error",
        message: `These emails do not look right: ${invalidEmails.join(", ")}`,
      });
      return;
    }

    try {
      setEmailSending(true);
      setEmailStatus(null);

      if (!isPremiumUser) {
        const pack = getShareEmailPack(emails.length);
        if (!pack) {
          setEmailStatus({
            type: "error",
            message: "You can send to up to 500 emails at a time.",
          });
          return;
        }

        trackClientActivity("email_share_checkout_started", {
          cardId,
          title,
          recipientCount: emails.length,
          packSize: pack.size,
          amountCents: pack.amount,
        });

        await openCheckout({
          purchaseType: "email_share_batch",
          cardId,
          emails,
          label: `${pack.size} Email Share Pack — ${pack.label}`,
          returnPath: `${window.location.pathname}?shareEmail=sent`,
        });

        setEmailStatus({
          type: "success",
          message: "Checkout opened. The emails will send after payment is complete.",
        });
        return;
      }

      const response = await fetch(`/api/cards/${cardId}/share/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "The email could not be sent. Please try again.");
      }

      trackShareClick("email");
      trackClientActivity("share_link_email_sent", {
        cardId,
        title,
        count: data.sent || emails.length,
        failedCount: data.failed?.length || 0,
      });

      const sentCount = data.sent || emails.length;
      const failedCount = data.failed?.length || 0;
      setEmailStatus({
        type: failedCount ? "error" : "success",
        message: failedCount
          ? `Sent ${sentCount}, but ${failedCount} did not go through.`
          : `Sent to ${sentCount} ${sentCount === 1 ? "email" : "emails"}.`,
      });

      if (!failedCount) {
        setEmailInput("");
        setTimeout(() => {
          setEmailModalOpen(false);
          setEmailStatus(null);
        }, 1400);
      }
    } catch (error: any) {
      setEmailStatus({
        type: "error",
        message: error?.message || "The email could not be sent. Please try again.",
      });
    } finally {
      setEmailSending(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackCardShared(cardId, "copy_link");
      trackClientActivity("share_link_copied", {
        cardId,
        title,
        source: "social_share_panel",
      });
      trackClientActivity("card_share_link_copied", {
        cardId,
        title,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      trackCardShared(cardId, "copy_link");
      trackClientActivity("share_link_copied", {
        cardId,
        title,
        source: "social_share_panel_fallback",
      });
      trackClientActivity("card_share_link_copied", {
        cardId,
        title,
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      await handleCopyLink();
      return;
    }
    try {
      setNativeSharing(true);
      await navigator.share({
        title,
        text: `Check out this bingo card: ${title}`,
        url,
      });
      trackCardShared(cardId, "native_share");
      trackClientActivity("card_shared", {
        cardId,
        title,
        platform: "native_share",
        destination: "system_share_sheet",
      });
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        await handleCopyLink();
      }
    } finally {
      setNativeSharing(false);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-[#a39a88] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-[#33312e]">Share this card</p>
          <p className="text-xs text-[#6b6459]">Email player links or copy the card link.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            onClick={openEmailModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7c5cff] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#7c5cff]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 0 0 2.22 0L21 8m-18 8h18a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z" />
            </svg>
            Email
          </button>
          <button
            onClick={handleNativeShare}
            disabled={nativeSharing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#a39a88] bg-white px-4 py-2.5 text-sm font-bold text-[#33312e] transition hover:bg-[#fff7ed] disabled:opacity-60"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342 15.316 16.658M15.316 7.342 8.684 10.658M9 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm12-6a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm0 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
            </svg>
            {nativeSharing ? "Opening..." : "Share sheet"}
          </button>
        </div>
      </div>

      <div className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row">
        <div className="min-w-0 flex-1 rounded-xl border border-[#a39a88] bg-[#fff7ed] px-3 py-2">
          <p className="truncate text-sm font-medium text-[#33312e]">{url}</p>
        </div>
        <button
          onClick={handleCopyLink}
          className={`${copied ? "bg-[#2ec4b6]" : "bg-[#33312e] hover:bg-[#33312e]"} inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition`}
        >
          {copied ? (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              Copied
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2m-6 12h8a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2Z" /></svg>
              Copy
            </>
          )}
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {shareLinks.map((link) => {
          if (link.name === "Email") {
            return (
              <button
                key={link.name}
                onClick={openEmailModal}
                className={`${link.color} inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition`}
                title={`Share on ${link.name}`}
                aria-label={`Share on ${link.name}`}
              >
                {link.icon}
                <span>{link.name}</span>
              </button>
            );
          }

          return (
            <button
              key={link.name}
              onClick={() => handleShare(link.name, link.href)}
              className={`${link.color} inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-bold text-white transition`}
              title={`Share on ${link.name}`}
              aria-label={`Share on ${link.name}`}
            >
              {link.icon}
              <span>{link.name}</span>
            </button>
          );
        })}
      </div>

      {emailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#33312e]/50 px-4 py-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-email-title"
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="share-email-title" className="text-lg font-bold text-[#33312e]">
                  Email player cards
                </h2>
                <p className="mt-1 text-sm text-[#33312e]">
                  Enter the emails they want to share. Add a comma after each email if there are multiple.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEmailModal}
                disabled={emailSending}
                className="rounded-full p-1.5 text-[#6b6459] transition hover:bg-[#fff7ed] hover:text-[#33312e] disabled:opacity-50"
                aria-label="Close email popup"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <label htmlFor="share-email-recipients" className="mt-4 block text-sm font-semibold text-[#33312e]">
              Recipient emails
            </label>
            <textarea
              id="share-email-recipients"
              value={emailInput}
              onChange={(event) => {
                setEmailInput(event.target.value);
                if (emailStatus) setEmailStatus(null);
              }}
              placeholder="player1@example.com, player2@example.com"
              rows={4}
              inputMode="email"
              autoFocus
              disabled={emailSending}
              className="mt-2 w-full resize-none rounded-xl border border-[#a39a88] px-3 py-2 text-sm text-[#33312e] outline-none transition placeholder:text-[#6b6459] focus:border-[#7c5cff] focus:ring-2 focus:ring-[#7c5cff]/15 disabled:bg-[#fff7ed]"
            />

            <div className="mt-4 overflow-hidden rounded-2xl border border-[#a39a88] bg-[#fff7ed]">
              <div className="flex items-start justify-between gap-3 border-b border-[#a39a88] bg-white px-4 py-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[#6b6459]">
                    {isPremiumUser ? "Premium sharing" : "Paid email share"}
                  </p>
                  <p className="mt-0.5 text-sm font-black text-[#33312e]">
                    {parsedEmails.length || 0} {parsedEmails.length === 1 ? "recipient" : "recipients"} selected
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-[#33312e]">
                    {isPremiumUser ? "$0" : emailPack?.label || "-"}
                  </p>
                  <p className="text-[11px] font-bold text-[#6b6459]">
                    {isPremiumUser ? "included" : "due today"}
                  </p>
                </div>
              </div>
              <div className="space-y-2 px-4 py-3 text-sm text-[#33312e]">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Unique player links</span>
                  <span className="font-black text-[#33312e]">
                    {parsedEmails.length || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold">Share pack</span>
                  <span className="font-black text-[#33312e]">
                    {isPremiumUser ? "Included" : emailPack ? `Up to ${emailPack.size}` : "Max 500"}
                  </span>
                </div>
                {!isPremiumUser && (
                  <button
                    type="button"
                    onClick={() => openCheckout({
                      label: "Premium — $7.99/mo · Email shares included",
                      returnPath: window.location.pathname,
                    })}
                    className="mt-2 w-full rounded-xl border border-[#7c5cff] bg-[#7c5cff]/10 px-3 py-2 text-sm font-black text-[#7c5cff] transition hover:bg-[#7c5cff]/15"
                  >
                    Or subscribe and email batches are included
                  </button>
                )}
              </div>
            </div>

            {emailStatus && (
              <p
                className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${
                  emailStatus.type === "success"
                    ? "bg-[#2ec4b6]/10 text-[#2ec4b6]"
                    : "bg-[#ff5d8f]/10 text-[#ff5d8f]"
                }`}
              >
                {emailStatus.message}
              </p>
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeEmailModal}
                disabled={emailSending}
                className="inline-flex items-center justify-center rounded-xl border border-[#a39a88] px-4 py-2.5 text-sm font-bold text-[#33312e] transition hover:bg-[#fff7ed] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendEmailShares}
                disabled={emailSending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#33312e] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#33312e] disabled:opacity-60"
              >
                {emailSending && (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4Z" />
                  </svg>
                )}
                {emailSending
                  ? isPremiumUser ? "Sending..." : "Opening checkout..."
                  : isPremiumUser
                    ? "Send Emails"
                    : `Pay ${emailPack?.label || ""} & Send`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
