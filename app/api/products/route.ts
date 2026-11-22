import { NextRequest, NextResponse } from "next/server";
import { getProductsServices, createProductService, updateProductService } from "@/lib/db/data-store";

export async function GET() {
  try {
    const products = await getProductsServices();
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name) {
      return NextResponse.json({ error: "Product/Service name is required." }, { status: 400 });
    }
    const created = await createProductService(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
  }
}
