"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CATEGORIES } from "@/lib/site";
import { extOf, fmtSize, slugify } from "@/lib/format";
import { checkFiles, removeStoredFiles, uploadFiles } from "@/lib/admin-actions";
import { getBrowserClient } from "@/lib/supabase/client";

const ACCEPT = ".pdf,application/pdf,.md,.txt,.csv,.json,image/*,video/mp4,video/webm";

export function NewBreakdownForm() {
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [pending, setPending] = useState<File[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ cls: "" | "ok" | "err"; text: string; href?: string }>({ cls: "", text: "" });

  const addFiles = (list: File[]) => {
    const problem = checkFiles(list, pending.length);
    if (problem) return setStatus({ cls: "err", text: problem });
    setStatus({ cls: "", text: "" });
    setPending((p) => p.concat(list));
  };

  const insertPrompt = () => {
    const ta = bodyRef.current;
    if (!ta) return;
    const a = ta.selectionStart;
    const z = ta.selectionEnd;
    const v = ta.value;
    const picked = v.slice(a, z).trim();
    const inner = picked || "Paste your prompt here";
    const before = v.slice(0, a);
    const pre = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    ta.value = before + pre + "```\n" + inner + "\n```\n\n" + v.slice(z);
    const start = a + pre.length + 4;
    ta.focus();
    ta.setSelectionRange(start, start + inner.length);
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") || "").trim();
    const body = String(fd.get("body") || "").trim();
    const link = String(fd.get("link") || "").trim();
    if (!pending.length && !link && !body)
      return setStatus({ cls: "err", text: "Write the post, attach a PDF or add a link so readers have something to open." });

    setBusy(true);
    const id = crypto.randomUUID();
    let uploaded: Awaited<ReturnType<typeof uploadFiles>> = [];
    try {
      if (pending.length)
        uploaded = await uploadFiles(id, pending, (i, f) =>
          setStatus({ cls: "", text: `Uploading ${i + 1} of ${pending.length}: ${f.name}…` }),
        );
      setStatus({ cls: "", text: "Publishing…" });
      const tags = String(fd.get("tags") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5);
      const slug = slugify(title);
      const { error } = await getBrowserClient()
        .from("breakdowns")
        .insert({
          id,
          slug,
          title,
          category: String(fd.get("category") || "Other"),
          tags,
          description: String(fd.get("description") || "").trim() || null,
          body: body || null,
          link: link || null,
          files: uploaded,
        });
      if (error) throw new Error(/row-level security/i.test(error.message) ? "Publishing was refused. Sign in again." : "Couldn't publish: " + error.message);
      form.reset();
      setPending([]);
      setStatus({ cls: "ok", text: "Published. It's live in Latest breakdowns.", href: `/breakdowns/${slug}` });
      router.refresh();
    } catch (err) {
      if (uploaded.length) await removeStoredFiles(uploaded.map((u) => u.path)).catch(() => {});
      setStatus({ cls: "err", text: err instanceof Error ? err.message : "Couldn't publish. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin">
      <h2>Add a breakdown</h2>
      <p className="note">Write the post, attach PDFs (they show inside the post with a viewer), add a link, or any mix. Up to 6 files, 20 MB each.</p>
      <form className="grid2" onSubmit={submit}>
        <div className="full">
          <label htmlFor="rTitle">Title</label>
          <input id="rTitle" name="title" required maxLength={140} placeholder="The perfect prompt formula: role, context, task, format" />
        </div>
        <div>
          <label htmlFor="rCat">Category</label>
          <select id="rCat" name="category" defaultValue="ChatGPT">
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rTags">Tags (comma separated)</label>
          <input id="rTags" name="tags" maxLength={80} placeholder="Prompting, Fundamentals" />
        </div>
        <div className="full">
          <label htmlFor="rDesc">Summary</label>
          <textarea id="rDesc" name="description" maxLength={400} style={{ minHeight: 80 }} placeholder="One or two lines shown in the list" />
        </div>
        <div className="full">
          <label htmlFor="rBody">Post (optional)</label>
          <button className="ins" type="button" onClick={insertPrompt}>
            + Insert prompt box
          </button>
          <textarea
            id="rBody"
            name="body"
            ref={bodyRef}
            style={{ minHeight: 260 }}
            placeholder="Write the breakdown. Start a line with ## for a heading. Click “Insert prompt box” to add a prompt readers can copy."
          />
        </div>
        <div className="full">
          <label htmlFor="rFile">PDFs and files (optional)</label>
          <label
            className={`drop${pending.length ? " has" : ""}${over ? " over" : ""}`}
            htmlFor="rFile"
            onDragEnter={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              addFiles(Array.from(e.dataTransfer.files || []));
            }}
          >
            {pending.length ? "Add more files" : "Drop PDFs here or click to choose"}
          </label>
          <input
            id="rFile"
            type="file"
            className="sr"
            multiple
            accept={ACCEPT}
            onChange={(e) => {
              addFiles(Array.from(e.target.files || []));
              e.target.value = "";
            }}
          />
          {pending.length > 0 && (
            <ul className="flist">
              {pending.map((f, i) => (
                <li key={`${f.name}-${i}`}>
                  <span className="ft">{(extOf(f.name) || "file").toUpperCase()}</span>
                  <span className="fn">{f.name}</span>
                  <span className="fz">{fmtSize(f.size)}</span>
                  <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setPending((p) => p.filter((_, j) => j !== i))}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="full">
          <label htmlFor="rLink">Link (optional)</label>
          <input id="rLink" name="link" type="url" placeholder="https://" />
        </div>
        <div className="full">
          <button className="btn" type="submit" disabled={busy}>
            {busy ? "Publishing…" : "Publish"}
          </button>
          <div className={`status ${status.cls}`} role="status">
            {status.text}
            {status.href && (
              <>
                {" "}
                <Link href={status.href}>View it</Link>
              </>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
