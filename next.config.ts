import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page reads fresh data from Supabase on each visit, so the simpler
  // (pre-Cache Components) rendering model is the right fit here.
  async redirects() {
    return [
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
