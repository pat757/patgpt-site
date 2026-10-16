import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { BreakdownForm } from "@/components/BreakdownForm";
import { getBreakdown } from "@/lib/data";

export const metadata: Metadata = { title: "Edit breakdown", robots: { index: false, follow: false } };

type Props = { params: Promise<{ slug: string }> };

export default async function EditBreakdownPage({ params }: Props) {
  const { slug } = await params;
  const { post, isAdmin } = await getBreakdown(slug);
  if (!isAdmin) redirect("/admin/login");
  if (!post) notFound();
  return (
    <section className="view">
      <div className="wrap">
        <Link className="back" href={`/breakdowns/${post.slug}`}>
          ← Back to the post
        </Link>
        <BreakdownForm post={post} />
      </div>
    </section>
  );
}
