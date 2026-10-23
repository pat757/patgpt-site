"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

const KEY = "patgpt-theme";
const deviceTheme = (): "light" | "dark" => (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
function savedTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return t === "dark" || t === "light" ? t : null;
  } catch {
    return null;
  }
}

function currentTheme(): "light" | "dark" {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}
function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

export function Header({ isAdmin }: { isAdmin: boolean }) {
  const path = usePathname() || "/";
  const theme = useSyncExternalStore(subscribe, currentTheme, () => "light" as const);

  // Follow the device's light/dark setting live, unless the visitor picked one with the button.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const follow = () => {
      if (!savedTheme()) document.documentElement.setAttribute("data-theme", deviceTheme());
    };
    follow();
    mq.addEventListener("change", follow);
    return () => mq.removeEventListener("change", follow);
  }, []);

  const toggle = () => {
    const next = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      // Picking the same as the device goes back to following the device.
      if (next === deviceTheme()) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, next);
    } catch {}
  };

  const at = (href: string) => (href === "/" ? path === "/" || path.startsWith("/breakdowns") : path.startsWith(href));
  const cur = (href: string) => (at(href) ? ({ "aria-current": "page" } as const) : {});

  return (
    <header>
      <div className="wrap">
        <Link className="logo" href="/">
          Pat <span className="brand-accent">Automates</span>
        </Link>
        <nav aria-label="Main">
          <Link className="home" href="/" {...cur("/")}>
            Home
          </Link>
          <Link href="/about" {...cur("/about")}>
            About
          </Link>
          <Link className="cta" href="/work-with-me" {...cur("/work-with-me")}>
            Work with me <span aria-hidden="true">↗</span>
          </Link>
          {isAdmin && (
            <Link className="admin-link" href="/admin" {...cur("/admin")}>
              Admin
            </Link>
          )}
          <button
            className="theme"
            type="button"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            <svg className="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
            </svg>
            <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4.5" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          </button>
        </nav>
      </div>
    </header>
  );
}
