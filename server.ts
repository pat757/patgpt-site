import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { SITE } from "@/lib/site";
import { SUPABASE_KEY, SUPABASE_URL, isConfigured } from "./env";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // The proxy refreshes the session, so this is safe to ignore.
        }
      },
    },
  });
}

/** Returns the Supabase client and whether the signed-in person is the site admin. */
export async function getSession() {
  await connection(); // always render per request: posts and admin state must be live
  if (!isConfigured()) return { supabase: null, isAdmin: false, email: null as string | null };
  const supabase = await createClient();
  let email: string | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    email = (data?.claims?.email as string | undefined) ?? null;
  } catch {
    email = null;
  }
  const isAdmin = !!email && email.toLowerCase() === SITE.adminEmail.toLowerCase();
  return { supabase, isAdmin, email };
}
