---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/breakdowns/[slug]/page.tsx","src/app/about/page.tsx","src/app/work-with-me/page.tsx"]
---

# Surface brief: Pat Automates public site (redesign)

Scope: the whole public site (home, breakdown pages, About, Work with me, not-found). Admin and the editor keep their current look. Home is Persuade; breakdown pages are Read.

Audience and job: reel followers on phones who want the prompt they just saw and to follow Pat; brands and teams on laptops deciding whether to work with Pat. Actions: copy a prompt, follow on Instagram/TikTok, get in touch.

Constraints: keep Pat's photo and the scroll-driven FollowScene; orange #ED7436 is the only accent, never blue; no invented proof, numbers or claims; keep existing behaviour (filters in the URL, gliding list, card-to-post morph, theme toggle that follows the device).

Unresolved: real reel thumbnails or video stills are not in the repo; the hero reel uses Pat's photo plus breakdown titles until real stills exist.

## Direction contract

THESIS: Pat Automates speaks in its own reel captions. Every heading lands like a caption with one keyword boxed in orange, and the homepage opens on a playing reel of the latest breakdowns. It refuses the creator-hub template (avatar, bio, card grid) and the dark AI-SaaS glow hero.

OWN-WORLD: Warm studio black ground in dark mode, white in light; orange #ED7436 as solid caption boxes and full-bleed caption bands that own whole regions; caption type in Archivo at 800-900 weight and wide width with tight leading; body in Atkinson Hyperlegible Next; 9:16 reel frames with segmented progress bars; prompts as caption cards with an orange header bar. No glows, no gradient text, no glass.

STORY: A follower lands from a reel, recognises the caption language and Pat's face, watches the latest breakdowns play as captions, taps one and copies the prompt. A brand sees the offer as caption cards and gets in touch.

FIRST VIEWPORT: Left, "AI, made practical." at about 7vw, landing word by word, "practical." boxed in orange; intro and follow line beneath. Right, a 9:16 reel frame of Pat's photo with a segmented progress bar, auto-playing the three latest breakdown titles as tappable captions. On phones the reel sits full width under the headline. Primary action: tap the playing caption to open that breakdown.

FORM: Caption Track (reel captions), my top-ranked grounded candidate, 1 of 7, chosen by the user as the pick over the assigned Trading Card Set. seed:85b92ba5200794d5. Signature interaction: the hero reel auto-advances caption clips with segmented progress, tap to skip, pause on hover and focus, static under reduced motion.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
