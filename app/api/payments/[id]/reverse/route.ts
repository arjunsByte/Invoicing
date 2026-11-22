import { NextRequest, NextResponse } from "next/server";
import { reversePayment } from "@/lib/db/data-store";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.reason) {
      return NextResponse.json({ error: "Reversal reason is required." }, { status: 400 });
    }

    const reversed = await reversePayment(id, body.reason);
    return NextResponse.json(reversed);
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 400 });
  }
}
