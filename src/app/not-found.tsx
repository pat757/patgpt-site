import Link from "next/link";

export default function NotFound() {
  return (
    <section className="view">
      <div className="wrap notfound">
        <h1 className="pageh">
          That page isn&apos;t <span className="kw">here</span>
        </h1>
        <p className="muted" style={{ marginTop: 18 }}>
          It may have been moved or deleted. The latest breakdowns are on the home page.
        </p>
        <p style={{ marginTop: 28 }}>
          <Link className="btn" href="/">
            Go to breakdowns
          </Link>
        </p>
      </div>
    </section>
  );
}
