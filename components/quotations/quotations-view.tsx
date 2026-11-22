"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Plus,
  Eye,
  Download,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Quotation, Customer } from "@/lib/types/database";
import { formatINR } from "@/lib/financial/number-to-words";
import { generateInvoicePDF } from "@/lib/pdf/generate-invoice-pdf";
import { cn } from "@/lib/utils";

interface QuotationsViewProps {
  initialQuotations: Quotation[];
  customers: Customer[];
}

export function QuotationsView({ initialQuotations, customers }: QuotationsViewProps) {
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const totalQuoted = quotations.reduce((acc, q) => acc + Number(q.total_amount), 0);
  const acceptedCount = quotations.filter((q) => q.status === "accepted" || q.status === "converted").length;
  const pendingCount = quotations.filter((q) => q.status === "pending").length;

  const handleDownloadPDF = (q: Quotation) => {
    const doc = generateInvoicePDF(q, true);
    doc.save(`${q.quotation_number.replace(/\//g, "-")}.pdf`);
  };

  const filtered = quotations.filter((q) => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (search) {
      const query = search.toLowerCase();
      const matchNum = q.quotation_number.toLowerCase().includes(query);
      const cust = customers.find((c) => c.id === q.customer_id);
      const matchCust =
        cust?.contact_name?.toLowerCase().includes(query) ||
        cust?.company_name?.toLowerCase().includes(query);
      return matchNum || matchCust;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Quotations & Estimates
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Client proposals, pricing estimates, validity dates, and seamless 1-click invoice conversion.
          </p>
        </div>

        <Link
          href="/quotations/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create New Quotation
        </Link>
      </div>

      {/* Mini KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Quotations Value
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {formatINR(totalQuoted)}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Accepted / Converted
          </span>
          <span className="text-xl font-bold text-emerald-600 mt-1 block">
            {acceptedCount} proposals
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Pending Client Decision
          </span>
          <span className="text-xl font-bold text-amber-600 mt-1 block">
            {pendingCount} proposals
          </span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search quotations by number or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-1 self-start sm:self-center">
          {(
            [
              { id: "all", label: "All" },
              { id: "pending", label: "Pending" },
              { id: "accepted", label: "Accepted" },
              { id: "converted", label: "Converted to Invoice" },
              { id: "draft", label: "Draft" },
              { id: "rejected", label: "Rejected" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-md transition-colors",
                statusFilter === s.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Quotation #</th>
                <th className="px-6 py-3.5">Client & Type</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Valid Until</th>
                <th className="px-6 py-3.5 text-right">Taxable</th>
                <th className="px-6 py-3.5 text-right">Total Amount</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    No quotations found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((q) => {
                  const cust = customers.find((c) => c.id === q.customer_id);
                  const custName = cust ? (cust.company_name || cust.contact_name) : "Customer";

                  return (
                    <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <Link href={`/quotations/${q.id}`} className="hover:underline">
                          {q.quotation_number}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 block truncate max-w-[200px]">
                          {custName}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">
                          {q.quotation_type === "gst" ? "GST Mode" : "Non-GST Mode"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{q.quotation_date}</td>
                      <td className="px-6 py-4 text-slate-500">{q.valid_until}</td>
                      <td className="px-6 py-4 text-right font-medium text-slate-700">
                        {formatINR(q.taxable_amount)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {formatINR(q.total_amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                            q.status === "accepted" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                            q.status === "converted" && "bg-indigo-50 text-indigo-700 border border-indigo-200",
                            q.status === "pending" && "bg-amber-50 text-amber-700 border border-amber-200",
                            q.status === "draft" && "bg-slate-100 text-slate-600",
                            q.status === "rejected" && "bg-rose-50 text-rose-700 border border-rose-200"
                          )}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/quotations/${q.id}`}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="View Quote"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDownloadPDF(q)}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
