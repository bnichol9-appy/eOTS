// Shared between server and client. Keep this file free of server-only imports.

export type ElfColor = "elf1" | "elf2" | "elf3";
export type AgeBand = "under5" | "5to8" | "9to12";
export type NightFormat = "duo" | "split" | "solo" | "single";

export interface Elf {
  name: string;
  personality: string;
  color: ElfColor;
}

export interface Kid {
  name: string;
  age: number | null;
}

export interface Profile {
  elves: Elf[];
  kids: Kid[];
  ageBands: AgeBand[];
  spookLevel: number; // 1 cosy .. 5 properly spooky
  chaosLevel: number; // 1 gentle .. 5 total mayhem
  maxSetupMinutes: number; // 5 | 10 | 20 | 30
  messTolerance: "low" | "medium" | "high";
  offLimits: string;
  supplies: string;
  notes: string;
  seasonStart: string; // MM-DD
  seasonEnd: string; // MM-DD
  onboarded: boolean;
}

export interface Spot {
  id: string;
  label: string;
  x: number; // 0..1
  y: number; // 0..1
  fitsElves: number;
  height: "low" | "mid" | "high";
  unsafe: boolean;
  unsafeReason: string | null;
  enabled: boolean;
}

export interface RoomInventory {
  summary: string;
  surfaces: string[];
  objects: string[];
  props: string[];
  hazards: string[];
  opportunities: string[];
  spots: Spot[];
}

export interface Photo {
  id: string;
  url: string;
}

export interface Room {
  id: string;
  name: string;
  notes: string;
  isKidsRoom: boolean;
  maxNights: number | null;
  photos: Photo[];
  inventory: RoomInventory | null;
  analysedAt: string | null;
  usedCount: number;
}

export interface Role {
  elf: string; // elf name
  action: string;
  roomName: string;
  spotLabel: string;
}

export interface KitItem {
  name: string;
  qty: string;
  elf: string | null;
  commonlyAtHome: boolean;
  estPriceGBP: number | null;
}

export interface Idea {
  id: string;
  dayId: string | null;
  slot: number | null;
  source: "generated" | "community" | "own";
  sourcePostId: string | null;
  favourite: boolean;
  title: string;
  pitch: string; // the story, 1-2 sentences
  roomName: string;
  format: NightFormat;
  roles: Role[];
  whatKidsSee: string;
  steps: string[];
  kit: KitItem[];
  setupMinutes: number;
  chaos: number; // 1..5
  mess: number; // 1..5
  spook: number; // 1..5
  elfNote: string;
  tags: string[];
  createdAt: string;
}

export interface DayResult {
  photoUrl: string | null;
  reaction: number;
  feedbackTags: string[];
  notes: string;
  analysis: string | null;
  learned: string | null;
  completedAt: string;
}

export interface CommunityPick {
  post: PostSummary;
  reason: string;
}

export interface Day {
  id: string;
  date: string;
  ideas: Idea[];
  chosenIdeaId: string | null;
  direction: string;
  status: "open" | "planned" | "done" | "skipped";
  isBusy: boolean;
  kitState: Record<string, boolean>; // item name -> have
  result: DayResult | null;
  postId: string | null;
  communityPick: CommunityPick | null;
  generatedAt: string | null;
}

export interface Taste {
  profile: string;
  updatedAt: string | null;
  updates: { date: string; summary: string }[];
}

export interface Moderation {
  ok: boolean;
  concern: string;
}

export interface AssistantSettings {
  channel: "whatsapp" | "imessage";
  phone: string; // E.164, e.g. +447700900123
  autoBuy: boolean;
  remindSetup: boolean;
  warnBusy: boolean;
}

export interface UserSettings {
  timezone: string;
  theme: "light" | "dark" | "system";
  eveningReminder: string | null; // "HH:MM" local, null = off
  morningReminder: string | null;
  assistant: AssistantSettings;
  nudges: { eveningSentOn?: string; morningSentOn?: string };
}

export const defaultSettings: UserSettings = {
  timezone: "UTC",
  theme: "light",
  eveningReminder: "21:00",
  morningReminder: "07:30",
  assistant: { channel: "whatsapp", phone: "", autoBuy: true, remindSetup: true, warnBusy: false },
  nudges: {},
};

export interface PublicUser {
  id: string;
  email: string;
  displayName: string;
  hasPin: boolean;
  settings: UserSettings;
  pushEnabled: boolean;
}

export interface Family {
  id: string;
  handle: string;
  inviteCode: string;
  members: { id: string; displayName: string }[];
}

export interface Badge {
  key: string;
  name: string;
  icon: string;
  description: string;
  awardedAt: string | null;
}

export interface Circle {
  id: string;
  name: string;
  inviteCode: string;
  isOwner: boolean;
  memberCount: number;
  members: { familyId: string; handle: string; elfName: string; parents: string }[];
  recent: { elfName: string; handle: string; title: string; date: string; postId: string | null }[];
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  tag: string;
  startsOn: string;
  endsOn: string;
  status: "upcoming" | "active" | "ended";
  entries: number;
  winner: { postId: string; title: string; elfName: string; handle: string } | null;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  url: string;
  readAt: string | null;
  createdAt: string;
}

export interface PostSummary {
  id: string;
  title: string;
  pitch: string;
  roomType: string;
  format: NightFormat;
  setupMinutes: number;
  chaos: number;
  mess: number;
  spook: number;
  tags: string[];
  photoUrl: string;
  reaction: number;
  upvotes: number;
  uses: number;
  remakes: number;
  commentsCount: number;
  visibility: "public" | "circles";
  challengeId: string | null;
  createdAt: string;
  author: { handle: string; displayName: string; elfName: string };
  viewer: { voted: boolean; saved: boolean; mine: boolean };
}

export interface PostDetail extends PostSummary {
  whatKidsSee: string;
  steps: string[];
  kit: KitItem[];
  parentTip: string;
  status: string;
  remakeOf: { id: string; title: string } | null;
  remakeList: PostSummary[];
  challenge: { id: string; title: string } | null;
  comments: Comment[];
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { handle: string; displayName: string; elfName: string };
  mine: boolean;
}

export interface Stats {
  nightsDone: number;
  streak: number;
  posts: number;
  upvotesReceived: number;
  remakesReceived: number;
}

export const defaultProfile: Profile = {
  elves: [],
  kids: [],
  ageBands: [],
  spookLevel: 2,
  chaosLevel: 4,
  maxSetupMinutes: 10,
  messTolerance: "medium",
  offLimits: "",
  supplies: "toilet paper, sticky tape, string, post-it notes, marker pens, balloons, wrapping paper, flour, googly eyes, a torch",
  notes: "",
  seasonStart: "12-01",
  seasonEnd: "12-24",
  onboarded: false,
};

export const ELF_COLORS: ElfColor[] = ["elf1", "elf2", "elf3"];
export const ROOM_TYPES = ["kitchen", "bathroom", "hallway", "stairs", "living room", "bedroom", "whole house", "outdoors", "other"] as const;

export function elfNames(profile: Profile): string {
  const names = profile.elves.map((e) => e.name).filter(Boolean);
  if (names.length === 0) return "the elf";
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} & ${names[names.length - 1]}`;
}

export function messWord(mess: number) {
  return mess <= 1 ? "None" : mess <= 3 ? "Low" : "Medium";
}

export function formatWord(format: NightFormat) {
  return format === "duo" ? "Duo night" : format === "split" ? "Split night" : format === "solo" ? "Solo night" : "";
}
