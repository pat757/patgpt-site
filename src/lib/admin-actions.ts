"use client";
// Admin-only writes. The database rules (supabase/schema.sql) reject these for anyone
// who isn't signed in as the admin, so hiding the buttons is just a convenience.
import { getBrowserClient } from "./supabase/client";
import { MAX_FILES, MAX_FILE_BYTES, STORAGE_BUCKET } from "./site";
import { safeFileName, uploadType } from "./format";
import { looksLikeImage, prepareImage } from "./images";
import type { Breakdown, StoredFile } from "./types";

export function checkFiles(list: File[], existing: number) {
  if (list.length + existing > MAX_FILES) return `A post can hold up to ${MAX_FILES} files.`;
  const big = list.find((f) => f.size > MAX_FILE_BYTES && !looksLikeImage(f));
  if (big) return `${big.name} is over 20 MB. Compress it or link to it instead.`;
  return "";
}

const stem = (name: string) => safeFileName(name).replace(/\.[^.]+$/, "").slice(0, 60);
const rand = () => Math.random().toString(36).slice(2, 7);

async function put(path: string, body: Blob, contentType: string) {
  if (body.size > MAX_FILE_BYTES) throw new Error("That file is too big. The limit is 20 MB.");
  const { error } = await getBrowserClient().storage.from(STORAGE_BUCKET).upload(path, body, { contentType, upsert: false });
  if (error) throw new Error(friendlyStorageError(error.message));
}

/** Uploads one image for use inside the post text. Returns its storage path. */
export async function uploadImage(postId: string, file: File) {
  const img = await prepareImage(file);
  const path = `${postId}/img-${Date.now()}-${rand()}-${img.width}x${img.height}.${img.ext}`;
  await put(path, img.blob, img.type);
  return path;
}

export async function uploadFiles(postId: string, files: File[], onStep?: (i: number, f: File) => void) {
  const done: StoredFile[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onStep?.(i, f);
      if (looksLikeImage(f)) {
        const img = await prepareImage(f);
        const path = `${postId}/${Date.now()}-${i}-${stem(f.name)}-${img.width}x${img.height}.${img.ext}`;
        await put(path, img.blob, img.type);
        done.push({ path, name: f.name, type: img.type, size: img.blob.size });
      } else {
        const type = uploadType(f);
        const path = `${postId}/${Date.now()}-${i}-${safeFileName(f.name)}`;
        await put(path, f, type);
        done.push({ path, name: f.name, type, size: f.size });
      }
    }
  } catch (e) {
    if (done.length) await removeStoredFiles(done.map((d) => d.path)).catch(() => {});
    throw e;
  }
  return done;
}

export async function removeStoredFiles(paths: string[]) {
  if (!paths.length) return;
  await getBrowserClient().storage.from(STORAGE_BUCKET).remove(paths);
}

/** Every file stored for a post: attachments and images in the text. */
async function listPostFolder(id: string) {
  const { data } = await getBrowserClient().storage.from(STORAGE_BUCKET).list(id, { limit: 1000 });
  const items = (data ?? []) as { name: string }[];
  return items.filter((o) => o.name && !o.name.startsWith(".")).map((o) => `${id}/${o.name}`);
}

export async function deleteBreakdown(id: string, filePaths: string[]) {
  const supabase = getBrowserClient();
  const stored = await listPostFolder(id).catch(() => [] as string[]);
  const { error, count } = await supabase.from("breakdowns").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error("Couldn't delete it. Try again.");
  if (count === 0) throw new Error("Couldn't delete it. Are you still signed in?");
  await removeStoredFiles([...new Set([...filePaths, ...stored])]).catch(() => {});
}

export async function setBreakdownFiles(id: string, files: StoredFile[]) {
  const { error, count } = await getBrowserClient()
    .from("breakdowns")
    .update({ files }, { count: "exact" })
    .eq("id", id);
  if (error || count === 0) throw new Error("Couldn't save the change. Are you still signed in?");
}

export type BreakdownFields = Pick<Breakdown, "title" | "category" | "tags" | "description" | "body" | "link">;

export async function updateBreakdown(id: string, fields: BreakdownFields) {
  const { error, count } = await getBrowserClient()
    .from("breakdowns")
    .update(fields, { count: "exact" })
    .eq("id", id);
  if (error) throw new Error(/row-level security/i.test(error.message) ? "Saving was refused. Sign in again." : "Couldn't save: " + error.message);
  if (count === 0) throw new Error("Couldn't save. Are you still signed in?");
}

function friendlyStorageError(msg: string) {
  if (/row-level security|unauthorized|not authorized/i.test(msg)) return "Upload refused. Sign in again and retry.";
  if (/mime|type/i.test(msg)) return "That file type can't be uploaded. Try a PDF, image, video or text file.";
  if (/size|too large|exceeded/i.test(msg)) return "That file is too big. The limit is 20 MB.";
  return "Upload failed: " + msg;
}
