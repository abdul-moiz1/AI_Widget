import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Conversation schema for storing chat history
export const conversations = pgTable("conversations", {
  sessionId: varchar("session_id").primaryKey(),
  persona: varchar("persona").default("assistant"),
  language: varchar("language").default("en"),
  voiceGender: varchar("voice_gender").default("female"),
  voiceStyle: varchar("voice_style").default("calm"),
  messages: jsonb("messages").default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export type Conversation = typeof conversations.$inferSelect;
export type ConversationMessage = {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
};

// Voice preferences schema
export const voicePreferences = z.object({
  language: z.string().default("en"),
  gender: z.enum(["female", "male"]).default("female"),
  style: z.enum(["calm", "friendly", "professional"]).default("calm"),
});

export type VoicePreference = z.infer<typeof voicePreferences>;
