import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import pat from "../../../public/pat.jpg";

export const metadata: Metadata = {
  title: "About",
  description: "Why Pat Automates exists: prompts that work, tools put through their paces, and no hype.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <section className="view" aria-labelledby="about-h">
      <div className="wrap">
        <div className="about-top">
          <div className="prose">
            <p className="eyebrow">About</p>
            <h1 className="pageh" id="about-h">
              Why Pat Automates exists
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
              <Link href="/work-with-me?type=consulting" style={{ color: "var(--accent-text)" }}>
                the consulting page
              </Link>{" "}
              is for.
            </p>
          </div>
          <Image className="portrait" src={pat} alt="Patrick Holmes, creator of Pat Automates" priority sizes="(max-width: 820px) 300px, 400px" />
        </div>
        <h2 className="about-sub">What you&apos;ll find here</h2>
        <div className="cards">
          <div className="card">
            <h3>Tips you can use today</h3>
            <p>Short, practical AI tricks you can try in the next five minutes.</p>
          </div>
          <div className="card">
            <h3>Prompt breakdowns</h3>
            <p>Write-ups on prompts and tools, with the copyable text front and centre.</p>
          </div>
          <Link className="card card-link" href="/work-with-me?type=consulting">
            <h3>
              Hands-on consulting <span aria-hidden="true">↗</span>
            </h3>
            <p>Prompt systems, tool audits and automation for teams that want it done properly.</p>
          </Link>
        </div>
      </div>
    </section>
  );
}
