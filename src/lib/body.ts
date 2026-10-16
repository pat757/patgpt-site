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

export const imageLine = (src: string, caption = "") => `![${caption.replace(/[\]\n]/g, " ")}](${src})`;

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

/** Image files stored on this site that the post text uses. */
export function storedImagesIn(text: string | null | undefined): string[] {
  return parseBody(text).flatMap((b) => (b.kind === "img" && isStoredImagePath(b.src) ? [b.src] : []));
}

/** The post text without image lines (for word counts and search). */
export const withoutImages = (text: string | null | undefined) =>
  String(text || "")
    .split(/\r?\n/)
    .filter((l) => !parseImageLine(l))
    .join("\n");
