import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Arrow } from "@/components/Arrow";
import pat from "../../../public/pat.jpg";

export const metadata: Metadata = {
  title: "About",
  description: "Why Pat Automates exists: prompts that work, tools put through their paces, and no hype.",
  alternates: { canonical: "/about" },
};

// What visitors get, as caption rows; the last one leads to consulting.
const FIND = [
  { t: "Tips you can use today", d: "Short, practical AI tricks you can try in the next five minutes." },
  { t: "Prompt breakdowns", d: "Write-ups on prompts and tools, with the copyable text front and centre." },
  { t: "Hands-on consulting", d: "Prompt systems, tool audits and automation for teams that want it done properly.", href: "/work-with-me?type=consulting" },
];

export default function AboutPage() {
  return (
    <section className="view" aria-labelledby="about-h">
      <div className="wrap">
        <div className="about-top">
          <div className="prose">
            <h1 className="pageh" id="about-h">
              Why Pat Automates <span className="kw">exists</span>
            </h1>
            <p>
              I&apos;m Patrick Holmes, Pat for short. Pat Automates is where I keep the stuff that actually works: prompts I use
              every week, tools I&apos;ve put through their paces, and the odd opinion about where AI is genuinely useful
              versus where it&apos;s noise.
            </p>
            <p>
              No hype, no &quot;10 prompts that will replace your job&quot;. Everything here gets written up the way I&apos;d
              want to read it: the prompt itself, why it works, and what you&apos;d change for your own setup.
            </p>
            <p>
              If you&apos;d rather have someone build this for your team than read about it, that&apos;s what{" "}
              <Link href="/work-with-me?type=consulting">the consulting page</Link> is for.
            </p>
          </div>
          <div className="portrait-reel">
            <Image className="portrait" src={pat} alt="Patrick Holmes, creator of Pat Automates" priority sizes="(max-width: 820px) 420px, 380px" />
            <p className="cap-line" aria-hidden="true">
              I&apos;m <span className="kw">Pat.</span>
            </p>
          </div>
        </div>

        <section className="find" aria-labelledby="find-h">
          <h2 className="cap" id="find-h">
            What you&apos;ll find <span className="kw">here</span>
          </h2>
          <ul className="find-list">
            {FIND.map((f) => (
              <li key={f.t}>
                {f.href ? (
                  <Link className="row" href={f.href}>
                    <span className="t">{f.t}</span>
                    <span className="d">{f.d}</span>
                    <span className="go">
                      <Arrow />
                    </span>
                  </Link>
                ) : (
                  <div className="row">
                    <span className="t">{f.t}</span>
                    <span className="d">{f.d}</span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  );
}
