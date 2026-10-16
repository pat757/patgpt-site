import { publicFileUrl, imageUrl } from "./storage";
import { SUPABASE_URL } from "./supabase/env";

// Turns the plain-text post format into blocks:
//   ## Heading          -> heading
//   ```Optional label   -> start of a prompt box (closed by another ```)
//   ![Caption](path)    -> image, on a line of its own (path is a file in storage, or an https:// link)
//   blank line          -> paragraph break

export type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "img"; src: string; caption: string }
  | { kind: "prompt"; n: number; label: string; text: string };

const IMAGE_LINE = /^!\[([^\]\n]*)\]\(([^)\s]+)\)$/;

/** Reads an image line, or returns null if the line isn't one. */
export function parseImageLine(line: string): { caption: string; src: string } | null {
  const m = line.trim().match(IMAGE_LINE);
  if (!m) return null;
  const src = m[2];
  if (!isStoredImagePath(src) && !/^https:\/\//i.test(src)) return null;
  return { caption: m[1].trim(), src };
}

/** A file this site stored for a post: "<post id>/<file name>". */
export const isStoredImagePath = (src: string) => /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(src);

/** Width and height are written into the stored file name (…-1600x900.webp) so the page doesn't jump while images load. */
export function imageSize(src: string): { width: number; height: number } | null {
  const m = src.match(/-(\d{1,5})x(\d{1,5})\.(?:webp|png|jpe?g|gif)$/i);
  return m ? { width: +m[1], height: +m[2] } : null;
}


export function parseBody(text: string | null | undefined): Block[] {
  const out: Block[] = [];
  const lines = String(text || "").split(/\r?\n/);
  let para: string[] = [];
  let code: string[] | null = null;
  let label = "";
  let n = 0;
  const flush = () => {
    if (para.length) {
      out.push({ kind: "p", text: para.join(" ") });
      para = [];
    }
  };
  const box = () => {
    n++;
    out.push({ kind: "prompt", n, label, text: (code || []).join("\n").replace(/^\n+|\n+$/g, "") });
    code = null;
    label = "";
  };
  for (const line of lines) {
    if (/^```/.test(line.trim())) {
      if (code === null) {
        flush();
        code = [];
        label = line.trim().slice(3).trim();
      } else box();
      continue;
    }
    if (code !== null) {
      code.push(line);
      continue;
    }
    if (/^##\s+/.test(line)) {
      flush();
      out.push({ kind: "h", text: line.replace(/^##\s+/, "") });
      continue;
    }
    const img = parseImageLine(line);
    if (img) {
      flush();
      out.push({ kind: "img", ...img });
      continue;
    }
    if (!line.trim()) {
      flush();
      continue;
    }
    para.push(line.trim());
  }
  if (code !== null) box();
  flush();
  return out;
}


/** The post text without image lines (for word counts and search). */
export const withoutImages = (text: string | null | undefined) =>
  String(text || "")
    .split(/\r?\n/)
    .filter((l) => !parseImageLine(l))
    .join("\n");

// ---------------------------------------------------------------------------
// Posts written in the visual editor are stored as HTML (they start with "<").
// Older posts use the plain-text format above; both keep working.
// ---------------------------------------------------------------------------

export const isHtmlBody = (text: string | null | undefined) => /^\s*</.test(String(text || ""));

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Converts a plain-text post into editor HTML, so older posts open in the visual editor. */
export function legacyToHtml(text: string | null | undefined): string {
  return parseBody(text)
    .map((b) => {
      if (b.kind === "h") return `<h2>${esc(b.text)}</h2>`;
      if (b.kind === "p") return `<p>${esc(b.text)}</p>`;
      if (b.kind === "img") return `<img src="${esc(imageUrl(b.src))}" alt="${esc(b.caption)}">`;
      return `<pre${b.label ? ` data-label="${esc(b.label)}"` : ""}><code>${esc(b.text)}</code></pre>`;
    })
    .join("");
}

const storageBase = () => publicFileUrl("");

/** The storage path for an image URL from this site's storage (or a bare stored path), else null. */
export function storedPathFromUrl(src: string): string | null {
  if (isStoredImagePath(src)) return src;
  const base = storageBase();
  if (!SUPABASE_URL || !src.startsWith(base)) return null;
  try {
    const path = src.slice(base.length).split(/[?#]/)[0].split("/").map(decodeURIComponent).join("/");
    return isStoredImagePath(path) ? path : null;
  } catch {
    return null;
  }
}

/** Images a post may show: https links, or files in this site's storage. */
export const isAllowedImageSrc = (src: string) =>
  /^https:\/\//i.test(src) || isStoredImagePath(src) || (!!SUPABASE_URL && src.startsWith(storageBase()));

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&amp;/g, "&");

function htmlImageSrcs(html: string): string[] {
  return [...html.matchAll(/<img\b[^>]*?\ssrc="([^"]*)"/gi)].map((m) => decodeEntities(m[1]));
}

/** Image files stored on this site that a post uses (either format). */
export function storedImagesIn(text: string | null | undefined): string[] {
  if (isHtmlBody(text)) return htmlImageSrcs(String(text)).flatMap((s) => storedPathFromUrl(s) ?? []);
  return parseBody(text).flatMap((b) => (b.kind === "img" && isStoredImagePath(b.src) ? [b.src] : []));
}

/** The first picture in a post (for link previews), as a URL. */
export function firstImageIn(text: string | null | undefined): string | null {
  if (isHtmlBody(text)) {
    const src = htmlImageSrcs(String(text)).find(isAllowedImageSrc);
    return src ? imageUrl(src) : null;
  }
  const img = parseBody(text).find((b) => b.kind === "img");
  return img && img.kind === "img" ? imageUrl(img.src) : null;
}

/** Just the words of a post (for read time and search). */
export function plainText(text: string | null | undefined): string {
  if (!isHtmlBody(text)) return withoutImages(text);
  return decodeEntities(
    String(text)
      .replace(/<\/(p|h[1-6]|li|pre|blockquote)>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .trim();
}
