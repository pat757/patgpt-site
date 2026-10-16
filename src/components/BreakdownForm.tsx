"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CATEGORIES } from "@/lib/site";
import { catOf, extOf, fmtSize, slugify } from "@/lib/format";
import { isHtmlBody, legacyToHtml, storedImagesIn } from "@/lib/body";
import { checkFiles, removeStoredFiles, updateBreakdown, uploadFiles } from "@/lib/admin-actions";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Breakdown } from "@/lib/types";
import { PostEditor, type PostEditorHandle } from "./editor/PostEditor";

const ACCEPT = ".pdf,application/pdf,.md,.txt,.csv,.json,image/*,video/mp4,video/webm";
const MAX_BODY = 50000; // matches the database limit in supabase/schema.sql

type Status = { cls: "" | "ok" | "err"; text: string; href?: string };

/** Adding a new breakdown (no post) or editing a published one. */
export function BreakdownForm({ post }: { post?: Breakdown }) {
  const editing = !!post;
  const router = useRouter();
  const editor = useRef<PostEditorHandle>(null);
  // A new post gets its id as soon as its first image is uploaded, so the images live in its folder.
  const idRef = useRef<string | null>(post?.id ?? null);
  const uploadedHere = useRef(new Set<string>());
  const [initialHtml] = useState(() => (post?.body ? (isHtmlBody(post.body) ? post.body : legacyToHtml(post.body)) : ""));
  const [editorKey, setEditorKey] = useState(0);
  const [uploading, setUploading] = useState(0);
  const [pending, setPending] = useState<File[]>([]);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
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

  /** Removes images that were uploaded or used before but aren't in the saved post any more. */
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
    const body = editor.current?.getHtml();
    if (body === null || uploading > 0) return setStatus({ cls: "err", text: "Wait for the images to finish uploading." });
    if ((body || "").length > MAX_BODY)
      return setStatus({ cls: "err", text: "This post is too long to save. Split it into two posts, or move some of it into a PDF." });
    const form = e.currentTarget;
    const fd = new FormData(form);
    const title = String(fd.get("title") || "").trim();
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
        cleanUpImages(body || "", post.id);
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
      cleanUpImages(body || "", id);
      idRef.current = null;
      form.reset();
      editor.current?.clear();
      setEditorKey((k) => k + 1);
      setPending([]);
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

  return (
    <div className="admin">
      <h2>{editing ? "Edit breakdown" : "Add a breakdown"}</h2>
      <p className="note">
        {editing
          ? "Change anything below and save. PDFs and other attached files are added or removed on the post page."
          : "Write the post with the toolbar, paste or drop screenshots and photos anywhere in it, attach PDFs, add a link, or any mix."}
      </p>
      <form
        className="grid2"
        onSubmit={submit}
        onInput={() => setDirty(true)}
        // Pressing Enter in a single-line box (title, caption…) shouldn't publish the post by accident.
        onKeyDown={(e) => {
          const t = e.target as HTMLElement;
          if (e.key === "Enter" && t.tagName === "INPUT" && (t as HTMLInputElement).type !== "submit") e.preventDefault();
        }}
      >
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
          <span className="label">Post{editing ? "" : " (optional)"}</span>
          <PostEditor
            key={editorKey}
            handle={editor}
            initialHtml={editorKey === 0 ? initialHtml : ""}
            getPostId={postId}
            onChange={() => setDirty(true)}
            onUploadsChange={setUploading}
            onUploaded={(path) => uploadedHere.current.add(path)}
            onMessage={(cls, text) => setStatus({ cls, text })}
          />
          <p className="hint">
            {uploading > 0
              ? `Uploading ${uploading} ${uploading === 1 ? "image" : "images"}… you can keep writing.`
              : "Tip: select text and use the toolbar, or shortcuts like Ctrl/⌘+B for bold. Type ## and a space for a heading, or - for a list. Press Enter three times to leave a prompt box."}
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
              {busy ? (editing ? "Saving…" : "Publishing…") : uploading > 0 ? "Uploading images…" : editing ? "Save changes" : "Publish"}
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
