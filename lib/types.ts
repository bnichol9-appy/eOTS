// Shared between server and client. Keep this file free of server-only imports.

export interface Kid {
  name: string;
  age: number | null;
}

export interface Profile {
  elfName: string;
  elfPersonality: string;
  kids: Kid[];
  chaosLevel: number; // 1..5
  messTolerance: "low" | "medium" | "high";
  offLimits: string;
  supplies: string;
  notes: string;
  seasonStart: string; // MM-DD
  seasonEnd: string; // MM-DD
}

export interface RoomInventory {
  summary: string;
  surfaces: string[];
  objects: string[];
  props: string[];
  hazards: string[];
  opportunities: string[];
}

export interface Photo {
  id: string;
  url: string;
}

export interface Room {
  id: string;
  name: string;
  notes: string;
  photos: Photo[];
  inventory: RoomInventory | null;
  analysedAt: string | null;
}

export interface Idea {
  id: string;
  dayId: string | null;
  slot: number | null;
  source: "generated" | "community" | "own";
  sourcePostId: string | null;
  favourite: boolean;
  title: string;
  pitch: string;
  roomName: string;
  whatKidsSee: string;
  steps: string[];
  supplies: string[];
  setupMinutes: number;
  chaos: number;
  mess: number;
  elfNote: string;
  tags: string[];
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

export interface PostSummary {
  id: string;
  title: string;
  pitch: string;
  roomType: string;
  setupMinutes: number;
  chaos: number;
  mess: number;
  tags: string[];
  photoUrl: string;
  reaction: number;
  upvotes: number;
  uses: number;
  commentsCount: number;
  remakes: number;
  visibility: "public" | "circles";
  challengeId: string | null;
  createdAt: string;
  author: { handle: string; displayName: string; elfName: string };
  viewer: { voted: boolean; saved: boolean; mine: boolean };
}

export interface PostDetail extends PostSummary {
  whatKidsSee: string;
  steps: string[];
  supplies: string[];
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

export interface UserSettings {
  timezone: string;
  eveningReminder: string | null; // "HH:MM" local, null = off
  morningReminder: string | null;
  nudges: { eveningSentOn?: string; morningSentOn?: string };
}

export const defaultSettings: UserSettings = { timezone: "UTC", eveningReminder: "20:30", morningReminder: "07:30", nudges: {} };

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
  emoji: string;
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

export interface Stats {
  nightsDone: number;
  streak: number;
  posts: number;
  upvotesReceived: number;
  remakesReceived: number;
}

export const defaultProfile: Profile = {
  elfName: "",
  elfPersonality: "a mischievous, slightly unhinged prankster who treats the whole house as a playground",
  kids: [],
  chaosLevel: 4,
  messTolerance: "high",
  offLimits: "",
  supplies: "toilet paper, sticky tape, string, post-it notes, marker pens, balloons, wrapping paper, flour, googly eyes",
  notes: "",
  seasonStart: "12-01",
  seasonEnd: "12-24",
};

export const ROOM_TYPES = ["kitchen", "bathroom", "hallway", "stairs", "living room", "bedroom", "whole house", "outdoors", "other"] as const;
