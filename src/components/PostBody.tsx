import { isHtmlBody, parseBody } from "@/lib/body";
import { PostImage } from "./PostImage";
import { PromptBox } from "./PromptBox";
import { RichBody } from "./RichBody";

export function PostBody({ text }: { text: string }) {
  if (isHtmlBody(text))
    return (
      <div className="body">
        <RichBody html={text} />
      </div>
    );

  // Posts written before the visual editor existed.
  const blocks = parseBody(text);
  return (
    <div className="body">
      {blocks.map((b, i) => {
        if (b.kind === "h") return <h2 key={i}>{b.text}</h2>;
        if (b.kind === "p") return <p key={i}>{b.text}</p>;
        if (b.kind === "img") return <PostImage key={i} src={b.src} caption={b.caption} />;
        return <PromptBox key={i} n={b.n} label={b.label} text={b.text} />;
      })}
    </div>
  );
}
