import { getPayments } from "@/lib/db/data-store";
import { PaymentsView } from "@/components/payments/payments-view";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const payments = await getPayments();
  return <PaymentsView initialPayments={payments} />;
}
