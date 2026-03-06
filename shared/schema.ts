import { sql } from "drizzle-orm";
import { pgTable, serial, text, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  content: text("content").notNull(),
  overallScore: integer("overall_score"),
  results: jsonb("results"),
  status: text("status").notNull().default("pending"),
  userId: integer("user_id"),
  promptTokens: integer("prompt_tokens"),
  completionTokens: integer("completion_tokens"),
  totalTokens: integer("total_tokens"),
  model: text("model"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
  createdAt: true,
  overallScore: true,
  results: true,
  status: true,
  userId: true,
  promptTokens: true,
  completionTokens: true,
  totalTokens: true,
  model: true,
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

export const analysisResultSchema = z.object({
  overallScore: z.number().min(0).max(100),
  summary: z.string(),
  categories: z.array(z.object({
    name: z.string(),
    score: z.number().min(0).max(100),
    status: z.enum(["pass", "warning", "fail"]),
    findings: z.array(z.string()),
    suggestions: z.array(z.string()),
  })),
  improvedVersion: z.string().optional(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
