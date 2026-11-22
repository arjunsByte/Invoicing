import { NextRequest, NextResponse } from "next/server";
import { recordPayment } from "@/lib/db/data-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.amount || Number(body.amount) <= 0) {
      return NextResponse.json({ error: "Payment amount must be greater than zero." }, { status: 400 });
    }

    const payment = await recordPayment({
      invoice_id: id,
      amount: Number(body.amount),
      payment_date: body.payment_date || new Date().toISOString().split("T")[0],
      payment_method: body.payment_method || "bank_transfer",
      transaction_reference: body.transaction_reference,
      notes: body.notes,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 400 });
  }
}
