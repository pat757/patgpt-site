import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_KEY, SUPABASE_URL, isConfigured } from "@/lib/supabase/env";

// Keeps the admin login session fresh on every page request.
export async function proxy(request: NextRequest) {
  // If Supabase sends a sign-in link to any page other than /auth/confirm (it falls back to
  // the Site URL when the redirect isn't on its allow list), finish the sign-in anyway.
  const { pathname, searchParams } = request.nextUrl;
  if ((searchParams.has("code") || searchParams.has("token_hash")) && pathname !== "/auth/confirm") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/confirm";
    if (!url.searchParams.get("next")) url.searchParams.set("next", "/admin");
    return NextResponse.redirect(url);
  }

  let response = NextResponse.next({ request });
  if (!isConfigured()) return response;

  const hasSession = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasSession) return response; // visitors who never signed in: nothing to refresh

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|pat.jpg|robots.txt|sitemap.xml).*)"],
};
