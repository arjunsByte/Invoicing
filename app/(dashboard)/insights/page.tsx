import { getInvoices, getPayments, getExpenses, getCustomers, getProductsServices } from "@/lib/db/data-store";
import { InsightsView } from "@/components/insights/insights-view";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const [invoices, payments, expenses, customers, products] = await Promise.all([
    getInvoices(),
    getPayments(),
    getExpenses(),
    getCustomers(),
    getProductsServices(),
  ]);

  return (
    <InsightsView
      invoices={invoices}
      payments={payments}
      expenses={expenses}
      customers={customers}
      products={products}
    />
  );
}
