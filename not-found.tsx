import Link from "next/link";

export default function NotFound() {
  return (
    <section className="view">
      <div className="wrap notfound">
        <p className="eyebrow">404</p>
        <h1 className="pageh">That page isn&apos;t here</h1>
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
