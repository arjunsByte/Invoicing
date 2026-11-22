"use client";

import { useState } from "react";
import {
  Wallet,
  Search,
  Plus,
  Trash2,
  Download,
  Building,
  CreditCard,
  X,
  FileSpreadsheet,
} from "lucide-react";
import { Expense } from "@/lib/types/database";
import { formatINR } from "@/lib/financial/number-to-words";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "software_subscriptions", label: "Software & SaaS Subscriptions" },
  { id: "cloud_hosting", label: "Cloud Hosting & Infrastructure" },
  { id: "contractors", label: "Contractors & Consultants" },
  { id: "hardware_equipment", label: "Hardware & Devices" },
  { id: "legal_professional", label: "Legal, CA & Compliance" },
  { id: "office_supplies", label: "Office & Workspace" },
  { id: "travel", label: "Travel & Hospitality" },
  { id: "marketing", label: "Marketing & Growth" },
  { id: "taxes_fees", label: "Bank Charges & Govt Fees" },
  { id: "utilities", label: "Internet & Utilities" },
  { id: "other", label: "Other Business Expense" },
];

interface ExpensesViewProps {
  initialExpenses: Expense[];
}

export function ExpensesView({ initialExpenses }: ExpensesViewProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    category: "software_subscriptions",
    vendor_name: "",
    vendor_gstin: "",
    expense_date: new Date().toISOString().split("T")[0],
    description: "",
    taxable_amount: 10000,
    gst_amount: 1800,
    total_amount: 11800,
    payment_method: "credit_card" as Expense["payment_method"],
    notes: "",
  });

  const handleTaxableChange = (taxable: number) => {
    const gst = Number((taxable * 0.18).toFixed(2));
    setFormData((prev) => ({
      ...prev,
      taxable_amount: taxable,
      gst_amount: gst,
      total_amount: Number((taxable + gst).toFixed(2)),
    }));
  };

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.vendor_name) {
      setErrorMsg("Vendor name is required.");
      return;
    }
    if (formData.total_amount <= 0) {
      setErrorMsg("Total amount must be greater than zero.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save expense.");
      }

      const created = await res.json();
      setExpenses([created, ...expenses]);
      setShowAddModal(false);
      setFormData({
        category: "software_subscriptions",
        vendor_name: "",
        vendor_gstin: "",
        expense_date: new Date().toISOString().split("T")[0],
        description: "",
        taxable_amount: 10000,
        gst_amount: 1800,
        total_amount: 11800,
        payment_method: "credit_card",
        notes: "",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record expense.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      setExpenses(expenses.filter((e) => e.id !== id));
    } catch (e) {
      alert("Failed to delete expense");
    }
  };

  const exportExpensesCSV = () => {
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
  };

  const totalExpenseAmount = expenses.reduce((acc, e) => acc + Number(e.total_amount), 0);
  const totalGstPaid = expenses.reduce((acc, e) => acc + Number(e.gst_amount), 0);

  const filtered = expenses.filter((e) => {
    if (categoryFilter !== "all" && e.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.expense_number.toLowerCase().includes(q) ||
        e.vendor_name.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.vendor_gstin?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Business Expenses & Input Tax Credit
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Operational costs, vendor bills, and eligible GST Input Tax Credit (ITC) tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportExpensesCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Expense
          </button>
        </div>
      </div>

      {/* Mini KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Business Expenses
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {formatINR(totalExpenseAmount)}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total GST Input Credit (ITC)
          </span>
          <span className="text-xl font-bold text-indigo-600 mt-1 block">
            {formatINR(totalGstPaid)}
          </span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            Total Expense Records
          </span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">
            {expenses.length} records
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search vendor, description, GSTIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 self-start sm:self-center"
        >
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Expense #</th>
                <th className="px-6 py-3.5">Vendor & Category</th>
                <th className="px-6 py-3.5">Date</th>
                <th className="px-6 py-3.5">Vendor GSTIN</th>
                <th className="px-6 py-3.5 text-right">Taxable</th>
                <th className="px-6 py-3.5 text-right">GST (ITC)</th>
                <th className="px-6 py-3.5 text-right">Total Amount</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    No expenses found matching your criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">{e.expense_number}</td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-slate-900 block truncate max-w-[200px]">
                        {e.vendor_name}
                      </span>
                      <span className="text-[10px] text-slate-400 capitalize block">
                        {e.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{e.expense_date}</td>
                    <td className="px-6 py-4 font-mono text-slate-600">
                      {e.vendor_gstin || "--"}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-700">
                      {formatINR(e.taxable_amount)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-indigo-600">
                      {formatINR(e.gst_amount)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {formatINR(e.total_amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDeleteExpense(e.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Delete expense"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Record Business Expense</h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateExpense} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor / Merchant *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AWS, GitHub, Google"
                    value={formData.vendor_name}
                    onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor GSTIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="27AABCA1234J1Z8"
                    value={formData.vendor_gstin}
                    onChange={(e) => setFormData({ ...formData, vendor_gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expense_date}
                    onChange={(e) => setFormData({ ...formData, expense_date: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Purpose
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly server hosting invoice"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Taxable (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.taxable_amount}
                    onChange={(e) => handleTaxableChange(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    GST Paid (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.gst_amount}
                    onChange={(e) => {
                      const gst = Number(e.target.value);
                      setFormData({
                        ...formData,
                        gst_amount: gst,
                        total_amount: Number((formData.taxable_amount + gst).toFixed(2)),
                      });
                    }}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Total Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={formData.total_amount}
                    onChange={(e) => setFormData({ ...formData, total_amount: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Saving..." : "Record Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
