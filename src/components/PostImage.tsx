"use client";
/* eslint-disable @next/next/no-img-element -- images are resized before upload and served straight from storage */
import { useRef } from "react";
import { imageSize } from "@/lib/body";
import { imageUrl } from "@/lib/storage";

/** An image in a post. Tap or click to see it full screen; tap again or press Esc to close. */
export function PostImage({ src, caption, children }: { src: string; caption?: string; children?: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const url = imageUrl(src);
  const size = imageSize(src);
  const alt = caption || "";
  return (
    <figure className="pimg">
      <button
        type="button"
        className={size ? "pimg-btn sized" : "pimg-btn"}
        aria-label={caption ? `Enlarge image: ${caption}` : "Enlarge image"}
        onClick={() => dialog.current?.showModal()}
        // Never wider than the image itself, and tall phone photos stop at 80% of the screen height.
        style={size ? { width: `min(100%, ${size.width}px, calc(80vh * ${(size.width / size.height).toFixed(4)}))` } : undefined}
      >
        <img src={url} alt={alt} width={size?.width} height={size?.height} loading="lazy" decoding="async" />
      </button>
      {caption && <figcaption>{caption}</figcaption>}
      {children}
      <dialog ref={dialog} className="zoom" aria-label={caption || "Image"} onClick={() => dialog.current?.close()}>
        <img src={url} alt={alt} loading="lazy" decoding="async" />
        <button type="button" className="zoom-x" aria-label="Close" autoFocus>
          ×
        </button>
      </dialog>
    </figure>
  );
}
