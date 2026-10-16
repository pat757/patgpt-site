"use client";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { Placeholder } from "@tiptap/extensions";
import { useEffect, useImperativeHandle, useRef, type ReactNode, type Ref } from "react";
import { removeStoredFiles, uploadImage } from "@/lib/admin-actions";
import { storedPathFromUrl } from "@/lib/body";
import { looksLikeImage } from "@/lib/images";
import { publicFileUrl } from "@/lib/storage";
import { ImageNode, PromptBoxNode } from "./nodes";

export type PostEditorHandle = {
  /** The post as HTML ("" when empty), or null while images are still uploading. */
  getHtml: () => string | null;
  clear: () => void;
};

type Props = {
  initialHtml: string;
  getPostId: () => string;
  handle: Ref<PostEditorHandle>;
  onChange: () => void;
  onUploadsChange: (n: number) => void;
  onMessage: (kind: "" | "ok" | "err", text: string) => void;
  /** Called with the storage path of every image uploaded, so unused ones can be cleaned up on save. */
  onUploaded: (path: string) => void;
};

const rid = () => Math.random().toString(36).slice(2, 10);

const imageFilesFrom = (dt: DataTransfer | null) => Array.from(dt?.files || []).filter(looksLikeImage);

/** True when the clipboard holds real text (e.g. copied from a doc), which should paste as text, not as a picture of it. */
function hasRichText(dt: DataTransfer | null) {
  const html = dt?.getData("text/html") || "";
  return html.replace(/<img\b[^>]*>/gi, "").replace(/<[^>]*>/g, "").replace(/&nbsp;|\s/g, "").length > 0;
}

function findUploading(editor: Editor, uploadId: string) {
  let found: { pos: number; attrs: Record<string, unknown>; size: number } | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (found) return false;
    if (node.type.name === "image" && node.attrs.uploadId === uploadId) found = { pos, attrs: node.attrs, size: node.nodeSize };
  });
  return found as { pos: number; attrs: Record<string, unknown>; size: number } | null;
}

function countUploading(editor: Editor) {
  let n = 0;
  editor.state.doc.descendants((node) => {
    if (node.type.name === "image" && (node.attrs.uploadId || String(node.attrs.src || "").startsWith("blob:"))) n++;
  });
  return n;
}

export function PostEditor({ initialHtml, getPostId, handle, onChange, onUploadsChange, onMessage, onUploaded }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const finished = useRef(new Map<string, string>()); // temporary preview URL -> uploaded URL
  const triedLinks = useRef(new Set<string>());
  const cb = useRef({ onChange, onUploadsChange, onMessage, getPostId, onUploaded });
  useEffect(() => {
    cb.current = { onChange, onUploadsChange, onMessage, getPostId, onUploaded };
  });

  /** Swaps an image that was uploading for its final address, or removes it if the upload failed. */
  const settle = (uploadId: string, url: string | null, keepOriginal = false) => {
    const ed = editorRef.current;
    if (!ed || ed.isDestroyed) return false;
    const hit = findUploading(ed, uploadId);
    if (!hit) return false;
    const tr = ed.state.tr.setMeta("addToHistory", false);
    if (url) tr.setNodeMarkup(hit.pos, undefined, { ...hit.attrs, src: url, uploadId: null });
    else if (keepOriginal) tr.setNodeMarkup(hit.pos, undefined, { ...hit.attrs, uploadId: null });
    else tr.delete(hit.pos, hit.pos + hit.size);
    ed.view.dispatch(tr);
    return true;
  };

  const uploadOne = async (uploadId: string, file: File, previewUrl?: string) => {
    try {
      const path = await uploadImage(cb.current.getPostId(), file);
      cb.current.onUploaded(path);
      const url = publicFileUrl(path);
      if (previewUrl) finished.current.set(previewUrl, url);
      if (!settle(uploadId, url)) removeStoredFiles([path]).catch(() => {}); // removed while uploading
      return true;
    } catch (e) {
      settle(uploadId, null);
      cb.current.onMessage("err", e instanceof Error ? e.message : "An image didn't upload. Try again.");
      return false;
    }
  };

  /** Adds image files at the cursor (or a drop point) and uploads them. */
  const insertFiles = async (files: File[], at?: number) => {
    const ed = editorRef.current;
    if (!ed || !files.length) return;
    const items = files.map((file) => ({ file, uploadId: rid(), preview: URL.createObjectURL(file) }));
    const content = items.map((i) => ({ type: "image", attrs: { src: i.preview, alt: "", uploadId: i.uploadId } }));
    if (typeof at === "number") ed.chain().focus().insertContentAt(at, content).run();
    else ed.chain().focus().insertContent(content).run();
    cb.current.onMessage("", files.length === 1 ? "Uploading image…" : `Uploading ${files.length} images…`);
    let ok = 0;
    for (const i of items) if (await uploadOne(i.uploadId, i.file, i.preview)) ok++;
    if (ok === items.length) cb.current.onMessage("ok", ok === 1 ? "Image added." : `${ok} images added.`);
  };

  /** Images pasted from web pages or documents get copied into the site's storage, so they can't disappear later. */
  const importPastedImages = async () => {
    const ed = editorRef.current;
    if (!ed) return;
    const base = publicFileUrl("");
    const jobs: { uploadId: string; src: string }[] = [];
    const tr = ed.state.tr.setMeta("addToHistory", false);
    ed.state.doc.descendants((node, pos) => {
      if (node.type.name !== "image" || node.attrs.uploadId) return;
      const src = String(node.attrs.src || "");
      if (!src || src.startsWith(base) || storedPathFromUrl(src) || finished.current.has(src) || triedLinks.current.has(src)) return;
      const uploadId = rid();
      jobs.push({ uploadId, src });
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, uploadId });
    });
    if (!jobs.length) return;
    ed.view.dispatch(tr);
    let linked = 0;
    let dropped = 0;
    for (const job of jobs) {
      try {
        const res = await fetch(job.src);
        if (!res.ok) throw new Error("fetch failed");
        const blob = await res.blob();
        if (!blob.type.startsWith("image/")) throw new Error("not an image");
        const file = new File([blob], `pasted.${blob.type.split("/")[1] || "png"}`, { type: blob.type });
        await uploadOne(job.uploadId, file);
      } catch {
        if (/^https:\/\//i.test(job.src)) {
          // The other site doesn't allow copying; keep showing it from there.
          triedLinks.current.add(job.src);
          settle(job.uploadId, null, true);
          linked++;
        } else {
          settle(job.uploadId, null);
          dropped++;
        }
      }
    }
    if (linked)
      cb.current.onMessage(
        "err",
        `${linked === 1 ? "One image is" : `${linked} images are`} shown from another website and couldn't be copied here, so ${linked === 1 ? "it" : "they"} could disappear later. To keep ${linked === 1 ? "it" : "them"} for sure, save ${linked === 1 ? "it" : "them"} to your device and paste or drop ${linked === 1 ? "it" : "them"} in.`,
      );
    else if (dropped) cb.current.onMessage("err", "Some pasted images couldn't be copied. Save them to your device and paste or drop them in.");
  };

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          defaultProtocol: "https",
          HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
        },
      }),
      PromptBoxNode,
      ImageNode,
      Placeholder.configure({ placeholder: "Write your breakdown… Paste or drop screenshots and images straight in." }),
    ],
    content: initialHtml,
    editorProps: {
      attributes: { class: "ed-content body", "aria-label": "Post", "aria-multiline": "true" },
      handlePaste: (_view, event) => {
        const files = imageFilesFrom(event.clipboardData);
        if (!files.length || hasRichText(event.clipboardData)) return false;
        event.preventDefault();
        insertFiles(files);
        return true;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false;
        const files = imageFilesFrom(event.dataTransfer);
        if (!files.length) return false;
        event.preventDefault();
        insertFiles(files, view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos);
        return true;
      },
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor, transaction }) => {
      cb.current.onChange();
      cb.current.onUploadsChange(countUploading(editor));
      const ui = transaction.getMeta("uiEvent");
      if (ui === "paste" || ui === "drop") importPastedImages();
    },
  });
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  useImperativeHandle(handle, () => ({
    getHtml: () => {
      const ed = editorRef.current;
      if (!ed) return "";
      if (countUploading(ed) > 0) return null;
      if (ed.isEmpty) return "";
      let html = ed.getHTML();
      for (const [preview, url] of finished.current) html = html.split(preview).join(url);
      if (/src="blob:/.test(html)) return null;
      return html.replace(/(<p><\/p>)+$/, "");
    },
    clear: () => {
      editorRef.current?.commands.clearContent(true);
      finished.current.clear();
    },
  }));

  return (
    <div className="ed">
      <Toolbar editor={editor} onPickImage={() => fileInput.current?.click()} />
      <input
        ref={fileInput}
        type="file"
        className="sr"
        multiple
        accept="image/*"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const list = Array.from(e.target.files || []).filter(looksLikeImage);
          e.target.value = "";
          insertFiles(list);
        }}
      />
      {editor ? <EditorContent editor={editor} /> : <div className="ed-content body ed-loading">Loading editor…</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

const mod = "Ctrl/⌘+";

const I = {
  bullet: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M9 6h11M9 12h11M9 18h11" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" />
      <circle cx="4.5" cy="12" r="1" fill="currentColor" />
      <circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </svg>
  ),
  ordered: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M10 6h10M10 12h10M10 18h10" />
      <path d="M4 5h1.5v4M3.5 9h3M3.5 14.5a1.5 1.5 0 1 1 2.6 1L3.5 19h3" strokeWidth="1.5" />
    </svg>
  ),
  quote: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7.5 6C5 6 3 8 3 10.5V18h7v-7H6c0-1.7 1-3 2.5-3V6Zm10 0C15 6 13 8 13 10.5V18h7v-7h-4c0-1.7 1-3 2.5-3V6Z" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3.2-3.2a4.5 4.5 0 0 0-6.4-6.4L12 5.6" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3.2 3.2a4.5 4.5 0 0 0 6.4 6.4L12 18.4" />
    </svg>
  ),
  prompt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="m7.5 10 2.5 2-2.5 2M12.5 15h4" />
    </svg>
  ),
  image: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="9" cy="10" r="1.8" />
      <path d="m21 16-5-5-9 9" />
    </svg>
  ),
  divider: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M3 12h18" />
    </svg>
  ),
  undo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  ),
  redo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </svg>
  ),
};

function Btn({ label, active, disabled, onClick, children }: { label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      className="tb"
      title={label}
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep the cursor where it is
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, onPickImage }: { editor: Editor | null; onPickImage: () => void }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            strike: e.isActive("strike"),
            h2: e.isActive("heading", { level: 2 }),
            h3: e.isActive("heading", { level: 3 }),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            quote: e.isActive("blockquote"),
            link: e.isActive("link"),
            prompt: e.isActive("codeBlock"),
            canUndo: e.can().undo(),
            canRedo: e.can().redo(),
          }
        : null,
  });
  // Buttons work as soon as the editor exists; their highlighted state fills in on the first edit.
  const off = !editor;
  const run = (fn: (e: Editor) => void) => () => editor && fn(editor);

  const setLink = (e: Editor) => {
    const prev = (e.getAttributes("link").href as string | undefined) || "";
    const input = window.prompt("Link address (leave empty to remove the link)", prev || "https://");
    if (input === null) return;
    const raw = input.trim();
    if (!raw || raw === "https://") {
      e.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const href = /^(https?:\/\/|mailto:)/i.test(raw) ? raw : raw.includes("@") && !raw.includes("/") ? `mailto:${raw}` : `https://${raw}`;
    if (e.state.selection.empty && !e.isActive("link"))
      e.chain().focus().insertContent({ type: "text", text: raw, marks: [{ type: "link", attrs: { href } }] }).run();
    else e.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  return (
    <div className="ed-toolbar" role="toolbar" aria-label="Formatting">
      <div className="tb-group">
        <Btn label={`Bold (${mod}B)`} active={s?.bold} disabled={off} onClick={run((e) => e.chain().focus().toggleBold().run())}>
          <b>B</b>
        </Btn>
        <Btn label={`Italic (${mod}I)`} active={s?.italic} disabled={off} onClick={run((e) => e.chain().focus().toggleItalic().run())}>
          <i style={{ fontFamily: "Georgia, serif" }}>I</i>
        </Btn>
        <Btn label={`Underline (${mod}U)`} active={s?.underline} disabled={off} onClick={run((e) => e.chain().focus().toggleUnderline().run())}>
          <u>U</u>
        </Btn>
        <Btn label="Strikethrough" active={s?.strike} disabled={off} onClick={run((e) => e.chain().focus().toggleStrike().run())}>
          <s>S</s>
        </Btn>
      </div>
      <div className="tb-group">
        <Btn label="Heading" active={s?.h2} disabled={off} onClick={run((e) => e.chain().focus().toggleHeading({ level: 2 }).run())}>
          <span className="tb-h">H2</span>
        </Btn>
        <Btn label="Subheading" active={s?.h3} disabled={off} onClick={run((e) => e.chain().focus().toggleHeading({ level: 3 }).run())}>
          <span className="tb-h">H3</span>
        </Btn>
      </div>
      <div className="tb-group">
        <Btn label="Bulleted list" active={s?.bullet} disabled={off} onClick={run((e) => e.chain().focus().toggleBulletList().run())}>
          {I.bullet}
        </Btn>
        <Btn label="Numbered list" active={s?.ordered} disabled={off} onClick={run((e) => e.chain().focus().toggleOrderedList().run())}>
          {I.ordered}
        </Btn>
        <Btn label="Quote" active={s?.quote} disabled={off} onClick={run((e) => e.chain().focus().toggleBlockquote().run())}>
          {I.quote}
        </Btn>
        <Btn label="Link" active={s?.link} disabled={off} onClick={run(setLink)}>
          {I.link}
        </Btn>
      </div>
      <div className="tb-group">
        <Btn label="Prompt box (readers can copy it)" active={s?.prompt} disabled={off} onClick={run((e) => e.chain().focus().toggleCodeBlock().run())}>
          {I.prompt}
        </Btn>
        <Btn label="Insert image" disabled={off} onClick={onPickImage}>
          {I.image}
        </Btn>
        <Btn label="Divider line" disabled={off} onClick={run((e) => e.chain().focus().setHorizontalRule().run())}>
          {I.divider}
        </Btn>
      </div>
      <div className="tb-group tb-end">
        <Btn label={`Undo (${mod}Z)`} disabled={off || !s || !s.canUndo} onClick={run((e) => e.chain().focus().undo().run())}>
          {I.undo}
        </Btn>
        <Btn label="Redo" disabled={off || !s || !s.canRedo} onClick={run((e) => e.chain().focus().redo().run())}>
          {I.redo}
        </Btn>
      </div>
    </div>
  );
}
