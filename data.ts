import "server-only";
import { cache } from "react";
import { getSession } from "./supabase/server";
import type { Breakdown, Inquiry } from "./types";

const COLUMNS = "id, slug, title, category, tags, description, body, link, files, created_at";

function normalize(row: Record<string, unknown>): Breakdown {
  return {
    id: String(row.id),
    slug: String(row.slug),
    title: String(row.title ?? ""),
    category: String(row.category ?? "Other"),
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    description: (row.description as string) ?? null,
    body: (row.body as string) ?? null,
    link: (row.link as string) ?? null,
    files: Array.isArray(row.files) ? (row.files as Breakdown["files"]) : [],
    created_at: String(row.created_at ?? ""),
  };
}

export async function listBreakdowns() {
  const { supabase, isAdmin } = await getSession();
  if (!supabase) return { posts: [] as Breakdown[], isAdmin, error: "not-configured" as const };
  const { data, error } = await supabase
    .from("breakdowns")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return { posts: [] as Breakdown[], isAdmin, error: "load-failed" as const };
  return { posts: (data ?? []).map(normalize), isAdmin, error: null };
}

// cache() lets the page and its metadata share one database read per request.
export const getBreakdown = cache(async function getBreakdown(slug: string) {
  const { supabase, isAdmin } = await getSession();
  if (!supabase) return { post: null, isAdmin };
  const { data } = await supabase.from("breakdowns").select(COLUMNS).eq("slug", slug).maybeSingle();
  return { post: data ? normalize(data) : null, isAdmin };
});

export async function listInquiries() {
  const { supabase, isAdmin } = await getSession();
  if (!supabase || !isAdmin) return [] as Inquiry[];
  const { data } = await supabase
    .from("inquiries")
    .select("id, type, name, email, business, product, budget, message, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  return (data ?? []) as Inquiry[];
}
