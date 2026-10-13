import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE } from "@/lib/site";
import { SUPABASE_KEY, SUPABASE_URL, isConfigured } from "@/lib/supabase/env";

export const revalidate = 3600; // rebuild the sitemap at most once an hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE.url}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE.url}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE.url}/work-with-me`, changeFrequency: "monthly", priority: 0.7 },
  ];
  if (!isConfigured()) return pages;
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
    const { data } = await supabase.from("breakdowns").select("slug, created_at, body, files").limit(1000);
    for (const b of data ?? []) {
      if (b.body || (Array.isArray(b.files) && b.files.length))
        pages.push({ url: `${SITE.url}/breakdowns/${b.slug}`, lastModified: b.created_at, changeFrequency: "monthly", priority: 0.8 });
    }
  } catch {}
  return pages;
}
