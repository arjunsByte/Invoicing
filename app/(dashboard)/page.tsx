import { getInvoices, getPayments, getExpenses, getCustomers } from "@/lib/db/data-store";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [invoices, payments, expenses, customers] = await Promise.all([
    getInvoices(),
    getPayments(),
    getExpenses(),
    getCustomers(),
  ]);

  return (
    <DashboardView
      invoices={invoices}
      payments={payments}
      expenses={expenses}
      customers={customers}
    />
  );
}
