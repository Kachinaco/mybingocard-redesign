"use client";

import { useState, useEffect, useCallback } from "react";

interface TicketReply {
  from: string | null;
  message: string;
  sentAt: string;
}

interface Ticket {
  _id: string;
  email: string;
  subject: string;
  preview: string;
  body?: string;
  bodyHtml?: string;
  messageId?: string;
  receivedAt: string;
  status: "open" | "resolved";
  isReply: boolean;
  threadId?: string;
  replies?: TicketReply[];
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/support");
      if (!res.ok) {
        throw new Error("Failed to fetch tickets");
      }
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleStatusChange = async (ticketId: string, status: string) => {
    try {
      const res = await fetch("/api/admin/support", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, status }),
      });
      if (!res.ok) {
        throw new Error("Failed to update ticket");
      }
      fetchTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update ticket");
    }
  };

  const handleSendReply = async (ticketId: string) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/support/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, message: replyText }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send reply");
      }
      setReplyText("");
      setReplyingId(null);
      fetchTickets();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const toggleExpand = (ticketId: string) => {
    if (expandedId === ticketId) {
      setExpandedId(null);
      setReplyingId(null);
      setReplyText("");
    } else {
      setExpandedId(ticketId);
    }
  };

  const toggleReply = (ticketId: string) => {
    if (replyingId === ticketId) {
      setReplyingId(null);
      setReplyText("");
    } else {
      setReplyingId(ticketId);
      setReplyText("");
    }
  };

  const filtered =
    filter === "all" ? tickets : tickets.filter((t) => t.status === filter);
  const openCount = tickets.filter((t) => t.status === "open").length;
  const resolvedCount = tickets.filter((t) => t.status === "resolved").length;

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Support Tickets
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {openCount} open ticket{openCount !== 1 ? "s" : ""}
            {resolvedCount > 0 &&
              ` / ${resolvedCount} resolved`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["open", "all", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-sm text-slate-400">Loading tickets...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No {filter !== "all" ? filter : ""} tickets
          </div>
        ) : (
          filtered.map((ticket) => {
            const isExpanded = expandedId === ticket._id;
            const isReplying = replyingId === ticket._id;
            const bodyContent = ticket.body || ticket.preview;

            return (
              <div
                key={ticket._id}
                className={`bg-white rounded-xl border shadow-sm transition-shadow ${
                  ticket.isReply ? "border-red-200" : "border-slate-200"
                } ${isExpanded ? "shadow-md" : "hover:shadow-md"}`}
              >
                {/* Header row - clickable to expand */}
                <div
                  className="p-4 cursor-pointer select-none"
                  onClick={() => toggleExpand(ticket._id)}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <svg
                          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                        {ticket.isReply && (
                          <span className="px-2 py-0.5 bg-red-50 text-red-700 text-xs font-semibold rounded-full">
                            Reply
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            ticket.status === "open"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {ticket.status}
                        </span>
                        {ticket.replies && ticket.replies.length > 0 && (
                          <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full">
                            {ticket.replies.length} {ticket.replies.length === 1 ? "reply" : "replies"} sent
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-slate-900 truncate">
                        {ticket.subject}
                      </h3>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {ticket.email}
                      </p>
                      {!isExpanded && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                          {ticket.preview}
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-2">
                        {new Date(ticket.receivedAt).toLocaleString()}
                      </p>
                    </div>
                    <div
                      className="flex-shrink-0 sm:self-start flex gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {ticket.status === "open" ? (
                        <button
                          onClick={() =>
                            handleStatusChange(ticket._id, "resolved")
                          }
                          className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Resolve
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(ticket._id, "open")}
                          className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100"
                        >
                          Reopen
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 pb-4">
                    {/* Full email body */}
                    <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                        Full Message
                      </h4>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap break-words leading-relaxed">
                        {bodyContent || "(no content)"}
                      </div>
                    </div>

                    {/* Previous replies */}
                    {ticket.replies && ticket.replies.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                          Replies
                        </h4>
                        {ticket.replies.map((reply, i) => (
                          <div key={i} className="p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-semibold text-indigo-700">
                                {reply.from || "Admin"}
                              </span>
                              <span className="text-xs text-slate-400">
                                {new Date(reply.sentAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="text-sm text-slate-700 whitespace-pre-wrap">
                              {reply.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply button / compose area */}
                    <div className="mt-4">
                      {!isReplying ? (
                        <button
                          onClick={() => toggleReply(ticket._id)}
                          className="rounded-lg bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 transition hover:bg-indigo-100"
                        >
                          Reply
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply..."
                            rows={5}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 focus:outline-none resize-y"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSendReply(ticket._id)}
                              disabled={sendingReply || !replyText.trim()}
                              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {sendingReply ? "Sending..." : "Send Reply"}
                            </button>
                            <button
                              onClick={() => toggleReply(ticket._id)}
                              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
