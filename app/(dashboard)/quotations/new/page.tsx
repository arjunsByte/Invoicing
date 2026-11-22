import { getCompanySettings, getCustomers, getProductsServices } from "@/lib/db/data-store";
import { QuotationForm } from "@/components/quotations/quotation-form";

export const dynamic = "force-dynamic";

export default async function NewQuotationPage() {
  const [settings, customers, products] = await Promise.all([
    getCompanySettings(),
    getCustomers(),
    getProductsServices(),
  ]);

  return (
    <QuotationForm
      companySettings={settings}
      customers={customers}
      products={products}
    />
  );
}
