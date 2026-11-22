import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  ArrowLeft,
  Receipt,
  FileText,
  CreditCard,
} from "lucide-react";
import { getCustomerById, getInvoices, getQuotations, getPayments } from "@/lib/db/data-store";
import { formatINR } from "@/lib/financial/number-to-words";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const [allInvoices, allQuotations, allPayments] = await Promise.all([
    getInvoices(),
    getQuotations(),
    getPayments(),
  ]);

  const invoices = allInvoices.filter((i) => i.customer_id === id);
  const quotations = allQuotations.filter((q) => q.customer_id === id);
  const payments = allPayments.filter((p) => p.customer_id === id && !p.is_reversed);

  return (
    <div className="space-y-6">
      {/* Top back button */}
      <div className="flex items-center gap-2">
        <Link
          href="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Customers
        </Link>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shrink-0">
              {customer.customer_type === "business" ? (
                <Building className="h-6 w-6" />
              ) : (
                <User className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900">
                  {customer.company_name || customer.contact_name}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-slate-100 text-slate-700">
                  {customer.customer_type}
                </span>
                {customer.gstin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                    GST Active
                  </span>
                )}
              </div>
              {customer.company_name && (
                <div className="text-xs text-slate-500 mt-0.5">
                  Primary Contact: <span className="font-medium text-slate-800">{customer.contact_name}</span>
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                {customer.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    {customer.email}
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    {customer.phone}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {customer.billing_city || "N/A"}, {customer.billing_state || ""} ({customer.billing_state_code || "--"})
                </span>
                {customer.gstin && (
                  <span className="font-mono text-slate-800 font-semibold">
                    GSTIN: {customer.gstin}
                  </span>
                )}
                {customer.pan && (
                  <span className="font-mono text-slate-800 font-semibold">
                    PAN: {customer.pan}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <Link
              href={`/quotations/new?customerId=${customer.id}`}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              + Create Quote
            </Link>
            <Link
              href={`/invoices/new?customerId=${customer.id}`}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors"
            >
              + Generate Invoice
            </Link>
          </div>
        </div>

        {/* Financial Highlights */}
        <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Invoiced Sales
            </span>
            <span className="text-xl font-bold text-slate-900 mt-1 block">
              {formatINR(customer.total_sales || 0)}
            </span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Total Amount Settled
            </span>
            <span className="text-xl font-bold text-emerald-600 mt-1 block">
              {formatINR(customer.total_paid || 0)}
            </span>
          </div>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Outstanding Balance Due
            </span>
            <span className="text-xl font-bold text-rose-600 mt-1 block">
              {formatINR(customer.outstanding_balance || 0)}
            </span>
          </div>
        </div>
      </div>

      {/* Associated Invoices */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Invoices & Bills ({invoices.length})</h2>
          </div>
          <Link
            href={`/invoices/new?customerId=${customer.id}`}
            className="text-xs font-medium text-slate-900 hover:underline"
          >
            + New Invoice
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Invoice #</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Issue Date</th>
                <th className="px-6 py-3">Due Date</th>
                <th className="px-6 py-3 text-right">Total Amount</th>
                <th className="px-6 py-3 text-right">Balance Due</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-slate-400">
                    No invoices generated for this client yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-slate-600 capitalize">
                      {inv.invoice_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{inv.invoice_date}</td>
                    <td className="px-6 py-3.5 text-slate-500">{inv.due_date}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                      {formatINR(inv.total_amount)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-semibold text-rose-600">
                      {formatINR(inv.balance_due)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                          inv.status === "paid" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                          inv.status === "partially_paid" && "bg-blue-50 text-blue-700 border border-blue-200",
                          inv.status === "issued" && "bg-amber-50 text-amber-700 border border-amber-200",
                          inv.status === "draft" && "bg-slate-100 text-slate-600",
                          inv.status === "cancelled" && "bg-rose-50 text-rose-700 border border-rose-200"
                        )}
                      >
                        {inv.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Associated Quotations & Estimates */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Quotations & Proposals ({quotations.length})</h2>
          </div>
          <Link
            href={`/quotations/new?customerId=${customer.id}`}
            className="text-xs font-medium text-slate-900 hover:underline"
          >
            + New Quote
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Quote #</th>
                <th className="px-6 py-3">Quote Date</th>
                <th className="px-6 py-3">Valid Until</th>
                <th className="px-6 py-3 text-right">Taxable</th>
                <th className="px-6 py-3 text-right">Total Amount</th>
                <th className="px-6 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No quotations issued to this client yet.
                  </td>
                </tr>
              ) : (
                quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      <Link href={`/quotations/${q.id}`} className="hover:underline">
                        {q.quotation_number}
                      </Link>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">{q.quotation_date}</td>
                    <td className="px-6 py-3.5 text-slate-500">{q.valid_until}</td>
                    <td className="px-6 py-3.5 text-right font-medium text-slate-700">
                      {formatINR(q.taxable_amount)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-bold text-slate-900">
                      {formatINR(q.total_amount)}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider",
                          q.status === "accepted" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                          q.status === "converted" && "bg-indigo-50 text-indigo-700 border border-indigo-200",
                          q.status === "pending" && "bg-amber-50 text-amber-700 border border-amber-200",
                          q.status === "draft" && "bg-slate-100 text-slate-600",
                          q.status === "rejected" && "bg-rose-50 text-rose-700"
                        )}
                      >
                        {q.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Payment History */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Payment History ({payments.length})</h2>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Receipt #</th>
                <th className="px-6 py-3">Payment Date</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">UTR / Ref</th>
                <th className="px-6 py-3 text-right">Amount Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                    No payment receipts on file for this client yet.
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-900 font-mono">{p.payment_number}</td>
                    <td className="px-6 py-3.5 text-slate-500">{p.payment_date}</td>
                    <td className="px-6 py-3.5 text-slate-600 uppercase font-medium">
                      {p.payment_method.replace("_", " ")}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-700">{p.transaction_reference || "N/A"}</td>
                    <td className="px-6 py-3.5 text-right font-bold text-emerald-600">
                      {formatINR(p.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
