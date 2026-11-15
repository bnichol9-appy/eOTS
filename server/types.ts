export interface Kid {
  name: string;
  age: number | null;
}

export interface Profile {
  elfName: string;
  elfPersonality: string;
  kids: Kid[];
  chaosLevel: number; // 1 (gentle) .. 5 (total mayhem)
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
  takenAt: string;
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
  title: string;
  pitch: string;
  roomName: string;
  whatKidsSee: string;
  steps: string[];
  supplies: string[];
  setupMinutes: number;
  chaos: number; // 1..5
  mess: number; // 1..5
  elfNote: string;
  tags: string[];
}

export interface DayResult {
  photoId: string | null;
  reaction: number; // 1..5
  feedbackTags: string[];
  notes: string;
  analysis: string | null;
  learned: string | null;
  completedAt: string;
}

export interface Day {
  date: string; // YYYY-MM-DD
  ideas: Idea[];
  chosenIdeaId: string | null;
  direction: string;
  status: "open" | "planned" | "done" | "skipped";
  result: DayResult | null;
  generatedAt: string | null;
}

export interface Taste {
  profile: string;
  updatedAt: string | null;
  updates: { date: string; summary: string }[];
}

export interface Database {
  profile: Profile;
  rooms: Room[];
  days: Record<string, Day>;
  taste: Taste;
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

export const emptyDatabase = (): Database => ({
  profile: { ...defaultProfile },
  rooms: [],
  days: {},
  taste: { profile: "", updatedAt: null, updates: [] },
});
