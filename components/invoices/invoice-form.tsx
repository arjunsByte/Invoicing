"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Receipt,
  Building,
  HelpCircle,
  Check,
  Save,
} from "lucide-react";
import { Customer, ProductService, CompanySettings, InvoiceItem, DocumentType } from "@/lib/types/database";
import { calculateLineItemTax, calculateDocumentTotals } from "@/lib/financial/gst-calculator";
import { numberToIndianWords, formatINR } from "@/lib/financial/number-to-words";
import { INDIAN_STATES } from "@/lib/financial/invoice-numbering";
import { cn } from "@/lib/utils";

interface InvoiceFormProps {
  companySettings: CompanySettings;
  customers: Customer[];
  products: ProductService[];
}

export function InvoiceForm({ companySettings, customers, products }: InvoiceFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedCustomerId = searchParams.get("customerId");
  const preselectedCustId = requestedCustomerId && customers.some((customer) => customer.id === requestedCustomerId)
    ? requestedCustomerId
    : customers[0]?.id || "";

  const [invoiceType, setInvoiceType] = useState<DocumentType>(
    companySettings.is_gst_registered ? "gst_tax_invoice" : "non_gst_invoice"
  );

  const [customerId, setCustomerId] = useState(preselectedCustId);
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0]
  );
  const [placeOfSupplyState, setPlaceOfSupplyState] = useState(companySettings.state || "Maharashtra");
  const [placeOfSupplyCode, setPlaceOfSupplyCode] = useState(companySettings.state_code || "27");
  const [reverseCharge, setReverseCharge] = useState(false);
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Line items state
  const [items, setItems] = useState<InvoiceItem[]>([]);

  // Sync place of supply when customer changes
  useEffect(() => {
    const cust = customers.find((c) => c.id === customerId);
    if (cust && cust.billing_state) {
      setPlaceOfSupplyState(cust.billing_state);
      setPlaceOfSupplyCode(cust.billing_state_code || "27");
    }
  }, [customerId, customers]);

  const isInterstate = placeOfSupplyCode !== (companySettings.state_code || "27");
  const isGstApplicable = invoiceType === "gst_tax_invoice";

  // Recalculate line items on change
  const updateLineItem = (index: number, field: keyof InvoiceItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[index], [field]: value };

    // Tax calculation
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
      sac_hsn_code: prod.sac_hsn_code || "",
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
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      item_description: "",
      sac_hsn_code: "",
      quantity: 1,
      unit: "months",
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

  // Compute overall document totals
  const totals = calculateDocumentTotals(items, discountType, discountValue, true);
  const amountWords = numberToIndianWords(totals.total_amount);

  const handleSubmit = async (targetStatus: "draft" | "issued") => {
    setErrorMsg("");

    if (!customerId) {
      setErrorMsg("Please select a customer.");
      return;
    }
    if (items.some((i) => !i.item_description)) {
      setErrorMsg("All line items must have a description.");
      return;
    }

    if (invoiceType === "gst_tax_invoice" && !companySettings.is_gst_registered) {
      setErrorMsg(
        "GST Tax Invoices cannot be issued because QORVA LABS LLP is configured as Non-GST registered. Please switch to Non-GST Commercial Invoice or enable GST in Settings."
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        invoice_type: invoiceType,
        customer_id: customerId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        status: targetStatus,
        is_locked: targetStatus === "issued",
        place_of_supply: `${placeOfSupplyState} (${placeOfSupplyCode})`,
        place_of_supply_state_code: placeOfSupplyCode,
        is_interstate: isInterstate,
        reverse_charge: reverseCharge,
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

      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create invoice.");
      }

      const created = await res.json();
      router.push(`/invoices/${created.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top back & actions */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Invoices
        </Link>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("issued")}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {submitting ? "Issuing..." : "Issue & Lock Invoice"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        {/* Document Type Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Document Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => {
                if (!companySettings.is_gst_registered) {
                  setErrorMsg(
                    "Cannot select GST Tax Invoice: QORVA LABS LLP is currently configured as Non-GST. Enable it in Settings first."
                  );
                  return;
                }
                setInvoiceType("gst_tax_invoice");
              }}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                invoiceType === "gst_tax_invoice"
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300",
                !companySettings.is_gst_registered && "opacity-50 cursor-not-allowed"
              )}
            >
              <div className="font-bold text-xs">GST Tax Invoice</div>
              <div className={cn("text-[11px] mt-0.5", invoiceType === "gst_tax_invoice" ? "text-slate-300" : "text-slate-500")}>
                Full GSTIN, HSN/SAC, CGST, SGST or IGST
              </div>
            </button>

            <button
              type="button"
              onClick={() => setInvoiceType("non_gst_invoice")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                invoiceType === "non_gst_invoice"
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              )}
            >
              <div className="font-bold text-xs">Commercial / Non-GST Bill</div>
              <div className={cn("text-[11px] mt-0.5", invoiceType === "non_gst_invoice" ? "text-slate-300" : "text-slate-500")}>
                Zero GST charged or displayed
              </div>
            </button>

            <button
              type="button"
              onClick={() => setInvoiceType("bill_of_supply")}
              className={cn(
                "p-3 rounded-xl border text-left transition-all",
                invoiceType === "bill_of_supply"
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
              )}
            >
              <div className="font-bold text-xs">Bill of Supply</div>
              <div className={cn("text-[11px] mt-0.5", invoiceType === "bill_of_supply" ? "text-slate-300" : "text-slate-500")}>
                For composition or exempt services
              </div>
            </button>
          </div>
        </div>

        {/* Customer & Dates Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Customer *
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            >
              {!customers.length && <option value="">No customers available — add a customer first</option>}
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name || c.contact_name} {c.gstin ? `(${c.gstin})` : "(Non-GST)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Invoice Date *
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* GST Tax Rules Box */}
        {isGstApplicable && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Place of Supply (POS)
                </span>
                <span className="text-[11px] text-slate-500">
                  Origin: {companySettings.state} ({companySettings.state_code}) &rarr; Destination: {placeOfSupplyState} ({placeOfSupplyCode})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={placeOfSupplyState}
                  onChange={(e) => {
                    const st = INDIAN_STATES.find((s) => s.name === e.target.value);
                    setPlaceOfSupplyState(e.target.value);
                    setPlaceOfSupplyCode(st?.code || "27");
                  }}
                  className="px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.name}>
                      {s.name} ({s.code})
                    </option>
                  ))}
                </select>

                <div className="px-2.5 py-1 text-xs font-semibold rounded-md bg-white border border-slate-200 text-slate-800">
                  {isInterstate ? "IGST (Inter-state)" : "CGST + SGST (Intra-state)"}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reverseCharge}
                  onChange={(e) => setReverseCharge(e.target.checked)}
                />
                <span>Tax is payable on Reverse Charge basis (Sec 9(3) / 9(4))</span>
              </label>
            </div>
          </div>
        )}

        {/* Line Items Table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Line Items & Services
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
                  <th className="p-3">Description & Offering</th>
                  {isGstApplicable && <th className="p-3 w-24">SAC/HSN</th>}
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
                        <option value="" disabled>
                          -- Choose from catalogue (optional) --
                        </option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (₹{p.default_price})
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Item description / scope"
                        value={item.item_description}
                        onChange={(e) => updateLineItem(idx, "item_description", e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </td>
                    {isGstApplicable && (
                      <td className="p-3">
                        <input
                          type="text"
                          placeholder="998314"
                          value={item.sac_hsn_code || ""}
                          onChange={(e) => updateLineItem(idx, "sac_hsn_code", e.target.value)}
                          className="w-full px-2 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg text-center"
                        />
                      </td>
                    )}
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

        {/* Totals & Notes Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Instructions & Notes
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
            <div className="flex justify-between text-xs text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-900">{formatINR(totals.subtotal)}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-600 gap-2">
              <span>Discount:</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Number(e.target.value))}
                  className="w-16 px-1.5 py-0.5 text-xs text-right bg-white border border-slate-200 rounded"
                />
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded"
                >
                  <option value="percentage">%</option>
                  <option value="fixed">₹</option>
                </select>
              </div>
            </div>

            <div className="flex justify-between text-xs text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-semibold text-slate-900">{formatINR(totals.taxable_amount)}</span>
            </div>

            {isGstApplicable && (
              <>
                {isInterstate ? (
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Integrated Tax (IGST):</span>
                    <span className="font-semibold text-slate-900">{formatINR(totals.igst_amount)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Central Tax (CGST):</span>
                      <span className="font-semibold text-slate-900">{formatINR(totals.cgst_amount)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>State Tax (SGST):</span>
                      <span className="font-semibold text-slate-900">{formatINR(totals.sgst_amount)}</span>
                    </div>
                  </>
                )}
              </>
            )}

            {totals.round_off !== 0 && (
              <div className="flex justify-between text-xs text-slate-600">
                <span>Round Off:</span>
                <span className="font-semibold text-slate-900">{formatINR(totals.round_off)}</span>
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 flex justify-between items-baseline">
              <span className="text-sm font-bold text-slate-900">Total Invoice Amount:</span>
              <span className="text-xl font-bold text-slate-900">{formatINR(totals.total_amount)}</span>
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
