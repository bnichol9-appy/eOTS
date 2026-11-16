import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { Profile, RoomInventory, DayResult, Moderation } from "../types";

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  handle: text("handle").notNull().unique(),
  pinHash: text("pin_hash"),
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  profile: jsonb("profile").$type<Profile>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rooms = pgTable(
  "rooms",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    notes: text("notes").notNull().default(""),
    inventory: jsonb("inventory").$type<RoomInventory>(),
    analysedAt: timestamp("analysed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("rooms_user_idx").on(t.userId)],
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
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD in the family's local time
    status: text("status").notNull().default("open"), // open | planned | done | skipped
    direction: text("direction").notNull().default(""),
    chosenIdeaId: text("chosen_idea_id"),
    communityPickPostId: text("community_pick_post_id"),
    communityPickReason: text("community_pick_reason"),
    result: jsonb("result").$type<DayResult>(),
    postId: text("post_id"), // set once the night has been shared
    generatedAt: timestamp("generated_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("days_user_date_idx").on(t.userId, t.date)],
);

export const ideas = pgTable(
  "ideas",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    dayId: text("day_id").references(() => days.id, { onDelete: "set null" }),
    slot: integer("slot"), // 0 full send, 1 quick hit, 2 wildcard, 3 community
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
  (t) => [index("ideas_user_idx").on(t.userId), index("ideas_day_idx").on(t.dayId)],
);

export const tasteProfiles = pgTable("taste_profiles", {
  userId: text("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  profile: text("profile").notNull().default(""),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export const tasteUpdates = pgTable(
  "taste_updates",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    summary: text("summary").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("taste_updates_user_idx").on(t.userId)],
);

export const posts = pgTable(
  "posts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    dayId: text("day_id"),
    remakeOfPostId: text("remake_of_post_id"),
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
    commentsCount: integer("comments_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("posts_user_idx").on(t.userId), index("posts_status_created_idx").on(t.status, t.createdAt)],
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

export type UserRow = typeof users.$inferSelect;
export type RoomRow = typeof rooms.$inferSelect;
export type RoomPhotoRow = typeof roomPhotos.$inferSelect;
export type DayRow = typeof days.$inferSelect;
export type IdeaRow = typeof ideas.$inferSelect;
export type PostRow = typeof posts.$inferSelect;
export type CommentRow = typeof comments.$inferSelect;
