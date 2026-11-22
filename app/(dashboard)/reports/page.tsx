import { getInvoices, getPayments, getExpenses, getCustomers } from "@/lib/db/data-store";
import { ReportsView } from "@/components/reports/reports-view";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const [invoices, payments, expenses, customers] = await Promise.all([
    getInvoices(),
    getPayments(),
    getExpenses(),
    getCustomers(),
  ]);

  return (
    <ReportsView
      invoices={invoices}
      payments={payments}
      expenses={expenses}
      customers={customers}
    />
  );
}
