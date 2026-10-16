import { parseBody } from "@/lib/body";
import { CopyButton } from "./CopyButton";
import { PostImage } from "./PostImage";

export function PostBody({ text }: { text: string }) {
  const blocks = parseBody(text);
  return (
    <div className="body">
      {blocks.map((b, i) => {
        if (b.kind === "h") return <h2 key={i}>{b.text}</h2>;
        if (b.kind === "p") return <p key={i}>{b.text}</p>;
        if (b.kind === "img") return <PostImage key={i} src={b.src} caption={b.caption} />;
        return (
          <div className="pbox" key={i}>
            <div className="pbox-h">
              <span>
                Prompt {b.n} · {b.label || "Copy & paste"}
              </span>
              <CopyButton text={b.text} n={b.n} />
            </div>
            <pre>{b.text}</pre>
          </div>
        );
      })}
    </div>
  );
}
