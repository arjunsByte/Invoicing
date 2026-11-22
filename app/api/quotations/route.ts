import { NextRequest, NextResponse } from "next/server";
import { getQuotations, createQuotation } from "@/lib/db/data-store";

export async function GET() {
  try {
    const quotations = await getQuotations();
    return NextResponse.json(quotations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.customer_id) {
      return NextResponse.json({ error: "Customer is required." }, { status: 400 });
    }
    if (!body.items || body.items.length === 0) {
      return NextResponse.json({ error: "Quotation must have at least one line item." }, { status: 400 });
    }

    const created = await createQuotation(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
