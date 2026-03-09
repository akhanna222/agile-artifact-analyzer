import { db } from "./db";
import { analyses, users, referenceDocuments, type Analysis, type InsertAnalysis, type AnalysisResult, type User, type InsertUser, type ReferenceDocument } from "@shared/schema";
import { eq, desc, sql, count } from "drizzle-orm";

export interface IStorage {
  getAnalyses(): Promise<Analysis[]>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  createAnalysis(data: InsertAnalysis, userId?: number): Promise<Analysis>;
  updateAnalysisResults(id: number, overallScore: number, results: AnalysisResult, status: string, tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number; model: string }): Promise<Analysis | undefined>;
  deleteAnalysis(id: number): Promise<void>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: number): Promise<User | undefined>;
  getUsers(): Promise<User[]>;
  createUser(data: InsertUser): Promise<User>;
  deleteUser(id: number): Promise<void>;
  getUsageStats(): Promise<any>;
  getReferenceDocuments(): Promise<ReferenceDocument[]>;
  getReferenceDocumentsByName(docName: string): Promise<ReferenceDocument[]>;
  addReferenceDocument(doc: { docName: string; pageNumber: number; content: string }): Promise<ReferenceDocument>;
  deleteReferenceDocumentsByName(docName: string): Promise<void>;
  searchReferenceDocumentsByText(queryText: string, limit?: number): Promise<(ReferenceDocument & { similarity: number })[]>;
  getReferenceDocumentSummary(): Promise<{ docName: string; pageCount: number; createdAt: Date }[]>;
}

export class DatabaseStorage implements IStorage {
  async getAnalyses(): Promise<Analysis[]> {
    return db.select().from(analyses).orderBy(desc(analyses.createdAt));
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db.select().from(analyses).where(eq(analyses.id, id));
    return analysis;
  }

  async createAnalysis(data: InsertAnalysis, userId?: number): Promise<Analysis> {
    const [analysis] = await db.insert(analyses).values({ ...data, userId: userId || null }).returning();
    return analysis;
  }

  async updateAnalysisResults(
    id: number,
    overallScore: number,
    results: AnalysisResult,
    status: string,
    tokenUsage?: { promptTokens: number; completionTokens: number; totalTokens: number; model: string }
  ): Promise<Analysis | undefined> {
    const updateData: any = { overallScore, results, status };
    if (tokenUsage) {
      updateData.promptTokens = tokenUsage.promptTokens;
      updateData.completionTokens = tokenUsage.completionTokens;
      updateData.totalTokens = tokenUsage.totalTokens;
      updateData.model = tokenUsage.model;
    }
    const [analysis] = await db
      .update(analyses)
      .set(updateData)
      .where(eq(analyses.id, id))
      .returning();
    return analysis;
  }

  async deleteAnalysis(id: number): Promise<void> {
    await db.delete(analyses).where(eq(analyses.id, id));
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(data: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getUsageStats(): Promise<any> {
    const totalAnalyses = await db.select({ count: count() }).from(analyses);

    const tokenTotals = await db.select({
      totalPromptTokens: sql<number>`COALESCE(SUM(${analyses.promptTokens}), 0)`,
      totalCompletionTokens: sql<number>`COALESCE(SUM(${analyses.completionTokens}), 0)`,
      totalTokens: sql<number>`COALESCE(SUM(${analyses.totalTokens}), 0)`,
    }).from(analyses);

    const byType = await db.select({
      type: analyses.type,
      count: count(),
      tokens: sql<number>`COALESCE(SUM(${analyses.totalTokens}), 0)`,
    }).from(analyses).groupBy(analyses.type);

    const byUser = await db.select({
      userId: analyses.userId,
      count: count(),
      tokens: sql<number>`COALESCE(SUM(${analyses.totalTokens}), 0)`,
    }).from(analyses).groupBy(analyses.userId);

    const userMap: Record<number, string> = {};
    const allUsers = await db.select({ id: users.id, email: users.email }).from(users);
    for (const u of allUsers) {
      userMap[u.id] = u.email;
    }

    const byStatus = await db.select({
      status: analyses.status,
      count: count(),
    }).from(analyses).groupBy(analyses.status);

    const recentAnalyses = await db.select({
      id: analyses.id,
      title: analyses.title,
      type: analyses.type,
      status: analyses.status,
      overallScore: analyses.overallScore,
      userId: analyses.userId,
      promptTokens: analyses.promptTokens,
      completionTokens: analyses.completionTokens,
      totalTokens: analyses.totalTokens,
      model: analyses.model,
      createdAt: analyses.createdAt,
    }).from(analyses).orderBy(desc(analyses.createdAt)).limit(20);

    const dailyUsage = await db.select({
      date: sql<string>`DATE(${analyses.createdAt})`,
      count: count(),
      tokens: sql<number>`COALESCE(SUM(${analyses.totalTokens}), 0)`,
    }).from(analyses).groupBy(sql`DATE(${analyses.createdAt})`).orderBy(sql`DATE(${analyses.createdAt})`);

    const totalUsers = await db.select({ count: count() }).from(users);

    return {
      totalAnalyses: totalAnalyses[0]?.count || 0,
      totalUsers: totalUsers[0]?.count || 0,
      tokens: tokenTotals[0] || { totalPromptTokens: 0, totalCompletionTokens: 0, totalTokens: 0 },
      byType,
      byUser: byUser.map((u) => ({
        email: u.userId ? userMap[u.userId] || `User #${u.userId}` : "Unknown",
        count: u.count,
        tokens: u.tokens,
      })),
      byStatus,
      recentAnalyses: recentAnalyses.map((a) => ({
        ...a,
        userEmail: a.userId ? userMap[a.userId] || `User #${a.userId}` : "Unknown",
      })),
      dailyUsage,
    };
  }

  async getReferenceDocuments(): Promise<ReferenceDocument[]> {
    return db.select().from(referenceDocuments).orderBy(referenceDocuments.docName, referenceDocuments.pageNumber);
  }

  async getReferenceDocumentsByName(docName: string): Promise<ReferenceDocument[]> {
    return db.select().from(referenceDocuments).where(eq(referenceDocuments.docName, docName)).orderBy(referenceDocuments.pageNumber);
  }

  async addReferenceDocument(doc: { docName: string; pageNumber: number; content: string }): Promise<ReferenceDocument> {
    const [result] = await db.insert(referenceDocuments).values({
      docName: doc.docName,
      pageNumber: doc.pageNumber,
      content: doc.content,
    }).returning();
    return result;
  }

  async deleteReferenceDocumentsByName(docName: string): Promise<void> {
    await db.delete(referenceDocuments).where(eq(referenceDocuments.docName, docName));
  }

  async searchReferenceDocumentsByText(queryText: string, limit: number = 8): Promise<(ReferenceDocument & { similarity: number })[]> {
    const words = queryText.toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 20);

    if (words.length === 0) {
      return [];
    }

    const tsQuery = words.join(" | ");

    const results = await db.execute(sql`
      SELECT id, doc_name, page_number, content, created_at,
        ts_rank_cd(to_tsvector('english', content), to_tsquery('english', ${tsQuery})) as similarity
      FROM reference_documents
      WHERE to_tsvector('english', content) @@ to_tsquery('english', ${tsQuery})
      ORDER BY similarity DESC
      LIMIT ${limit}
    `);
    return (results.rows as any[]).map(row => ({
      id: row.id,
      docName: row.doc_name,
      pageNumber: row.page_number,
      content: row.content,
      embedding: null,
      createdAt: row.created_at,
      similarity: parseFloat(row.similarity || "0"),
    }));
  }

  async getReferenceDocumentSummary(): Promise<{ docName: string; pageCount: number; createdAt: Date }[]> {
    const results = await db.select({
      docName: referenceDocuments.docName,
      pageCount: count(),
      createdAt: sql<Date>`MIN(${referenceDocuments.createdAt})`,
    }).from(referenceDocuments).groupBy(referenceDocuments.docName);
    return results as any;
  }
}

export const storage = new DatabaseStorage();
