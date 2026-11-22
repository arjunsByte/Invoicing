"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Trash2, AlertCircle } from "lucide-react";
import { Customer, ProductService, CompanySettings, QuotationItem } from "@/lib/types/database";
import { calculateLineItemTax, calculateDocumentTotals } from "@/lib/financial/gst-calculator";
import { numberToIndianWords, formatINR } from "@/lib/financial/number-to-words";
import { INDIAN_STATES } from "@/lib/financial/invoice-numbering";
import { cn } from "@/lib/utils";

interface QuotationFormProps {
  companySettings: CompanySettings;
  customers: Customer[];
  products: ProductService[];
}

export function QuotationForm({ companySettings, customers, products }: QuotationFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustId = searchParams.get("customerId") || (customers[0]?.id || "");

  const [quotationType, setQuotationType] = useState<"gst" | "non_gst">(
    companySettings.is_gst_registered ? "gst" : "non_gst"
  );
  const [customerId, setCustomerId] = useState(preselectedCustId);
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split("T")[0]);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
  );
  const [placeOfSupplyState, setPlaceOfSupplyState] = useState(companySettings.state || "Maharashtra");
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState(companySettings.state_code || "27");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState(companySettings.default_notes || "");
  const [terms, setTerms] = useState(companySettings.terms_and_conditions || "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [items, setItems] = useState<QuotationItem[]>([
    {
      id: "qitem-1",
      item_description: products[0]?.name || "Cloud Infrastructure Consulting",
      sac_hsn_code: products[0]?.sac_hsn_code || "998314",
      quantity: 1,
      unit: products[0]?.unit || "fixed",
      unit_price: products[0]?.default_price || 75000,
      discount_percent: 0,
      taxable_amount: 75000,
      gst_rate: quotationType === "gst" ? 18 : 0,
      cgst_rate: 0,
      cgst_amount: 0,
      sgst_rate: 0,
      sgst_amount: 0,
      igst_rate: 0,
      igst_amount: 0,
      total_amount: 75000,
      sort_order: 1,
    },
  ]);

  const isInterstate = placeOfSupplyCode !== (companySettings.state_code || "27");
  const isGstApplicable = quotationType === "gst";

  const updateLineItem = (index: number, field: keyof QuotationItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    const calc = calculateLineItemTax(
      {
        quantity: Number(current.quantity) || 0,
        unit_price: Number(current.unit_price) || 0,
        discount_percent: Number(current.discount_percent) || 0,
        gst_rate: Number(current.gst_rate) || 0,
      },
      isInterstate,
      isGstApplicable
    );

    updated[index] = {
      ...current,
      taxable_amount: calc.taxable_amount,
      cgst_rate: calc.cgst_rate,
      cgst_amount: calc.cgst_amount,
      sgst_rate: calc.sgst_rate,
      sgst_amount: calc.sgst_amount,
      igst_rate: calc.igst_rate,
      igst_amount: calc.igst_amount,
      total_amount: calc.total_amount,
    };

    setItems(updated);
  };

  const handleProductSelect = (index: number, prodId: string) => {
    const prod = products.find((p) => p.id === prodId);
    if (!prod) return;

    const updated = [...items];
    const current = {
      ...updated[index],
      product_id: prod.id,
      item_description: prod.name,
      sac_hsn_code: prod.sac_hsn_code || "998314",
      unit: prod.unit,
      unit_price: prod.default_price,
      gst_rate: isGstApplicable ? prod.gst_rate : 0,
    };

    const calc = calculateLineItemTax(
      {
        quantity: Number(current.quantity) || 0,
        unit_price: Number(current.unit_price) || 0,
        discount_percent: Number(current.discount_percent) || 0,
        gst_rate: Number(current.gst_rate) || 0,
      },
      isInterstate,
      isGstApplicable
    );

    updated[index] = {
      ...current,
      taxable_amount: calc.taxable_amount,
      cgst_rate: calc.cgst_rate,
      cgst_amount: calc.cgst_amount,
      sgst_rate: calc.sgst_rate,
      sgst_amount: calc.sgst_amount,
      igst_rate: calc.igst_rate,
      igst_amount: calc.igst_amount,
      total_amount: calc.total_amount,
    };

    setItems(updated);
  };

  const addItem = () => {
    const newItem: QuotationItem = {
      id: `qitem-${Date.now()}`,
      item_description: "",
      sac_hsn_code: "998314",
      quantity: 1,
      unit: "fixed",
      unit_price: 0,
      discount_percent: 0,
      taxable_amount: 0,
      gst_rate: isGstApplicable ? 18 : 0,
      cgst_rate: 0,
      cgst_amount: 0,
      sgst_rate: 0,
      sgst_amount: 0,
      igst_rate: 0,
      igst_amount: 0,
      total_amount: 0,
      sort_order: items.length + 1,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const totals = calculateDocumentTotals(items, discountType, discountValue, true);
  const amountWords = numberToIndianWords(totals.total_amount);

  const handleSubmit = async (targetStatus: "draft" | "pending") => {
    setErrorMsg("");

    if (!customerId) {
      setErrorMsg("Please select a customer.");
      return;
    }
    if (items.some((i) => !i.item_description)) {
      setErrorMsg("All quotation line items must have descriptions.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        quotation_type: quotationType,
        customer_id: customerId,
        quotation_date: quoteDate,
        valid_until: validUntil,
        status: targetStatus,
        place_of_supply: `${placeOfSupplyState} (${placeOfSupplyCode})`,
        place_of_supply_state_code: placeOfSupplyCode,
        is_interstate: isInterstate,
        currency: "INR",
        subtotal: totals.subtotal,
        discount_type: discountType,
        discount_value: discountValue,
        discount_amount: totals.discount_amount,
        taxable_amount: totals.taxable_amount,
        cgst_amount: totals.cgst_amount,
        sgst_amount: totals.sgst_amount,
        igst_amount: totals.igst_amount,
        total_tax: totals.total_tax,
        round_off: totals.round_off,
        total_amount: totals.total_amount,
        notes,
        terms_and_conditions: terms,
        items,
      };

      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create quotation.");
      }

      const created = await res.json();
      router.push(`/quotations/${created.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Link
          href="/quotations"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Quotations
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("pending")}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Create & Send Quote"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Quotation Mode
          </label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setQuotationType("gst")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                quotationType === "gst"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              )}
            >
              <div className="font-bold text-xs">GST Estimate</div>
              <div className={cn("text-[11px] mt-0.5", quotationType === "gst" ? "text-slate-300" : "text-slate-500")}>
                Shows applicable tax breakdowns
              </div>
            </button>

            <button
              type="button"
              onClick={() => setQuotationType("non_gst")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                quotationType === "non_gst"
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              )}
            >
              <div className="font-bold text-xs">Non-GST Proposal</div>
              <div className={cn("text-[11px] mt-0.5", quotationType === "non_gst" ? "text-slate-300" : "text-slate-500")}>
                Net commercial pricing only
              </div>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Client *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || c.contact_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Quotation Date *
            </label>
            <input
              type="date"
              value={quoteDate}
              onChange={(e) => setQuoteDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Validity Date *
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>
        </div>

        {/* Line Items */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Proposed Offerings
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-slate-700"
            >
              <Plus className="h-3.5 w-3.5" /> Add Row
            </button>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-8 text-center">#</th>
                  <th className="p-3">Scope / Item Description</th>
                  <th className="p-3 w-20 text-center">Qty</th>
                  <th className="p-3 w-28 text-right">Unit Price</th>
                  {isGstApplicable && <th className="p-3 w-24 text-center">GST %</th>}
                  <th className="p-3 w-28 text-right">Total</th>
                  <th className="p-3 w-10 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id || idx}>
                    <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                    <td className="p-3 space-y-1">
                      <select
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded text-slate-600 mb-1"
                        defaultValue=""
                      >
                        <option value="" disabled>-- Select standard service --</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Detailed scope or offering description"
                        value={item.item_description}
                        onChange={(e) => updateLineItem(idx, "item_description", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => updateLineItem(idx, "quantity", e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-center"
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        value={item.unit_price}
                        onChange={(e) => updateLineItem(idx, "unit_price", e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-right font-medium"
                      />
                    </td>
                    {isGstApplicable && (
                      <td className="p-3">
                        <select
                          value={item.gst_rate}
                          onChange={(e) => updateLineItem(idx, "gst_rate", Number(e.target.value))}
                          className="w-full px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-center"
                        >
                          <option value={0}>0%</option>
                          <option value={5}>5%</option>
                          <option value={12}>12%</option>
                          <option value={18}>18%</option>
                          <option value={28}>28%</option>
                        </select>
                      </td>
                    )}
                    <td className="p-3 text-right font-bold text-slate-900">
                      {formatINR(item.total_amount)}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}
                        className="text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Proposal Terms & Conditions
              </label>
              <textarea
                rows={3}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">{formatINR(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-semibold text-slate-900">{formatINR(totals.taxable_amount)}</span>
            </div>
            {isGstApplicable && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>Applicable GST:</span>
                <span className="font-semibold text-slate-900">{formatINR(totals.total_tax)}</span>
              </div>
            )}
            <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline font-bold text-sm text-slate-900">
              <span>Total Estimated Amount:</span>
              <span className="text-xl">{formatINR(totals.total_amount)}</span>
            </div>
            <div className="pt-2 text-[11px] text-slate-500 italic">
              Amount in words: {amountWords}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
