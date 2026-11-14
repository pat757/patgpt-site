import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/Arrow";
import { BreakdownList } from "@/components/BreakdownList";
import { CopyButton } from "@/components/CopyButton";
import { FollowScene } from "@/components/FollowScene";
import { firstPrompt } from "@/lib/body";
import { listBreakdowns } from "@/lib/data";
import { breakdownHref } from "@/lib/format";
import { INQUIRY_KINDS, SITE } from "@/lib/site";
import pat from "../../public/pat.jpg";

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

export default async function Home() {
  const { posts, isAdmin, error } = await listBreakdowns();

  // The newest post that has a prompt leads the page, so a visitor from a reel can copy it straight away.
  const lead = posts
    .map((p) => ({ post: p, prompt: firstPrompt(p.body), href: breakdownHref(p) }))
    .find((x) => x.prompt && x.href);
  const long = lead?.prompt ? lead.prompt.text.length > 520 || lead.prompt.text.split("\n").length > 10 : false;
  const example = posts.find((p) => breakdownHref(p).startsWith("/"));

  return (
    <section className="view" aria-labelledby="home-h">
      <div className="wrap">
        <div className={`hero${lead ? " has-lead" : ""}`}>
          <div className="hero-intro">
            <div className="hello">
              <Image className="avatar" src={pat} alt="Pat" priority sizes="72px" />
              <h1 id="home-h">AI, made practical.</h1>
            </div>
            <p className="intro">I&apos;m Pat. Here are the prompts, tools, and ideas that make AI worth your time.</p>
            <div className="follow-row">
              <span>New AI hacks every week on</span>
              {SITE.socials.map((s) => (
                <a key={s.label} className="soc" href={s.href} target="_blank" rel="noopener noreferrer">
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {lead?.prompt && (
            <figure className="lead">
              <figcaption className="lead-cap">
                Latest prompt, from <Link href={lead.href}>{lead.post.title}</Link>
              </figcaption>
              <div className={`pbox lead-box${long ? " clamped" : ""}`}>
                <div className="pbox-h">
                  <span>{lead.prompt.label || "Copy & paste"}</span>
                  <CopyButton text={lead.prompt.text} n={1} />
                </div>
                <pre>{lead.prompt.text}</pre>
              </div>
              <Link className="read" href={lead.href}>
                See the full breakdown <Arrow />
              </Link>
            </figure>
          )}
        </div>

        <BreakdownList posts={posts} isAdmin={isAdmin} error={error} />

        <FollowScene />

        <section className="hire" aria-labelledby="hire-h">
          <h2 id="hire-h">Work with me</h2>
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
          <div className="hire-more">
            {example && (
              <p>
                See how I write things up: <Link href={breakdownHref(example)}>{example.title}</Link>
              </p>
            )}
            <p>
              Something else? <Link href="/work-with-me?type=general">Send a general inquiry</Link>
            </p>
          </div>
        </section>
      </div>
    </section>
  );
}
