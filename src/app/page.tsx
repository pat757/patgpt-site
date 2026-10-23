import { BreakdownList } from "@/components/BreakdownList";
import { FollowScene } from "@/components/FollowScene";
import { listBreakdowns } from "@/lib/data";

export default async function Home() {
  const { posts, isAdmin, error } = await listBreakdowns();
  return (
    <section className="view" aria-labelledby="home-h">
      <div className="wrap">
        <p className="eyebrow">AI, made practical.</p>
        <h1 className="wordmark" id="home-h">
          Pat <span className="brand-accent">Automates</span>
        </h1>
        <p className="intro">I&apos;m Pat. Here are the prompts, tools, and ideas that make AI worth your time.</p>
        <BreakdownList posts={posts} isAdmin={isAdmin} error={error} />
        <FollowScene />
      </div>
    </section>
  );
}
