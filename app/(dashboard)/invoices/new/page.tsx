import { getCompanySettings, getCustomers, getProductsServices } from "@/lib/db/data-store";
import { InvoiceForm } from "@/components/invoices/invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const [settings, customers, products] = await Promise.all([
    getCompanySettings(),
    getCustomers(),
    getProductsServices(),
  ]);

  return (
    <InvoiceForm
      companySettings={settings}
      customers={customers}
      products={products}
    />
  );
}
