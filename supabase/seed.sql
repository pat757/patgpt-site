-- Copies across the breakdown you'd already published on the Claude version of the site.
-- Run once, after schema.sql. Safe to run again (it skips the post if it's already there).
-- The PDF that was attached to it isn't included; re-attach it from the post page if you want it.

insert into public.breakdowns (slug, title, category, tags, description, body, link, files, created_at)
values (
  'how-to-use-chatgpt-to-make-a-professional-level-headshot',
  'How to use ChatGPT to make a professional level headshot!',
  'ChatGPT',
  array['Prompting', 'Images', 'Headshot'],
  'Don''t pay for a pro photographer, do this instead',
  E'I use this as my profile picture on Linkedin, Instagram, TikTok, and YouTube!\n\n```\n/headshot (your custom instruction and/or preferences if any)\n```',
  null,
  '[]'::jsonb,
  '2026-10-12T01:25:16.774Z'
)
on conflict (slug) do nothing;
