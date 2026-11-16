# eOTS

A PIN-locked Elf on the Shelf planner that comes up with big, action-packed overnight setups for **your** house, learns what your family actually likes from the photos you take of what you built, and shares the best of it with other parents.

No cute elf-holding-a-marshmallow scenes. Toilet-papered hallways, zip lines across the kitchen, sock ropes down the stairs, crime scenes in the living room.

Runs on **Vercel** with **Neon** (Postgres) and **Vercel Blob** (photos), built with Next.js, Drizzle ORM and the Claude API.

## How it works

1. **House**: photograph areas of your home. Claude builds a private inventory of what's there: surfaces, props, hazards and concrete setup hooks per room.
2. **Tonight**: tap *Plan tonight's mischief* and get three original options (**Full send**, **Quick hit**, **Wildcard**) plus one **community pick**: a real setup another parent built and photographed, chosen by Claude because it fits your rooms, chaos level and taste. Remix any option, ask for a fresh batch with a direction, or ♡ an idea to save it for later.
3. **Done, how did it go?**: photograph what you actually built, rate the kids' reaction and tag it. Claude analyses the photo and updates your family's *taste profile*, which feeds every future idea.
4. **Share with other parents**: one tap turns that night (photo + plan + what really happened) into a community post. Claude rewrites it as a generalised how-to, strips your kids' names and your house specifics, and runs a safety check. Your room photos are never shared.
5. **Other elves**: the community feed. Trending / New / All-time, filter by room. Upvote, save (lands in your Saved list), comment, and *Do this tonight*. Every post shows how many families have done it. Each parent has an elf page with their stats and setups.
6. **Log**: your saved ideas, the season history, and the "elf brain" (the editable taste profile).

The whole app is behind a PIN on top of your account: it locks when it goes to the background and always asks for the PIN on a fresh open, so kids grabbing the phone see nothing.

## Deploy on Vercel

1. Push this repo and import it into Vercel.
2. In the project's **Storage** tab add the **Neon** integration (sets `DATABASE_URL`) and the **Blob** integration (sets `BLOB_READ_WRITE_TOKEN`).
3. Add environment variables `ANTHROPIC_API_KEY` and `AUTH_SECRET` (any long random string, e.g. `openssl rand -hex 32`).
4. Deploy. The build runs `drizzle-kit migrate && next build`, so the schema is applied to Neon automatically on every deploy.

Open the URL on your phone and use *Add to Home Screen*.

## Run locally

```bash
npm install
cp .env.example .env     # add ANTHROPIC_API_KEY and AUTH_SECRET
npm run dev              # http://localhost:3000
```

With no `DATABASE_URL` the app uses an embedded Postgres (PGlite) in `./.pglite`, and with no `BLOB_READ_WRITE_TOKEN` photos go to `./.uploads`. So it runs locally with zero setup. To develop against your real Neon branch instead, run `vercel env pull .env.local`.

Useful scripts: `npm run db:generate` (new migration after changing `lib/db/schema.ts`), `npm run db:migrate`, `npm run db:studio`.

## Configuration

| Variable | Required | What it does |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | yes | Claude API key. |
| `AUTH_SECRET` | yes in production | Signs session and unlock cookies. |
| `DATABASE_URL` | on Vercel | Neon Postgres connection string. |
| `BLOB_READ_WRITE_TOKEN` | on Vercel | Vercel Blob token for photos. |
| `EOTS_MODEL` | no | Defaults to `claude-opus-5-5`. |

## Layout

```
app/(app)/        the five screens (Tonight, House, Elves, Log, Elf) behind the PIN gate
app/api/          route handlers: auth, rooms, days, ideas, taste, posts, users
components/       shell, lock screen, cards, sheets
lib/claude.ts     every prompt and structured-output schema
lib/db/schema.ts  Drizzle schema (users, rooms, days, ideas, taste, posts, votes, comments, reports)
lib/data.ts       queries, including the hot-ranking for the feed
lib/days.ts       generation, remix, community pick, "do this tonight"
drizzle/          generated SQL migrations
```

## Community ranking and moderation

Trending uses a decay score: `(upvotes + 2 × families who did it + 0.5 × comments + 1) / (hours old + 2)^1.3`. A setup that families actually build outranks one that only gets upvotes. Claude flags unsafe or unsuitable posts into review at share time, and three reports from different parents also pull a post into review (visible only to its author). Your own posts can be deleted at any time.

## Cost

A night's planning sends room inventories, the taste profile, the season history and twenty community candidates as text and gets back three ideas plus the pick. Photos are downscaled in the browser. Expect a few cents per night per family.
