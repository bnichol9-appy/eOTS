# Mischief Nights (eOTS)

A PIN-locked Elf on the Shelf planner that gives you one set-up per night for **your** house, built from photos of your rooms, with one to three elves, a kit bag, an AI-assistant hand-off, and a community of other parents. "eOTS" is the kid-proof name on the home screen.

The elves are night-shift mischief-makers: big, physical, gently spooky, never scary. Toilet-papered hallways, zip lines across the kitchen, séances in the bathroom.

Runs on **Vercel** with **Neon** (Postgres) and **Vercel Blob** (photos), built with Next.js, Drizzle ORM and the Claude API.

## How it works

1. **Rooms**: photograph a room and Claude finds the hiding spots, pins them on the photo (numbered, with unsafe ones blocked) and builds a private inventory of props and mischief hooks. Kids' bedrooms are used sparingly.
2. **Tonight**: the hero plan with elf pins on your room photo, set-up time, mess and spook. Shuffle through three original options (**Full send**, **Quick hit**, **Wildcard**) plus a **community pick** from another family, then *Mark as set up*. Busy nights force five minutes, no mess, nothing to buy. With two or three elves, nights are **duo**, **split** or **solo**.
3. **Calendar**: the month at a glance with a dot per elf and the room, big nights outlined, *Plan the week* to lock in the next four nights, and a night-before reminder you can text to your assistant.
4. **Kit bag**: everything the next four nights need, grouped by night and tagged by elf, with have/buy per item. *Ask my assistant to buy these* opens WhatsApp or Messages with the order written out and a budget; or copy it as a shopping list.
5. **How did it go?**: photograph what you actually built, rate the kids' reaction and tag it. Claude analyses the photo and updates your family's *taste profile*, which feeds every future idea.
6. **Share with other elves**: one tap turns that night into a community post. Claude rewrites it as a generalised how-to, strips your kids' names and house specifics, and runs a safety check. Room photos are never shared.
7. **Ideas**: your own library (search, filters, saved) with *Dream up 3 more for my house*, and the **Other elves** community: trending, new and all-time feeds, circles, weekly challenges and elf pages.
8. **Settings**: light, dark or match-phone, your elves and their personalities, house rules (ages, spook, chaos, time limit, season), the AI assistant channel and number, reminders, co-parents, badges and the PIN.

### Social

- **Circles**: private groups (the school parents, the cousins) joined with a code. Members see each other's recent nights and can share a setup to "just my circles" instead of everyone. The nightly community pick draws from circle posts too.
- **Remakes**: do another family's setup, share your photo, and it's linked as a remake under the original. Remake counts feed the trending score and the original poster gets a nudge.
- **Weekly challenges**: a themed week (Grand Entrance, Bathroom Week, Recruit the Toys, Grand Finale). Tick "enter this week's challenge" when sharing; most upvotes at the end wins the Champion badge. The generator makes the Wildcard idea a challenge entry while one is running. The calendar lives in `lib/challenges.ts`.
- **Reminders and nudges**: an evening push if the elf hasn't moved, a morning one if last night wasn't logged, plus pings for upvote milestones, comments, remakes, circle joins and badges. Everything also lands in the in-app inbox (bell on the Tonight tab).
- **Badges**: fourteen of them, from First Night of Chaos to Toilet Paper Artisan to Champion. Shown on your Log and your public elf page.
- **Co-parents**: a family has one elf, one house and one plan but any number of logins. Share your family code from the Elf tab; your partner signs up with it. Each parent keeps their own PIN and reminder times.

The whole app is behind a PIN on top of your account: it locks when it goes to the background and always asks for the PIN on a fresh open, so kids grabbing the phone see nothing.

## Design

The app follows the design pack (made under the working name Trick or Tinsel) in `design/handoff/` (tokens, design system, reference screens, product spec). Light theme by default, dark and match-phone in Settings. Gloock for display type, DM Sans for body, Lucide line icons, no emoji.

## Deploy on Vercel

1. Push this repo and import it into Vercel.
2. In the project's **Storage** tab add the **Neon** integration (sets `DATABASE_URL`) and the **Blob** integration (sets `BLOB_STORE_ID`, used with Vercel's OIDC token, or `BLOB_READ_WRITE_TOKEN` on older stores; public and private stores both work).
3. Add environment variables `ANTHROPIC_SHARED_API` (or link the shared variable of that name; `ANTHROPIC_API_KEY` also works), `AUTH_SECRET` (any long random string, e.g. `openssl rand -hex 32`) and `CRON_SECRET` (another random string).
4. For push notifications, run `npm run vapid` locally and add the two `VAPID_*` keys it prints plus `VAPID_SUBJECT` (a `mailto:` address).
5. Deploy. The build runs `drizzle-kit migrate && next build`, so the schema is applied to Neon automatically on every deploy.

`vercel.json` schedules the nudge job every 15 minutes. On the Vercel Hobby plan cron jobs only run once a day, so either upgrade to Pro or point a free external pinger (cron-job.org etc.) at `https://<your-app>/api/cron/nudges` every 15 minutes with the header `Authorization: Bearer <CRON_SECRET>`. The job is idempotent; it never sends the same nudge twice in a day.

On iPhone, push notifications only work once the app has been added to the Home Screen.

Open the URL on your phone and use *Add to Home Screen*.

## Run locally

```bash
npm install
cp .env.example .env     # add ANTHROPIC_SHARED_API and AUTH_SECRET
npm run dev              # http://localhost:3000
```

With no `DATABASE_URL` the app uses an embedded Postgres (PGlite) in `./.pglite`, and with no Blob store configured photos go to `./.uploads`. So it runs locally with zero setup. To develop against your real Neon branch instead, run `vercel env pull .env.local`.

Useful scripts: `npm run db:generate` (new migration after changing `lib/db/schema.ts`), `npm run db:migrate`, `npm run db:studio`.

## Configuration

| Variable | Required | What it does |
| --- | --- | --- |
| `ANTHROPIC_SHARED_API` or `ANTHROPIC_API_KEY` | yes | Claude API key. The shared variable name is read first. |
| `AUTH_SECRET` | yes in production | Signs session and unlock cookies. |
| `DATABASE_URL` | on Vercel | Neon Postgres connection string. |
| `BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN` | on Vercel | Vercel Blob store for photos (set by the Blob integration). |
| `CRON_SECRET` | for nudges | Authorises the scheduled nudge job. |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | for push | Web push keys from `npm run vapid`. Without them, notifications only appear in the inbox. |
| `EOTS_MODEL` | no | Defaults to `claude-opus-5-5`. |

## Layout

```
app/(app)/        the five screens (Tonight, House, Elves, Log, Elf) behind the PIN gate
app/api/          route handlers: auth, rooms, days, ideas, taste, posts, users
components/       shell, lock screen, cards, sheets
lib/claude.ts     every prompt and structured-output schema
lib/db/schema.ts  Drizzle schema (families, users, rooms, days, ideas, taste, posts, votes, comments,
                  reports, circles, challenges, badges, notifications, push subscriptions)
lib/data.ts       queries, including the hot-ranking and circle visibility for the feed
lib/days.ts       generation, remix, community pick, "do this tonight"
lib/circles.ts, lib/challenges.ts, lib/badges.ts, lib/notify.ts
app/api/cron/     the scheduled nudge and challenge wrap-up job
drizzle/          generated SQL migrations
```

## Community ranking and moderation

Trending uses a decay score: `(upvotes + 2 × families who did it + 3 × remakes + 0.5 × comments + 1) / (hours old + 2)^1.3`. A setup that families actually build outranks one that only gets upvotes. Claude flags unsafe or unsuitable posts into review at share time, and three reports from different parents also pull a post into review (visible only to its author). Your own posts can be deleted at any time.

## Cost

A night's planning sends room inventories, the taste profile, the season history and twenty community candidates as text and gets back three ideas plus the pick. Photos are downscaled in the browser. Expect a few cents per night per family.
