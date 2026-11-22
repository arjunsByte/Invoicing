import { getExpenses } from "@/lib/db/data-store";
import { ExpensesView } from "@/components/expenses/expenses-view";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const expenses = await getExpenses();
  return <ExpensesView initialExpenses={expenses} />;
}
