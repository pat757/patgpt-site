"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ViewTransition, addTransitionType, startTransition, useEffect, useMemo, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/site";
import { plainText, promptCount } from "@/lib/body";
import { breakdownHref, catOf, fmtDate, isPdf, readMins } from "@/lib/format";
import { deleteBreakdown } from "@/lib/admin-actions";
import type { Breakdown } from "@/lib/types";
import { Arrow } from "./Arrow";
import { ConfirmButton } from "./ConfirmButton";

function SmartLink({ href, className, children }: { href: string; className?: string; children: React.ReactNode }) {
  if (href.startsWith("/"))
    return (
      // Full prefetch so the post page is ready when tapped, which lets its title morph in (see ViewTransition below).
      <Link href={href} className={className} prefetch>
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
  // `query` is what's in the search box; `applied` is what the list is filtered by. Keeping them apart lets
  // typing stay instant while the list glides to its new order a moment later.
  const [query, setQuery] = useState("");
  const [applied, setApplied] = useState("");
  const typing = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (typing.current) clearTimeout(typing.current);
  }, []);

  // The chosen chip and search live in the address bar (?cat=…&q=…), so coming back from a post, or opening a
  // shared link, lands on the same filtered list. Read once on first load, then kept in step.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get("cat");
    const q = params.get("q") ?? "";
    if (c && (CATEGORIES as readonly string[]).includes(c)) setCat(c);
    if (q) {
      setQuery(q);
      setApplied(q);
    }
  }, []);
  // Skip the very first run: it happens before the restored values above take effect and would wipe them.
  const synced = useRef(false);
  useEffect(() => {
    if (!synced.current) {
      synced.current = true;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (cat === "All") params.delete("cat");
    else params.set("cat", cat);
    if (applied.trim()) params.set("q", applied.trim());
    else params.delete("q");
    const next = params.toString();
    if (next !== window.location.search.replace(/^\?/, "")) {
      window.history.replaceState(null, "", next ? `?${next}` : window.location.pathname);
    }
  }, [cat, applied]);

  // Filter changes run as a "filter" transition: the cards glide, enter and leave (styles in globals.css).
  const filterTo = (change: () => void) =>
    startTransition(() => {
      addTransitionType("filter");
      change();
    });
  const onType = (v: string) => {
    setQuery(v);
    if (typing.current) clearTimeout(typing.current);
    typing.current = setTimeout(() => filterTo(() => setApplied(v)), 220);
  };

  const shown = useMemo(() => {
    const q = applied.trim().toLowerCase();
    return posts.filter(
      (p) =>
        (cat === "All" || catOf(p) === cat) &&
        (!q || [p.title, p.description, plainText(p.body), p.tags.join(" "), p.category].join(" ").toLowerCase().includes(q)),
    );
  }, [posts, cat, applied]);

  // Only offer categories that have posts, and skip the row entirely when there's nothing to choose between.
  const used = CATEGORIES.filter((c) => posts.some((p) => catOf(p) === c));
  const showChips = used.length > 1;
  const reset = () => {
    if (typing.current) clearTimeout(typing.current);
    setQuery("");
    filterTo(() => {
      setCat("All");
      setApplied("");
    });
  };

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
          onChange={(e) => onType(e.target.value)}
        />
      </div>
      {showChips && (
        <div className="chips" role="group" aria-label="Filter by category">
          {["All", ...used].map((c) => (
            <button key={c} className="chip" type="button" aria-pressed={cat === c} onClick={() => filterTo(() => setCat(c))}>
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="listhead">
        <h2>Latest breakdowns</h2>
        <span className="listhead-r">
          {isAdmin && (
            <Link className="new" href="/admin">
              + New breakdown
            </Link>
          )}
          <span>
            {shown.length} {shown.length === 1 ? "breakdown" : "breakdowns"}
          </span>
        </span>
      </div>

      {/* A short spoken update instead of re-reading every card whenever the filter changes. */}
      <p className="sr" role="status">
        {!error && posts.length
          ? `${shown.length} ${shown.length === 1 ? "breakdown" : "breakdowns"}${cat !== "All" ? ` in ${cat}` : ""}${
              applied.trim() ? ` matching “${applied.trim()}”` : ""
            }`
          : ""}
      </p>
      <div>
        {error === "not-configured" ? (
          <p className="empty">Breakdowns aren&apos;t available right now. Check back soon.</p>
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
          <p className="empty">
            Nothing matches that.{" "}
            <button type="button" className="linkish" onClick={reset}>
              Show all breakdowns
            </button>
          </p>
        ) : (
          shown.map((p) => {
            const href = breakdownHref(p);
            const pdfs = p.files.filter(isPdf).length;
            const action = p.body ? "Read" : pdfs ? "View PDF" : p.files.length ? "View" : "Open";
            const prompts = promptCount(p.body);
            const category = catOf(p);
            const tags = p.tags.filter((t) => t.trim().toLowerCase() !== category.toLowerCase());
            return (
              // Each card glides, enters and leaves only during filter transitions; on page navigation it stays put
              // while its pill and title morph into the post page's (matching names on breakdowns/[slug]/page.tsx).
              <ViewTransition
                key={p.id}
                enter={{ filter: "card-in", default: "none" }}
                exit={{ filter: "card-out", default: "none" }}
                update={{ filter: "card-move", default: "none" }}
                default="none"
              >
              <article className="post">
                <div className="meta">
                  <ViewTransition name={`bd-cat-${p.id}`} share="morph" default="none">
                    <span className="pill">{category}</span>
                  </ViewTransition>
                  {tags.map((t) => (
                    <span key={t}>{t}</span>
                  ))}
                </div>
                <ViewTransition name={`bd-title-${p.id}`} share="morph" default="none">
                  <h3>{href ? <SmartLink href={href}>{p.title}</SmartLink> : p.title}</h3>
                </ViewTransition>
                {p.description && <p className="ex">{p.description}</p>}
                <div className="foot">
                  <span>
                    {fmtDate(p.created_at)}
                    {p.body ? ` · ${readMins(p)} min read` : ""}
                    {pdfs ? ` · ${pdfs} ${pdfs === 1 ? "PDF" : "PDFs"}` : ""}
                    {prompts ? (
                      <>
                        {" · "}
                        <span className="has-prompt">
                          {prompts === 1 ? "Prompt to copy" : `${prompts} prompts to copy`}
                        </span>
                      </>
                    ) : null}
                  </span>
                  <span className="foot-r">
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
                        {action} <Arrow />
                      </SmartLink>
                    )}
                  </span>
                </div>
              </article>
              </ViewTransition>
            );
          })
        )}
      </div>
    </>
  );
}
