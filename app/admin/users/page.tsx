"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  planType: string;
  subscriptionStatus: string;
  createdAt: string;
  lastActive: string;
  image?: string;
  cardCount: number;
}

interface UsersResponse {
  users: AdminUser[];
  totalUsers: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const fetchUsers = useCallback(async (pageNum: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?page=${pageNum}&limit=50`);
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const json: UsersResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page);
  }, [page, fetchUsers]);

  return (
    <div>
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-500 mt-1">
          {data
            ? `${data.totalUsers.toLocaleString()} total users`
            : "Loading users..."}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-3 text-sm text-slate-400">Loading users...</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Cards
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Last Active
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data?.users.map((user) => (
                    <tr
                      key={user._id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-6">
                        <Link
                          href={`/admin/users/${user._id}`}
                          className="flex items-center gap-3"
                        >
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                            {(user.name || user.email || "?")
                              .charAt(0)
                              .toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-slate-900 hover:text-indigo-600 transition-colors">
                            {user.name}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-500">
                        {user.email}
                      </td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                            user.planType === "PREMIUM"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              user.planType === "PREMIUM"
                                ? user.subscriptionStatus === "active"
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          ></span>
                          {user.planType}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-600 font-medium">
                        {user.cardCount}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-400">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "N/A"}
                      </td>
                      <td className="py-3.5 px-6 text-sm text-slate-400">
                        {user.lastActive
                          ? new Date(user.lastActive).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                  {data?.users.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-12 text-center text-sm text-slate-400"
                      >
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {data?.users.map((user) => (
                <Link
                  key={user._id}
                  href={`/admin/users/${user._id}`}
                  className="block px-4 py-4 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500 flex-shrink-0">
                      {(user.name || user.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {user.name || "No name"}
                          </p>
                          <p className="mt-1 break-all text-xs text-slate-500">
                            {user.email}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            user.planType === "PREMIUM"
                              ? "bg-indigo-50 text-indigo-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              user.planType === "PREMIUM"
                                ? user.subscriptionStatus === "active"
                                  ? "bg-emerald-500"
                                  : "bg-amber-500"
                                : "bg-slate-400"
                            }`}
                          ></span>
                          {user.planType}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                        <span>{user.cardCount} cards</span>
                        <span>
                          Joined{" "}
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "N/A"}
                        </span>
                        <span className="col-span-2">
                          Last active{" "}
                          {user.lastActive
                            ? new Date(user.lastActive).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {data?.users.length === 0 && (
                <div className="py-12 text-center text-sm text-slate-400">
                  No users found.
                </div>
              )}
            </div>

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <p className="text-sm text-slate-400">
                  Page {data.page} of {data.totalPages} ({data.totalUsers} total)
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(data.totalPages, p + 1))
                    }
                    disabled={page >= data.totalPages}
                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
