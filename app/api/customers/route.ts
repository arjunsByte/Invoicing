import { NextRequest, NextResponse } from "next/server";
import { getCustomers, createCustomer, deleteCustomer } from "@/lib/db/data-store";

export async function GET() {
  try {
    const customers = await getCustomers();
    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Customer ID is required." }, { status: 400 });
    const success = await deleteCustomer(id);
    if (!success) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Request could not be completed." }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.contact_name) {
      return NextResponse.json({ error: "Contact name is required." }, { status: 400 });
    }

    const created = await createCustomer(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
  }
}
