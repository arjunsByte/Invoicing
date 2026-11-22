import { notFound } from "next/navigation";
import { getInvoiceById, getPayments, getCompanySettings } from "@/lib/db/data-store";
import { InvoiceDetailView } from "@/components/invoices/invoice-detail-view";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invoice, allPayments, companySettings] = await Promise.all([
    getInvoiceById(id),
    getPayments(),
    getCompanySettings(),
  ]);

  if (!invoice) {
    notFound();
  }

  const invoicePayments = allPayments.filter((p) => p.invoice_id === id);

  return (
    <InvoiceDetailView
      invoice={invoice}
      payments={invoicePayments}
      companySettings={companySettings}
    />
  );
}
