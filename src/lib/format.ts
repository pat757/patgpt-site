import { plainText } from "./body";
import { CATEGORIES } from "./site";
import type { Breakdown, StoredFile } from "./types";

// Fixed locale and time zone so the server and the browser always agree.
const dateFmt = new Intl.DateTimeFormat("en-NZ", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Pacific/Auckland",
});

export const fmtDate = (iso: string | null | undefined) => (iso ? dateFmt.format(new Date(iso)) : "");

export const fmtSize = (bytes: number | null | undefined) => {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
};

export const extOf = (name: string | null | undefined) => {
  const m = String(name || "").match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : "";
};

export const isPdf = (f: Pick<StoredFile, "name" | "type">) => f.type === "application/pdf" || extOf(f.name) === "pdf";

export const isImage = (f: Pick<StoredFile, "name" | "type">) =>
  /^image\/(png|jpeg|gif|webp)$/.test(f.type) || ["png", "jpg", "jpeg", "gif", "webp"].includes(extOf(f.name));

export const catOf = (b: Pick<Breakdown, "category">) =>
  (CATEGORIES as readonly string[]).includes(b.category) ? b.category : "Other";

export const readMins = (b: Pick<Breakdown, "body" | "description">) =>
  Math.max(1, Math.round(`${plainText(b.body)} ${b.description || ""}`.split(/\s+/).filter(Boolean).length / 220));

export const safeUrl = (u: string | null | undefined) => (u && /^https?:\/\//i.test(u) ? u : "");

export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "breakdown"}-${suffix}`;
}

/** Where a list item should send readers. */
export function breakdownHref(b: Pick<Breakdown, "slug" | "body" | "files" | "link">) {
  if (b.body || (b.files && b.files.length)) return `/breakdowns/${b.slug}`;
  return safeUrl(b.link);
}

const TYPE_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  md: "text/markdown",
  txt: "text/plain",
  csv: "text/csv",
  json: "application/json",
};
export function uploadType(file: File) {
  const ext = extOf(file.name);
  if (TYPE_BY_EXT[ext]) return TYPE_BY_EXT[ext];
  return (file.type || "").split(";")[0].trim() || "application/octet-stream";
}

export function safeFileName(name: string) {
  const ext = extOf(name);
  const stem = name.replace(/\.[^.]+$/, "");
  const clean = stem
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return (clean || "file") + (ext ? "." + ext : "");
}

const PLAIN_WORDS = new Set([
  "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "is", "it", "its", "your", "you", "how", "what", "why",
  "with", "into", "actually", "good", "make", "get", "from", "this", "that", "my", "at", "by", "are", "be", "can", "best",
]);

/**
 * Which word of a title gets the orange caption box: the category's name when the title says it, otherwise an
 * acronym or name in capitals (GTA, AI, SEO), otherwise the longest word that isn't filler. -1 for an empty title.
 * Used by the reel, the list and the post heading, so the same word is boxed everywhere and the morph matches.
 */
export function captionKeyword(title: string, category: string): number {
  const words = title.split(/\s+/).filter(Boolean);
  const bare = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cat = bare(category);
  const byCategory = words.findIndex((w) => bare(w) === cat);
  if (byCategory >= 0) return byCategory;
  const capitals = words.findIndex((w) => /^[A-Z0-9]{2,}$/.test(w.replace(/[^A-Za-z0-9]/g, "")) && /[A-Z]/.test(w));
  if (capitals >= 0) return capitals;
  let best = -1;
  let length = 0;
  words.forEach((w, i) => {
    const b = bare(w);
    if (b.length > length && !PLAIN_WORDS.has(b)) {
      best = i;
      length = b.length;
    }
  });
  return best;
}
