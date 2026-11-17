# Shelf Life (repo: eOTS)

A phone web app (installable PWA) that gives parents Elf-on-the-Shelf set-ups each night, built from photos of their own house, with a parent community. The product and its home-screen label are Shelf Life (formerly Mischief Nights and Trick or Tinsel; the name lives in `lib/brand.ts`, and `public/sw.js` repeats it as the fallback push title). The repo is still called eOTS.

## Stack (do not swap)

- Next.js App Router on Vercel, TypeScript, no CSS framework. All styling is in `app/globals.css` using the design tokens.
- Neon Postgres via Drizzle ORM (`lib/db/schema.ts`, migrations in `drizzle/`). With no `DATABASE_URL` the app uses embedded PGlite in `./.pglite`.
- Vercel Blob for photos (`lib/storage.ts`), local `./.uploads` fallback.
- Claude API via `@anthropic-ai/sdk` with structured outputs. Every prompt lives in `lib/claude.ts`. The key is read from `ANTHROPIC_SHARED_API` (the shared Vercel variable) or `ANTHROPIC_API_KEY`.
- Web push via `web-push`; nudges run from `app/api/cron/nudges` (see `vercel.json`).

## Design

`design/handoff/` is the design pack (made under the old name Trick or Tinsel): `tokens.json` / `tokens.css`, `DESIGN_SYSTEM.md`, nine reference screens as HTML and screenshots in light and dark, and the product spec and AI prompt docs. Its build brief assumed Expo and Supabase; that assumption was replaced by the stack above. Follow the design system's fidelity rules: colours only from tokens, the orange accent is a background colour only (text on it is `--on-accent`), Lucide line icons at 1.8px stroke, no emoji in the interface, 44px touch targets, both themes pass WCAG AA.

## Where things are

- `app/(app)/` screens: Home (`page.tsx`: pre-season countdown and get-ready list, tonight's planner in `components/home/NightPlanner.tsx`, coming-up nights, highlights and community in `components/home/Sections.tsx`; season maths in `lib/client/season.ts`), `calendar`, `rooms` (+ `new`, `[id]`), `ideas` (library and "Other elves" community, posts, circles, challenges, elf pages), `kit`, `settings` (+ `badges`), `inbox`, `onboarding`.
- `app/api/` route handlers; `lib/api.ts` wraps them. Sessions and the PIN unlock cookie are in `lib/auth.ts`.
- `lib/days.ts` generation, remix, plan-the-week, community pick. `lib/kit.ts` kit bag. `lib/assistant.ts` WhatsApp/iMessage hand-off templates. `lib/circles.ts`, `lib/challenges.ts`, `lib/badges.ts`, `lib/notify.ts`.

## Conventions

- Family-scoped data keys off `family.id` (co-parents share a family); votes, comments and push subscriptions key off `user.id`.
- Run `npm run typecheck` and `npm run build` before committing. `npm run db:generate` after changing the schema.
