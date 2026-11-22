"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Plus,
  Mail,
  Phone,
  MapPin,
  Building,
  User,
  ArrowUpRight,
  Filter,
  Check,
  X,
} from "lucide-react";
import { Customer } from "@/lib/types/database";
import { formatINR } from "@/lib/financial/number-to-words";
import { INDIAN_STATES } from "@/lib/financial/invoice-numbering";
import { cn } from "@/lib/utils";

interface CustomersViewProps {
  initialCustomers: Customer[];
}

export function CustomersView({ initialCustomers }: CustomersViewProps) {
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "business" | "individual">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // New customer form state
  const [formData, setFormData] = useState({
    customer_type: "business" as "business" | "individual",
    company_name: "",
    contact_name: "",
    email: "",
    phone: "",
    billing_address: "",
    billing_city: "",
    billing_state: "Maharashtra",
    billing_state_code: "27",
    billing_pincode: "",
    billing_country: "India",
    gstin: "",
    pan: "",
    notes: "",
  });

  const handleStateChange = (stateName: string) => {
    const found = INDIAN_STATES.find((s) => s.name === stateName);
    setFormData((prev) => ({
      ...prev,
      billing_state: stateName,
      billing_state_code: found ? found.code : "27",
    }));
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!formData.contact_name) {
      setErrorMsg("Contact name is required.");
      return;
    }
    if (formData.customer_type === "business" && !formData.company_name) {
      setErrorMsg("Company name is required for business clients.");
      return;
    }

    // Duplicate check
    const dupEmail = customers.find(
      (c) => formData.email && c.email?.toLowerCase() === formData.email.toLowerCase()
    );
    if (dupEmail) {
      setErrorMsg(`A customer with email ${formData.email} already exists (${dupEmail.contact_name}).`);
      return;
    }

    const dupGstin = customers.find(
      (c) => formData.gstin && c.gstin?.toUpperCase() === formData.gstin.toUpperCase()
    );
    if (dupGstin) {
      setErrorMsg(`A customer with GSTIN ${formData.gstin} already exists (${dupGstin.company_name}).`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          preferred_currency: "INR",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create customer");
      }

      const created = await res.json();
      setCustomers([created, ...customers]);
      setShowAddModal(false);
      setFormData({
        customer_type: "business",
        company_name: "",
        contact_name: "",
        email: "",
        phone: "",
        billing_address: "",
        billing_city: "",
        billing_state: "Maharashtra",
        billing_state_code: "27",
        billing_pincode: "",
        billing_country: "India",
        gstin: "",
        pan: "",
        notes: "",
      });
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save customer");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    if (typeFilter !== "all" && c.customer_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = c.contact_name?.toLowerCase().includes(q);
      const matchComp = c.company_name?.toLowerCase().includes(q);
      const matchEmail = c.email?.toLowerCase().includes(q);
      const matchGst = c.gstin?.toLowerCase().includes(q);
      return matchName || matchComp || matchEmail || matchGst;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Customer Directory
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Permanent client registry, billing profiles, and transaction balances.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Customer
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, company, GSTIN, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
          />
        </div>

        <div className="flex items-center gap-1 self-start sm:self-center">
          {(
            [
              { id: "all", label: "All Clients" },
              { id: "business", label: "Corporate / Business" },
              { id: "individual", label: "Individual" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                typeFilter === t.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customers List Grid / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Customer & Entity</th>
                <th className="px-6 py-3.5">Contact Details</th>
                <th className="px-6 py-3.5">Tax / GSTIN</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5 text-right">Total Invoiced</th>
                <th className="px-6 py-3.5 text-right">Outstanding</th>
                <th className="px-6 py-3.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                    No customers found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center shrink-0">
                          {cust.customer_type === "business" ? (
                            <Building className="h-4 w-4 text-slate-600" />
                          ) : (
                            <User className="h-4 w-4 text-slate-600" />
                          )}
                        </div>
                        <div>
                          <Link
                            href={`/customers/${cust.id}`}
                            className="font-semibold text-slate-900 hover:underline block leading-tight text-sm"
                          >
                            {cust.company_name || cust.contact_name}
                          </Link>
                          {cust.company_name && (
                            <span className="text-[11px] text-slate-500 block">
                              Attn: {cust.contact_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {cust.email && (
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <Mail className="h-3 w-3 text-slate-400" />
                          <span>{cust.email}</span>
                        </div>
                      )}
                      {cust.phone && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] mt-0.5">
                          <Phone className="h-3 w-3 text-slate-400" />
                          <span>{cust.phone}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {cust.gstin ? (
                        <div>
                          <span className="font-mono text-xs font-semibold text-slate-900 block">
                            {cust.gstin}
                          </span>
                          <span className="text-[10px] uppercase font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            GST Registered
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">Non-GST</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      <div>{cust.billing_city || "N/A"}</div>
                      <div className="text-[11px] text-slate-400">
                        {cust.billing_state || ""} ({cust.billing_state_code || "--"})
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      {formatINR(cust.total_sales || 0)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={cn(
                          "font-bold",
                          (cust.outstanding_balance || 0) > 0 ? "text-rose-600" : "text-emerald-600"
                        )}
                      >
                        {formatINR(cust.outstanding_balance || 0)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/customers/${cust.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-900 hover:text-slate-600"
                      >
                        History →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full p-6 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Add New Customer</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="mt-4 space-y-4">
              {/* Type switch */}
              <div className="flex items-center gap-4">
                <label className="text-xs font-medium text-slate-700">Client Type:</label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="customer_type"
                      checked={formData.customer_type === "business"}
                      onChange={() => setFormData({ ...formData, customer_type: "business" })}
                    />
                    Corporate / Business
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-800 cursor-pointer">
                    <input
                      type="radio"
                      name="customer_type"
                      checked={formData.customer_type === "individual"}
                      onChange={() => setFormData({ ...formData, customer_type: "individual" })}
                    />
                    Individual
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.customer_type === "business" && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Technologies Pvt Ltd"
                      value={formData.company_name}
                      onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="billing@client.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    placeholder="+91 98765 43210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    GSTIN (15 Digits, Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    placeholder="27AABCA5566K1Z1"
                    value={formData.gstin}
                    onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    PAN (10 Digits, Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    placeholder="AABCA5566K"
                    value={formData.pan}
                    onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Billing Street Address
                </label>
                <input
                  type="text"
                  placeholder="Plot 42, Cyber Park, Sector 18"
                  value={formData.billing_address}
                  onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="Mumbai"
                    value={formData.billing_city}
                    onChange={(e) => setFormData({ ...formData, billing_city: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    State & GST State Code
                  </label>
                  <select
                    value={formData.billing_state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    PIN Code
                  </label>
                  <input
                    type="text"
                    placeholder="400051"
                    value={formData.billing_pincode}
                    onChange={(e) => setFormData({ ...formData, billing_pincode: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Terms agreed, preferred communication, reference notes..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving Customer..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
