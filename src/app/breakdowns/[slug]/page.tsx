import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostBody } from "@/components/PostBody";
import { PostFiles } from "@/components/PostFiles";
import { getBreakdown } from "@/lib/data";
import { parseBody } from "@/lib/body";
import { catOf, fmtDate, isImage, isPdf, readMins } from "@/lib/format";
import { imageUrl } from "@/lib/storage";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { post } = await getBreakdown(slug);
  if (!post) return { title: "Breakdown not found" };
  const description = post.description || `A ${catOf(post)} breakdown from PatGPT.`;
  // The first picture in the post becomes the preview image when the link is shared.
  const firstInText = parseBody(post.body).find((b) => b.kind === "img");
  const firstAttached = post.files.find((f) => !isPdf(f) && isImage(f));
  const cover = firstInText?.kind === "img" ? imageUrl(firstInText.src) : firstAttached ? imageUrl(firstAttached.path) : null;
  return {
    title: post.title,
    description,
    alternates: { canonical: `/breakdowns/${post.slug}` },
    openGraph: {
      type: "article",
      title: post.title,
      description,
      url: `/breakdowns/${post.slug}`,
      publishedTime: post.created_at,
      ...(cover ? { images: [cover] } : {}),
    },
    ...(cover ? { twitter: { card: "summary_large_image", title: post.title, description, images: [cover] } } : {}),
  };
}

export default async function BreakdownPage({ params }: Props) {
  const { slug } = await params;
  const { post, isAdmin } = await getBreakdown(slug);
  if (!post) notFound();
  const pdfCount = post.files.filter(isPdf).length;

  return (
    <section className="view">
      <div className="wrap article">
        <Link className="back" href="/">
          ← All breakdowns
        </Link>
        <div className="meta" style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", fontSize: ".85rem", color: "var(--muted)" }}>
          <span className="pill">{catOf(post)}</span>
          {post.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <h1>{post.title}</h1>
        {post.description && <p className="lead">{post.description}</p>}
        <p className="muted" style={{ marginTop: 14, fontSize: ".9rem" }}>
          {fmtDate(post.created_at)}
          {post.body ? ` · ${readMins(post)} min read` : ""}
          {pdfCount ? ` · ${pdfCount} ${pdfCount === 1 ? "PDF" : "PDFs"}` : ""}
        </p>
        {post.body && <PostBody text={post.body} />}
        <PostFiles post={post} isAdmin={isAdmin} />
      </div>
    </section>
  );
}
