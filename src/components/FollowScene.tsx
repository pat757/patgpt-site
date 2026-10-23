"use client";
import { useEffect, useRef } from "react";
import { SITE } from "@/lib/site";

const TEXT = `Follow ${SITE.name} for more AI hacks!`;

/** Scroll-driven scene: the prompt types out, the camera follows, then pulls back to the full bar. */
export function FollowScene() {
  const sec = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cam = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const txt = useRef<HTMLDivElement>(null);
  const typed = useRef<HTMLSpanElement>(null);
  const rest = useRef<HTMLSpanElement>(null);
  const caret = useRef<HTMLSpanElement>(null);
  const hl = useRef<HTMLSpanElement>(null);
  const cta = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = [sec, stage, cam, bar, txt, typed, rest, caret, hl, cta].map((r) => r.current);
    if (els.some((e) => !e)) return;
    const [secEl, stageEl, camEl, barEl, txtEl, typedEl, restEl, caretEl, hlEl, ctaEl] = els as [
      HTMLElement, HTMLDivElement, HTMLDivElement, HTMLDivElement, HTMLDivElement,
      HTMLSpanElement, HTMLSpanElement, HTMLSpanElement, HTMLSpanElement, HTMLDivElement,
    ];
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
    const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    let W = 640;
    let lastN = -1;
    let ticking = false;

    const setChars = (n: number) => {
      if (n === lastN) return;
      lastN = n;
      typedEl.textContent = TEXT.slice(0, n);
      restEl.textContent = TEXT.slice(n);
    };

    const frame = () => {
      ticking = false;
      let p = 1;
      if (!reduce) {
        const r = secEl.getBoundingClientRect();
        const top = parseFloat(getComputedStyle(stageEl).top) || 0;
        const start = r.top + scrollY - top;
        const maxScroll = document.documentElement.scrollHeight - innerHeight;
        const total = Math.min(secEl.offsetHeight - stageEl.offsetHeight, maxScroll - start);
        p = clamp((scrollY - start) / Math.max(1, total), 0, 1);
      }
      const tType = clamp((p - 0.06) / 0.54, 0, 1);
      const tZoom = ease(clamp((p - 0.58) / 0.3, 0, 1));
      const tCta = clamp((p - 0.86) / 0.1, 0, 1);

      setChars(Math.round(TEXT.length * tType));
      caretEl.classList.toggle("blink", tType === 0 || tType === 1);

      const caretX = txtEl.offsetLeft + caretEl.offsetLeft;
      hlEl.style.width = Math.max(0, caretEl.offsetLeft + 6) + "px";
      hlEl.style.opacity = String(tType === 0 ? 0 : 1 - tZoom);

      const zoomIn = stageEl.clientWidth < 520 ? 2.4 : 3.2;
      const s = lerp(zoomIn, 1, tZoom);
      const focus = lerp(Math.max(caretX - 40, 24), W / 2, tZoom);
      camEl.style.transform = `scale(${s.toFixed(4)}) translate(${(-focus).toFixed(1)}px, -25px)`;

      ctaEl.style.opacity = String(tCta);
      ctaEl.style.transform = `translateY(${((1 - tCta) * 10).toFixed(1)}px)`;
      ctaEl.classList.toggle("on", tCta > 0.5);
    };
    const size = () => {
      W = Math.min(640, stageEl.clientWidth - 40);
      barEl.style.width = W + "px";
      // Shrink the bar's text on narrow screens so the whole line fits.
      barEl.style.fontSize = "";
      typedEl.textContent = TEXT;
      restEl.textContent = "";
      const needed = typedEl.offsetWidth + 6;
      const room = txtEl.clientWidth;
      if (needed > room) barEl.style.fontSize = Math.max(10, Math.floor((15 * room * 10) / needed) / 10) + "px";
      lastN = -1;
      frame();
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    };
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", size);
    document.fonts?.ready.then(size).catch(() => {});
    size();
    return () => {
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", size);
    };
  }, []);

  return (
    <section className="fs" ref={sec} aria-label={`Follow ${SITE.name} for more AI hacks`}>
      <div className="fs-stage" ref={stage}>
        <div className="fs-cam" ref={cam} aria-hidden="true">
          <div className="fs-bar" ref={bar}>
            <svg className="fs-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M12 4v16M4 12h16" />
            </svg>
            <div className="fs-text" ref={txt}>
              <span className="fs-hl" ref={hl} />
              <span className="fs-typed" ref={typed} />
              <span className="fs-caret blink" ref={caret} />
              <span className="fs-rest" ref={rest}>
                {TEXT}
              </span>
            </div>
            <div className="fs-meta">
              <span>Flash</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
              </svg>
            </div>
          </div>
        </div>
        <div className="fs-cta" ref={cta}>
          <p>New AI hacks every week.</p>
          <div className="fs-links">
            {SITE.socials.map((s) => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
