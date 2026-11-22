import { NextRequest, NextResponse } from "next/server";
import { getInvoices, createInvoice, getCompanySettings } from "@/lib/db/data-store";

export async function GET() {
  try {
    const invoices = await getInvoices();
    return NextResponse.json(invoices);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.customer_id) {
      return NextResponse.json({ error: "Customer selection is required." }, { status: 400 });
    }
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: "Invoice must have at least one line item." }, { status: 400 });
    }

    // Check company GST registration
    const companySettings = await getCompanySettings();
    if (body.invoice_type === "gst_tax_invoice" && !companySettings.is_gst_registered) {
      return NextResponse.json(
        {
          error:
            "GST Tax Invoices cannot be issued because QORVA LABS LLP is currently set to Non-GST registered. Please enable GST registration in Settings or issue a Non-GST Commercial Invoice.",
        },
        { status: 400 }
      );
    }

    const created = await createInvoice(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
