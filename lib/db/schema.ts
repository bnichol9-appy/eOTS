import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { Profile, RoomInventory, DayResult, Moderation, UserSettings } from "../types";

/** A family shares one elf, one house, one taste profile. Co-parents are users on the same family. */
export const families = pgTable("families", {
  id: text("id").primaryKey(),
  handle: text("handle").notNull().unique(),
  inviteCode: text("invite_code").notNull().unique(),
  profile: jsonb("profile").$type<Profile>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    pinHash: text("pin_hash"),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    settings: jsonb("settings").$type<UserSettings>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_family_idx").on(t.familyId)],
);

export const rooms = pgTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    notes: text("notes").notNull().default(""),
    inventory: jsonb("inventory").$type<RoomInventory>(),
    analysedAt: timestamp("analysed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rooms_family_idx").on(t.familyId)],
);

export const roomPhotos = pgTable(
  "room_photos",
  {
    id: text("id").primaryKey(),
    roomId: text("room_id").notNull().references(() => rooms.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("room_photos_room_idx").on(t.roomId)],
);

export const days = pgTable(
  "days",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD in the family's local time
    status: text("status").notNull().default("open"), // open | planned | done | skipped
    direction: text("direction").notNull().default(""),
    chosenIdeaId: text("chosen_idea_id"),
    communityPickPostId: text("community_pick_post_id"),
    communityPickReason: text("community_pick_reason"),
    result: jsonb("result").$type<DayResult>(),
    postId: text("post_id"),
    generatedAt: timestamp("generated_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("days_family_date_idx").on(t.familyId, t.date)],
);

export const ideas = pgTable(
  "ideas",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    dayId: text("day_id").references(() => days.id, { onDelete: "set null" }),
    slot: integer("slot"), // 0 full send, 1 quick hit, 2 wildcard, 3 community pick, 4 attached
    source: text("source").notNull().default("generated"), // generated | community | own
    sourcePostId: text("source_post_id"),
    favourite: boolean("favourite").notNull().default(false),
    title: text("title").notNull(),
    pitch: text("pitch").notNull(),
    roomName: text("room_name").notNull(),
    whatKidsSee: text("what_kids_see").notNull(),
    steps: jsonb("steps").$type<string[]>().notNull(),
    supplies: jsonb("supplies").$type<string[]>().notNull(),
    setupMinutes: integer("setup_minutes").notNull(),
    chaos: integer("chaos").notNull(),
    mess: integer("mess").notNull(),
    elfNote: text("elf_note").notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("ideas_family_idx").on(t.familyId), index("ideas_day_idx").on(t.dayId)],
);

export const tasteProfiles = pgTable("taste_profiles", {
  familyId: text("family_id").primaryKey().references(() => families.id, { onDelete: "cascade" }),
  profile: text("profile").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const tasteUpdates = pgTable(
  "taste_updates",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("taste_updates_family_idx").on(t.familyId)],
);

export const challenges = pgTable("challenges", {
  id: text("id").primaryKey(), // e.g. 2026-bathroom-week
  title: text("title").notNull(),
  description: text("description").notNull(),
  tag: text("tag").notNull(),
  startsOn: text("starts_on").notNull(), // YYYY-MM-DD
  endsOn: text("ends_on").notNull(),
  winnerPostId: text("winner_post_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // who shared it
    dayId: text("day_id"),
    remakeOfPostId: text("remake_of_post_id"),
    challengeId: text("challenge_id"),
    visibility: text("visibility").notNull().default("public"), // public | circles
    elfName: text("elf_name").notNull(),
    title: text("title").notNull(),
    pitch: text("pitch").notNull(),
    roomType: text("room_type").notNull(),
    whatKidsSee: text("what_kids_see").notNull(),
    steps: jsonb("steps").$type<string[]>().notNull(),
    supplies: jsonb("supplies").$type<string[]>().notNull(),
    setupMinutes: integer("setup_minutes").notNull(),
    chaos: integer("chaos").notNull(),
    mess: integer("mess").notNull(),
    tags: jsonb("tags").$type<string[]>().notNull(),
    parentTip: text("parent_tip").notNull().default(""),
    photoUrl: text("photo_url").notNull(),
    reaction: integer("reaction").notNull(),
    status: text("status").notNull().default("published"), // published | review | hidden
    moderation: jsonb("moderation").$type<Moderation>(),
    upvotes: integer("upvotes").notNull().default(0),
    uses: integer("uses").notNull().default(0),
    remakes: integer("remakes").notNull().default(0),
    commentsCount: integer("comments_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("posts_family_idx").on(t.familyId),
    index("posts_status_created_idx").on(t.status, t.createdAt),
    index("posts_remake_idx").on(t.remakeOfPostId),
    index("posts_challenge_idx").on(t.challengeId),
  ],
);

export const votes = pgTable(
  "votes",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.postId] })],
);

export const comments = pgTable(
  "comments",
  {
    id: text("id").primaryKey(),
    postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("comments_post_idx").on(t.postId)],
);

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  postId: text("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const circles = pgTable("circles", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  ownerFamilyId: text("owner_family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const circleMembers = pgTable(
  "circle_members",
  {
    circleId: text("circle_id").notNull().references(() => circles.id, { onDelete: "cascade" }),
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.circleId, t.familyId] }), index("circle_members_family_idx").on(t.familyId)],
);

export const badges = pgTable(
  "badges",
  {
    familyId: text("family_id").notNull().references(() => families.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    awardedAt: timestamp("awarded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.familyId, t.key] })],
);

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    url: text("url").notNull().default("/"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.createdAt)],
);

export const pushSubscriptions = pgTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    endpoint: text("endpoint").notNull().unique(),
    keys: jsonb("keys").$type<{ p256dh: string; auth: string }>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("push_subs_user_idx").on(t.userId)],
);

export type FamilyRow = typeof families.$inferSelect;
export type UserRow = typeof users.$inferSelect;
export type RoomRow = typeof rooms.$inferSelect;
export type DayRow = typeof days.$inferSelect;
export type IdeaRow = typeof ideas.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type ChallengeRow = typeof challenges.$inferSelect;
export type CircleRow = typeof circles.$inferSelect;
export type NotificationRow = typeof notifications.$inferSelect;
