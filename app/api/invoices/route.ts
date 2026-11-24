import { NextRequest, NextResponse } from "next/server";
import { getInvoices, createInvoice, getCompanySettings } from "@/lib/db/data-store";

export async function GET() {
  try {
    const invoices = await getInvoices();
    return NextResponse.json(invoices);
  } catch (error: unknown) {
    console.error("Invoice list failed", error);
    const message = error instanceof Error ? error.message : "Request could not be completed.";
    return NextResponse.json({ error: message }, { status: 500 });
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

    const created = await createInvoice({
      customer_id: body.customer_id,
      invoice_type: body.invoice_type,
      quotation_id: body.quotation_id,
      invoice_date: body.invoice_date,
      due_date: body.due_date,
      status: body.status === "issued" ? "issued" : "draft",
      place_of_supply: body.place_of_supply,
      place_of_supply_state_code: body.place_of_supply_state_code,
      is_interstate: body.is_interstate === true,
      reverse_charge: body.reverse_charge === true,
      currency: body.currency,
      discount_type: body.discount_type,
      discount_value: body.discount_value,
      notes: body.notes,
      terms_and_conditions: body.terms_and_conditions,
      items: body.items,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    console.error("Invoice creation failed", error);
    const message = error instanceof Error ? error.message : "Request could not be completed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
