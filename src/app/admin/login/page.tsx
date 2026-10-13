import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { isAdmin } = await getSession();
  if (isAdmin) redirect("/admin");
  const { error } = await searchParams;
  return (
    <section className="view">
      <div className="wrap login">
        <p className="eyebrow">Admin</p>
        <h1 className="pageh">Sign in</h1>
        <p className="muted" style={{ margin: "18px 0 28px" }}>
          Enter your admin email and you&apos;ll get a link that signs you in.
        </p>
        <LoginForm error={error} />
      </div>
    </section>
  );
}
