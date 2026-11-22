import { getQuotations, getCustomers } from "@/lib/db/data-store";
import { QuotationsView } from "@/components/quotations/quotations-view";

export const dynamic = "force-dynamic";

export default async function QuotationsPage() {
  const [quotations, customers] = await Promise.all([
    getQuotations(),
    getCustomers(),
  ]);

  return <QuotationsView initialQuotations={quotations} customers={customers} />;
}
