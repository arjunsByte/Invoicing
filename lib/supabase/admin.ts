import { createClient } from "@supabase/supabase-js";

/** Server-only Supabase client for trusted application data operations. */
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isPlaceholder = (value: string | undefined) =>
    !value || /placeholder|your-project|\.\.\./i.test(value);

  if (!url || !serviceRoleKey || isPlaceholder(url) || isPlaceholder(serviceRoleKey)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the deployment environment."
      );
    }
    return null;
  }

  // Supabase legacy service-role keys are JWTs with role=service_role. The
  // newer server-side secret keys use the sb_secret_ prefix instead.
  if (serviceRoleKey.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY contains a publishable/anon key. Set the server-side service_role or sb_secret_ key in the deployment environment."
    );
  }
  if (!serviceRoleKey.startsWith("sb_secret_")) {
    try {
      const payload = JSON.parse(Buffer.from(serviceRoleKey.split(".")[1], "base64url").toString("utf8"));
      if (payload.role !== "service_role") {
        throw new Error(
          `SUPABASE_SERVICE_ROLE_KEY has role '${payload.role || "unknown"}', not 'service_role'. Set the server-side service role key in the deployment environment.`
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("SUPABASE_SERVICE_ROLE_KEY")) throw error;
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not a recognized service role JWT or sb_secret_ key. Copy the server-side key from the matching Supabase project."
      );
    }
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
