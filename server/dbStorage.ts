import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { conversions, users, type InsertConversion, type Conversion, type InsertUser, type User } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import type { IStorage } from "./storage";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async createConversion(insertConversion: InsertConversion): Promise<Conversion> {
    const result = await db.insert(conversions).values(insertConversion).returning();
    return result[0];
  }

  async getConversion(id: string): Promise<Conversion | undefined> {
    const result = await db.select().from(conversions).where(eq(conversions.id, id));
    return result[0];
  }

  async updateConversion(id: string, updates: Partial<Conversion>): Promise<Conversion> {
    const result = await db
      .update(conversions)
      .set(updates)
      .where(eq(conversions.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error("Conversion not found");
    }
    
    return result[0];
  }

  async getRecentConversions(limit: number = 10): Promise<Conversion[]> {
    const result = await db
      .select()
      .from(conversions)
      .orderBy(desc(conversions.createdAt))
      .limit(limit);
    return result;
  }

  async clearAllConversions(): Promise<void> {
    await db.delete(conversions);
  }
}