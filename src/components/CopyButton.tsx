"use client";
import { useRef, useState } from "react";

const COPY_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="12" height="12" rx="2.5" />
    <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
  </svg>
);

export function CopyButton({ text, n }: { text: string; n: number }) {
  const [label, setLabel] = useState<"Copy" | "Copied" | "Press Ctrl+C">("Copy");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const btn = useRef<HTMLButtonElement>(null);

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        ta.remove();
      } catch {}
    }
    if (!ok) {
      const pre = btn.current?.closest(".pbox")?.querySelector("pre");
      if (pre) {
        const r = document.createRange();
        r.selectNodeContents(pre);
        const sel = getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
      }
    }
    setLabel(ok ? "Copied" : "Press Ctrl+C");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setLabel("Copy"), 1800);
  };

  return (
    <button ref={btn} className={`copy${label === "Copied" ? " done" : ""}`} type="button" aria-label={`Copy prompt ${n}`} onClick={copy}>
      {COPY_ICON}
      <b>{label}</b>
    </button>
  );
}
