import { NextRequest, NextResponse } from "next/server";
import { getExpenses, createExpense, deleteExpense } from "@/lib/db/data-store";

export async function GET() {
  try {
    const expenses = await getExpenses();
    return NextResponse.json(expenses);
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.vendor_name) {
      return NextResponse.json({ error: "Vendor name is required." }, { status: 400 });
    }
    if (!body.total_amount || Number(body.total_amount) <= 0) {
      return NextResponse.json({ error: "Total amount must be greater than zero." }, { status: 400 });
    }

    const created = await createExpense({
      category: body.category || "software_subscriptions",
      vendor_name: body.vendor_name,
      vendor_gstin: body.vendor_gstin,
      expense_date: body.expense_date || new Date().toISOString().split("T")[0],
      description: body.description,
      taxable_amount: Number(body.taxable_amount) || Number(body.total_amount),
      gst_amount: Number(body.gst_amount) || 0,
      total_amount: Number(body.total_amount),
      payment_method: body.payment_method || "bank_transfer",
      receipt_url: body.receipt_url,
      notes: body.notes,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Expense ID is required" }, { status: 400 });
    }
    const success = await deleteExpense(id);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
  }
}
