"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Receipt,
  Search,
  Plus,
  Filter,
  Download,
  Eye,
  CheckCircle2,
  Clock,
  AlertCircle,
  CreditCard,
  FileText,
  Trash2,
} from "lucide-react";
import { Invoice, Customer } from "@/lib/types/database";
import { formatINR } from "@/lib/financial/number-to-words";
import { generateInvoicePDF } from "@/lib/pdf/generate-invoice-pdf";
import { cn } from "@/lib/utils";

interface InvoicesViewProps {
  initialInvoices: Invoice[];
  customers: Customer[];
}

export function InvoicesView({ initialInvoices, customers }: InvoicesViewProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(initialInvoices);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteInvoice = async (invoice: Invoice) => {
    if (!window.confirm(`Delete draft invoice ${invoice.invoice_number}? Only unpaid drafts can be deleted.`)) return;
    setDeleteError("");
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to delete invoice.");
      setInvoices((prev) => prev.filter((item) => item.id !== invoice.id));
    } catch (error: any) {
      setDeleteError(error.message || "Failed to delete invoice.");
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  const totalInvoiced = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((acc, i) => acc + Number(i.total_amount), 0);
  const totalPaid = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((acc, i) => acc + Number(i.amount_paid), 0);
  const totalOutstanding = invoices
    .filter((i) => i.status !== "cancelled")
    .reduce((acc, i) => acc + Number(i.balance_due), 0);
  const overdueCount = invoices.filter(
    (i) => i.due_date < todayStr && i.status !== "paid" && i.status !== "cancelled" && i.balance_due > 0
  ).length;

  const handleDownloadPDF = (inv: Invoice) => {
    const doc = generateInvoicePDF(inv, false);
    doc.save(`${inv.invoice_number.replace(/\//g, "-")}.pdf`);
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (typeFilter !== "all" && inv.invoice_type !== typeFilter) return false;

    if (search) {
      const q = search.toLowerCase();
      const matchNum = inv.invoice_number.toLowerCase().includes(q);
      const cust = customers.find((c) => c.id === inv.customer_id);
      const matchCust =
        cust?.contact_name?.toLowerCase().includes(q) ||
        cust?.company_name?.toLowerCase().includes(q);
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
            Invoices & Billing
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            GST Tax Invoices, Commercial Non-GST Bills, payment tracking, and PDF records.
          </p>
        </div>

        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create New Invoice
        </Link>
      </div>

      {deleteError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700">{deleteError}</div>}

      {/* Mini KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Invoiced
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {formatINR(totalInvoiced)}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Collected Cash
          </span>
          <span className="text-xl font-bold text-emerald-600 mt-1 block">
            {formatINR(totalPaid)}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Outstanding Receivables
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {formatINR(totalOutstanding)}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Overdue Invoices
          </span>
          <span className="text-xl font-bold text-rose-600 mt-1 block">
            {overdueCount} {overdueCount === 1 ? "invoice" : "invoices"}
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by invoice number or client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-center">
          {(
            [
              { id: "all", label: "All Status" },
              { id: "issued", label: "Issued" },
              { id: "partially_paid", label: "Partially Paid" },
              { id: "paid", label: "Paid" },
              { id: "draft", label: "Draft" },
              { id: "cancelled", label: "Cancelled" },
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

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Invoice #</th>
                <th className="px-6 py-3.5">Client & Type</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Due Date</th>
                <th className="px-6 py-3.5 text-right">Total Amount</th>
                <th className="px-6 py-3.5 text-right">Balance Due</th>
                <th className="px-6 py-3.5 text-center">Status</th>
                <th className="px-6 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    No invoices match your selection.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => {
                  const cust = customers.find((c) => c.id === inv.customer_id);
                  const custName = cust ? (cust.company_name || cust.contact_name) : "Customer";
                  const isOverdue =
                    inv.due_date < todayStr && inv.status !== "paid" && inv.status !== "cancelled" && inv.balance_due > 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">
                        <Link href={`/invoices/${inv.id}`} className="hover:underline flex items-center gap-1.5">
                          {inv.invoice_number}
                        </Link>
                        {inv.is_locked && (
                          <span className="text-[10px] text-slate-400 font-normal block">
                            Locked (Issued)
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-900 block truncate max-w-[200px]">
                          {custName}
                        </span>
                        <span className="text-[10px] text-slate-500 uppercase font-medium">
                          {inv.invoice_type === "gst_tax_invoice" ? "GST Tax Invoice" : "Non-GST Bill"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500">{inv.invoice_date}</td>
                      <td className="px-6 py-4">
                        <span className={cn("text-xs", isOverdue ? "text-rose-600 font-bold" : "text-slate-500")}>
                          {inv.due_date}
                        </span>
                        {isOverdue && (
                          <span className="text-[10px] block text-rose-600 font-medium">Overdue</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {formatINR(inv.total_amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span
                          className={cn(
                            "font-bold",
                            inv.balance_due > 0 ? "text-rose-600" : "text-emerald-600"
                          )}
                        >
                          {formatINR(inv.balance_due)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                            inv.status === "paid" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                            inv.status === "partially_paid" && "bg-blue-50 text-blue-700 border border-blue-200",
                            inv.status === "issued" && "bg-amber-50 text-amber-700 border border-amber-200",
                            inv.status === "draft" && "bg-slate-100 text-slate-600 border border-slate-200",
                            inv.status === "cancelled" && "bg-rose-50 text-rose-700 border border-rose-200"
                          )}
                        >
                          {inv.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="View Invoice"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDownloadPDF(inv)}
                            className="p-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {inv.status === "draft" && <button onClick={() => handleDeleteInvoice(inv)} aria-label={`Delete ${inv.invoice_number}`} title="Delete draft invoice" className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button>}
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
