import { NextRequest, NextResponse } from "next/server";
import { convertQuotationToInvoice } from "@/lib/db/data-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await convertQuotationToInvoice(id);
    return NextResponse.json(invoice, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 400 });
  }
}
