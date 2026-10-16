"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/site";
import { catOf, extOf, fmtSize, slugify } from "@/lib/format";
import { imageLine, storedImagesIn } from "@/lib/body";
import { looksLikeImage } from "@/lib/images";
import { checkFiles, removeStoredFiles, updateBreakdown, uploadFiles, uploadImage } from "@/lib/admin-actions";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Breakdown } from "@/lib/types";
import { PostBody } from "./PostBody";

const ACCEPT = ".pdf,application/pdf,.md,.txt,.csv,.json,image/*,video/mp4,video/webm";
const MAX_IMAGES = 30;

type Status = { cls: "" | "ok" | "err"; text: string; href?: string };

const tokenName = (name: string) => name.replace(/[[\]()\n]/g, "").slice(0, 60) || "image";

/** Adding a new breakdown (no post) or editing a published one. */
export function BreakdownForm({ post }: { post?: Breakdown }) {
  const editing = !!post;
  const router = useRouter();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const imageInput = useRef<HTMLInputElement>(null);
  // A new post gets its id as soon as its first image is uploaded, so the images live in its folder.
  const idRef = useRef<string | null>(post?.id ?? null);
  const uploadedHere = useRef(new Set<string>());
  const pendingRef = useRef(0);
  const [uploading, setUploading] = useState(0);
  const [pending, setPending] = useState<File[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState<Status>({ cls: "", text: "" });

  const postId = () => (idRef.current ??= crypto.randomUUID());

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const addFiles = (list: File[]) => {
    const problem = checkFiles(list, pending.length);
    if (problem) return setStatus({ cls: "err", text: problem });
    setStatus({ cls: "", text: "" });
    setPending((p) => p.concat(list));
    setDirty(true);
  };

  /** Puts a block of text on its own lines at the cursor. Returns where the block starts and the caret after it. */
  const insertBlock = (block: string) => {
    const ta = bodyRef.current!;
    const a = ta.selectionStart;
    const z = ta.selectionEnd;
    const v = ta.value;
    const before = v.slice(0, a);
    const after = v.slice(z);
    const pre = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
    const tail = after.startsWith("\n\n") ? "" : after.startsWith("\n") ? "\n" : "\n\n";
    ta.value = before + pre + block + tail + after;
    setDirty(true);
    return { start: before.length + pre.length, caret: (before + pre + block + tail).length };
  };

  const insertPrompt = () => {
    const ta = bodyRef.current;
    if (!ta) return;
    const picked = ta.value.slice(ta.selectionStart, ta.selectionEnd).trim();
    const inner = picked || "Paste your prompt here";
    const { start } = insertBlock("```\n" + inner + "\n```");
    ta.focus();
    ta.setSelectionRange(start + 4, start + 4 + inner.length);
  };

  /** Swaps an "Uploading…" placeholder for the finished image line (or removes it). False if it was deleted meanwhile. */
  const replaceToken = (token: string, line: string) => {
    const ta = bodyRef.current;
    if (!ta) return false;
    const v = ta.value;
    let start = v.indexOf(token);
    if (start < 0) return false;
    let end = start + token.length;
    if (!line) {
      if (v.slice(end, end + 2) === "\n\n") end += 2;
      else if (v.slice(start - 2, start) === "\n\n") start -= 2;
    }
    const s = ta.selectionStart;
    const e = ta.selectionEnd;
    ta.value = v.slice(0, start) + line + v.slice(end);
    const delta = line.length - (end - start);
    const fix = (p: number) => (p >= end ? p + delta : p > start ? start + line.length : p);
    ta.setSelectionRange(fix(s), fix(e));
    return true;
  };

  const insertImages = async (files: File[]) => {
    const ta = bodyRef.current;
    if (!ta || !files.length) return;
    const imgs = files.filter(looksLikeImage);
    if (!imgs.length)
      return setStatus({ cls: "err", text: "Only images can go in the post text. Attach PDFs and other files in the box below." });
    if (storedImagesIn(ta.value).length + pendingRef.current + imgs.length > MAX_IMAGES)
      return setStatus({ cls: "err", text: `A post can show up to ${MAX_IMAGES} images.` });

    if (preview !== null) setPreview(null);
    const tag = Date.now().toString(36);
    const tokens = imgs.map((f, i) => `![Uploading ${tokenName(f.name)}…](uploading-${tag}-${i})`);
    const { caret } = insertBlock(tokens.join("\n\n"));
    ta.focus();
    ta.setSelectionRange(caret, caret);

    pendingRef.current += imgs.length;
    setUploading(pendingRef.current);
    setStatus({ cls: "", text: imgs.length === 1 ? "Uploading image…" : `Uploading ${imgs.length} images…` });
    let failed = "";
    for (let i = 0; i < imgs.length; i++) {
      let path = "";
      try {
        path = await uploadImage(postId(), imgs[i]);
        uploadedHere.current.add(path);
      } catch (e) {
        failed = e instanceof Error ? e.message : "An image didn't upload. Try again.";
      }
      if (!replaceToken(tokens[i], path ? imageLine(path) : "") && path) {
        // The placeholder was deleted while uploading, so the image isn't wanted.
        uploadedHere.current.delete(path);
        removeStoredFiles([path]).catch(() => {});
      }
      pendingRef.current--;
      setUploading(pendingRef.current);
    }
    setStatus(
      failed
        ? { cls: "err", text: failed }
        : { cls: "ok", text: `${imgs.length === 1 ? "Image" : "Images"} added. To add a caption, type it between the [ ].` },
    );
  };

  /** Removes images that were uploaded or used before but aren't in the saved text any more. */
  const cleanUpImages = (savedBody: string, id: string) => {
    const used = new Set(storedImagesIn(savedBody));
    const attached = new Set((post?.files ?? []).map((f) => f.path));
    const candidates = new Set([...uploadedHere.current, ...storedImagesIn(post?.body)]);
    const unused = [...candidates].filter((p) => !used.has(p) && !attached.has(p) && p.startsWith(id + "/"));
    uploadedHere.current = new Set();
    if (unused.length) removeStoredFiles(unused).catch(() => {});
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pendingRef.current > 0) return setStatus({ cls: "err", text: "Wait for the images to finish uploading." });
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") || "").trim();
    const body = (bodyRef.current?.value ?? "").trim();
    const link = String(fd.get("link") || "").trim();
    const fields = {
      title,
      category: String(fd.get("category") || "Other"),
      tags: String(fd.get("tags") || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 5),
      description: String(fd.get("description") || "").trim() || null,
      body: body || null,
      link: link || null,
    };

    if (editing) {
      if (!body && !link && !post.files.length)
        return setStatus({ cls: "err", text: "Write the post or add a link so readers have something to open." });
      setBusy(true);
      setStatus({ cls: "", text: "Saving…" });
      try {
        await updateBreakdown(post.id, fields);
        cleanUpImages(body, post.id);
        setDirty(false);
        setStatus({ cls: "ok", text: "Saved." });
        router.push(`/breakdowns/${post.slug}`);
        router.refresh();
      } catch (err) {
        setStatus({ cls: "err", text: err instanceof Error ? err.message : "Couldn't save. Try again." });
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!pending.length && !link && !body)
      return setStatus({ cls: "err", text: "Write the post, attach a PDF or add a link so readers have something to open." });

    setBusy(true);
    const id = postId();
    let uploaded: Awaited<ReturnType<typeof uploadFiles>> = [];
    try {
      if (pending.length)
        uploaded = await uploadFiles(id, pending, (i, f) =>
          setStatus({ cls: "", text: `Uploading ${i + 1} of ${pending.length}: ${f.name}…` }),
        );
      setStatus({ cls: "", text: "Publishing…" });
      const slug = slugify(title);
      const { error } = await getBrowserClient()
        .from("breakdowns")
        .insert({ id, slug, ...fields, files: uploaded });
      if (error) throw new Error(/row-level security/i.test(error.message) ? "Publishing was refused. Sign in again." : "Couldn't publish: " + error.message);
      cleanUpImages(body, id);
      idRef.current = null;
      form.reset();
      if (bodyRef.current) bodyRef.current.value = "";
      setPending([]);
      setPreview(null);
      setDirty(false);
      setStatus({ cls: "ok", text: "Published. It's live in Latest breakdowns.", href: `/breakdowns/${slug}` });
      router.refresh();
    } catch (err) {
      if (uploaded.length) await removeStoredFiles(uploaded.map((u) => u.path)).catch(() => {});
      setStatus({ cls: "err", text: err instanceof Error ? err.message : "Couldn't publish. Try again." });
    } finally {
      setBusy(false);
    }
  };

  const busyLabel = editing ? "Saving…" : "Publishing…";

  return (
    <div className="admin">
      <h2>{editing ? "Edit breakdown" : "Add a breakdown"}</h2>
      <p className="note">
        {editing
          ? "Change anything below and save. PDFs and other attached files are added or removed on the post page."
          : "Write the post, put screenshots and photos anywhere in it, attach PDFs (they show inside the post with a viewer), add a link, or any mix."}
      </p>
      <form className="grid2" onSubmit={submit} onInput={() => setDirty(true)}>
        <div className="full">
          <label htmlFor="rTitle">Title</label>
          <input id="rTitle" name="title" required maxLength={140} defaultValue={post?.title} placeholder="The perfect prompt formula: role, context, task, format" />
        </div>
        <div>
          <label htmlFor="rCat">Category</label>
          <select id="rCat" name="category" defaultValue={post ? catOf(post) : "ChatGPT"}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rTags">Tags (comma separated)</label>
          <input id="rTags" name="tags" maxLength={80} defaultValue={post?.tags.join(", ")} placeholder="Prompting, Fundamentals" />
        </div>
        <div className="full">
          <label htmlFor="rDesc">Summary</label>
          <textarea id="rDesc" name="description" maxLength={400} style={{ minHeight: 80 }} defaultValue={post?.description ?? ""} placeholder="One or two lines shown in the list" />
        </div>
        <div className="full">
          <label htmlFor="rBody">Post{editing ? "" : " (optional)"}</label>
          <div className="ins-row">
            <button className="ins" type="button" onClick={insertPrompt} disabled={preview !== null}>
              + Insert prompt box
            </button>
            <button className="ins" type="button" onClick={() => imageInput.current?.click()} disabled={preview !== null}>
              + Insert image
            </button>
            <button
              className="ins ins-preview"
              type="button"
              aria-pressed={preview !== null}
              onClick={() => setPreview(preview === null ? (bodyRef.current?.value ?? "") : null)}
            >
              {preview === null ? "Preview" : "Back to editing"}
            </button>
          </div>
          <input
            ref={imageInput}
            type="file"
            className="sr"
            multiple
            accept="image/*"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => {
              const list = Array.from(e.target.files || []);
              e.target.value = "";
              insertImages(list);
            }}
          />
          <textarea
            id="rBody"
            name="body"
            ref={bodyRef}
            hidden={preview !== null}
            style={{ minHeight: 300 }}
            defaultValue={post?.body ?? ""}
            placeholder="Write the breakdown. Start a line with ## for a heading. Paste a screenshot (Ctrl/⌘+V) or click “Insert image” to put a picture where your cursor is."
            onPaste={(e) => {
              const files = Array.from(e.clipboardData?.files || []).filter(looksLikeImage);
              if (!files.length) return;
              e.preventDefault();
              insertImages(files);
            }}
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes("Files")) e.preventDefault();
            }}
            onDrop={(e) => {
              const files = Array.from(e.dataTransfer.files || []);
              if (!files.length) return;
              e.preventDefault();
              e.currentTarget.focus();
              insertImages(files);
            }}
          />
          {preview !== null && (
            <div className="preview" aria-label="Preview of the post">
              {preview.trim() ? <PostBody text={preview} /> : <p className="muted">Nothing written yet.</p>}
            </div>
          )}
          <p className="hint">
            {uploading > 0
              ? `Uploading ${uploading} ${uploading === 1 ? "image" : "images"}… you can keep writing.`
              : "Each image is a line like ![caption](…). Type a caption inside the [ ], or delete the line to remove the image."}
          </p>
        </div>
        {!editing && (
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
        )}
        <div className="full">
          <label htmlFor="rLink">Link (optional)</label>
          <input id="rLink" name="link" type="url" defaultValue={post?.link ?? ""} placeholder="https://" />
        </div>
        <div className="full">
          <div className="form-actions">
            <button className="btn" type="submit" disabled={busy || uploading > 0}>
              {busy ? busyLabel : uploading > 0 ? "Uploading images…" : editing ? "Save changes" : "Publish"}
            </button>
            {editing && (
              <Link className="btn outline" href={`/breakdowns/${post.slug}`}>
                Cancel
              </Link>
            )}
          </div>
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
