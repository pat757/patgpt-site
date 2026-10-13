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
  title: { default: "PatGPT AI Hub", template: "%s | PatGPT" },
  description: SITE.description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "PatGPT",
    url: SITE.url,
    title: "PatGPT AI Hub",
    description: SITE.description,
    images: [{ url: "/pat.jpg", width: 800, height: 800, alt: "Pat from PatGPT" }],
  },
  twitter: { card: "summary", title: "PatGPT AI Hub", description: SITE.description, images: ["/pat.jpg"] },
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

// Applies the saved light/dark choice before the first paint.
const THEME_SCRIPT = `try{var t=localStorage.getItem("patgpt-theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

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
