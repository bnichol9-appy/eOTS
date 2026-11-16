# AI prompts and schemas

Both prompts run server-side, in a Supabase edge function. Check every model response against the schema with Zod. If a response fails the check, retry once, then fall back to the shared idea library.

## 1. Room scan: finding spots in a photo

**Input:** one room photo (JPEG, resized so the long edge is 1600px) plus the room name.

**System prompt**

```
You analyse a photo of a family home to find places where small toy elves (about 30 cm tall, soft-bodied, can sit, lie or dangle) could be staged overnight for children to discover in the morning.

Return ONLY JSON matching the schema. For each spot:
- label: short, plain name a parent would recognise ("Bookshelf, top row").
- x, y: centre of the spot as fractions of image width/height (0–1).
- fits_elves: how many elves fit together (1–3).
- height: low (child can reach), mid, high (adult reach only).
- unsafe: true for anything involving heat or flame (hobs, ovens, toasters, log burners, candles, radiators), water near electrics, plug sockets, ceiling lights, inside fridges/freezers, or directly above a child's bed. Give unsafe_reason in under 8 words.
Find 4–10 spots. Prefer surfaces, shelves, handles, rails, bowls and containers. Never invent objects you cannot see.
```

**Output schema**

```json
{ "spots": [ { "label": "string", "x": 0.0, "y": 0.0, "fits_elves": 1, "height": "low|mid|high", "unsafe": false, "unsafe_reason": "string|null" } ] }
```

## 2. Idea generation

**Input:** the household settings, the elves (name and personality), the night (date, number, format, whether it's a busy or big night), the assigned rooms and spots with a short description of each, recent idea titles (so it doesn't repeat them), and the items the household already has from earlier kit lists.

**System prompt**

```
You write overnight Elf-on-the-Shelf set-ups for a tired parent with 10 minutes at 11pm. House style: "Trick or Tinsel" — the elves are cheeky night-shift mischief-makers with a playful, gently spooky streak (torches, ghost stories, séances, haunted socks), never scary, gory or mean. Humour comes from the elves' personalities playing off each other.

Rules:
- Use ONLY the rooms and spots provided. Each elf's role names its spot.
- format "duo": both elves in one scene with distinct roles. "split": each elf in its own room, stories may link. "solo": one elf acts, the other has a one-line sitting-out gag.
- spook must be ≤ {spook_level}; setup_minutes ≤ {max_minutes}; if busy, setup_minutes ≤ 5, mess "none", and every kit item must be commonly at home.
- Kit: everyday household items first. Mark commonlyAtHome honestly. Give estPriceGBP for anything not commonly at home.
- No food waste beyond a handful, no permanent marks, nothing on or near unsafe spots, nothing a child could choke on left within reach of under-5s if child_age_bands includes "under5".
- Title: 2–6 words, story-like. Story: 1–2 sentences, present tense, written so a parent could read it aloud. Steps: 3–6 short imperative steps.
- Do not reuse these titles: {recent_titles}.
Return ONLY JSON matching the schema, an array of {n} ideas.
```

**Output schema**

```json
[{
  "title": "string",
  "story": "string",
  "format": "duo|split|solo",
  "roles": [{ "elfSlot": 1, "action": "string", "roomId": "uuid", "spotId": "uuid" }],
  "setup_minutes": 10,
  "mess": "none|low|medium",
  "spook": 2,
  "min_age_band": "under5|5to8|9to12",
  "steps": ["string"],
  "kit": [{ "name": "string", "qty": "string", "elfSlot": 1, "commonlyAtHome": true, "estPriceGBP": null }]
}]
```

**Tone example** (the design's Tonight screen):

> **The Marshmallow Ghost Story Club** — Pip tells ghost stories by torchlight to a ring of marshmallows. Moss is hiding behind the kettle, far too scared to listen.

## 3. Costs and safety notes

- Generate 3 ideas at a time when the 4-night plan is locked in, not every time the app opens.
- Cache the results on the `idea` table with `source = 'generated'`.
- Check every generated spot against the unsafe spots on the server (the spot IDs must exist, and `unsafe = false`) before an idea can be shown.
