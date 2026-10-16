"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CATEGORIES } from "@/lib/site";
import { plainText } from "@/lib/body";
import { breakdownHref, catOf, fmtDate, isPdf, readMins } from "@/lib/format";
import { deleteBreakdown } from "@/lib/admin-actions";
import type { Breakdown } from "@/lib/types";
import { ConfirmButton } from "./ConfirmButton";

function SmartLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  if (href.startsWith("/"))
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  return (
    <a href={href} className={className} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}

export function BreakdownList({ posts, isAdmin, error }: { posts: Breakdown[]; isAdmin: boolean; error: string | null }) {
  const router = useRouter();
  const [cat, setCat] = useState<string>("All");
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter(
      (p) =>
        (cat === "All" || catOf(p) === cat) &&
        (!q || [p.title, p.description, plainText(p.body), p.tags.join(" "), p.category].join(" ").toLowerCase().includes(q)),
    );
  }, [posts, cat, query]);

  return (
    <>
      <div className="searchbox">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          placeholder="Search prompts, tools and tips…"
          aria-label="Search prompts, tools and tips"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="chips" role="group" aria-label="Filter by category">
        {["All", ...CATEGORIES].map((c) => (
          <button key={c} className="chip" type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {c}
          </button>
        ))}
      </div>

      <div className="listhead">
        <h2>Latest breakdowns</h2>
        <span className="listhead-r">
          {isAdmin && (
            <Link className="new" href="/admin">
              + New breakdown
            </Link>
          )}
          <span>
            {shown.length} {shown.length === 1 ? "article" : "articles"}
          </span>
        </span>
      </div>

      <div aria-live="polite">
        {error === "not-configured" ? (
          <p className="empty">The site isn&apos;t connected to its database yet. Follow the setup guide in the README.</p>
        ) : error ? (
          <p className="empty">Breakdowns couldn&apos;t load right now. Refresh to try again.</p>
        ) : !posts.length ? (
          <p className="empty">
            {isAdmin ? (
              <>
                No breakdowns yet. <Link href="/admin">Publish your first one</Link>.
              </>
            ) : (
              "The first breakdowns land here soon."
            )}
          </p>
        ) : !shown.length ? (
          <p className="empty">Nothing matches that. Try another search or pick All.</p>
        ) : (
          shown.map((p) => {
            const href = breakdownHref(p);
            const pdfs = p.files.filter(isPdf).length;
            const action = p.body ? "Read" : pdfs ? "View PDF" : p.files.length ? "View" : "Open";
            return (
              <article className="post" key={p.id}>
                <div className="meta">
                  <span className="pill">{catOf(p)}</span>
                  {p.tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <h3>{href ? <SmartLink href={href}>{p.title}</SmartLink> : p.title}</h3>
                {p.description && <p className="ex">{p.description}</p>}
                <div className="foot">
                  <span>
                    {fmtDate(p.created_at)}
                    {p.body ? ` · ${readMins(p)} min read` : ""}
                    {pdfs ? ` · ${pdfs} ${pdfs === 1 ? "PDF" : "PDFs"}` : ""}
                  </span>
                  <span style={{ display: "flex", gap: 18, alignItems: "center" }}>
                    {isAdmin && (
                      <Link className="edit" href={`/breakdowns/${p.slug}/edit`}>
                        Edit
                      </Link>
                    )}
                    {isAdmin && (
                      <ConfirmButton
                        label="Delete"
                        question="Delete for everyone?"
                        confirmLabel="Delete"
                        busyLabel="Deleting…"
                        onConfirm={async () => {
                          await deleteBreakdown(
                            p.id,
                            p.files.map((f) => f.path),
                          );
                          router.refresh();
                        }}
                      />
                    )}
                    {href && (
                      <SmartLink href={href} className="read">
                        {action} <span aria-hidden="true">→</span>
                      </SmartLink>
                    )}
                  </span>
                </div>
              </article>
            );
          })
        )}
      </div>
    </>
  );
}
