"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { isImage, isPdf, safeUrl } from "@/lib/format";
import { downloadFileUrl } from "@/lib/storage";
import { checkFiles, deleteBreakdown, removeStoredFiles, setBreakdownFiles, uploadFiles } from "@/lib/admin-actions";
import type { Breakdown, StoredFile } from "@/lib/types";
import { ConfirmButton } from "./ConfirmButton";
import { PdfViewer } from "./PdfViewer";
import { PostImage } from "./PostImage";

const ACCEPT = ".pdf,application/pdf,.md,.txt,.csv,.json,image/*,video/mp4,video/webm";

export function PostFiles({ post, isAdmin }: { post: Breakdown; isAdmin: boolean }) {
  const router = useRouter();
  const [status, setStatus] = useState<{ cls: "" | "ok" | "err"; text: string }>({ cls: "", text: "" });
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pdfs = post.files.filter(isPdf);
  const images = post.files.filter((f) => !isPdf(f) && isImage(f));
  const others = post.files.filter((f) => !isPdf(f) && !isImage(f));
  const link = safeUrl(post.link);

  const removeFile = (f: StoredFile) => async () => {
    await setBreakdownFiles(
      post.id,
      post.files.filter((x) => x.path !== f.path),
    );
    await removeStoredFiles([f.path]).catch(() => {});
    router.refresh();
  };
  const removeBtn = (f: StoredFile) =>
    isAdmin ? (
      <ConfirmButton className="unattach" label="Remove" question="Remove this file?" confirmLabel="Remove" busyLabel="Removing…" onConfirm={removeFile(f)} />
    ) : null;

  const attach = async (list: File[]) => {
    if (!list.length) return;
    const problem = checkFiles(list, post.files.length);
    if (problem) return setStatus({ cls: "err", text: problem });
    setBusy(true);
    try {
      const added = await uploadFiles(post.id, list, (i, f) =>
        setStatus({ cls: "", text: `Uploading ${i + 1} of ${list.length}: ${f.name}…` }),
      );
      try {
        await setBreakdownFiles(post.id, post.files.concat(added));
      } catch (e) {
        await removeStoredFiles(added.map((a) => a.path)).catch(() => {});
        throw e;
      }
      setStatus({ cls: "ok", text: `Attached. Readers can see ${added.length === 1 ? "it" : "them"} now.` });
      router.refresh();
    } catch (e) {
      setStatus({ cls: "err", text: e instanceof Error ? e.message : "Upload failed. Try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {pdfs.map((f) => (
        <PdfViewer key={f.path} file={f} ownerSlot={removeBtn(f)} />
      ))}

      {images.length > 0 && (
        <div className="body attached-images">
          {images.map((f) => (
            <PostImage key={f.path} src={f.path}>
              {removeBtn(f)}
            </PostImage>
          ))}
        </div>
      )}

      {(others.length > 0 || link) && (
        <div className="attach">
          {others.map((f) => (
            <span key={f.path} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <a className="btn" href={downloadFileUrl(f.path, f.name)}>
                Download {f.name}
              </a>
              {removeBtn(f)}
            </span>
          ))}
          {link && (
            <a className="btn outline" href={link} target="_blank" rel="noopener noreferrer">
              Open link ↗
            </a>
          )}
        </div>
      )}

      {isAdmin && (
        <div className="post-owner">
          <div className="ownerbar">
            <p>Only you see this. Edit the post, or attach PDFs and files.</p>
            <span className="ownerbar-act">
            <Link className="btn small outline" href={`/breakdowns/${post.slug}/edit`}>
              Edit post
            </Link>
            <label className="btn small" htmlFor="addFiles" aria-disabled={busy} style={busy ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
              + Attach PDF
            </label>
            </span>
            <input
              id="addFiles"
              ref={inputRef}
              className="sr"
              type="file"
              multiple
              accept={ACCEPT}
              onChange={(e) => {
                const list = Array.from(e.target.files || []);
                e.target.value = "";
                attach(list);
              }}
            />
            {status.text && (
              <div className={`status ${status.cls}`} role="status" style={{ width: "100%", marginTop: 0 }}>
                {status.text}
              </div>
            )}
          </div>
          <div className="danger-zone">
            <p>Delete this breakdown and its files for everyone.</p>
            <ConfirmButton
              className="btn-danger"
              label="Delete post"
              question="Delete for everyone?"
              confirmLabel="Delete"
              busyLabel="Deleting…"
              onConfirm={async () => {
                await deleteBreakdown(
                  post.id,
                  post.files.map((f) => f.path),
                );
                router.push("/");
                router.refresh();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
