import { NextRequest, NextResponse } from "next/server";
import { getCompanySettings, updateCompanySettings } from "@/lib/db/data-store";

export async function GET() {
  try {
    const settings = await getCompanySettings();
    return NextResponse.json(settings);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = await updateCompanySettings(body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
