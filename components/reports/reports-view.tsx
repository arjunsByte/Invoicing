"use client";

import { useState } from "react";
import {
  FileSpreadsheet,
  Download,
  Database,
  ShieldCheck,
  Receipt,
  Users,
  Wallet,
  ArrowDownToLine,
  CheckCircle2,
} from "lucide-react";
import { Invoice, Payment, Expense, Customer } from "@/lib/types/database";
import { formatINR } from "@/lib/financial/number-to-words";

interface ReportsViewProps {
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  customers: Customer[];
}

export function ReportsView({
  invoices,
  payments,
  expenses,
  customers,
}: ReportsViewProps) {
  // Tax computations
  const validInvoices = invoices.filter((i) => i.status !== "cancelled");
  const totalCgstOutput = validInvoices.reduce((acc, i) => acc + Number(i.cgst_amount), 0);
  const totalSgstOutput = validInvoices.reduce((acc, i) => acc + Number(i.sgst_amount), 0);
  const totalIgstOutput = validInvoices.reduce((acc, i) => acc + Number(i.igst_amount), 0);
  const totalOutputGstLiability = totalCgstOutput + totalSgstOutput + totalIgstOutput;

  const totalInputTaxCredit = expenses.reduce((acc, e) => acc + Number(e.gst_amount), 0);
  const netGstPayable = Math.max(0, totalOutputGstLiability - totalInputTaxCredit);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Financial Reports & Business Data Export
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          GST liability schedules, complete database backups, and spreadsheet exports for QORVA LABS LLP.
        </p>
      </div>

      {/* GST Compliance & Tax Filing Schedule Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              GST Tax Schedule & Input Credit (ITC) Ledger
            </h2>
            <p className="text-xs text-slate-500">
              GSTR-1 Output Tax vs GSTR-3B Eligible Input Credit computation
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
            FY 2026-2027
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Output CGST (Sales)
            </span>
            <span className="text-lg font-bold text-slate-900 mt-1 block">
              {formatINR(totalCgstOutput)}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Output SGST (Sales)
            </span>
            <span className="text-lg font-bold text-slate-900 mt-1 block">
              {formatINR(totalSgstOutput)}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Output IGST (Interstate)
            </span>
            <span className="text-lg font-bold text-slate-900 mt-1 block">
              {formatINR(totalIgstOutput)}
            </span>
          </div>

          <div className="bg-slate-900 text-white p-4 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Output GST
            </span>
            <span className="text-lg font-bold text-white mt-1 block">
              {formatINR(totalOutputGstLiability)}
            </span>
          </div>
        </div>

        {/* Net GST Payable Calculation */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs text-slate-600">
              Total Input Tax Credit (ITC) Available from Business Expenses:{" "}
              <span className="font-bold text-emerald-600">{formatINR(totalInputTaxCredit)}</span>
            </div>
            <div className="text-[11px] text-slate-400">
              ITC is offset against output CGST/SGST/IGST liability in accordance with Sec 49 of the CGST Act.
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Net GST Cash Outflow
            </span>
            <span className="text-xl font-bold text-slate-900">
              {formatINR(netGstPayable)}
            </span>
          </div>
        </div>
      </div>

      {/* Export & Data Backup Center */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            Export & Backup Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Download permanent snapshots of all commercial transactions, customer records, and system dumps.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Full Database Backup Dump */}
          <div className="p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white shrink-0">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Complete Business Data Backup (JSON)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Full structured dump of all company settings, clients, invoices, payments, audit history, and expenses.
                </p>
              </div>
            </div>

            <a
              href="/api/export/backup"
              download
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
            >
              <ArrowDownToLine className="h-4 w-4" />
              Download Full Backup (.json)
            </a>
          </div>

          {/* Invoices CSV Export */}
          <div className="p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 shrink-0">
                <Receipt className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Invoices & Tax Register (CSV / Excel)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  All issued, paid, and outstanding bills with itemized CGST, SGST, and IGST breakdowns.
                </p>
              </div>
            </div>

            <a
              href="/api/export/invoices"
              download
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              Export Invoices (.csv)
            </a>
          </div>

          {/* Customers CSV Export */}
          <div className="p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Customer Database (CSV / Excel)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Complete directory of business and individual clients, GSTINs, PANs, addresses, and sales balances.
                </p>
              </div>
            </div>

            <a
              href="/api/export/customers"
              download
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              Export Customers (.csv)
            </a>
          </div>

          {/* Expense & ITC Register */}
          <div className="p-5 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors flex flex-col justify-between space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-amber-50 text-amber-700 shrink-0">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Expense & ITC Register (CSV)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Itemized vendor disbursements, categories, payment methods, and GST paid on purchases.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const headers = ["Expense #", "Date", "Category", "Vendor", "Vendor GSTIN", "Taxable Amount", "GST Amount", "Total Amount", "Payment Method"];
                const rows = expenses.map((e) => [
                  e.expense_number,
                  e.expense_date,
                  e.category,
                  `"${e.vendor_name}"`,
                  e.vendor_gstin || "",
                  e.taxable_amount,
                  e.gst_amount,
                  e.total_amount,
                  e.payment_method,
                ]);

                const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", `QORVA_LABS_Expenses_${new Date().toISOString().split("T")[0]}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              Export Expenses (.csv)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
