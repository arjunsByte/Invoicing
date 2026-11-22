import { getCustomers } from "@/lib/db/data-store";
import { CustomersView } from "@/components/customers/customers-view";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const customers = await getCustomers();
  return <CustomersView initialCustomers={customers} />;
}
