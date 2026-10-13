import { parseBody } from "@/lib/body";
import { CopyButton } from "./CopyButton";

export function PostBody({ text }: { text: string }) {
  const blocks = parseBody(text);
  return (
    <div className="body">
      {blocks.map((b, i) => {
        if (b.kind === "h") return <h2 key={i}>{b.text}</h2>;
        if (b.kind === "p") return <p key={i}>{b.text}</p>;
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
