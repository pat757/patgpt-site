// Everything site-wide in one place. If you change the admin email here,
// change it in supabase/schema.sql (the is_admin() function) too.

export const SITE = {
  name: "PatGPT",
  url: "https://patgpt-ai.com",
  domain: "patgpt-ai.com",
  email: "pat@patgpt-ai.com",
  adminEmail: "pat@patgpt-ai.com",
  owner: "Patrick Holmes",
  description:
    "Prompts, tools and AI breakdowns from Pat, plus promotion, partnerships and AI consulting.",
  socials: [
    { label: "Instagram", href: "https://www.instagram.com/patgpt.ai/" },
    { label: "TikTok", href: "https://www.tiktok.com/@patgpt.ai" },
    { label: "YouTube", href: "https://www.youtube.com/@PatGPTAI" },
  ],
} as const;

export const CATEGORIES = ["Claude", "ChatGPT", "Gemini", "Grok", "AI Tools", "Local AI", "Other"] as const;
export type Category = (typeof CATEGORIES)[number];

export const STORAGE_BUCKET = "breakdown-files";
export const MAX_FILES = 6;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;

export const INQUIRY_KINDS = {
  promotion: {
    label: "Promotion and partnerships",
    short: "Promotion",
    blurb: "Get your AI tool or product in front of an audience that uses AI every day.",
    points: [
      "Sponsored breakdowns on this site",
      "Short videos on Instagram, TikTok and YouTube",
      "Honest tool tests and reviews",
      "I only promote tools I'd actually use",
    ],
    msg: "What would you like to promote?",
    biz: "Brand or company",
  },
  consulting: {
    label: "AI consulting",
    short: "Consulting",
    blurb: "Pick the right tools, build prompts and automate real workflows.",
    points: [
      "Custom prompt libraries for your team",
      "AI tool audits and recommendations",
      "Workflow automation setup",
      "1:1 AI coaching sessions",
    ],
    msg: "What do you need help with?",
    biz: "Company (optional)",
  },
  general: {
    label: "General inquiry",
    short: "General",
    blurb: "Questions, collabs, press, or anything else.",
    points: ["Questions about a breakdown or prompt", "Collabs and guest appearances", "Press and interviews"],
    msg: "Your message",
    biz: "Company (optional)",
  },
} as const;
export type InquiryKind = keyof typeof INQUIRY_KINDS;
export const INQUIRY_ORDER: InquiryKind[] = ["promotion", "consulting", "general"];
export const BUDGETS = ["Not sure yet", "Under $500", "$500 to $2,000", "$2,000 to $5,000", "$5,000+"] as const;

export function isInquiryKind(v: unknown): v is InquiryKind {
  return typeof v === "string" && v in INQUIRY_KINDS;
}
