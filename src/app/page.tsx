import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/Arrow";
import { BreakdownList } from "@/components/BreakdownList";
import { FollowScene } from "@/components/FollowScene";
import { listBreakdowns } from "@/lib/data";
import { INQUIRY_KINDS } from "@/lib/site";
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
  return (
    <section className="view" aria-labelledby="home-h">
      <div className="wrap">
        <div className="hello">
          <Image className="avatar" src={pat} alt="Pat" priority sizes="88px" />
          <h1 id="home-h">AI, made practical.</h1>
        </div>
        <p className="intro">I&apos;m Pat. Here are the prompts, tools, and ideas that make AI worth your time.</p>
        <BreakdownList posts={posts} isAdmin={isAdmin} error={error} />

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
          <Link className="btn" href="/work-with-me">
            Get in touch
          </Link>
        </section>

        <FollowScene />
      </div>
    </section>
  );
}
