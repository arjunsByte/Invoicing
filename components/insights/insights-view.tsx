"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import {
  TrendingUp,
  Receipt,
  Users,
  PieChart as PieIcon,
  DollarSign,
  ArrowUpRight,
  ShieldAlert,
  Percent,
} from "lucide-react";
import { Invoice, Payment, Expense, Customer, ProductService } from "@/lib/types/database";
import { computeDashboardMetrics, DateFilterType } from "@/lib/financial/analytics";
import { formatINR } from "@/lib/financial/number-to-words";
import { cn } from "@/lib/utils";

interface InsightsViewProps {
  invoices: Invoice[];
  payments: Payment[];
  expenses: Expense[];
  customers: Customer[];
  products: ProductService[];
}

export function InsightsView({
  invoices,
  payments,
  expenses,
  customers,
  products,
}: InsightsViewProps) {
  const [filter, setFilter] = useState<DateFilterType>("this_year");

  const metrics = computeDashboardMetrics(invoices, payments, expenses, customers, filter);

  // Revenue by Product / Service
  const productRevenueMap: Record<string, number> = {};
  invoices.filter((i) => i.status !== "cancelled").forEach((inv) => {
    (inv.items || []).forEach((item) => {
      const desc = item.item_description.split(" - ")[0].slice(0, 24);
      productRevenueMap[desc] = (productRevenueMap[desc] || 0) + (Number(item.taxable_amount) || 0);
    });
  });

  const productChartData = Object.entries(productRevenueMap)
    .map(([name, revenue]) => ({ name, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // Customer Acquisition & Repeat Customer Ratio
  const customersWithInvoices = customers.filter((c) => (c.invoice_count || 0) > 0);
  const repeatCustomers = customers.filter((c) => (c.invoice_count || 0) > 1);
  const repeatCustomerPercentage = customersWithInvoices.length > 0
    ? Math.round((repeatCustomers.length / customersWithInvoices.length) * 100)
    : 0;

  // Expense vs Sales comparison
  const expenseVsSalesData = metrics.monthlyTrend.map((m) => ({
    month: m.month,
    Sales: m.sales,
    Expenses: m.expenses,
    NetProfit: Math.max(0, m.sales - m.expenses),
  }));

  const COLORS = ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sales Insights & Deep Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Holistic breakdown of revenue, product margins, repeat clients, and tax yields.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
          {(
            [
              { id: "this_month", label: "Month" },
              { id: "this_quarter", label: "Quarter" },
              { id: "this_year", label: "Fiscal Year" },
              { id: "all", label: "Lifetime" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-md transition-all",
                filter === tab.id
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* High-level Analytical KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Average Invoice Value
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {formatINR(metrics.averageInvoiceValue)}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Across {metrics.invoiceCount} generated bills
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Repeat Client Rate
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900 flex items-baseline gap-2">
            <span>{repeatCustomerPercentage}%</span>
            <span className="text-xs text-emerald-600 font-medium">({repeatCustomers.length} clients)</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Clients with multiple engagements
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            Settlement Rate
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics.invoiceCount > 0 ? Math.round((metrics.paidInvoiceCount / metrics.invoiceCount) * 100) : 0}%
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {metrics.paidInvoiceCount} fully settled of {metrics.invoiceCount}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
            GST Tax Proportion
          </span>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            {metrics.totalSales > 0 ? Math.round((metrics.totalGstSales / metrics.totalSales) * 100) : 0}%
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {formatINR(metrics.totalGstSales)} under GST compliance
          </div>
        </div>
      </div>

      {/* Main Charts: Expense vs Revenue + Product Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales vs Expenses & Profit Margin Chart */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">
              Revenue vs Expenses vs Net Margin
            </h3>
            <p className="text-xs text-slate-500">
              Monthly profitability comparison
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={expenseVsSalesData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <Tooltip formatter={(val: any) => formatINR(Number(val))} />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }} />
                <Bar dataKey="Sales" fill="#0f172a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="NetProfit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Service / Offering */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-slate-900">
              Revenue by Service Offering
            </h3>
            <p className="text-xs text-slate-500">
              Top billing categories based on line item value
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={productChartData} margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} tickFormatter={(val) => `₹${val / 1000}k`} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#475569" }} width={120} />
                <Tooltip formatter={(val: any) => formatINR(Number(val))} />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 10 Clients Detailed Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Top 10 Clients by Lifetime Value</h3>
          <p className="text-xs text-slate-500">Ranked by invoiced sales, settled cash, and outstanding balances</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Rank</th>
                <th className="px-6 py-3">Customer / Company</th>
                <th className="px-6 py-3">State & Code</th>
                <th className="px-6 py-3">GSTIN</th>
                <th className="px-6 py-3 text-right">Invoiced Sales</th>
                <th className="px-6 py-3 text-right">Amount Paid</th>
                <th className="px-6 py-3 text-right">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers
                .filter((c) => (c.total_sales || 0) > 0)
                .sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0))
                .slice(0, 10)
                .map((c, idx) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-500">#{idx + 1}</td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {c.company_name || c.contact_name}
                      {c.company_name && (
                        <span className="block text-[11px] font-normal text-slate-400">
                          Attn: {c.contact_name}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {c.billing_state || "N/A"} ({c.billing_state_code || "--"})
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 font-mono text-[11px]">
                      {c.gstin || "Non-GST"}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                      {formatINR(c.total_sales || 0)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-emerald-600">
                      {formatINR(c.total_paid || 0)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-rose-600">
                      {formatINR(c.outstanding_balance || 0)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
