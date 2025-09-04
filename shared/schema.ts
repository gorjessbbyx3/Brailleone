import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversions = pgTable("conversions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  sourceType: text("source_type").notNull(), // 'pdf' or 'url'
  sourceUrl: text("source_url"), // For URL sources
  status: text("status").notNull().default("pending"), // pending, extracting, ai_reviewing, converting, completed, failed
  progress: integer("progress").notNull().default(0), // 0-100
  currentStage: text("current_stage").notNull().default("initializing"),
  totalPages: integer("total_pages"),
  wordCount: integer("word_count"),
  braillePages: integer("braille_pages"),
  accuracyScore: integer("accuracy_score"), // 0-100
  aiEnhancements: json("ai_enhancements").$type<string[]>(),
  originalTextPath: text("original_text_path"),
  cleanedTextPath: text("cleaned_text_path"),
  brailleFilePath: text("braille_file_path"),
  aiReportPath: text("ai_report_path"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertConversionSchema = createInsertSchema(conversions).omit({
  id: true,
  createdAt: true,
  completedAt: true,
});

export type InsertConversion = z.infer<typeof insertConversionSchema>;
export type Conversion = typeof conversions.$inferSelect;

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
