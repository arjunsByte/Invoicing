import { NextResponse } from "next/server";
import { getFullBackupDump } from "@/lib/db/data-store";

export async function GET() {
  try {
    const dump = await getFullBackupDump();
    return new NextResponse(JSON.stringify(dump, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="QORVA_LABS_Full_Backup_${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
  }
}
