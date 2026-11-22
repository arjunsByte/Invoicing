import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const isLiveSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-project");

    if (isLiveSupabase) {
      try {
        const supabase = await createServerSupabaseClient();
        await supabase.auth.signOut();
      } catch (e) {
        // silent
      }
    }

    const cookieStore = await cookies();
    cookieStore.delete("qorva_owner_session");

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Request could not be completed." }, { status: 500 });
  }
}
