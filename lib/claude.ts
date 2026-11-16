import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Day, Idea, Profile, Room, RoomInventory, Taste, PostSummary, DayResult } from "./types";

const client = new Anthropic();
const MODEL = process.env.EOTS_MODEL ?? "claude-opus-5-5";
const BETAS = ["server-side-fallback-2026-07-01"];

// ---------- Schemas ----------

const InventorySchema = z.object({
  summary: z.string().describe("Two or three sentences describing the space and its prank potential"),
  surfaces: z.array(z.string()).describe("Floors, counters, tables, stairs, walls, ceilings, fixtures the elf could use"),
  objects: z.array(z.string()).describe("Specific objects visible: furniture, appliances, toys, decor, clothes, food, tools"),
  props: z.array(z.string()).describe("Things that could be moved, stacked, hung, wrapped, spilled or repurposed in a setup"),
  hazards: z.array(z.string()).describe("Anything fragile, electrical, valuable or unsafe that setups must avoid"),
  opportunities: z.array(z.string()).describe("Five to ten concrete, action-heavy setup hooks this room specifically enables"),
});

const IdeaSchema = z.object({
  title: z.string().describe("Punchy headline, max 8 words"),
  pitch: z.string().describe("Two sentences: what the elf did and why it is funny"),
  roomName: z.string().describe("Exact name of the room this uses, or 'Whole house'"),
  whatKidsSee: z.string().describe("The scene from the doorway in the morning, vivid, present tense"),
  steps: z.array(z.string()).describe("Numbered build steps for one adult, concrete and in order, 4 to 9 steps"),
  supplies: z.array(z.string()).describe("Everything needed, quantities where it matters"),
  setupMinutes: z.number().int().describe("Realistic set-up time"),
  chaos: z.number().int().min(1).max(5).describe("1 gentle to 5 total mayhem"),
  mess: z.number().int().min(1).max(5).describe("1 nothing to clean to 5 serious cleanup"),
  elfNote: z.string().describe("Optional short note the elf leaves behind, in the elf's voice, or empty string"),
  tags: z.array(z.string()).describe("3 to 5 lowercase tags, e.g. prank, spectacle, interactive, food, bathroom"),
});

const IdeasSchema = z.object({
  ideas: z.array(IdeaSchema),
  communityPickId: z.string().describe("The id of the one community candidate best suited to this family tonight, or empty string if none fits"),
  communityPickWhy: z.string().describe("One sentence to the parent on why that community setup suits their house and kids, or empty string"),
});

const SetupAnalysisSchema = z.object({
  description: z.string().describe("What was actually built, two to four sentences, specific about objects and scale"),
  styleSignals: z.array(z.string()).describe("Five to eight short observations about this family's style: scale, mess, humour type, props, craft level, how far they went beyond the plan"),
});

const TasteSchema = z.object({
  profile: z.string().describe("The updated taste profile as markdown bullets, max 220 words"),
  summary: z.string().describe("One sentence on what changed, written to the parent"),
});

const PostDraftSchema = z.object({
  title: z.string().describe("Punchy, max 8 words, no elf name"),
  pitch: z.string().describe("Two sentences selling the setup to other parents"),
  roomType: z.enum(["kitchen", "bathroom", "hallway", "stairs", "living room", "bedroom", "whole house", "outdoors", "other"]),
  whatKidsSee: z.string().describe("The scene from the doorway, present tense, based on the photo"),
  steps: z.array(z.string()).describe("Steps as actually done, generalised so another family can follow them in their own home, 4 to 9 steps"),
  supplies: z.array(z.string()),
  setupMinutes: z.number().int(),
  chaos: z.number().int().min(1).max(5),
  mess: z.number().int().min(1).max(5),
  tags: z.array(z.string()).describe("3 to 6 lowercase tags"),
  parentTip: z.string().describe("One practical tip from this parent's notes or the photo, or empty string"),
  safetyOk: z.boolean().describe("false if the setup involves genuine danger (fire, choking hazards for toddlers, damage to others' property, anything cruel), or if the photo contains anything unsuitable for a parents' community"),
  safetyConcern: z.string().describe("Why safetyOk is false, or empty string"),
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
    if (err instanceof Anthropic.AuthenticationError) throw new ClaudeError("Anthropic API key is missing or invalid. Set ANTHROPIC_API_KEY.");
    if (err instanceof Anthropic.RateLimitError) throw new ClaudeError("Rate limited by the API. Wait a minute and try again.");
    if (err instanceof Anthropic.APIConnectionError) throw new ClaudeError("Could not reach the Anthropic API.");
    if (err instanceof Anthropic.APIError) throw new ClaudeError(`API error ${err.status}: ${err.message}`);
    if (err instanceof Error && /resolve authentication method/i.test(err.message)) throw new ClaudeError("No Anthropic credentials found. Set ANTHROPIC_API_KEY.");
    throw err;
  }
}

function clamp(n: number) {
  return Math.min(5, Math.max(1, Math.round(n)));
}

// ---------- Prompt pieces ----------

function kidsLine(profile: Profile) {
  if (profile.kids.length === 0) return "the kids";
  return profile.kids.map((k) => (k.age ? `${k.name} (${k.age})` : k.name)).join(", ");
}

function profileBlock(profile: Profile) {
  const chaosWords = ["", "gentle", "playful", "cheeky", "chaotic", "total mayhem"];
  return [
    `Elf name: ${profile.elfName || "the elf"}`,
    `Elf personality: ${profile.elfPersonality}`,
    `Kids: ${kidsLine(profile)}`,
    `Target chaos level: ${profile.chaosLevel}/5 (${chaosWords[profile.chaosLevel] ?? "chaotic"})`,
    `Mess tolerance: ${profile.messTolerance}`,
    `Supplies on hand: ${profile.supplies || "the usual household stuff"}`,
    `Off limits / rules: ${profile.offLimits || "none given"}`,
    profile.notes ? `Family notes: ${profile.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function roomsBlock(rooms: Room[]) {
  if (rooms.length === 0) return "(No rooms photographed yet. Invent plausible setups for a typical family home.)";
  return rooms
    .map((r) => {
      if (!r.inventory) return `## ${r.name}\n(not analysed yet)${r.notes ? `\nNotes: ${r.notes}` : ""}`;
      const inv = r.inventory;
      return [
        `## ${r.name}`,
        r.notes ? `Notes from parent: ${r.notes}` : "",
        inv.summary,
        `Surfaces: ${inv.surfaces.join("; ")}`,
        `Objects: ${inv.objects.join("; ")}`,
        `Props: ${inv.props.join("; ")}`,
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
    if (d.status === "done" && chosen) {
      const r = d.result;
      lines.push(
        `- ${d.date} DONE: "${chosen.title}" (${chosen.roomName}) reaction ${r?.reaction ?? "?"}/5` +
          (r?.feedbackTags.length ? ` tags: ${r.feedbackTags.join(", ")}` : "") +
          (r?.notes ? ` note: ${r.notes}` : ""),
      );
    } else if (d.status === "planned" && chosen) lines.push(`- ${d.date} PLANNED: "${chosen.title}" (${chosen.roomName})`);
    else if (d.status === "skipped") lines.push(`- ${d.date} skipped`);
    const rejected = d.ideas.filter((i) => i.id !== d.chosenIdeaId).map((i) => `"${i.title}"`);
    if (rejected.length && d.status !== "open") lines.push(`  (not picked that day: ${rejected.join(", ")})`);
  }
  return lines.length ? lines.join("\n") : "(nothing yet, this is the start of the season)";
}

function candidatesBlock(posts: PostSummary[]) {
  if (posts.length === 0) return "(none available)";
  return posts
    .map(
      (p) =>
        `- id=${p.id} "${p.title}" [${p.roomType}, ${p.setupMinutes} min, chaos ${p.chaos}/5, mess ${p.mess}/5, ${p.upvotes} upvotes, done by ${p.uses} families, tags: ${p.tags.join(", ")}] ${p.pitch}`,
    )
    .join("\n");
}

// ---------- Room analysis ----------

export async function analyseRoom(room: { name: string; notes: string }, photosBase64: string[]): Promise<RoomInventory> {
  const system = `You are scouting locations for an Elf on the Shelf operation that favours big, physical, action-packed setups and pranks over cute little scenes. You will be shown photos of one area of a family home. Build a precise inventory the idea generator can rely on. Name specific things you can actually see (brand, colour, position where useful). Think like a prop master and a prankster: what can be stacked, wrapped, hung, spilled, rearranged, zip-lined, barricaded, toilet-papered or turned upside down here? Be concrete, not generic. Only list hazards that are genuinely there.`;
  const content: Block[] = [
    ...photosBase64.map(image),
    { type: "text", text: `Area name: ${room.name}${room.notes ? `\nParent's notes: ${room.notes}` : ""}\n\nProduce the inventory.` },
  ];
  return parse({ system, content, schema: InventorySchema, effort: "medium" });
}

// ---------- Idea generation ----------

const IDEAS_SYSTEM = `You are the creative director of overnight chaos for one family's Elf on the Shelf. Every night the elf "comes alive", and every morning the kids find the evidence.

This family is bored of the Instagram version: an elf perched somewhere holding a marshmallow. They want ACTION. The elf should look like it had an enormous, physical, slightly unhinged night. Think whole-room transformations, pranks on the house, stunts with visible aftermath:
- the hallway toilet-papered floor to ceiling, elf tangled in the middle
- a zip line of string across the kitchen with toy cars crashed in a pile below
- every pair of socks in the house tied into a rope hanging from the landing
- the sofa cushions turned into a fortress with a KEEP OUT sign and a moat of cereal
- the toilet gift-wrapped shut; the fridge contents given googly eyes
- a flour snow-angel on the counter with elf-sized footprints walking off it
- the kids' shoes all swapped onto the Christmas tree like baubles
- a crime scene with tape outline of the elf and chocolate "evidence" bags

Principles:
1. Use THIS house. Name the real rooms, surfaces and objects from the inventories. A great idea reads like it could only happen in this home.
2. Every idea is a story with physical evidence: what the elf was doing, what went wrong, what the kids walk into.
3. Scale beats cute. Prefer big visual impact. Spectacle, mess and surprise are good when within the family's limits.
4. Respect the rules: the family's off-limits list and hazards are absolute. Keep things reversible unless the family explicitly allows sacrificing items.
5. Realistic for one tired adult at night: 10 to 30 minutes of setup with supplies on hand (quick ideas under 10).
6. Never repeat or lightly rework anything in the history. Escalate across the season: later days should feel bigger or weirder than earlier ones.
7. The taste profile is what this family has actually responded to. Weight it heavily over your own defaults.
8. Give the options real variety: different rooms, different kinds of fun (spectacle / prank / interactive), different effort.
9. Community setups are real things other parents built and photographed, with their upvotes. Use them as inspiration for what lands with kids, but your own ideas must be original, not copies. Separately, pick the ONE community candidate that would work best in this specific house for this family tonight (right rooms, right chaos level, not something they've already done), or none if nothing fits.

Write steps as the parent will follow them at 11pm: short, concrete, in order, with placements and quantities. The elf note, when used, is short and in character.`;

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
}

export type GeneratedIdea = Omit<Idea, "id" | "dayId" | "slot" | "source" | "sourcePostId" | "favourite">;

export async function generateIdeas(input: GenerateInput): Promise<{ ideas: GeneratedIdea[]; communityPickId: string | null; communityPickWhy: string }> {
  const content: Block[] = [];
  const text = [
    `# Family`,
    profileBlock(input.profile),
    ``,
    `# The house`,
    roomsBlock(input.rooms),
    ``,
    `# What this family has loved so far (taste profile)`,
    input.taste.profile || "(no feedback yet; lean into the family's stated chaos level)",
    ``,
    `# Season history`,
    historyBlock(input.history),
    ``,
    `# Community setups other parents have built (candidates for tonight's community pick, and inspiration)`,
    candidatesBlock(input.communityCandidates),
    ``,
    `# Tonight`,
    input.challenge ? `This week's community challenge: "${input.challenge.title}": ${input.challenge.description} Make the WILDCARD idea a strong entry for it (the parent can share it to the challenge afterwards).` : "",
    `Date: ${input.date}` + (input.dayNumber ? ` (day ${input.dayNumber} of ${input.seasonLength})` : " (outside the usual season, treat as a bonus night)"),
    input.direction ? `Parent's direction for tonight: ${input.direction}` : "",
    input.focusRoom ? `Focus on this area: ${input.focusRoom.name}` : "",
    input.avoidTitles.length ? `Do not reuse these ideas already offered: ${input.avoidTitles.map((t) => `"${t}"`).join(", ")}` : "",
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
  const out = await parse({ system: IDEAS_SYSTEM, content, schema: IdeasSchema, effort: "high", maxTokens: 12000 });
  const validPick = input.communityCandidates.some((c) => c.id === out.communityPickId) ? out.communityPickId : null;
  return {
    ideas: out.ideas.slice(0, input.count).map((i) => ({ ...i, chaos: clamp(i.chaos), mess: clamp(i.mess), setupMinutes: Math.max(2, Math.round(i.setupMinutes)) })),
    communityPickId: validPick,
    communityPickWhy: validPick ? out.communityPickWhy : "",
  };
}

export const THREE_SLOTS = `Produce exactly 3 ideas in this order:
1. FULL SEND: the biggest, most spectacular setup you can justify tonight.
2. QUICK HIT: under 10 minutes to build, still a proper laugh with visible aftermath.
3. WILDCARD: something interactive, story-driven or just strange, e.g. the kids find a challenge, a trail, a mystery, or the elf has clearly recruited the pets or toys.`;

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
  const system = `You maintain a compact "taste profile" for one family's Elf on the Shelf: what they love, what falls flat, which rooms and props work, how big and messy they like it, the humour that lands with the kids, and what the parent finds worth the effort. The profile is injected into every future idea generation, so it must be concrete and actionable. Merge the new evidence into the existing profile: strengthen confirmed patterns, soften contradicted ones, keep it under 220 words as markdown bullets grouped under short headings (Loves / Avoid / Rooms & props / Scale & mess / Notes). Prefer specific over generic. Do not invent preferences without evidence.`;
  const reactionWords = ["", "flop", "meh", "liked it", "loved it", "lost their minds"];
  const text = [
    `# Current profile`,
    current.profile || "(empty)",
    ``,
    `# New evidence (${event.date})`,
    event.idea
      ? `Setup done: "${event.idea.title}" in ${event.idea.roomName}. ${event.idea.pitch} (chaos ${event.idea.chaos}/5, mess ${event.idea.mess}/5, tags: ${event.idea.tags.join(", ")}${event.idea.source === "community" ? ", a community idea from another parent" : ""})`
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
  elfName: string;
}

export async function packagePost(input: PackageInput) {
  const system = `You turn one family's finished Elf on the Shelf setup into a clear, reusable post for a community of parents who like big, action-packed, prank-style setups. You get the original plan (if any), a photo of what was actually built, the kids' reaction and the parent's notes. Write the post from what was ACTUALLY built (the photo wins over the plan). Generalise steps so another family can do it in their own home: refer to "the hallway" and "a kitchen chair", never this family's specific furniture, names or address. Keep the parent's voice out; this is a how-to. Do not include the kids' names. Flag safety problems honestly.`;
  const content: Block[] = [
    image(input.photoBase64),
    {
      type: "text",
      text: [
        input.idea ? `Original plan: "${input.idea.title}": ${input.idea.pitch}\nPlanned steps: ${input.idea.steps.join(" / ")}\nPlanned supplies: ${input.idea.supplies.join(", ")}` : "No written plan; the parent made it up.",
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
  return { ...out, chaos: clamp(out.chaos), mess: clamp(out.mess), setupMinutes: Math.max(2, Math.round(out.setupMinutes)) };
}
