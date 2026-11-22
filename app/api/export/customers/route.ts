import { NextResponse } from "next/server";
import { getCustomers } from "@/lib/db/data-store";

export async function GET() {
  try {
    const customers = await getCustomers();

    const headers = [
      "Contact Name",
      "Company Name",
      "Type",
      "Email",
      "Phone",
      "Address",
      "City",
      "State",
      "State Code",
      "PIN Code",
      "GSTIN",
      "PAN",
      "Total Invoiced",
      "Total Paid",
      "Outstanding Balance",
    ];

    const rows = customers.map((c) => [
      `"${c.contact_name}"`,
      `"${c.company_name || ""}"`,
      `"${c.customer_type}"`,
      `"${c.email || ""}"`,
      `"${c.phone || ""}"`,
      `"${c.billing_address || ""}"`,
      `"${c.billing_city || ""}"`,
      `"${c.billing_state || ""}"`,
      `"${c.billing_state_code || ""}"`,
      `"${c.billing_pincode || ""}"`,
      `"${c.gstin || ""}"`,
      `"${c.pan || ""}"`,
      c.total_sales || 0,
      c.total_paid || 0,
      c.outstanding_balance || 0,
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="QORVA_LABS_Customers_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
  }
}
