import { NextResponse, type NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that do not require owner session
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/unauthorized") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check for owner session cookie or Supabase auth token
  const ownerSession = request.cookies.get("qorva_owner_session");
  const supabaseToken = request.cookies.get("sb-access-token") || request.cookies.get("supabase-auth-token");

  // In production or when authenticated, verify session
  // If no session exists, redirect to private owner login
  if (!ownerSession && !supabaseToken) {
    // For local development convenience if first load, we can redirect to /login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
