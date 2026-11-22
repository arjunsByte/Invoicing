"use client";

import { useState } from "react";
import {
  Settings,
  Building2,
  Receipt,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Save,
  Shield,
} from "lucide-react";
import { CompanySettings } from "@/lib/types/database";
import { INDIAN_STATES } from "@/lib/financial/invoice-numbering";
import { cn } from "@/lib/utils";

interface SettingsViewProps {
  initialSettings: CompanySettings;
}

export function SettingsView({ initialSettings }: SettingsViewProps) {
  const [settings, setSettings] = useState<CompanySettings>(initialSettings);
  const [submitting, setSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleStateChange = (stateName: string) => {
    const found = INDIAN_STATES.find((s) => s.name === stateName);
    setSettings((prev) => ({
      ...prev,
      state: stateName,
      state_code: found ? found.code : "27",
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSavedSuccess(false);
    setErrorMsg("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update company settings.");
      }

      const updated = await res.json();
      setSettings(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save settings.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Company Settings & GST Registration
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure QORVA LABS LLP legal entity identifiers, tax registration, prefixes, and bank settlement details.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {submitting ? "Saving..." : "Save Settings"}
        </button>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Company settings and tax configuration saved successfully!</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* GST Registration Status (Prominent Box) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-slate-700" />
                GST Registration Status (Crucial Rule)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                When disabled, the system will disallow issuing GST Tax Invoices and strictly enforce Non-GST Commercial Invoices.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.is_gst_registered}
                onChange={(e) => setSettings({ ...settings, is_gst_registered: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-slate-900"></div>
            </label>
          </div>

          {settings.is_gst_registered ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 space-y-1">
              <span className="font-bold block">GST Registered Entity Active</span>
              <p>
                GST Tax Invoices with applicable CGST/SGST (Intra-state) and IGST (Inter-state) are currently enabled.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <span className="font-bold block">Non-GST Commercial Mode</span>
              <p>
                GST Tax Invoices are blocked. The system will only issue Non-GST Commercial Invoices and Bills of Supply.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company GSTIN (15 Digits)
              </label>
              <input
                type="text"
                maxLength={15}
                disabled={!settings.is_gst_registered}
                value={settings.gstin || ""}
                onChange={(e) => setSettings({ ...settings, gstin: e.target.value.toUpperCase() })}
                placeholder="27AABFQ1234K1Z5"
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-40"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Permanent Account Number (PAN)
              </label>
              <input
                type="text"
                maxLength={10}
                value={settings.pan || ""}
                onChange={(e) => setSettings({ ...settings, pan: e.target.value.toUpperCase() })}
                placeholder="AABFQ1234K"
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Legal Entity Information */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="h-4 w-4 text-slate-700" />
            Legal Entity Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Entity Legal Name *
              </label>
              <input
                type="text"
                required
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                LLPIN (Limited Liability Partnership No)
              </label>
              <input
                type="text"
                value={settings.llpin || ""}
                onChange={(e) => setSettings({ ...settings, llpin: e.target.value })}
                placeholder="ABX-9821"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Business Email *
              </label>
              <input
                type="email"
                required
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Phone Number
              </label>
              <input
                type="text"
                value={settings.phone || ""}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Address Line 1
            </label>
            <input
              type="text"
              value={settings.address_line1 || ""}
              onChange={(e) => setSettings({ ...settings, address_line1: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={settings.city || ""}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State & Code (Origin)
              </label>
              <select
                value={settings.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PIN Code
              </label>
              <input
                type="text"
                value={settings.pincode || ""}
                onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Bank & Settlement Details */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <CreditCard className="h-4 w-4 text-slate-700" />
            Bank Account & UPI Settlement
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bank Name
              </label>
              <input
                type="text"
                value={settings.bank_name || ""}
                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                placeholder="HDFC Bank Ltd"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Holder Name
              </label>
              <input
                type="text"
                value={settings.bank_account_holder || ""}
                onChange={(e) => setSettings({ ...settings, bank_account_holder: e.target.value })}
                placeholder="QORVA LABS LLP"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Number
              </label>
              <input
                type="text"
                value={settings.bank_account_no || ""}
                onChange={(e) => setSettings({ ...settings, bank_account_no: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                IFSC Code
              </label>
              <input
                type="text"
                value={settings.bank_ifsc || ""}
                onChange={(e) => setSettings({ ...settings, bank_ifsc: e.target.value.toUpperCase() })}
                placeholder="HDFC0001234"
                className="w-full px-3 py-2 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch Name
              </label>
              <input
                type="text"
                value={settings.bank_branch || ""}
                onChange={(e) => setSettings({ ...settings, bank_branch: e.target.value })}
                placeholder="Malad West, Mumbai"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                UPI ID (VPA)
              </label>
              <input
                type="text"
                value={settings.upi_id || ""}
                onChange={(e) => setSettings({ ...settings, upi_id: e.target.value })}
                placeholder="qorvalabs@hdfcbank"
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Invoice Numbering Prefixes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 pb-2 border-b border-slate-100">
            <Receipt className="h-4 w-4 text-slate-700" />
            Document Numbering & Sequences
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GST Tax Invoice Prefix
              </label>
              <input
                type="text"
                value={settings.gst_invoice_prefix}
                onChange={(e) => setSettings({ ...settings, gst_invoice_prefix: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Use &#123;FY&#125; for financial year</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Non-GST Commercial Prefix
              </label>
              <input
                type="text"
                value={settings.non_gst_invoice_prefix}
                onChange={(e) => setSettings({ ...settings, non_gst_invoice_prefix: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quotation Prefix
              </label>
              <input
                type="text"
                value={settings.quotation_prefix}
                onChange={(e) => setSettings({ ...settings, quotation_prefix: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Bill of Supply Prefix
              </label>
              <input
                type="text"
                value={settings.bill_of_supply_prefix}
                onChange={(e) => setSettings({ ...settings, bill_of_supply_prefix: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving Configuration..." : "Save All Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
