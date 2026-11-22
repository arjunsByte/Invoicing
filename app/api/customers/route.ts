import { NextRequest, NextResponse } from "next/server";
import { getCustomers, createCustomer } from "@/lib/db/data-store";

export async function GET() {
  try {
    const customers = await getCustomers();
    return NextResponse.json(customers);
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
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
