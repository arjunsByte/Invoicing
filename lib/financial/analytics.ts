import { Invoice, Payment, Expense, Customer } from "@/lib/types/database";
import { startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear, parseISO, isAfter, isBefore, isSameDay } from "date-fns";

export type DateFilterType = "today" | "this_week" | "this_month" | "this_quarter" | "this_year" | "all" | "custom";

export interface DashboardMetrics {
  totalSales: number;
  totalGstSales: number;
  totalNonGstSales: number;
  totalReceived: number; // Actual cash collected
  outstandingPayments: number;
  overdueCount: number;
  overdueAmount: number;
  totalExpenses: number;
  totalGstInputCredit: number; // GST paid on business expenses
  netCashFlow: number; // Collections minus expenses
  netAccountingProfit: number; // Invoiced sales minus expenses
  salesGrowthPercent: number;
  invoiceCount: number;
  paidInvoiceCount: number;
  unpaidInvoiceCount: number;
  averageInvoiceValue: number;
  monthlyTrend: {
    month: string;
    sales: number;
    gstSales: number;
    nonGstSales: number;
    collections: number;
    expenses: number;
  }[];
  topCustomers: {
    id: string;
    name: string;
    revenue: number;
    invoiceCount: number;
  }[];
  recentInvoices: Invoice[];
  recentPayments: Payment[];
}

export function filterByDateRange<T extends { dateStr: string }>(
  items: T[],
  filter: DateFilterType,
  customStart?: string,
  customEnd?: string
): T[] {
  const now = new Date();
  let startDate: Date;

  if (filter === "today") {
    startDate = startOfDay(now);
  } else if (filter === "this_week") {
    startDate = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  } else if (filter === "this_month") {
    startDate = startOfMonth(now);
  } else if (filter === "this_quarter") {
    startDate = startOfQuarter(now);
  } else if (filter === "this_year") {
    startDate = startOfYear(now);
  } else if (filter === "custom" && customStart) {
    startDate = parseISO(customStart);
  } else {
    return items;
  }

  const endDate = filter === "custom" && customEnd ? parseISO(customEnd) : now;

  return items.filter((item) => {
    try {
      const d = parseISO(item.dateStr);
      return (isAfter(d, startDate) || isSameDay(d, startDate)) && (isBefore(d, endDate) || isSameDay(d, endDate));
    } catch {
      return true;
    }
  });
}

export function computeDashboardMetrics(
  invoices: Invoice[],
  payments: Payment[],
  expenses: Expense[],
  customers: Customer[],
  filter: DateFilterType = "this_month",
  customStart?: string,
  customEnd?: string
): DashboardMetrics {
  const validInvoices = invoices.filter((i) => i.status !== "cancelled");
  const validPayments = payments.filter((p) => !p.is_reversed);

  // Map with dateStr for filtering
  const mappedInvoices = validInvoices.map((i) => ({ ...i, dateStr: i.invoice_date }));
  const mappedPayments = validPayments.map((p) => ({ ...p, dateStr: p.payment_date }));
  const mappedExpenses = expenses.map((e) => ({ ...e, dateStr: e.expense_date }));

  const filteredInvoices = filterByDateRange(mappedInvoices, filter, customStart, customEnd);
  const filteredPayments = filterByDateRange(mappedPayments, filter, customStart, customEnd);
  const filteredExpenses = filterByDateRange(mappedExpenses, filter, customStart, customEnd);

  // Aggregations
  let totalSales = 0;
  let totalGstSales = 0;
  let totalNonGstSales = 0;
  let paidInvoiceCount = 0;
  let unpaidInvoiceCount = 0;

  filteredInvoices.forEach((inv) => {
    const amt = Number(inv.total_amount) || 0;
    totalSales += amt;
    if (inv.invoice_type === "gst_tax_invoice") {
      totalGstSales += amt;
    } else {
      totalNonGstSales += amt;
    }
    if (inv.status === "paid") {
      paidInvoiceCount++;
    } else {
      unpaidInvoiceCount++;
    }
  });

  const totalReceived = filteredPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  const totalExpenses = filteredExpenses.reduce((acc, e) => acc + (Number(e.total_amount) || 0), 0);
  const totalGstInputCredit = filteredExpenses.reduce((acc, e) => acc + (Number(e.gst_amount) || 0), 0);

  // Outstanding across all active invoices
  const outstandingPayments = validInvoices.reduce((acc, inv) => acc + (Number(inv.balance_due) || 0), 0);

  // Overdue check
  const todayStr = new Date().toISOString().split("T")[0];
  const overdueInvoices = validInvoices.filter(
    (inv) => inv.due_date < todayStr && inv.status !== "paid" && inv.balance_due > 0
  );
  const overdueCount = overdueInvoices.length;
  const overdueAmount = overdueInvoices.reduce((acc, inv) => acc + (Number(inv.balance_due) || 0), 0);

  // Cash collections vs Accounting profit
  const netCashFlow = totalReceived - totalExpenses;
  const netAccountingProfit = totalSales - totalExpenses;

  const invoiceCount = filteredInvoices.length;
  const averageInvoiceValue = invoiceCount > 0 ? Math.round(totalSales / invoiceCount) : 0;

  // Monthly trends (Last 6-12 months for visual charts)
  const monthMap: Record<string, { sales: number; gstSales: number; nonGstSales: number; collections: number; expenses: number }> = {};
  
  // Initialize last 6 months
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    monthMap[key] = { sales: 0, gstSales: 0, nonGstSales: 0, collections: 0, expenses: 0 };
  }

  validInvoices.forEach((inv) => {
    const d = parseISO(inv.invoice_date);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    if (monthMap[key]) {
      const amt = Number(inv.total_amount) || 0;
      monthMap[key].sales += amt;
      if (inv.invoice_type === "gst_tax_invoice") {
        monthMap[key].gstSales += amt;
      } else {
        monthMap[key].nonGstSales += amt;
      }
    }
  });

  validPayments.forEach((p) => {
    const d = parseISO(p.payment_date);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    if (monthMap[key]) {
      monthMap[key].collections += Number(p.amount) || 0;
    }
  });

  expenses.forEach((e) => {
    const d = parseISO(e.expense_date);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    if (monthMap[key]) {
      monthMap[key].expenses += Number(e.total_amount) || 0;
    }
  });

  const monthlyTrend = Object.entries(monthMap).map(([month, data]) => ({
    month,
    ...data,
  }));

  // Top Customers
  const customerRevenueMap: Record<string, { name: string; revenue: number; count: number }> = {};
  validInvoices.forEach((inv) => {
    const custId = inv.customer_id;
    const cust = customers.find((c) => c.id === custId);
    const name = cust ? (cust.company_name || cust.contact_name) : "Customer";
    if (!customerRevenueMap[custId]) {
      customerRevenueMap[custId] = { name, revenue: 0, count: 0 };
    }
    customerRevenueMap[custId].revenue += Number(inv.total_amount) || 0;
    customerRevenueMap[custId].count += 1;
  });

  const topCustomers = Object.entries(customerRevenueMap)
    .map(([id, data]) => ({ id, name: data.name, revenue: data.revenue, invoiceCount: data.count }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Sales growth mock comparison
  const salesGrowthPercent = 14.8; // e.g. Positive growth rate

  return {
    totalSales,
    totalGstSales,
    totalNonGstSales,
    totalReceived,
    outstandingPayments,
    overdueCount,
    overdueAmount,
    totalExpenses,
    totalGstInputCredit,
    netCashFlow,
    netAccountingProfit,
    salesGrowthPercent,
    invoiceCount,
    paidInvoiceCount,
    unpaidInvoiceCount,
    averageInvoiceValue,
    monthlyTrend,
    topCustomers,
    recentInvoices: validInvoices.slice(0, 5),
    recentPayments: validPayments.slice(0, 5),
  };
}
