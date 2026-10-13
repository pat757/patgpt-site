"use client";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { BUDGETS, INQUIRY_KINDS, INQUIRY_ORDER, SITE, type InquiryKind } from "@/lib/site";
import { sendInquiry, type InquiryState } from "@/app/work-with-me/actions";

export function ContactForm({ initialKind }: { initialKind: InquiryKind }) {
  const [kind, setKind] = useState<InquiryKind>(initialKind);
  const [state, action, pending] = useActionState<InquiryState, FormData>(sendInquiry, null);
  const formRef = useRef<HTMLFormElement>(null);
  const radios = useRef<Record<string, HTMLButtonElement | null>>({});
  const K = INQUIRY_KINDS[kind];

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  const pick = (k: InquiryKind, focus = false) => {
    setKind(k);
    if (focus) radios.current[k]?.focus();
  };
  const onKeys = (e: React.KeyboardEvent) => {
    const keys = ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();
    const i = INQUIRY_ORDER.indexOf(kind);
    const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
    pick(INQUIRY_ORDER[(i + d + INQUIRY_ORDER.length) % INQUIRY_ORDER.length], true);
  };

  return (
    <div className="split" style={{ marginTop: 0 }}>
      <div>
        <p className="eyebrow">Work with me</p>
        <h1 className="pageh" id="contact-h">
          Let&apos;s work together
        </h1>
        <p className="muted" style={{ marginTop: 18, fontSize: "1.06rem" }}>
          Want your product in front of people who actually use AI, AI set up in your business, or just have a question?
          Pick what fits and I&apos;ll get back to you within two working days.
        </p>
        <div className="kinds" role="radiogroup" aria-label="What's this about?" onKeyDown={onKeys}>
          {INQUIRY_ORDER.map((k) => {
            const item = INQUIRY_KINDS[k];
            const on = k === kind;
            return (
              <button
                key={k}
                ref={(el) => {
                  radios.current[k] = el;
                }}
                className="kind"
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={on ? 0 : -1}
                onClick={() => pick(k)}
              >
                <span className="kind-t">
                  {item.label}
                  <i aria-hidden="true" />
                </span>
                <span className="kind-d">{item.blurb}</span>
                <span className="offer">
                  {item.points.map((pt) => (
                    <span key={pt}>{pt}</span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <p className="direct">
          Prefer email? Write to <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </p>
      </div>

      <form
        className="contact-form"
        ref={formRef}
        onSubmit={(e) => {
          // Submitting by hand keeps what people typed if sending fails
          // (a plain form action would clear the fields either way).
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => action(fd));
        }}
      >
        <input type="hidden" name="type" value={kind} />
        <div className="hp" aria-hidden="true">
          <label htmlFor="iWebsite">Leave this empty</label>
          <input id="iWebsite" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <p className="form-kind" aria-live="polite">
          Inquiry type: <b>{K.label}</b>
        </p>
        <div className="row2">
          <div className="field">
            <label htmlFor="iName">Name</label>
            <input id="iName" name="name" required maxLength={80} autoComplete="name" />
          </div>
          <div className="field">
            <label htmlFor="iEmail">Email</label>
            <input id="iEmail" name="email" type="email" required maxLength={120} autoComplete="email" />
          </div>
        </div>
        {kind !== "general" && (
          <div className="field">
            <label htmlFor="iBiz">{K.biz}</label>
            <input id="iBiz" name="business" maxLength={120} autoComplete="organization" required={kind === "promotion"} />
          </div>
        )}
        {kind === "promotion" && (
          <div className="row2">
            <div className="field">
              <label htmlFor="iProduct">Product or website</label>
              <input id="iProduct" name="product" type="url" maxLength={300} placeholder="https://" />
            </div>
            <div className="field">
              <label htmlFor="iBudget">Budget (USD)</label>
              <select id="iBudget" name="budget" defaultValue="Not sure yet">
                {BUDGETS.map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="field">
          <label htmlFor="iMsg">{K.msg}</label>
          <textarea id="iMsg" name="message" required maxLength={2000} />
        </div>
        <button className="btn" type="submit" disabled={pending}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 2 11 13" />
            <path d="M22 2 15 22l-4-9-9-4 20-7z" />
          </svg>
          {pending ? "Sending…" : "Send inquiry"}
        </button>
        <div className={`status ${state ? (state.ok ? "ok" : "err") : ""}`} role="status">
          {state?.message}
        </div>
      </form>
    </div>
  );
}
