"use client";

import { useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  Plus,
  Calendar,
  Layers,
  Building2,
  CreditCard,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Invoice, Payment, Expense, Customer } from "@/lib/types/database";
import { computeDashboardMetrics, DateFilterType } from "@/lib/financial/analytics";
import { formatINR } from "@/lib/financial/number-to-words";
import { cn } from "@/lib/utils";

interface DashboardViewProps {
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  customers: Customer[];
}

export function DashboardView({
  invoices,
  payments,
  expenses,
  customers,
}: DashboardViewProps) {
  const [dateFilter, setDateFilter] = useState<DateFilterType>("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const metrics = computeDashboardMetrics(
    invoices,
    payments,
    expenses,
    customers,
    dateFilter,
    customStart,
    customEnd
  );

  const gstPieData = [
    { name: "GST Tax Sales", value: metrics.totalGstSales, color: "#0f172a" },
    { name: "Non-GST / Commercial", value: metrics.totalNonGstSales, color: "#64748b" },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-8">
      {/* Top Banner & Date Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Executive Business Overview
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time sales, collections, tax metrics, and cash flow for QORVA LABS LLP.
          </p>
        </div>

        {/* Date Filter Controls */}
        <div className="flex flex-wrap items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          {(
            [
              { id: "today", label: "Today" },
              { id: "this_week", label: "This Week" },
              { id: "this_month", label: "This Month" },
              { id: "this_quarter", label: "This Quarter" },
              { id: "this_year", label: "This Year" },
              { id: "all", label: "All Time" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setDateFilter(tab.id)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                dateFilter === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Grid (8 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Sales (Invoiced)
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatINR(metrics.totalSales)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="h-3.5 w-3.5" />
            <span>+{metrics.salesGrowthPercent}% vs prev period</span>
          </div>
        </div>

        {/* Amount Received (Cash Collection) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Amount Received (Cash)
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatINR(metrics.totalReceived)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Actual bank deposits & UPI received
          </div>
        </div>

        {/* Outstanding Receivables */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Outstanding Payments
            </span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {formatINR(metrics.outstandingPayments)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Pending across all issued invoices
          </div>
        </div>

        {/* Overdue Invoices */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Overdue Invoices
            </span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <AlertCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600 tracking-tight">
              {formatINR(metrics.overdueAmount)}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({metrics.overdueCount} {metrics.overdueCount === 1 ? "invoice" : "invoices"})
            </span>
          </div>
          <div className="mt-2 text-xs text-rose-600/80 font-medium">
            Requires follow-up action
          </div>
        </div>

        {/* Total GST Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              GST Tax Invoiced
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {formatINR(metrics.totalGstSales)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Intra & Inter-state tax bills
          </div>
        </div>

        {/* Total Non-GST Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Non-GST / Commercial
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {formatINR(metrics.totalNonGstSales)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            Commercial bills & advisory
          </div>
        </div>

        {/* Total Expenses & Input Credit */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Business Expenses
            </span>
            <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold text-slate-900 tracking-tight">
              {formatINR(metrics.totalExpenses)}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            ITC eligible: {formatINR(metrics.totalGstInputCredit)}
          </div>
        </div>

        {/* Net Business Income - Dual distinction */}
        <div className="bg-slate-900 text-white p-5 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Net Business Income
            </span>
            <div className="p-2 rounded-lg bg-slate-800 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold text-white tracking-tight">
              {formatINR(metrics.netCashFlow)}
            </span>
            <span className="text-[11px] block text-slate-400 mt-0.5">
              Net Cash Flow (Received - Expenses)
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-xs text-slate-300 flex justify-between">
            <span>Accounting Profit:</span>
            <span className="font-semibold text-white">
              {formatINR(metrics.netAccountingProfit)}
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Cash Collections Trend (Area Chart) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Monthly Revenue & Cash Trend
              </h3>
              <p className="text-xs text-slate-500">
                Comparison of invoiced revenue versus actual payments collected
              </p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cashGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip
                  formatter={(val: any) => formatINR(Number(val))}
                  contentStyle={{ backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "12px" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Area type="monotone" dataKey="sales" name="Invoiced Sales" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="collections" name="Cash Collected" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#cashGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GST vs Non-GST Sales Breakdown */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              GST vs Non-GST Breakdown
            </h3>
            <p className="text-xs text-slate-500">
              Tax status of invoiced revenue
            </p>
          </div>

          <div className="h-56 w-full my-auto flex items-center justify-center">
            {gstPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gstPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {gstPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: any) => formatINR(Number(val))} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-slate-400">No invoice records in period</div>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                GST Tax Invoices
              </span>
              <span className="font-semibold text-slate-900">{formatINR(metrics.totalGstSales)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-600">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                Non-GST Commercial
              </span>
              <span className="font-semibold text-slate-900">{formatINR(metrics.totalNonGstSales)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Row: Recent Invoices & Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Invoices</h3>
              <p className="text-xs text-slate-500">Latest generated bills and payment status</p>
            </div>
            <Link
              href="/invoices"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              View all →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Invoice #</th>
                  <th className="px-6 py-3">Client</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-right">Amount</th>
                  <th className="px-6 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics.recentInvoices.map((inv) => {
                  const cust = customers.find((c) => c.id === inv.customer_id);
                  const custName = cust ? (cust.company_name || cust.contact_name) : "Customer";
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-900">
                        <Link href={`/invoices/${inv.id}`} className="hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 truncate max-w-[160px]">
                        {custName}
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">{inv.invoice_date}</td>
                      <td className="px-6 py-3.5 text-right font-semibold text-slate-900">
                        {formatINR(inv.total_amount)}
                      </td>
                      <td className="px-6 py-3.5 text-center">
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Customers by Revenue (1 col) */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Top Clients</h3>
              <p className="text-xs text-slate-500">Highest revenue contributors</p>
            </div>
            <Link
              href="/customers"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Clients →
            </Link>
          </div>

          <div className="p-6 divide-y divide-slate-100 space-y-4">
            {metrics.topCustomers.map((cust, idx) => (
              <div key={cust.id} className="pt-3 first:pt-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-slate-900 block truncate max-w-[140px]">
                      {cust.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {cust.invoiceCount} {cust.invoiceCount === 1 ? "invoice" : "invoices"}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-900">
                  {formatINR(cust.revenue)}
                </span>
              </div>
            ))}
          </div>

          <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
            <Link
              href="/invoices/new"
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:text-slate-700"
            >
              <Plus className="h-3 w-3" /> Create new invoice
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
