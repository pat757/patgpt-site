import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads fresh data from Supabase on each visit, so the simpler
  // (pre-Cache Components) rendering model is the right fit here.
  async redirects() {
    // The site moved from patgpt-ai.com to patautomates.com. Anything on the old domain (and the www
    // version of the new one) is sent to the same page on patautomates.com, so old links keep working.
    const toNewDomain = ["patgpt-ai.com", "www.patgpt-ai.com", "www.patautomates.com"].map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: "https://patautomates.com/:path*",
      permanent: true,
    }));
    return [
      ...toNewDomain,
      { source: "/contact", destination: "/work-with-me", permanent: true },
      { source: "/login", destination: "/admin/login", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
