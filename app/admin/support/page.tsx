"use client";

import { useState, useEffect, useCallback } from "react";

interface Ticket {
  _id: string;
  email: string;
  subject: string;
  preview: string;
  receivedAt: string;
  status: "open" | "resolved";
  isReply: boolean;
  threadId?: string;
}

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("open");

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
          filtered.map((ticket) => (
            <div
              key={ticket._id}
              className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-shadow ${
                ticket.isReply ? "border-red-200" : "border-slate-200"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
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
                  </div>
                  <h3 className="font-semibold text-slate-900 truncate">
                    {ticket.subject}
                  </h3>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {ticket.email}
                  </p>
                  <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                    {ticket.preview}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    {new Date(ticket.receivedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex-shrink-0 sm:self-start">
                  {ticket.status === "open" ? (
                    <button
                      onClick={() =>
                        handleStatusChange(ticket._id, "resolved")
                      }
                      className="w-full rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 sm:w-auto"
                    >
                      Resolve
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStatusChange(ticket._id, "open")}
                      className="w-full rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100 sm:w-auto"
                    >
                      Reopen
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
