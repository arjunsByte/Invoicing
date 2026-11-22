"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Printer,
  Download,
  CreditCard,
  Ban,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Lock,
  Building,
  RotateCcw,
  X,
} from "lucide-react";
import { Invoice, Payment, CompanySettings } from "@/lib/types/database";
import { formatINR } from "@/lib/financial/number-to-words";
import { generateInvoicePDF } from "@/lib/pdf/generate-invoice-pdf";
import { cn } from "@/lib/utils";

interface InvoiceDetailViewProps {
  invoice: Invoice;
  payments: Payment[];
  companySettings: CompanySettings;
}

export function InvoiceDetailView({
  invoice: initialInvoice,
  payments: initialPayments,
  companySettings,
}: InvoiceDetailViewProps) {
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice>(initialInvoice);
  const [payments, setPayments] = useState<Payment[]>(initialPayments);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Payment form state
  const [payAmount, setPayAmount] = useState(invoice.balance_due);
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payMethod, setPayMethod] = useState<Payment["payment_method"]>("bank_transfer");
  const [payRef, setPayRef] = useState("");
  const [payNotes, setPayNotes] = useState("");

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = generateInvoicePDF(invoice, false);
    doc.save(`${invoice.invoice_number.replace(/\//g, "-")}.pdf`);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (payAmount <= 0) {
      setErrorMsg("Amount must be greater than zero.");
      return;
    }
    if (payAmount > invoice.balance_due) {
      setErrorMsg(`Payment amount cannot exceed outstanding balance due (₹${invoice.balance_due}).`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: payAmount,
          payment_date: payDate,
          payment_method: payMethod,
          transaction_reference: payRef,
          notes: payNotes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to record payment.");
      }

      const newPayment = await res.json();
      setPayments([newPayment, ...payments]);

      // Update local invoice balance
      const newPaid = Number((invoice.amount_paid + payAmount).toFixed(2));
      const newBalance = Number((invoice.total_amount - newPaid).toFixed(2));
      const newStatus = newBalance <= 0.01 ? "paid" : "partially_paid";

      setInvoice({
        ...invoice,
        amount_paid: newPaid,
        balance_due: newBalance,
        status: newStatus,
      });

      setShowPaymentModal(false);
      setPayNotes("");
      setPayRef("");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to record payment.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelInvoice = async () => {
    if (!cancelReason) {
      setErrorMsg("Please specify a reason for cancellation.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          reason: cancelReason,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to cancel invoice.");
      }

      const updated = await res.json();
      setInvoice(updated);
      setShowCancelModal(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to cancel invoice.");
    } finally {
      setSubmitting(false);
    }
  };

  const isGst = invoice.invoice_type === "gst_tax_invoice";
  const customer = invoice.customer_snapshot || {};
  const company = invoice.company_snapshot || companySettings;

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Action Header (Hidden during print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Invoices
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {invoice.status !== "cancelled" && invoice.balance_due > 0 && (
            <button
              onClick={() => {
                setPayAmount(invoice.balance_due);
                setShowPaymentModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
            >
              <CreditCard className="h-4 w-4" />
              Record Payment
            </button>
          )}

          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-sm transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>

          {invoice.status !== "cancelled" && invoice.amount_paid === 0 && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Ban className="h-4 w-4" />
              Cancel Invoice
            </button>
          )}
        </div>
      </div>

      {/* Invoice Status Banner */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
              invoice.status === "paid" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
              invoice.status === "partially_paid" && "bg-blue-50 text-blue-700 border border-blue-200",
              invoice.status === "issued" && "bg-amber-50 text-amber-700 border border-amber-200",
              invoice.status === "draft" && "bg-slate-100 text-slate-600",
              invoice.status === "cancelled" && "bg-rose-50 text-rose-700 border border-rose-200"
            )}
          >
            {invoice.status.replace("_", " ")}
          </span>
          {invoice.is_locked && (
            <span className="flex items-center gap-1 text-xs text-slate-500 font-medium">
              <Lock className="h-3.5 w-3.5 text-slate-400" /> Locked Document (Issued)
            </span>
          )}
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-600">
          <div>
            Total: <span className="font-bold text-slate-900">{formatINR(invoice.total_amount)}</span>
          </div>
          <div>
            Paid: <span className="font-bold text-emerald-600">{formatINR(invoice.amount_paid)}</span>
          </div>
          <div>
            Balance: <span className="font-bold text-rose-600">{formatINR(invoice.balance_due)}</span>
          </div>
        </div>
      </div>

      {/* High-Resolution Printable Invoice Container */}
      <div className="bg-white p-8 md:p-12 rounded-2xl border border-slate-200 shadow-sm print:border-none print:shadow-none print:p-0 space-y-8">
        {/* Document Header Band */}
        <div className="bg-slate-900 text-white p-3 rounded-lg flex items-center justify-between text-xs font-bold tracking-wider uppercase">
          <span>{isGst ? "Tax Invoice (Sec 31 CGST Act)" : "Commercial Non-GST Bill"}</span>
          <span>{invoice.financial_year}</span>
        </div>

        {/* Company & Invoice Metadata Row */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              {company.company_name || "QORVA LABS LLP"}
            </h2>
            {company.tagline && <p className="text-xs text-slate-500 mt-0.5">{company.tagline}</p>}
            <div className="text-xs text-slate-600 mt-2 space-y-0.5">
              <p>{company.address_line1}</p>
              <p>{company.city}, {company.state} - {company.pincode}</p>
              <p>Email: {company.email} | Phone: {company.phone}</p>
              <p className="font-mono pt-1">LLPIN: {company.llpin} | PAN: {company.pan}</p>
              {isGst && company.gstin && (
                <p className="font-mono font-bold text-slate-900 pt-0.5">
                  GSTIN: {company.gstin} (State Code: {company.state_code})
                </p>
              )}
            </div>
          </div>

          <div className="text-right space-y-1 text-xs">
            <div className="text-base font-bold text-slate-900">
              Invoice #{invoice.invoice_number}
            </div>
            <div className="text-slate-600">
              <span className="text-slate-400">Invoice Date:</span> {invoice.invoice_date}
            </div>
            <div className="text-slate-600">
              <span className="text-slate-400">Due Date:</span> {invoice.due_date}
            </div>
            {isGst && (
              <>
                <div className="text-slate-600">
                  <span className="text-slate-400">Place of Supply:</span> {invoice.place_of_supply}
                </div>
                <div className="text-slate-600">
                  <span className="text-slate-400">Reverse Charge:</span> {invoice.reverse_charge ? "Yes" : "No"}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Customer / Billed To Row */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
            Billed To / Customer
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <div className="font-bold text-slate-900 text-sm">
                {customer.company_name || customer.contact_name}
              </div>
              {customer.company_name && (
                <div className="text-slate-600">Attn: {customer.contact_name}</div>
              )}
              <div className="text-slate-500 mt-1">
                {customer.billing_address}, {customer.billing_city} - {customer.billing_pincode}
              </div>
              <div className="text-slate-500">{customer.billing_state}, {customer.billing_country}</div>
            </div>

            <div className="sm:text-right space-y-0.5 text-slate-600">
              {customer.email && <div>Email: {customer.email}</div>}
              {customer.phone && <div>Phone: {customer.phone}</div>}
              {customer.pan && <div>PAN: {customer.pan}</div>}
              {isGst && customer.gstin && (
                <div className="font-mono font-bold text-slate-900">
                  Customer GSTIN: {customer.gstin}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white uppercase font-bold text-[11px]">
              <tr>
                <th className="p-3 w-8 text-center">#</th>
                <th className="p-3">Description & Offering</th>
                {isGst && <th className="p-3 text-center">SAC/HSN</th>}
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-right">Unit Price</th>
                {isGst && <th className="p-3 text-center">Tax Rate</th>}
                <th className="p-3 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(invoice.items || []).map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="p-3 text-center text-slate-400 font-bold">{idx + 1}</td>
                  <td className="p-3 font-semibold text-slate-800">{item.item_description}</td>
                  {isGst && (
                    <td className="p-3 text-center font-mono text-slate-600">{item.sac_hsn_code || "998314"}</td>
                  )}
                  <td className="p-3 text-center text-slate-700">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="p-3 text-right text-slate-700">{formatINR(item.unit_price)}</td>
                  {isGst && <td className="p-3 text-center text-slate-700">{item.gst_rate}%</td>}
                  <td className="p-3 text-right font-bold text-slate-900">{formatINR(item.total_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Section: Words, Bank Details, and Totals */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
          <div className="space-y-4 text-xs">
            <div>
              <span className="font-bold text-slate-700 uppercase tracking-wider block text-[11px]">
                Total Amount in Words:
              </span>
              <p className="font-medium text-slate-800 mt-0.5">{invoice.amount_in_words}</p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
              <span className="font-bold text-slate-900 block mb-1">Bank Settlement Details</span>
              <p className="text-slate-600">Bank: <span className="font-medium text-slate-900">{company.bank_name}</span></p>
              <p className="text-slate-600">A/C Holder: <span className="font-medium text-slate-900">{company.bank_account_holder}</span></p>
              <p className="text-slate-600">A/C Number: <span className="font-mono font-medium text-slate-900">{company.bank_account_no}</span></p>
              <p className="text-slate-600">IFSC Code: <span className="font-mono font-medium text-slate-900">{company.bank_ifsc}</span></p>
              <p className="text-slate-600">Branch: <span className="font-medium text-slate-900">{company.bank_branch}</span></p>
              {company.upi_id && (
                <p className="text-slate-600 pt-1">UPI ID: <span className="font-mono font-bold text-slate-900">{company.upi_id}</span></p>
              )}
            </div>

            {invoice.notes && (
              <div>
                <span className="font-bold text-slate-700 block text-[11px]">Notes:</span>
                <p className="text-slate-500 mt-0.5">{invoice.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-medium text-slate-900">{formatINR(invoice.subtotal)}</span>
            </div>
            {invoice.discount_amount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount:</span>
                <span className="font-medium text-slate-900">-{formatINR(invoice.discount_amount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-medium text-slate-900">{formatINR(invoice.taxable_amount)}</span>
            </div>
            {isGst && (
              <>
                {invoice.is_interstate ? (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST:</span>
                    <span className="font-medium text-slate-900">{formatINR(invoice.igst_amount)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST:</span>
                      <span className="font-medium text-slate-900">{formatINR(invoice.cgst_amount)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST:</span>
                      <span className="font-medium text-slate-900">{formatINR(invoice.sgst_amount)}</span>
                    </div>
                  </>
                )}
              </>
            )}
            {invoice.round_off !== 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Round Off:</span>
                <span className="font-medium text-slate-900">{formatINR(invoice.round_off)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
              <span>Total Invoice Amount:</span>
              <span>{formatINR(invoice.total_amount)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-semibold">
              <span>Amount Paid:</span>
              <span>{formatINR(invoice.amount_paid)}</span>
            </div>
            <div className="pt-1 border-t border-slate-200 flex justify-between font-bold text-base text-rose-600">
              <span>Balance Due:</span>
              <span>{formatINR(invoice.balance_due)}</span>
            </div>
          </div>
        </div>

        {/* Footer & Signature */}
        <div className="pt-8 border-t border-slate-200 flex items-end justify-between text-xs text-slate-500">
          <div>
            <p>Thank you for choosing QORVA LABS LLP.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">This is a computer generated invoice requiring no physical signature.</p>
          </div>

          <div className="text-right">
            <span className="font-bold text-slate-900 block">For QORVA LABS LLP</span>
            <span className="text-[11px] text-slate-400 mt-8 block">Authorized Signatory</span>
          </div>
        </div>
      </div>

      {/* Payment History Ledger */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Payments Recorded ({payments.length})</h3>
          </div>
          {invoice.status !== "cancelled" && invoice.balance_due > 0 && (
            <button
              onClick={() => {
                setPayAmount(invoice.balance_due);
                setShowPaymentModal(true);
              }}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
            >
              + Record Payment
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Receipt #</th>
                <th className="px-6 py-3">Payment Date</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">Transaction Reference (UTR)</th>
                <th className="px-6 py-3 text-right">Amount Received</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-6 text-center text-slate-400">
                    No payments have been recorded for this invoice yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id}>
                    <td className="px-6 py-3.5 font-bold text-slate-900">{p.payment_number}</td>
                    <td className="px-6 py-3.5 text-slate-600">{p.payment_date}</td>
                    <td className="px-6 py-3.5 text-slate-600 uppercase font-medium">
                      {p.payment_method.replace("_", " ")}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-700">{p.transaction_reference || "N/A"}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-emerald-600">
                      {formatINR(p.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Settled
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Dialog */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Amount (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  max={invoice.balance_due}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-900 font-bold text-slate-900"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Remaining balance due: {formatINR(invoice.balance_due)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  required
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                  <option value="upi">UPI (GPay / PhonePe / Paytm / BHIM)</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction / UTR Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFCN2629381716 or UPI Ref"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Received 50% milestone settlement"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {submitting ? "Recording..." : "Confirm Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6">
            <h2 className="text-base font-bold text-rose-600">Cancel Invoice #{invoice.invoice_number}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Cancelling will lock this invoice, zero out any outstanding balance, and record an immutable audit entry.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reason for Cancellation *
              </label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Replaced by revised invoice / Project scope cancelled"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>

            <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Go Back
              </button>
              <button
                type="button"
                onClick={handleCancelInvoice}
                disabled={submitting || !cancelReason}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm disabled:opacity-50"
              >
                {submitting ? "Cancelling..." : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
