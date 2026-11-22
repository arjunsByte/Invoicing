import { NextResponse } from "next/server";
import { getInvoices, getCustomers } from "@/lib/db/data-store";

export async function GET() {
  try {
    const [invoices, customers] = await Promise.all([getInvoices(), getCustomers()]);

    const headers = [
      "Invoice Number",
      "Type",
      "Date",
      "Due Date",
      "Customer",
      "Customer GSTIN",
      "Place of Supply",
      "Taxable Amount",
      "CGST Amount",
      "SGST Amount",
      "IGST Amount",
      "Total Amount",
      "Amount Paid",
      "Balance Due",
      "Status",
    ];

    const rows = invoices.map((inv) => {
      const cust = customers.find((c) => c.id === inv.customer_id);
      const custName = cust ? (cust.company_name || cust.contact_name) : "Customer";

      return [
        `"${inv.invoice_number}"`,
        `"${inv.invoice_type}"`,
        inv.invoice_date,
        inv.due_date,
        `"${custName}"`,
        `"${cust?.gstin || ""}"`,
        `"${inv.place_of_supply || ""}"`,
        inv.taxable_amount,
        inv.cgst_amount,
        inv.sgst_amount,
        inv.igst_amount,
        inv.total_amount,
        inv.amount_paid,
        inv.balance_due,
        `"${inv.status}"`,
      ];
    });

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="QORVA_LABS_Invoices_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
