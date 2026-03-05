import { db } from "./db";
import { analyses, type Analysis, type InsertAnalysis, type AnalysisResult } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  getAnalyses(): Promise<Analysis[]>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  createAnalysis(data: InsertAnalysis): Promise<Analysis>;
  updateAnalysisResults(id: number, overallScore: number, results: AnalysisResult, status: string): Promise<Analysis | undefined>;
  deleteAnalysis(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getAnalyses(): Promise<Analysis[]> {
    return db.select().from(analyses).orderBy(desc(analyses.createdAt));
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis;
  }

  async createAnalysis(data: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db.insert(analyses).values(data).returning();
    return analysis;
  }

  async updateAnalysisResults(id: number, overallScore: number, results: AnalysisResult, status: string): Promise<Analysis | undefined> {
    const [analysis] = await db
      .update(analyses)
      .set({ overallScore, results, status })
      .where(eq(analyses.id, id))
      .returning();
    return analysis;
  }

  async deleteAnalysis(id: number): Promise<void> {
    await db.delete(analyses).where(eq(analyses.id, id));
  }
}

export const storage = new DatabaseStorage();
