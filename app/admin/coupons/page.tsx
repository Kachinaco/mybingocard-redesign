"use client";

import { useState, useEffect } from "react";

interface CouponData {
  _id: string;
  code: string;
  discountPercent?: number;
  discountAmount?: number;
  maxUses: number;
  usedCount: number;
  expiresAt?: string;
  active: boolean;
  createdAt: string;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponData[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "amount">(
    "percent"
  );
  const [discountValue, setDiscountValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");

  const fetchCoupons = async () => {
    const res = await fetch("/api/admin/coupons");
    const data = await res.json();
    setCoupons(data.coupons || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const body: any = {
        code,
        maxUses: maxUses ? parseInt(maxUses) : 0,
      };

      if (discountType === "percent") {
        body.discountPercent = parseFloat(discountValue);
      } else {
        body.discountAmount = Math.round(parseFloat(discountValue) * 100); // convert to cents
      }

      if (expiresAt) body.expiresAt = expiresAt;

      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create coupon");
      }

      setCode("");
      setDiscountValue("");
      setMaxUses("");
      setExpiresAt("");
      fetchCoupons();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id: string, active: boolean) => {
    await fetch(`/api/admin/coupons/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !active }),
    });
    fetchCoupons();
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">
        Coupon Management
      </h1>

      {/* Create Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          Create New Coupon
        </h2>
        <form
          onSubmit={handleCreate}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Coupon Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              placeholder="e.g. WELCOME20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Discount Type
            </label>
            <select
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            >
              <option value="percent">Percentage (%)</option>
              <option value="amount">Fixed Amount ($)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {discountType === "percent" ? "Discount %" : "Discount $"}
            </label>
            <input
              type="number"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              required
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              placeholder={discountType === "percent" ? "20" : "1.00"}
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Max Uses (0 = unlimited)
            </label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              placeholder="100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Expires At (optional)
            </label>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={creating}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Coupon"}
            </button>
          </div>
        </form>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Coupons Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left py-3 px-4 font-semibold text-slate-600">
                  Code
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">
                  Discount
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">
                  Usage
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">
                  Expires
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-semibold text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading...
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No coupons yet
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr
                    key={c._id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                      {c.code}
                    </td>
                    <td className="py-3 px-4">
                      {c.discountPercent
                        ? `${c.discountPercent}%`
                        : c.discountAmount
                          ? `$${(c.discountAmount / 100).toFixed(2)}`
                          : "\u2014"}
                    </td>
                    <td className="py-3 px-4">
                      {c.usedCount} / {c.maxUses || "\u221E"}
                    </td>
                    <td className="py-3 px-4">
                      {c.expiresAt
                        ? new Date(c.expiresAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${c.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                      >
                        {c.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggle(c._id, c.active)}
                        className={`text-xs font-medium ${c.active ? "text-red-600 hover:text-red-700" : "text-emerald-600 hover:text-emerald-700"}`}
                      >
                        {c.active ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {loading ? (
            <div className="py-8 text-center text-slate-400">Loading...</div>
          ) : coupons.length === 0 ? (
            <div className="py-8 text-center text-slate-400">No coupons yet</div>
          ) : (
            coupons.map((c) => (
              <div key={c._id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-bold text-indigo-600">{c.code}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {c.discountPercent
                        ? `${c.discountPercent}% off`
                        : c.discountAmount
                          ? `$${(c.discountAmount / 100).toFixed(2)} off`
                          : "-"}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${c.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                  >
                    {c.active ? "Active" : "Disabled"}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-400">
                  <span>
                    {c.usedCount} / {c.maxUses || "\u221E"} used
                  </span>
                  <span>
                    {c.expiresAt
                      ? new Date(c.expiresAt).toLocaleDateString()
                      : "Never expires"}
                  </span>
                </div>
                <button
                  onClick={() => handleToggle(c._id, c.active)}
                  className={`mt-3 text-xs font-medium ${c.active ? "text-red-600 hover:text-red-700" : "text-emerald-600 hover:text-emerald-700"}`}
                >
                  {c.active ? "Disable" : "Enable"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
