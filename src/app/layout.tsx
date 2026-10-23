import type { Metadata, Viewport } from "next";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/dm-sans";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { InlineScript } from "@/components/InlineScript";
import { getSession } from "@/lib/supabase/server";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: SITE.name, template: `%s | ${SITE.name}` },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: SITE.url,
    title: SITE.name,
    description: SITE.description,
    images: [{ url: "/pat.jpg", width: 800, height: 800, alt: `Pat from ${SITE.name}` }],
  },
  twitter: { card: "summary", title: SITE.name, description: SITE.description, images: ["/pat.jpg"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#150E09" },
  ],
};

// Sets light or dark before the first paint: the visitor's own choice if they picked one
// with the moon/sun button, otherwise their device's setting.
const THEME_SCRIPT = `(function(){var t=null;try{t=localStorage.getItem("patgpt-theme")}catch(e){}if(t!=="dark"&&t!=="light"){try{t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}catch(e){t="light"}}document.documentElement.setAttribute("data-theme",t)})()`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = await getSession();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <InlineScript html={THEME_SCRIPT} />
      </head>
      <body>
        <a className="skip" href="#main">
          Skip to content
        </a>
        <Header isAdmin={isAdmin} />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
