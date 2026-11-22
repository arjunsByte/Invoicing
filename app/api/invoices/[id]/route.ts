import { NextRequest, NextResponse } from "next/server";
import { getInvoiceById, updateInvoice, cancelInvoice } from "@/lib/db/data-store";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    return NextResponse.json(invoice);
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.action === "cancel") {
      const cancelled = await cancelInvoice(id, body.reason || "Cancelled by owner");
      return NextResponse.json(cancelled);
    }

    const allowedUpdates = {
      ...(typeof body.notes === "string" ? { notes: body.notes } : {}),
      ...(typeof body.terms_and_conditions === "string" ? { terms_and_conditions: body.terms_and_conditions } : {}),
      ...(typeof body.due_date === "string" ? { due_date: body.due_date } : {}),
    };
    if (!Object.keys(allowedUpdates).length) {
      return NextResponse.json({ error: "No editable invoice fields supplied." }, { status: 400 });
    }
    const updated = await updateInvoice(id, allowedUpdates);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 400 });
  }
}
