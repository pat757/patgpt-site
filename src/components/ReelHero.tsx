"use client";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import pat from "../../public/pat.jpg";
import { Arrow } from "./Arrow";

export type Clip = { href: string; title: string; category: string; prompts: number };

const DURATION = 5600; // ms each breakdown stays on screen
const WORD_STEP = 110; // ms between caption words landing

const clean = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * The homepage reel: Pat's photo in a 9:16 frame playing the latest breakdowns as captions, word by word, with a
 * segmented progress bar like a story. Tap the caption to open that breakdown. It pauses while hovered or focused
 * and has pause, previous and next buttons; with reduced motion it doesn't auto-play and captions show whole.
 */
export function ReelHero({ clips }: { clips: Clip[] }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(0); // caption words showing for the current clip
  const [held, setHeld] = useState(false); // paused with the button
  const [hover, setHover] = useState(false); // paused while hovered or focused
  const [still, setStill] = useState(false); // reduced motion
  const [cycle, setCycle] = useState(0); // restarts the progress animation when a clip restarts
  const remaining = useRef(DURATION); // time left on the current clip
  const runningSince = useRef<number | null>(null);
  const fresh = useRef(true); // a new clip just started, so its full time is still to run

  const clip = clips[index];
  const words = clip ? clip.title.split(/\s+/).filter(Boolean) : [];
  const key = clip ? words.findIndex((w) => clean(w) === clean(clip.category)) : -1;
  const paused = held || hover || still;

  useEffect(() => {
    setStill(matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const go = useCallback(
    (to: number) => {
      if (!clips.length) return;
      setIndex((to + clips.length) % clips.length);
      setCycle((c) => c + 1);
      fresh.current = true;
    },
    [clips.length],
  );

  // Caption words land one after another at the start of each clip.
  useEffect(() => {
    if (!clip) return;
    if (still) {
      setShown(words.length);
      return;
    }
    setShown(0);
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= words.length) clearInterval(t);
    }, WORD_STEP);
    return () => clearInterval(t);
    // words is derived from clip; cycle restarts the reveal when the same clip replays
  }, [clip, still, cycle]); // eslint-disable-line react-hooks/exhaustive-deps

  // Advance after the clip's time. Pausing keeps the time left, so the progress bar and the switch stay in step.
  useEffect(() => {
    if (clips.length < 2 || paused) return;
    if (fresh.current) {
      remaining.current = DURATION;
      fresh.current = false;
    }
    runningSince.current = performance.now();
    const t = setTimeout(() => go(index + 1), remaining.current);
    return () => {
      clearTimeout(t);
      if (runningSince.current !== null && !fresh.current) {
        remaining.current = Math.max(300, remaining.current - (performance.now() - runningSince.current));
      }
      runningSince.current = null;
    };
  }, [paused, index, cycle, clips.length, go]);

  return (
    <section
      className={`reel${paused ? " paused" : ""}`}
      aria-roledescription="carousel"
      aria-label="Latest breakdowns"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(false);
      }}
      style={{ "--dur": `${DURATION}ms` } as CSSProperties}
    >
      <Image className="reel-photo" src={pat} alt="" priority sizes="(max-width: 860px) 100vw, 420px" />
      {clips.length > 1 && (
        <div className="reel-bars" aria-hidden="true">
          {clips.map((c, n) => (
            <span key={c.href} className={n < index ? "done" : n === index ? "now" : ""}>
              <i key={n === index ? `now-${cycle}` : "idle"} />
            </span>
          ))}
        </div>
      )}
      <span className="reel-handle" aria-hidden="true">
        @patautomates
      </span>

      {clip ? (
        <>
          {/* Polite updates only while paused, so an auto-playing reel doesn't keep talking over the page. */}
          <Link href={clip.href} className="reel-cap" aria-live={paused ? "polite" : "off"} aria-label={`${clip.title}. Open breakdown`}>
            <span className="tag">
              {clip.category}
              {clip.prompts ? ` · ${clip.prompts} ${clip.prompts === 1 ? "prompt" : "prompts"}` : ""}
            </span>
            <span className="t" aria-hidden="true">
              {words.map((w, n) => (
                <span key={`${cycle}-${n}`}>
                  <span className={`w${n < shown ? " on" : ""}${n === key ? " k" : ""}`}>{w}</span>
                  {n < words.length - 1 ? " " : ""}
                </span>
              ))}
            </span>
          </Link>
          <div className="reel-foot">
            <Link href={clip.href} className="reel-open" tabIndex={-1} aria-hidden="true">
              Open breakdown <Arrow />
            </Link>
          </div>
          {clips.length > 1 && (
              <div className="reel-ctl">
                <button type="button" onClick={() => go(index - 1)} aria-label="Previous breakdown">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m15 6-6 6 6 6" />
                  </svg>
                </button>
                {!still && (
                  <button type="button" onClick={() => setHeld((h) => !h)} aria-label={held ? "Play" : "Pause"} aria-pressed={held}>
                    {held ? (
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M8 5.5v13l10-6.5z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <rect x="6.5" y="5.5" width="4" height="13" rx="1" />
                        <rect x="13.5" y="5.5" width="4" height="13" rx="1" />
                      </svg>
                    )}
                  </button>
                )}
                <button type="button" onClick={() => go(index + 1)} aria-label="Next breakdown">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </div>
          )}
        </>
      ) : (
        <p className="reel-empty">New breakdowns land here soon.</p>
      )}
    </section>
  );
}
