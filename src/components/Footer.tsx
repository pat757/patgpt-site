import Link from "next/link";
import { SITE } from "@/lib/site";

export function Footer() {
  return (
    <footer>
      <div className="wrap" style={{ maxWidth: 880 }}>
        <Link className="logo" href="/">
          Pat <span className="brand-accent">Automates</span>
        </Link>
        <div className="foot-links">
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          {SITE.socials.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
          <span>© {new Date().getFullYear()} {SITE.owner}</span>
        </div>
      </div>
    </footer>
  );
}
