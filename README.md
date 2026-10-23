# Pat Automates — patgpt-ai.com

Pat's AI hub: prompt and tool breakdowns (with copyable prompt boxes and PDF previews), an About page, and a Work with me page for promotion, consulting and general inquiries. Built with **Next.js 16**, **Supabase** (database, file storage, admin sign-in) and hosted on **Vercel**.

- **Visitors** read breakdowns, copy prompts, see screenshots and photos (tap to enlarge), view and download PDFs, and send inquiries. The site follows each visitor's light/dark device setting, and the moon/sun button lets them switch.
- **You** (signed in as `pat@patgpt-ai.com`) publish, edit and delete breakdowns, add images anywhere in a post, attach or remove PDFs, and read your inquiry inbox at **/admin**.
- Nobody else can sign in or change anything. The database rules in `supabase/schema.sql` enforce this, not just the page buttons.

---

## One-time setup (about 20–30 minutes)

### 1. Supabase

You should already have a Supabase project called `patgpt`, created while signed in as **pat@patgpt-ai.com**.

1. **Create the database.** In Supabase, open **SQL Editor → New query**. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. You should see "Success. No rows returned."
2. **Bring over your existing post.** Make another new query, paste [`supabase/seed.sql`](supabase/seed.sql) and click **Run**. This adds the ChatGPT headshot breakdown.
3. **Create your admin login.**
   1. Go to **Authentication → Users → Add user → Create new user**.
   2. Enter `pat@patgpt-ai.com` and any password. You won't use the password, because you sign in with email links.
   3. Tick **Auto Confirm User**, then create the user.
4. **Stop strangers signing up.** Go to **Authentication → Sign In / Providers** and turn **off** "Allow new users to sign up".
5. **Tell Supabase your web address.** Go to **Authentication → URL Configuration**.
   - **Site URL:** `https://patgpt-ai.com`
   - **Redirect URLs:** add `https://patgpt-ai.com/**`, `https://*.vercel.app/**` and `http://localhost:3000/**`.
6. **Make sign-in links work on any device (recommended).** Go to **Authentication → Emails → Magic Link** (it may be under Email Templates). Replace the link in the template with:

   ```html
   <h2>Sign in to Pat Automates</h2>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/admin">Sign in</a></p>
   ```

   If you skip this step, sign-in still works, but you'll need to open the link in the same browser you requested it from.
7. **Copy your keys for Vercel.** Click **Connect** at the top of the project, or go to **Settings → API Keys**. Copy:
   - the **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - the **Publishable key** (starts with `sb_publishable_`). This key is safe to use in a website.

   **Never** use the `secret` / `service_role` key in this site.

### 2. Vercel

1. Sign in at [vercel.com](https://vercel.com) with GitHub, click **Add New → Project**, and import the `patgpt-site` repo.
2. Under **Environment Variables**, add:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | your Supabase Project URL |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your Supabase publishable key |

3. Click **Deploy**. After a minute or two you'll get a `something.vercel.app` link. Open it and check that your headshot breakdown appears.

### 3. Point patgpt-ai.com at Vercel

Your domain was bought through Google, so it's now registered with **Squarespace Domains**, and Squarespace holds its DNS. Your Google Workspace email (pat@patgpt-ai.com) also depends on that DNS, so only change the records listed here.

1. **In Vercel:** open the project and go to **Settings → Domains → Add Domain**. Enter `patgpt-ai.com` and accept the suggestion to add `www.patgpt-ai.com` too. Vercel then shows the two records you need:
   - an **A** record for `@` (often `76.76.21.21`, but newer projects may get a different address such as `216.198.79.1`)
   - a **CNAME** record for `www` (a value like `xxxxxxxx.vercel-dns-017.com`)

   **Use exactly what Vercel shows you.**
2. **In Squarespace:**
   1. Sign in to Squarespace with the Google account you used for Workspace. You can also get there from the Google Admin console: **Account → Domains → Manage domains**.
   2. Open **Domains**, select `patgpt-ai.com`, then **DNS → DNS Settings**.
   3. Under **Squarespace Defaults**, delete only the **A** records for `@` and the **CNAME** for `www`. These point at a Squarespace parking page and would clash with Vercel.
   4. Under **Custom Records**, add:
      - Type **A**, Host `@`, Data = the A value from Vercel
      - Type **CNAME**, Host `www`, Data = the CNAME value from Vercel
3. **Do not touch** any **MX** records, **TXT** records (SPF, DKIM, `google-site-verification`) or the **Google Workspace** preset. Those run your email.
4. Wait. It usually takes a few minutes, but can take up to a few hours. Vercel shows **Valid Configuration** when it's done and sets up HTTPS automatically.
5. Visit **https://patgpt-ai.com**, then send yourself a test email to make sure pat@patgpt-ai.com still receives mail.

### 4. Sign in and post

1. Go to **https://patgpt-ai.com/admin**, enter `pat@patgpt-ai.com` and click **Email me a sign-in link**.
2. Open the email and click **Sign in**. You land on your dashboard and stay signed in on that device.
3. You'll now see an **Admin** link in the menu, **Edit** and **Delete** buttons on posts, and on each post **Edit post**, **Attach PDF** and **Delete post** buttons. Visitors never see these.

> Supabase's built-in email sends at most **2 emails an hour**, and only to members of your Supabase team. That's fine for signing yourself in. If you ever need more, connect your own email service under **Authentication → Emails → SMTP Settings**.

---

## Day to day

- **New breakdown:** go to `/admin` → **Add a breakdown**.
  - **Writing:** the post box works like Google Docs. Use the toolbar (or Ctrl/⌘+B, I, U) for **bold**, *italic*, underline, headings, bulleted and numbered lists, quotes, links and divider lines.
  - **Screenshots and photos:** paste them straight in (Ctrl/⌘+V), drag them in, or use the image button. They show up right away and upload in the background. Type a caption under any image if you want one. Big photos are shrunk automatically and their hidden location data is removed. Images copied from other websites are saved to your site too when the other site allows it; if not, you'll see a note telling you to save the image and paste it in.
  - **Prompt boxes:** click the prompt box button (or type ``` and a space) to add a prompt readers can copy. Give it a label in the box header. Press Enter three times, or the down arrow at the end, to carry on writing below it.
  - **Files:** drag in PDFs or other files (up to 6 per post, 20 MB each). PDFs show inside the post with a page viewer.
- **Change a published post:** open it and click **Edit post** (or **Edit** in the list on the home page). You can change the title, summary, text and images. Images you take out are deleted when you save.
- **Add a PDF to an existing post:** open the post and use **+ Attach PDF**.
- **Inquiries:** they appear in the inbox at `/admin`, labelled Promotion, Consulting or General. Reply by clicking the sender's email.
- **Links you can share:**
  - `https://patgpt-ai.com/work-with-me?type=promotion` opens the form with Promotion selected (`?type=consulting` and `?type=general` work too).
  - `https://patgpt-ai.com/contact` redirects to Work with me.
- **Edit text, links or socials:** most site-wide details (email, social links, inquiry options, budget ranges) live in [`src/lib/site.ts`](src/lib/site.ts). Commit a change on GitHub and Vercel redeploys automatically.

## Changing the admin email

Change `adminEmail` in `src/lib/site.ts` **and** the email inside `is_admin()` at the top of `supabase/schema.sql`, then re-run `schema.sql` in the SQL Editor and add the new address under **Authentication → Users**.

## Running it on your computer

```bash
npm install
cp .env.example .env.local   # then fill in the two Supabase values
npm run dev                  # http://localhost:3000
```

## What's where

| Path | What it is |
| --- | --- |
| `src/app/page.tsx` | Home: breakdowns list and the scroll animation |
| `src/app/breakdowns/[slug]` | A single breakdown with prompt boxes, images and PDF viewer (`/edit` is the admin edit page) |
| `src/app/about`, `src/app/work-with-me` | About and contact pages |
| `src/app/admin` | Your dashboard and sign-in page |
| `src/app/auth` | Sign-in link handler and sign-out |
| `src/components` | The building blocks (list, forms, PDF viewer, animation…) |
| `src/lib/site.ts` | Site-wide settings |
| `supabase/schema.sql` | Database tables, file storage and security rules |
| `supabase/seed.sql` | Your existing breakdown |

## Costs

- **Supabase:** the free plan covers a site like this, with 500 MB of database and 1 GB of file storage. Free projects pause after a week with no activity. Normal visitor traffic keeps it awake, and if it ever pauses you just click **Restore**.
- **Vercel:** the free **Hobby** plan is for **non-commercial** use only. Vercel counts "advertising the sale of a product or service" as commercial, and the Work with me page advertises consulting and sponsorships. So this site needs the **Pro** plan, which is listed at **US$20/month**. See Vercel's [fair use guidelines](https://vercel.com/docs/limits/fair-use-guidelines#commercial-usage).
