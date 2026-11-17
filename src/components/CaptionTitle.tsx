import { captionKeyword } from "@/lib/format";

/** A title set as a caption: one keyword boxed in orange, chosen by the shared rule in captionKeyword. */
export function CaptionTitle({ title, category }: { title: string; category: string }) {
  const words = title.split(/\s+/).filter(Boolean);
  const key = captionKeyword(title, category);
  return (
    <>
      {words.map((w, i) => (
        <span key={i}>
          {i === key ? <span className="kw">{w}</span> : w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </>
  );
}
