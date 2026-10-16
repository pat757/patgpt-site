"use client";
// Gets an image ready for the web before it's uploaded, in the browser:
// - shrinks anything bigger than 2400px on its longest side
// - re-saves photos (which also strips hidden data like the GPS location phones add)
// - keeps small PNG screenshots exactly as they are, and GIFs untouched so they still animate

export const MAX_IMAGE_SIDE = 2400;
const KEEP_PNG_UNDER = 1.5 * 1024 * 1024;

export type PreparedImage = { blob: Blob; type: string; ext: string; width: number; height: number };

const EXT: Record<string, string> = { "image/webp": "webp", "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif" };

export const looksLikeImage = (f: File) =>
  f.type.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|heif|avif|bmp)$/i.test(f.name);

async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  try {
    const bmp = await createImageBitmap(file); // applies the photo's rotation
    return { source: bmp, width: bmp.width, height: bmp.height, done: () => bmp.close() };
  } catch {
    // Some browsers can show formats they can't decode this way (e.g. iPhone HEIC in Safari).
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
    } catch {
      URL.revokeObjectURL(url);
      throw new Error(`${file.name} couldn't be read. Save it as a JPG or PNG and try again.`);
    }
  }
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality?: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function prepareImage(file: File): Promise<PreparedImage> {
  const { source, width, height, done } = await decode(file);
  try {
    if (!width || !height) throw new Error(`${file.name} couldn't be read. Save it as a JPG or PNG and try again.`);
    const longest = Math.max(width, height);

    if (file.type === "image/gif") return { blob: file, type: "image/gif", ext: "gif", width, height };
    if (file.type === "image/png" && file.size <= KEEP_PNG_UNDER && longest <= MAX_IMAGE_SIDE)
      return { blob: file, type: "image/png", ext: "png", width, height };

    const scale = Math.min(1, MAX_IMAGE_SIDE / longest);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser couldn't process that image. Try another browser.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, w, h);

    let blob = await toBlob(canvas, "image/webp", 0.86);
    if (!blob || blob.type !== "image/webp") {
      // Older Safari can't save WebP. Keep transparency for PNGs, otherwise use JPG.
      blob = file.type === "image/png" ? await toBlob(canvas, "image/png") : await toBlob(canvas, "image/jpeg", 0.88);
    }
    if (!blob) throw new Error(`${file.name} couldn't be processed. Try a JPG or PNG.`);
    // A screenshot that was already small can come out bigger; keep the original then.
    if (file.type === "image/png" && scale === 1 && blob.size > file.size)
      return { blob: file, type: "image/png", ext: "png", width, height };
    return { blob, type: blob.type, ext: EXT[blob.type] || "jpg", width: w, height: h };
  } finally {
    done();
  }
}
