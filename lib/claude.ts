import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { elfNames, type Day, type DayResult, type Idea, type PostSummary, type Profile, type Room, type RoomInventory, type Spot, type Taste } from "./types";

// The key comes from ANTHROPIC_SHARED_API (the shared Vercel variable) or ANTHROPIC_API_KEY.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_SHARED_API || process.env.ANTHROPIC_API_KEY || undefined });
const MODEL = process.env.EOTS_MODEL ?? "claude-opus-5-5";
const BETAS = ["server-side-fallback-2026-07-01"];

// ---------- Schemas ----------

const SpotSchema = z.object({
  label: z.string().describe("Short, plain name a parent would recognise, e.g. 'Bookshelf, top row'"),
  x: z.number().min(0).max(1).describe("Centre of the spot as a fraction of image width"),
  y: z.number().min(0).max(1).describe("Centre of the spot as a fraction of image height"),
  fitsElves: z.number().int().min(1).max(3).describe("How many 30 cm soft toy elves fit together"),
  height: z.enum(["low", "mid", "high"]).describe("low: a child can reach; mid; high: adult reach only"),
  unsafe: z.boolean().describe("true for heat or flame, water near electrics, plug sockets, ceiling lights, inside fridges/freezers, directly above a child's bed"),
  unsafeReason: z.string().describe("Under 8 words, or empty string"),
});

const InventorySchema = z.object({
  summary: z.string().describe("Two or three sentences describing the space and its mischief potential"),
  surfaces: z.array(z.string()).describe("Floors, counters, tables, stairs, walls, fixtures the elves could use"),
  objects: z.array(z.string()).describe("Specific objects visible: furniture, appliances, toys, decor, clothes, food, tools"),
  props: z.array(z.string()).describe("Things that could be moved, stacked, hung, wrapped, spilled or repurposed in a setup"),
  hazards: z.array(z.string()).describe("Anything fragile, electrical, valuable or unsafe that setups must avoid"),
  opportunities: z.array(z.string()).describe("Five to ten concrete, action-heavy setup hooks this room specifically enables"),
  spots: z.array(SpotSchema).describe("4 to 10 places elves could be staged, from the FIRST photo. Never invent objects you cannot see."),
});

const RoleSchema = z.object({
  elf: z.string().describe("The elf's name exactly as given"),
  action: z.string().describe("What this elf is doing, one short sentence"),
  roomName: z.string().describe("Exact room name from the house list"),
  spotLabel: z.string().describe("Exact spot label from that room's spot list, or empty string if the room has no spot list"),
});

const KitItemSchema = z.object({
  name: z.string(),
  qty: z.string().describe("Quantity or spec, e.g. 'x4', '1 roll', 'pack of 50+'; empty string if obvious"),
  elf: z.string().describe("Elf name this item is for, or empty string if shared"),
  commonlyAtHome: z.boolean().describe("Honest: would a typical family already have this?"),
  estPriceGBP: z.number().describe("Estimated price in GBP if not commonly at home, else 0"),
});

const IdeaSchema = z.object({
  title: z.string().describe("Story-like, 2 to 6 words, no elf names"),
  pitch: z.string().describe("The story in 1 to 2 sentences, present tense, written so a parent could read it aloud"),
  roomName: z.string().describe("Main room, exact name from the house list, or 'Whole house'"),
  format: z.enum(["duo", "split", "solo", "single"]).describe("single when there is one elf; otherwise duo (all elves, one scene), split (each in a different room) or solo (one acts, the others sit it out)"),
  roles: z.array(RoleSchema).describe("One role per elf"),
  whatKidsSee: z.string().describe("The scene from the doorway in the morning, vivid, present tense"),
  steps: z.array(z.string()).describe("3 to 8 short imperative steps a parent follows at 11pm"),
  kit: z.array(KitItemSchema).describe("Everything needed; everyday household items first"),
  setupMinutes: z.number().int(),
  chaos: z.number().int().min(1).max(5).describe("1 gentle to 5 total mayhem: scale and physical drama"),
  mess: z.number().int().min(1).max(5).describe("1 nothing to clean, 3 a few minutes, 5 serious cleanup"),
  spook: z.number().int().min(1).max(5).describe("1 cosy to 5 properly spooky (never scary or gory)"),
  elfNote: z.string().describe("Optional short note the elves leave, in character, or empty string"),
  tags: z.array(z.string()).describe("3 to 5 lowercase tags"),
});

const IdeasSchema = z.object({
  ideas: z.array(IdeaSchema),
  communityPickId: z.string().describe("The id of the one community candidate best suited to this family tonight, or empty string"),
  communityPickWhy: z.string().describe("One sentence to the parent on why that community setup suits their house, or empty string"),
});

const SetupAnalysisSchema = z.object({
  description: z.string().describe("What was actually built, two to four sentences, specific about objects and scale"),
  styleSignals: z.array(z.string()).describe("Five to eight short observations about this family's style"),
  suggestedTitle: z.string().describe("A short, playful title for this setup in the style of a set-up name, two to five words, e.g. 'The Great Sock Seance'"),
  whatKidsSee: z.string().describe("One sentence describing the scene the kids walk into, from their point of view"),
});

const TasteSchema = z.object({
  profile: z.string().describe("The updated taste profile as markdown bullets, max 220 words"),
  summary: z.string().describe("One sentence on what changed, written to the parent"),
});

const PostDraftSchema = z.object({
  title: z.string().describe("Story-like, 2 to 6 words, no elf names"),
  pitch: z.string().describe("Two sentences selling the setup to other parents"),
  roomType: z.enum(["kitchen", "bathroom", "hallway", "stairs", "living room", "bedroom", "whole house", "outdoors", "other"]),
  format: z.enum(["duo", "split", "solo", "single"]),
  whatKidsSee: z.string(),
  steps: z.array(z.string()).describe("Steps as actually done, generalised so another family can follow them, 3 to 8"),
  kit: z.array(KitItemSchema),
  setupMinutes: z.number().int(),
  chaos: z.number().int().min(1).max(5),
  mess: z.number().int().min(1).max(5),
  spook: z.number().int().min(1).max(5),
  tags: z.array(z.string()),
  parentTip: z.string().describe("One practical tip, or empty string"),
  safetyOk: z.boolean().describe("false if genuinely dangerous, cruel, or the photo is unsuitable for a parents' community"),
  safetyConcern: z.string(),
});

// ---------- Plumbing ----------

export class ClaudeError extends Error {}

type Block = Anthropic.Beta.BetaContentBlockParam;

function image(base64: string): Block {
  return { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64 } };
}

async function parse<T extends z.ZodType>(opts: { system: string; content: Block[]; schema: T; effort: "low" | "medium" | "high"; maxTokens?: number }): Promise<z.infer<T>> {
  try {
    const response = await client.beta.messages.parse({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 8000,
      betas: BETAS,
      fallbacks: "default",
      system: opts.system,
      output_config: { effort: opts.effort, format: zodOutputFormat(opts.schema) },
      messages: [{ role: "user", content: opts.content }],
    });
    if (response.stop_reason === "refusal") throw new ClaudeError("The model declined this request. Try a different direction.");
    if (response.stop_reason === "max_tokens") throw new ClaudeError("The response was cut off. Please try again.");
    if (!response.parsed_output) throw new ClaudeError("Could not read the model's answer. Please try again.");
    return response.parsed_output as z.infer<T>;
  } catch (err) {
    if (err instanceof ClaudeError) throw err;
    if (err instanceof Anthropic.AuthenticationError) throw new ClaudeError("Anthropic API key is missing or invalid. Set ANTHROPIC_SHARED_API or ANTHROPIC_API_KEY.");
    if (err instanceof Anthropic.RateLimitError) throw new ClaudeError("Rate limited by the API. Wait a minute and try again.");
    if (err instanceof Anthropic.APIConnectionError) throw new ClaudeError("Could not reach the Anthropic API.");
    if (err instanceof Anthropic.APIError) throw new ClaudeError(`API error ${err.status}: ${err.message}`);
    if (err instanceof Error && /resolve authentication method/i.test(err.message)) throw new ClaudeError("No Anthropic credentials found. Set ANTHROPIC_SHARED_API or ANTHROPIC_API_KEY.");
    throw err;
  }
}

const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));

// ---------- Prompt pieces ----------

function kidsLine(profile: Profile) {
  const bands = { under5: "under 5", "5to8": "5 to 8", "9to12": "9 to 12" };
  const parts = [];
  if (profile.kids.length) parts.push(profile.kids.map((k) => (k.age ? `${k.name} (${k.age})` : k.name)).join(", "));
  if (profile.ageBands.length) parts.push(`age bands: ${profile.ageBands.map((b) => bands[b]).join(", ")}`);
  return parts.join("; ") || "the kids";
}

function profileBlock(profile: Profile) {
  const chaosWords = ["", "gentle", "playful", "cheeky", "chaotic", "total mayhem"];
  const spookWords = ["", "cosy", "a shiver", "ghost-story", "haunted", "properly spooky"];
  const elves = profile.elves.length
    ? profile.elves.map((e, i) => `- ${e.name} (elf ${i + 1}): ${e.personality || "no personality set"}`).join("\n")
    : "- the elf (one elf, personality not set)";
  return [
    `Elves (${profile.elves.length || 1}):`,
    elves,
    `Kids: ${kidsLine(profile)}`,
    `Spook level: ${profile.spookLevel}/5 (${spookWords[profile.spookLevel] ?? ""}) - ideas must not exceed this${profile.ageBands.includes("under5") ? "; a child is under 5 so cap spook at 3 regardless" : ""}`,
    `Chaos level: ${profile.chaosLevel}/5 (${chaosWords[profile.chaosLevel] ?? ""}) - how big and physical the family likes it`,
    `Most time the parent will give it at 11pm: ${profile.maxSetupMinutes} minutes - setupMinutes must not exceed this`,
    `Mess tolerance: ${profile.messTolerance}`,
    `Supplies usually at home: ${profile.supplies || "the usual household stuff"}`,
    `Off limits / house rules: ${profile.offLimits || "none given"}`,
    profile.notes ? `Family notes: ${profile.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function roomsBlock(rooms: Room[]) {
  if (rooms.length === 0) return "(No rooms photographed yet. Invent plausible setups for a typical family home, roomName 'Whole house', spotLabel empty.)";
  return rooms
    .map((r) => {
      const limit = r.isKidsRoom ? ` [kids' bedroom: use sparingly, max ${r.maxNights ?? 2} nights a season, never two nights running]` : "";
      if (!r.inventory) return `## ${r.name}${limit}\n(not analysed yet)${r.notes ? `\nNotes: ${r.notes}` : ""}`;
      const inv = r.inventory;
      const usable = inv.spots.filter((s) => s.enabled && !s.unsafe);
      const blocked = inv.spots.filter((s) => s.unsafe || !s.enabled);
      return [
        `## ${r.name}${limit}`,
        r.notes ? `Notes from parent: ${r.notes}` : "",
        inv.summary,
        `Objects: ${inv.objects.join("; ")}`,
        `Props: ${inv.props.join("; ")}`,
        usable.length ? `Spots the elves can use: ${usable.map((s) => `"${s.label}" (fits ${s.fitsElves}, ${s.height})`).join("; ")}` : "",
        blocked.length ? `NEVER use: ${blocked.map((s) => `"${s.label}"${s.unsafeReason ? ` (${s.unsafeReason})` : ""}`).join("; ")}` : "",
        inv.hazards.length ? `Avoid: ${inv.hazards.join("; ")}` : "",
        `Hooks: ${inv.opportunities.join("; ")}`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

function historyBlock(days: Day[]) {
  const lines: string[] = [];
  for (const d of days) {
    const chosen = d.ideas.find((i) => i.id === d.chosenIdeaId);
    if (!chosen && d.status !== "skipped") continue;
    if (chosen) {
      const rooms = [...new Set([chosen.roomName, ...chosen.roles.map((r) => r.roomName)])].filter(Boolean).join(" + ");
      const r = d.result;
      lines.push(
        `- ${d.date} ${d.status.toUpperCase()}: "${chosen.title}" [${chosen.format}, ${rooms}]` +
          (r ? ` reaction ${r.reaction}/5${r.feedbackTags.length ? `, tags: ${r.feedbackTags.join(", ")}` : ""}${r.notes ? `, note: ${r.notes}` : ""}` : ""),
      );
    } else lines.push(`- ${d.date} skipped`);
    const rejected = d.ideas.filter((i) => i.id !== d.chosenIdeaId).map((i) => `"${i.title}"`);
    if (rejected.length && d.status !== "open") lines.push(`  (offered but not picked: ${rejected.join(", ")})`);
  }
  return lines.length ? lines.join("\n") : "(nothing yet, this is the start of the season)";
}

function candidatesBlock(posts: PostSummary[]) {
  if (posts.length === 0) return "(none available)";
  return posts
    .map((p) => `- id=${p.id} "${p.title}" [${p.roomType}, ${p.setupMinutes} min, chaos ${p.chaos}/5, spook ${p.spook}/5, ${p.upvotes} upvotes, done by ${p.uses} families] ${p.pitch}`)
    .join("\n");
}

// ---------- Room scan ----------

export async function analyseRoom(room: { name: string; notes: string; isKidsRoom: boolean }, photosBase64: string[]): Promise<Omit<RoomInventory, "spots"> & { spots: Omit<Spot, "id" | "enabled">[] }> {
  const system = `You analyse photos of one area of a family home for an Elf-on-the-Shelf operation. The elves are small soft toys (about 30 cm, can sit, lie or dangle) staged overnight for children to find. The family likes big, physical, action-packed setups and pranks, not cute little poses.

Do two jobs:
1. Build a precise inventory the idea generator can rely on. Name specific things you can actually see. Think like a prop master: what can be stacked, wrapped, hung, spilled, rearranged, zip-lined, barricaded or turned upside down here?
2. Find 4 to 10 hiding spots in the FIRST photo with x,y as fractions of the image. Prefer surfaces, shelves, handles, rails, bowls and containers. Mark unsafe anything involving heat or flame (hobs, ovens, toasters, log burners, candles, radiators), water near electrics, plug sockets, ceiling lights, inside fridges or freezers, or directly above a child's bed. Never invent objects you cannot see.`;
  const content: Block[] = [
    ...photosBase64.map(image),
    { type: "text", text: `Area name: ${room.name}${room.isKidsRoom ? " (a child's bedroom)" : ""}${room.notes ? `\nParent's notes: ${room.notes}` : ""}\n\nProduce the inventory and the spots.` },
  ];
  const out = await parse({ system, content, schema: InventorySchema, effort: "medium" });
  return { ...out, spots: out.spots.map((s) => ({ ...s, unsafeReason: s.unsafeReason || null })) };
}

// ---------- Idea generation ----------

const IDEAS_SYSTEM = `You write overnight Elf-on-the-Shelf set-ups for a tired parent at 11pm. House style: "Shelf Life". The elves are cheeky night-shift mischief-makers with a playful, gently spooky streak (torches, ghost stories, séances, haunted socks), never scary, gory or mean. Humour comes from the elves' personalities playing off each other.

This family is bored of the Instagram version: an elf perched somewhere holding a marshmallow. Their chaos level tells you how big and physical to go. At chaos 4 or 5 the elves should look like they had an enormous night: whole-room transformations, pranks on the house, stunts with visible aftermath (the hallway toilet-papered, a string zip line across the kitchen with toy cars crashed below, every sock tied into a rope down the stairs, the sofa cushions turned into a fortress with a KEEP OUT sign, the toilet gift-wrapped shut, a flour snow-angel on the counter). At chaos 1 or 2 keep it to a scene in one spot.

Rules:
1. Use THIS house. Each role names a real room and, where the room has a spot list, an exact spot label. Never use spots marked NEVER. A great idea reads like it could only happen in this home.
2. Formats. With one elf the format is "single". With two or more: "duo" puts all elves in one scene with distinct roles; "split" puts each elf in a different room (stories may link); "solo" has one elf act while the others sit it out with a one-line gag. Aim for roughly 60% duo, 30% split, 10% solo across the season and never the same format more than three nights running (see history). Night 1 and the last night are big nights: always duo (or single), the biggest idea of the season.
3. No elf uses the same room two nights running (check the history). Kids' bedrooms are used sparingly and never two nights in a row.
4. spook must not exceed the family's spook level; setupMinutes must not exceed their time limit. On a BUSY night: setupMinutes 5 or less, mess 1, and every kit item commonlyAtHome.
5. Kit: everyday household items first. Mark commonlyAtHome honestly. Give estPriceGBP for anything not commonly at home. No food waste beyond a handful, no permanent marks, nothing near unsafe spots, nothing a child could choke on within reach if there is a child under 5. Keep things reversible unless the family's rules explicitly allow sacrificing items.
6. Never repeat or lightly rework anything in the history. Escalate across the season.
7. The taste profile is what this family has actually responded to. Weight it heavily.
8. Community setups are real things other parents built. Use them as inspiration, never copy. Separately pick the ONE candidate that would work best in this house tonight, or none.

Title: 2 to 6 words, story-like. Pitch: the story in 1 to 2 sentences a parent could read aloud. Steps: short, imperative, in order, with placements and quantities.`;

export interface GenerateInput {
  profile: Profile;
  rooms: Room[];
  taste: Taste;
  history: Day[];
  date: string;
  dayNumber: number | null;
  seasonLength: number;
  direction: string;
  focusRoom: Room | null;
  focusPhotos: string[];
  count: number;
  avoidTitles: string[];
  slotHint: string;
  communityCandidates: PostSummary[];
  challenge: { title: string; description: string } | null;
  isBusy: boolean;
}

export type GeneratedIdea = Omit<Idea, "id" | "dayId" | "slot" | "source" | "sourcePostId" | "favourite" | "createdAt">;

export async function generateIdeas(input: GenerateInput): Promise<{ ideas: GeneratedIdea[]; communityPickId: string | null; communityPickWhy: string }> {
  const content: Block[] = [];
  const big = input.dayNumber === 1 || input.dayNumber === input.seasonLength;
  const text = [
    `# Family`,
    profileBlock(input.profile),
    ``,
    `# The house`,
    roomsBlock(input.rooms),
    ``,
    `# What this family has loved so far (taste profile)`,
    input.taste.profile || "(no feedback yet; lean into the family's stated chaos and spook levels)",
    ``,
    `# Season history (most recent last)`,
    historyBlock(input.history),
    ``,
    `# Community setups other parents have built (candidates and inspiration)`,
    candidatesBlock(input.communityCandidates),
    ``,
    `# Tonight`,
    `Date: ${input.date}` + (input.dayNumber ? ` (night ${input.dayNumber} of ${input.seasonLength}${big ? ", a BIG NIGHT" : ""})` : " (outside the usual season, treat as a bonus night)"),
    input.isBusy ? "This is a BUSY night: 5 minutes max, no mess, nothing to buy." : "",
    input.challenge ? `This week's community challenge: "${input.challenge.title}": ${input.challenge.description} Make one idea a strong entry for it.` : "",
    input.direction ? `Parent's direction for tonight: ${input.direction}` : "",
    input.focusRoom ? `Focus on this area: ${input.focusRoom.name}` : "",
    input.avoidTitles.length ? `Do not reuse these titles: ${input.avoidTitles.map((t) => `"${t}"`).join(", ")}` : "",
    ``,
    input.slotHint,
  ]
    .filter((l) => l !== "")
    .join("\n");
  content.push({ type: "text", text });
  if (input.focusRoom && input.focusPhotos.length) {
    content.push({ type: "text", text: `Photos of the focus area (${input.focusRoom.name}):` });
    for (const p of input.focusPhotos) content.push(image(p));
  }
  const out = await parse({ system: IDEAS_SYSTEM, content, schema: IdeasSchema, effort: "high", maxTokens: 14000 });
  const validPick = input.communityCandidates.some((c) => c.id === out.communityPickId) ? out.communityPickId : null;
  const names = new Set(input.profile.elves.map((e) => e.name));
  return {
    ideas: out.ideas.slice(0, input.count).map((i) => ({
      ...i,
      format: input.profile.elves.length <= 1 ? "single" : i.format,
      roles: i.roles.filter((r) => names.size === 0 || names.has(r.elf)),
      kit: i.kit.map((k) => ({ ...k, elf: k.elf || null, estPriceGBP: k.commonlyAtHome ? null : k.estPriceGBP || null })),
      chaos: clamp(i.chaos),
      mess: clamp(i.mess),
      spook: clamp(i.spook),
      setupMinutes: Math.max(2, Math.round(i.setupMinutes)),
    })),
    communityPickId: validPick,
    communityPickWhy: validPick ? out.communityPickWhy : "",
  };
}

export const THREE_SLOTS = `Produce exactly 3 ideas in this order:
1. FULL SEND: the biggest, most spectacular setup you can justify tonight within the time limit.
2. QUICK HIT: 5 minutes or less to build, still a proper laugh with visible aftermath.
3. WILDCARD: something interactive, story-driven or just strange: the kids find a challenge, a trail, a mystery, or the elves have clearly recruited the pets or toys.`;

export const ONE_SLOT = `Produce exactly 1 idea: the best single plan for this night given the rules above. Leave communityPickId empty.`;

// ---------- Learning ----------

export async function analyseSetup(photoBase64: string, idea: Idea | null, notes: string) {
  const system = `You are reviewing a photo of an Elf on the Shelf setup a parent built last night. Describe precisely what was built and extract style signals that tell us what this family actually enjoys doing (scale, mess, humour, effort, props, improvisation beyond the plan). Be specific and observational, not flattering.`;
  const content: Block[] = [
    image(photoBase64),
    {
      type: "text",
      text:
        (idea ? `The plan was: "${idea.title}": ${idea.pitch}\nPlanned steps: ${idea.steps.join(" / ")}\n` : "There was no written plan.\n") +
        (notes ? `Parent's notes: ${notes}\n` : "") +
        "Analyse the photo.",
    },
  ];
  return parse({ system, content, schema: SetupAnalysisSchema, effort: "medium" });
}

export interface TasteEvent {
  date: string;
  idea: Idea | null;
  reaction: number;
  feedbackTags: string[];
  notes: string;
  analysis: { description: string; styleSignals: string[] } | null;
  rejectedTitles: string[];
}

export async function updateTaste(current: Taste, event: TasteEvent) {
  const system = `You maintain a compact "taste profile" for one family's Elf on the Shelf: what they love, what falls flat, which rooms and props work, how big, messy and spooky they like it, the humour that lands with the kids, and what the parent finds worth the effort. The profile is injected into every future idea generation, so it must be concrete and actionable. Merge the new evidence into the existing profile: strengthen confirmed patterns, soften contradicted ones, keep it under 220 words as markdown bullets grouped under short headings (Loves / Avoid / Rooms & props / Scale & mess / Notes). Prefer specific over generic. Do not invent preferences without evidence.`;
  const reactionWords = ["", "flop", "meh", "liked it", "loved it", "lost their minds"];
  const text = [
    `# Current profile`,
    current.profile || "(empty)",
    ``,
    `# New evidence (${event.date})`,
    event.idea
      ? `Setup done: "${event.idea.title}" (${event.idea.format}, ${event.idea.roomName}). ${event.idea.pitch} (chaos ${event.idea.chaos}/5, mess ${event.idea.mess}/5, spook ${event.idea.spook}/5${event.idea.source === "community" ? ", a community idea from another parent" : ""})`
      : "Setup done: parent's own idea.",
    `Kids' reaction: ${event.reaction}/5 (${reactionWords[event.reaction] ?? ""})`,
    event.feedbackTags.length ? `Parent's feedback tags: ${event.feedbackTags.join(", ")}` : "",
    event.notes ? `Parent's notes: ${event.notes}` : "",
    event.analysis ? `Photo of the real setup: ${event.analysis.description}\nStyle signals: ${event.analysis.styleSignals.join("; ")}` : "",
    event.rejectedTitles.length ? `Options offered that day but not picked: ${event.rejectedTitles.join(", ")}` : "",
    ``,
    `Update the profile.`,
  ]
    .filter((l) => l !== "")
    .join("\n");
  return parse({ system, content: [{ type: "text", text }], schema: TasteSchema, effort: "medium" });
}

// ---------- Community packaging ----------

export interface PackageInput {
  photoBase64: string;
  idea: Idea | null;
  result: DayResult;
  ownDescription: string;
  profile: Profile;
}

export async function packagePost(input: PackageInput) {
  const system = `You turn one family's finished Elf on the Shelf setup into a clear, reusable post for a community of parents who like big, action-packed, gently spooky setups. You get the original plan (if any), a photo of what was actually built, the kids' reaction and the parent's notes. Write the post from what was ACTUALLY built (the photo wins over the plan). Generalise steps so another family can do it in their own home: "the hallway", "a kitchen chair", never this family's specific furniture, names or address. Do not include the kids' names. Flag safety problems honestly.`;
  const content: Block[] = [
    image(input.photoBase64),
    {
      type: "text",
      text: [
        `The family's elves: ${elfNames(input.profile)}.`,
        input.idea ? `Original plan: "${input.idea.title}" (${input.idea.format}): ${input.idea.pitch}\nPlanned steps: ${input.idea.steps.join(" / ")}\nPlanned kit: ${input.idea.kit.map((k) => k.name).join(", ")}` : "No written plan; the parent made it up.",
        input.ownDescription ? `Parent describes it as: ${input.ownDescription}` : "",
        input.result.notes ? `Parent's notes after the night: ${input.result.notes}` : "",
        input.result.analysis ? `Photo analysis: ${input.result.analysis}` : "",
        `Kids' reaction: ${input.result.reaction}/5`,
        input.result.feedbackTags.length ? `Parent's tags: ${input.result.feedbackTags.join(", ")}` : "",
        ``,
        `Write the community post.`,
      ]
        .filter((l) => l !== "")
        .join("\n"),
    },
  ];
  const out = await parse({ system, content, schema: PostDraftSchema, effort: "medium" });
  return {
    ...out,
    kit: out.kit.map((k) => ({ ...k, elf: k.elf || null, estPriceGBP: k.commonlyAtHome ? null : k.estPriceGBP || null })),
    chaos: clamp(out.chaos),
    mess: clamp(out.mess),
    spook: clamp(out.spook),
    setupMinutes: Math.max(2, Math.round(out.setupMinutes)),
  };
}
