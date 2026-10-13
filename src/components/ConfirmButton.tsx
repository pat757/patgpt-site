"use client";
import { useEffect, useRef, useState } from "react";

/** A button that asks "are you sure?" inline instead of a browser pop-up. */
export function ConfirmButton({
  label,
  question,
  confirmLabel,
  busyLabel,
  onConfirm,
  className = "del",
}: {
  label: string;
  question: string;
  confirmLabel: string;
  busyLabel: string;
  onConfirm: () => Promise<void>;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "ask" | "busy">("idle");
  const [error, setError] = useState("");
  const noRef = useRef<HTMLButtonElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state === "ask") noRef.current?.focus();
  }, [state]);

  const cancel = () => {
    setState("idle");
    requestAnimationFrame(() => btnRef.current?.focus());
  };
  const go = async () => {
    setState("busy");
    setError("");
    try {
      await onConfirm();
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Something went wrong. Try again.");
      setState("idle");
    }
  };

  if (state === "ask")
    return (
      <span className="ask" role="group" aria-label={question} onKeyDown={(e) => e.key === "Escape" && cancel()}>
        <span className="ask-q">{question}</span>
        <button type="button" className="ask-yes" onClick={go}>
          {confirmLabel}
        </button>
        <button type="button" className="ask-no" onClick={cancel} ref={noRef}>
          Cancel
        </button>
      </span>
    );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={className}
        disabled={state === "busy"}
        onClick={() => {
          setError("");
          setState("ask");
        }}
      >
        {state === "busy" ? busyLabel : label}
      </button>
      {error && (
        <span className="ask-err" role="alert">
          {error}
        </span>
      )}
    </>
  );
}
