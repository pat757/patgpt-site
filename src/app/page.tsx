import Link from "next/link";
import type { CSSProperties } from "react";
import { Arrow } from "@/components/Arrow";
import { BreakdownList } from "@/components/BreakdownList";
import { FollowScene } from "@/components/FollowScene";
import { ReelHero, type Clip } from "@/components/ReelHero";
import { promptCount } from "@/lib/body";
import { listBreakdowns } from "@/lib/data";
import { breakdownHref, catOf } from "@/lib/format";
import { INQUIRY_KINDS, SITE } from "@/lib/site";

const OFFERS = [
  {
    kind: "promotion",
    title: INQUIRY_KINDS.promotion.label,
    text: "Sponsored breakdowns, short videos and honest tool tests. I only promote tools I'd actually use.",
  },
  {
    kind: "consulting",
    title: INQUIRY_KINDS.consulting.label,
    text: "Prompt libraries for your team, tool audits, workflow automation and 1:1 coaching.",
  },
] as const;

// Each headline word lands in turn; the boxed word is the caption's keyword.
const HEADLINE: { w: string; key?: boolean }[] = [{ w: "AI," }, { w: "made" }, { w: "practical.", key: true }];

export default async function Home() {
  const { posts, isAdmin, error } = await listBreakdowns();

  // The reel plays the three newest breakdowns that open on this site.
  const clips: Clip[] = posts
    .filter((p) => breakdownHref(p).startsWith("/"))
    .slice(0, 3)
    .map((p) => ({ href: breakdownHref(p), title: p.title, category: catOf(p), prompts: promptCount(p.body) }));

  return (
    <section className="view" aria-labelledby="home-h">
      <div className="wrap">
        <div className="hero">
          <div>
            <h1 id="home-h" className="cap">
              {HEADLINE.map((h, i) => (
                <span key={h.w}>
                  <span className={h.key ? "w kw" : "w"} style={{ "--i": i } as CSSProperties}>
                    {h.w}
                  </span>
                  {i < HEADLINE.length - 1 ? " " : ""}
                </span>
              ))}
            </h1>
            <p className="intro">I&apos;m Pat. Here are the prompts, tools, and ideas that make AI worth your time.</p>
            <p className="follow-line">
              Follow along on{" "}
              {SITE.socials.map((s, i) => (
                <span key={s.label}>
                  {i > 0 && " and "}
                  <a href={s.href} target="_blank" rel="noopener noreferrer">
                    {s.label}
                  </a>
                </span>
              ))}
              .
            </p>
          </div>
          <ReelHero clips={clips} />
        </div>

        <h2 className="cap list-h">
          Latest <span className="kw">breakdowns</span>
        </h2>
        <BreakdownList posts={posts} isAdmin={isAdmin} error={error} />
      </div>

      <section className="band" aria-labelledby="hire-h">
        <div className="wrap">
          <h2 id="hire-h" className="cap">
            Work with <span className="kw">me</span>
          </h2>
          <p className="hire-lead">For brands and teams who want AI done properly, without the hype.</p>
          <ul className="offers">
            {OFFERS.map((o) => (
              <li key={o.kind}>
                <Link href={`/work-with-me?type=${o.kind}`}>
                  <span className="offer-t">{o.title}</span>
                  <span className="offer-d">{o.text}</span>
                  <span className="offer-go">
                    <Arrow />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <Link className="btn" href="/work-with-me">
            Get in touch
          </Link>
        </div>
      </section>

      <div className="wrap">
        <FollowScene />
      </div>
    </section>
  );
}
