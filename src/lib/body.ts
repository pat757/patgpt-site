// Turns the plain-text post format into blocks:
//   ## Heading          -> heading
//   ```Optional label   -> start of a prompt box (closed by another ```)
//   blank line          -> paragraph break

export type Block =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "prompt"; n: number; label: string; text: string };

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
