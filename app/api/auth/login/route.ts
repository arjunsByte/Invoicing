import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const ownerEmail = (process.env.OWNER_EMAIL || "owner@qorvalabs.com").trim().toLowerCase();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (email.trim().toLowerCase() !== ownerEmail) {
      return NextResponse.json(
        { error: "Access denied. Only the preconfigured owner of QORVA LABS LLP is authorized to log in." },
        { status: 403 }
      );
    }

    // Never accept a password without a configured identity provider.
    const isLiveSupabase =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder-project") &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes("placeholder");

    if (!isLiveSupabase) {
      return NextResponse.json({ error: "Authentication is not configured." }, { status: 503 });
    }
    {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || data.user?.email?.toLowerCase() !== ownerEmail) {
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }
    }

    return NextResponse.json({ success: true, email: ownerEmail });
  } catch (error) {
    console.error("Login failed", error);
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
