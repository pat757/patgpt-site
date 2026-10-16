import { STORAGE_BUCKET } from "./site";
import { SUPABASE_URL } from "./supabase/env";

const enc = (path: string) => path.split("/").map(encodeURIComponent).join("/");

/** Public URL for a stored file (the bucket is public-read). */
export const publicFileUrl = (path: string) =>
  `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${enc(path)}`;

/** Where an image in a post loads from: a file stored for the post, or an https link. */
export const imageUrl = (src: string) => (/^https?:\/\//i.test(src) ? src : publicFileUrl(src));

/** Same file, but the browser saves it under its original name. */
export const downloadFileUrl = (path: string, name: string) =>
  `${publicFileUrl(path)}?download=${encodeURIComponent(name)}`;
