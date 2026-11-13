# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, equally important, and they feed each other:

- **Followers and AI users.** They mostly arrive from a Pat Automates reel on Instagram or TikTok. They want to grab the prompt they just saw, understand why it works, and adapt it to their own setup. Most of them will be on a phone.
- **Brands and clients.** Companies weighing Pat for promotion and partnership deals (sponsored breakdowns, short videos, tool reviews) or for AI consulting (prompt libraries, tool audits, workflow automation, 1:1 coaching). The breakdowns and the audience behind them are what make the case to them.

There is also one admin: Pat, who publishes, edits and deletes breakdowns and reads the inquiry inbox at `/admin`.

## Product Purpose

Pat Automates is Pat's (Patrick Holmes) AI hub: practical prompt and tool breakdowns, an About page, and a Work with me page for inquiries.

The site is doing its job when all three happen:

1. Visitors find and copy the prompt they came for.
2. Visitors follow Pat on Instagram and TikTok.
3. Promotion and consulting inquiries come in through Work with me.

## Positioning

No hype. Everything is something Pat actually uses, written up the way he'd want to read it: the prompt itself, front and centre and copyable, then why it works, then what to change for your own setup. On promotion, Pat only promotes tools he'd actually use, and reviews are honest tests.

## Operating Context

- Visitors mostly come from short-form video and are on phones; the site follows the device's light/dark setting, and a moon/sun button switches it.
- Breakdowns carry copyable prompt boxes, inline images and screenshots (tap to enlarge), and PDFs to view or download.
- Breakdown categories: Claude, ChatGPT, Gemini, Grok, AI Tools, Local AI, Other.
- Inquiry types: Promotion and partnerships, AI consulting, General inquiry. Each has a budget picker: Not sure yet, Under $500, $500 to $2,000, $2,000 to $5,000, $5,000+.
- Pat publishes through a rich editor at `/admin`, signing in with an email link as `pat@patautomates.com`.

## Capabilities and Constraints

- Next.js 16 (App Router), Supabase (database, file storage, admin sign-in) and Vercel hosting. This Next.js version has breaking changes; read `node_modules/next/dist/docs/` before writing code (see `AGENTS.md`).
- Only the admin can sign in or change content. The database rules in `supabase/schema.sql` enforce this, not just the UI. Never put the Supabase secret / service_role key in the site.
- Up to 6 files per breakdown, 20 MB each.
- Site-wide values (name, email, socials, categories, inquiry types) live in `src/lib/site.ts`.

## Brand Commitments

- Name: **Pat Automates**, at patautomates.com. Owner: Patrick Holmes, "Pat" for short.
- Tagline in use: "AI, made practical."
- Voice: first person, plain and direct, mildly opinionated, no hype ("prompts that work, tools put through their paces").
- Accent colour: PatAutomates orange **#ED7436**, the same as the reels. **Never blue.** Screenshots of other apps keep their own colours.
- Socials: Instagram `@patautomates`, TikTok `@patautomates`. YouTube was removed.

## Evidence on Hand

- Portrait: `public/pat.jpg`.
- Seed breakdown: the ChatGPT headshot breakdown (`supabase/seed.sql`).
- No testimonials, client logos, case studies, follower counts or press exist in the repo. Don't invent them.

## Product Principles

1. **The prompt comes first.** A visitor who came for a prompt should reach and copy it in seconds, on a phone.
2. **Honest over impressive.** Only real usage, real tests and real claims, both in breakdowns and in promotion offers.
3. **Content earns the work.** Breakdowns build the audience, and the audience is what wins promotion and consulting. Give each a clear next step: follow, or get in touch.
4. **One brand across reels and site.** Someone arriving from a reel should recognise where they are.
