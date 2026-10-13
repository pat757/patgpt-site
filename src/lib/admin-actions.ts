"use client";
// Admin-only writes. The database rules (supabase/schema.sql) reject these for anyone
// who isn't signed in as the admin, so hiding the buttons is just a convenience.
import { getBrowserClient } from "./supabase/client";
import { MAX_FILES, MAX_FILE_BYTES, STORAGE_BUCKET } from "./site";
import { safeFileName, uploadType } from "./format";
import type { StoredFile } from "./types";

export function checkFiles(list: File[], existing: number) {
  if (list.length + existing > MAX_FILES) return `A post can hold up to ${MAX_FILES} files.`;
  const big = list.find((f) => f.size > MAX_FILE_BYTES);
  if (big) return `${big.name} is over 20 MB. Compress it or link to it instead.`;
  return "";
}

export async function uploadFiles(postId: string, files: File[], onStep?: (i: number, f: File) => void) {
  const supabase = getBrowserClient();
  const done: StoredFile[] = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      onStep?.(i, f);
      const type = uploadType(f);
      const path = `${postId}/${Date.now()}-${i}-${safeFileName(f.name)}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, f, { contentType: type, upsert: false });
      if (error) throw new Error(friendlyStorageError(error.message));
      done.push({ path, name: f.name, type, size: f.size });
    }
  } catch (e) {
    if (done.length) await supabase.storage.from(STORAGE_BUCKET).remove(done.map((d) => d.path));
    throw e;
  }
  return done;
}

export async function removeStoredFiles(paths: string[]) {
  if (!paths.length) return;
  await getBrowserClient().storage.from(STORAGE_BUCKET).remove(paths);
}

export async function deleteBreakdown(id: string, filePaths: string[]) {
  const supabase = getBrowserClient();
  const { error, count } = await supabase.from("breakdowns").delete({ count: "exact" }).eq("id", id);
  if (error) throw new Error("Couldn't delete it. Try again.");
  if (count === 0) throw new Error("Couldn't delete it. Are you still signed in?");
  await removeStoredFiles(filePaths).catch(() => {});
}

export async function setBreakdownFiles(id: string, files: StoredFile[]) {
  const { error, count } = await getBrowserClient()
    .from("breakdowns")
    .update({ files }, { count: "exact" })
    .eq("id", id);
  if (error || count === 0) throw new Error("Couldn't save the change. Are you still signed in?");
}

function friendlyStorageError(msg: string) {
  if (/row-level security|unauthorized|not authorized/i.test(msg)) return "Upload refused. Sign in again and retry.";
  if (/mime|type/i.test(msg)) return "That file type can't be uploaded. Try a PDF, image, video or text file.";
  if (/size|too large|exceeded/i.test(msg)) return "That file is too big. The limit is 20 MB.";
  return "Upload failed: " + msg;
}
