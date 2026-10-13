import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { InboxTable } from "@/components/InboxTable";
import { NewBreakdownForm } from "@/components/NewBreakdownForm";
import { listInquiries } from "@/lib/data";
import { getSession } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const { isAdmin, email } = await getSession();
  if (!isAdmin) redirect("/admin/login");
  const inquiries = await listInquiries();
  return (
    <section className="view">
      <div className="wrap">
        <div className="admin-top">
          <div>
            <p className="eyebrow">Admin</p>
            <h1 className="pageh">Your dashboard</h1>
            <p className="muted" style={{ marginTop: 10, fontSize: ".93rem" }}>
              Signed in as {email}
            </p>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit">Sign out</button>
          </form>
        </div>
        <NewBreakdownForm />
        <InboxTable items={inquiries} />
      </div>
    </section>
  );
}
