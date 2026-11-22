import { getInvoices, getCustomers } from "@/lib/db/data-store";
import { InvoicesView } from "@/components/invoices/invoices-view";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const [invoices, customers] = await Promise.all([
    getInvoices(),
    getCustomers(),
  ]);

  return <InvoicesView initialInvoices={invoices} customers={customers} />;
}
