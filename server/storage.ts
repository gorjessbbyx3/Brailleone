import { type User, type InsertUser, type Conversion, type InsertConversion } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Conversion methods
  createConversion(conversion: InsertConversion): Promise<Conversion>;
  getConversion(id: string): Promise<Conversion | undefined>;
  updateConversion(id: string, updates: Partial<Conversion>): Promise<Conversion>;
  getRecentConversions(limit?: number): Promise<Conversion[]>;
  clearAllConversions(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversions: Map<string, Conversion>;

  constructor() {
    this.users = new Map();
    this.conversions = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createConversion(insertConversion: InsertConversion): Promise<Conversion> {
    const id = randomUUID();
    const conversion: Conversion = {
      fileName: insertConversion.fileName,
      fileSize: insertConversion.fileSize,
      sourceType: insertConversion.sourceType,
      sourceUrl: insertConversion.sourceUrl || null,
      status: insertConversion.status || "pending",
      progress: insertConversion.progress || 0,
      currentStage: insertConversion.currentStage || "initializing",
      totalPages: insertConversion.totalPages || null,
      wordCount: insertConversion.wordCount || null,
      braillePages: insertConversion.braillePages || null,
      accuracyScore: insertConversion.accuracyScore || null,
      aiEnhancements: (insertConversion.aiEnhancements as string[]) || null,
      lineValidations: insertConversion.lineValidations || null,
      originalTextPath: insertConversion.originalTextPath || null,
      cleanedTextPath: insertConversion.cleanedTextPath || null,
      brailleFilePath: insertConversion.brailleFilePath || null,
      aiReportPath: insertConversion.aiReportPath || null,
      id,
      createdAt: new Date(),
      completedAt: null,
    };
    this.conversions.set(id, conversion);
    return conversion;
  }

  async getConversion(id: string): Promise<Conversion | undefined> {
    return this.conversions.get(id);
  }

  async updateConversion(id: string, updates: Partial<Conversion>): Promise<Conversion> {
    const existing = this.conversions.get(id);
    if (!existing) {
      throw new Error("Conversion not found");
    }
    
    const updated: Conversion = { ...existing, ...updates };
    this.conversions.set(id, updated);
    return updated;
  }

  async getRecentConversions(limit: number = 10): Promise<Conversion[]> {
    const conversions = Array.from(this.conversions.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
      .slice(0, limit);
    return conversions;
  }

  async clearAllConversions(): Promise<void> {
    this.conversions.clear();
  }
}

import { DatabaseStorage } from "./dbStorage";

// Use database storage if DATABASE_URL is available, otherwise fall back to memory storage
export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();
