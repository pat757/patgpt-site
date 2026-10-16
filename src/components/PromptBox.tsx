import { CopyButton } from "./CopyButton";

/** A prompt readers can copy, as shown in a published post. */
export function PromptBox({ n, label, text }: { n: number; label: string; text: string }) {
  return (
    <div className="pbox">
      <div className="pbox-h">
        <span>
          Prompt {n} · {label || "Copy & paste"}
        </span>
        <CopyButton text={text} n={n} />
      </div>
      <pre>{text}</pre>
    </div>
  );
}
