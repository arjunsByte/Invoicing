"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Printer,
  FileCheck2,
  CheckCircle,
  Building,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Quotation, CompanySettings } from "@/lib/types/database";
import { formatINR } from "@/lib/financial/number-to-words";
import { generateInvoicePDF } from "@/lib/pdf/generate-invoice-pdf";
import { cn } from "@/lib/utils";

interface QuotationDetailViewProps {
  quotation: Quotation;
  companySettings: CompanySettings;
}

export function QuotationDetailView({ quotation: initialQuotation, companySettings }: QuotationDetailViewProps) {
  const router = useRouter();
  const [quotation, setQuotation] = useState<Quotation>(initialQuotation);
  const [converting, setConverting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleDownloadPDF = () => {
    const doc = generateInvoicePDF(quotation, true);
    doc.save(`${quotation.quotation_number.replace(/\//g, "-")}.pdf`);
  };

  const handleConvert = async () => {
    if (!confirm("Convert this quotation into an issued invoice? This will create a locked invoice and link the records.")) {
      return;
    }

    setConverting(true);
    setErrorMsg("");
    try {
      const res = await fetch(`/api/quotations/${quotation.id}/convert`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to convert quotation.");
      }

      const invoice = await res.json();
      router.push(`/invoices/${invoice.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to convert quotation.");
      setConverting(false);
    }
  };

  const isGst = quotation.quotation_type === "gst";
  const customer = quotation.customer_snapshot || {};
  const company = quotation.company_snapshot || companySettings;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <Link
          href="/quotations"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Quotations
        </Link>

        <div className="flex items-center gap-2">
          {quotation.status !== "converted" && (
            <button
              onClick={handleConvert}
              disabled={converting}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <FileCheck2 className="h-4 w-4" />
              {converting ? "Converting..." : "Convert to Invoice"}
            </button>
          )}

          {quotation.status === "converted" && quotation.converted_to_invoice_id && (
            <Link
              href={`/invoices/${quotation.converted_to_invoice_id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <span>View Generated Invoice</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}

          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* Printable Quotation View */}
      <div className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 space-y-8">
        <div className="bg-slate-900 text-white p-3 rounded-lg flex items-center justify-between text-xs font-bold tracking-wider uppercase">
          <span>{isGst ? "Commercial Quotation (GST Mode)" : "Commercial Proposal"}</span>
          <span>Status: {quotation.status}</span>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {company.company_name || "QORVA LABS LLP"}
            </h2>
            <div className="text-xs text-slate-600 mt-2 space-y-0.5">
              <p>{company.address_line1}</p>
              <p>{company.city}, {company.state} - {company.pincode}</p>
              <p>Email: {company.email} | Phone: {company.phone}</p>
            </div>
          </div>

          <div className="text-right space-y-1 text-xs">
            <div className="text-base font-bold text-slate-900">
              Quotation #{quotation.quotation_number}
            </div>
            <div className="text-slate-600">
              <span className="text-slate-400">Date:</span> {quotation.quotation_date}
            </div>
            <div className="text-slate-600">
              <span className="text-slate-400">Valid Until:</span> {quotation.valid_until}
            </div>
          </div>
        </div>

        {/* Customer Box */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Prepared For:
          </span>
          <div className="font-bold text-slate-900 text-sm">
            {customer.company_name || customer.contact_name}
          </div>
          {customer.company_name && (
            <div className="text-slate-600">Attn: {customer.contact_name}</div>
          )}
          <div className="text-slate-500 mt-1">
            {customer.billing_address}, {customer.billing_city} - {customer.billing_pincode}
          </div>
        </div>

        {/* Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase font-bold text-[11px]">
              <tr>
                <th className="p-3 w-8 text-center">#</th>
                <th className="p-3">Scope / Offering</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-right">Unit Price</th>
                {isGst && <th className="p-3 text-center">GST %</th>}
                <th className="p-3 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(quotation.items || []).map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                  <td className="p-3 font-semibold text-slate-800">{item.item_description}</td>
                  <td className="p-3 text-center text-slate-700">{item.quantity} {item.unit}</td>
                  <td className="p-3 text-right text-slate-700">{formatINR(item.unit_price)}</td>
                  {isGst && <td className="p-3 text-center text-slate-700">{item.gst_rate}%</td>}
                  <td className="p-3 text-right font-bold text-slate-900">{formatINR(item.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
          <div className="text-xs space-y-3">
            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                Estimated Amount in Words:
              </span>
              <p className="font-medium text-slate-800 mt-0.5">{quotation.amount_in_words}</p>
            </div>
            {quotation.terms_and_conditions && (
              <div>
                <span className="font-bold text-slate-700 block text-[11px]">Terms:</span>
                <p className="text-slate-500 mt-0.5">{quotation.terms_and_conditions}</p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-900">{formatINR(quotation.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-medium text-slate-900">{formatINR(quotation.taxable_amount)}</span>
            </div>
            {isGst && (
              <div className="flex justify-between text-slate-600">
                <span>Applicable GST:</span>
                <span className="font-medium text-slate-900">{formatINR(quotation.total_tax)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
              <span>Total Estimated Amount:</span>
              <span>{formatINR(quotation.total_amount)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
