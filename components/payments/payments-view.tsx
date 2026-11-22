"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Search,
  RotateCcw,
  AlertCircle,
  Receipt,
  X,
  Filter,
} from "lucide-react";
import { Payment } from "@/lib/types/database";
import { formatINR } from "@/lib/financial/number-to-words";
import { cn } from "@/lib/utils";

interface PaymentsViewProps {
  initialPayments: Payment[];
}

export function PaymentsView({ initialPayments }: PaymentsViewProps) {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>(initialPayments);
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("all");

  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const totalCollected = payments
    .filter((p) => !p.is_reversed)
    .reduce((acc, p) => acc + Number(p.amount), 0);
  const activeCount = payments.filter((p) => !p.is_reversed).length;
  const reversedCount = payments.filter((p) => p.is_reversed).length;

  const handleReverse = async () => {
    if (!selectedPayment) return;
    if (!reversalReason) {
      setErrorMsg("Please specify a reason for payment reversal.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/payments/${selectedPayment.id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reversalReason }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to reverse payment.");
      }

      const updated = await res.json();
      setPayments(payments.map((p) => (p.id === updated.id ? updated : p)));
      setSelectedPayment(null);
      setReversalReason("");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to reverse payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = payments.filter((p) => {
    if (methodFilter !== "all" && p.payment_method !== methodFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchNum = p.payment_number.toLowerCase().includes(q);
      const matchRef = p.transaction_reference?.toLowerCase().includes(q);
      const matchInv = p.invoice?.invoice_number?.toLowerCase().includes(q);
      const matchCust =
        p.customer?.company_name?.toLowerCase().includes(q) ||
        p.customer?.contact_name?.toLowerCase().includes(q);
      return matchNum || matchRef || matchInv || matchCust;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Manual Payment Tracking & Receipts
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real cash collections ledger, UTR references, partial settlements, and audit-logged reversals.
          </p>
        </div>
      </div>

      {/* Mini KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Net Cash Collected
          </span>
          <span className="text-xl font-bold text-emerald-600 mt-1 block">
            {formatINR(totalCollected)}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Confirmed Receipts
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {activeCount} settlements
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Reversals / Bounced
          </span>
          <span className="text-xl font-bold text-rose-600 mt-1 block">
            {reversedCount} reversed
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search payments by receipt #, UTR, or invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-center">
          {(
            [
              { id: "all", label: "All Methods" },
              { id: "bank_transfer", label: "Bank (NEFT/RTGS)" },
              { id: "upi", label: "UPI" },
              { id: "cheque", label: "Cheque" },
              { id: "credit_card", label: "Card" },
            ] as const
          ).map((m) => (
            <button
              key={m.id}
              onClick={() => setMethodFilter(m.id)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                methodFilter === m.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Receipt #</th>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Customer</th>
                <th className="px-6 py-3.5">Payment Date</th>
                <th className="px-6 py-3.5">Method</th>
                <th className="px-6 py-3.5">UTR / Reference</th>
                <th className="px-6 py-3.5 text-right">Amount</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-slate-400">
                    No payment receipts found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 font-mono">
                      {p.payment_number}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      <Link href={`/invoices/${p.invoice_id}`} className="hover:underline">
                        {p.invoice?.invoice_number || "Invoice"}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {p.customer?.company_name || p.customer?.contact_name || "Client"}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{p.payment_date}</td>
                    <td className="px-6 py-4 uppercase font-medium text-slate-600">
                      {p.payment_method.replace("_", " ")}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700">
                      {p.transaction_reference || "N/A"}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-emerald-600">
                      {formatINR(p.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          !p.is_reversed
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        )}
                      >
                        {p.is_reversed ? "Reversed" : "Settled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {!p.is_reversed ? (
                        <button
                          onClick={() => {
                            setSelectedPayment(p);
                            setReversalReason("");
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:text-rose-800"
                          title="Reverse Payment"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Reverse
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Reversed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reversal Confirmation Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <h2 className="text-base font-bold text-rose-600">
              Reverse Payment {selectedPayment.payment_number}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Reversing will deduct {formatINR(selectedPayment.amount)} from collected cash, restore the balance on Invoice {selectedPayment.invoice?.invoice_number}, and log an audit trail.
            </p>

            {errorMsg && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Reversal *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Cheque returned / Duplicate entry / Bank UTR mismatch"
                value={reversalReason}
                onChange={(e) => setReversalReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleReverse}
                disabled={submitting || !reversalReason}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {submitting ? "Reversing..." : "Confirm Reversal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
