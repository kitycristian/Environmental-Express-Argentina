import { 
  type User, 
  type InsertUser,
  type Rubro,
  type InsertRubro,
  type Client,
  type InsertClient,
  type Instrument,
  type InsertInstrument,
  type Inspection,
  type InsertInspection,
  users,
  rubros,
  clients,
  instruments,
  inspections,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import { eq, desc } from "drizzle-orm";

const { Pool } = pg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Rubro methods
  getRubros(): Promise<Rubro[]>;
  getRubro(id: string): Promise<Rubro | undefined>;
  createRubro(rubro: InsertRubro): Promise<Rubro>;
  updateRubro(id: string, rubro: Partial<InsertRubro>): Promise<Rubro | undefined>;
  deleteRubro(id: string): Promise<boolean>;
  
  // Client methods
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<boolean>;
  
  // Instrument methods
  getInstruments(): Promise<Instrument[]>;
  getInstrument(id: string): Promise<Instrument | undefined>;
  createInstrument(instrument: InsertInstrument): Promise<Instrument>;
  updateInstrument(id: string, instrument: Partial<InsertInstrument>): Promise<Instrument | undefined>;
  deleteInstrument(id: string): Promise<boolean>;
  
  // Inspection methods
  getInspections(): Promise<Inspection[]>;
  getInspection(id: string): Promise<Inspection | undefined>;
  createInspection(inspection: InsertInspection): Promise<Inspection>;
  updateInspection(id: string, inspection: Partial<InsertInspection>): Promise<Inspection | undefined>;
  deleteInspection(id: string): Promise<boolean>;
}

export class DbStorage implements IStorage {
  // User methods
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

  // Rubro methods
  async getRubros(): Promise<Rubro[]> {
    return await db.select().from(rubros).orderBy(rubros.name);
  }

  async getRubro(id: string): Promise<Rubro | undefined> {
    const result = await db.select().from(rubros).where(eq(rubros.id, id));
    return result[0];
  }

  async createRubro(rubro: InsertRubro): Promise<Rubro> {
    const result = await db.insert(rubros).values(rubro).returning();
    return result[0];
  }

  async updateRubro(id: string, rubro: Partial<InsertRubro>): Promise<Rubro | undefined> {
    const result = await db.update(rubros).set(rubro).where(eq(rubros.id, id)).returning();
    return result[0];
  }

  async deleteRubro(id: string): Promise<boolean> {
    const result = await db.delete(rubros).where(eq(rubros.id, id)).returning();
    return result.length > 0;
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(clients.name);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const result = await db.select().from(clients).where(eq(clients.id, id));
    return result[0];
  }

  async createClient(client: InsertClient): Promise<Client> {
    const result = await db.insert(clients).values(client).returning();
    return result[0];
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    const result = await db.update(clients).set(client).where(eq(clients.id, id)).returning();
    return result[0];
  }

  async deleteClient(id: string): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id)).returning();
    return result.length > 0;
  }

  // Instrument methods
  async getInstruments(): Promise<Instrument[]> {
    return await db.select().from(instruments).orderBy(instruments.type, instruments.brand);
  }

  async getInstrument(id: string): Promise<Instrument | undefined> {
    const result = await db.select().from(instruments).where(eq(instruments.id, id));
    return result[0];
  }

  async createInstrument(instrument: InsertInstrument): Promise<Instrument> {
    const result = await db.insert(instruments).values(instrument).returning();
    return result[0];
  }

  async updateInstrument(id: string, instrument: Partial<InsertInstrument>): Promise<Instrument | undefined> {
    const result = await db.update(instruments).set(instrument).where(eq(instruments.id, id)).returning();
    return result[0];
  }

  async deleteInstrument(id: string): Promise<boolean> {
    const result = await db.delete(instruments).where(eq(instruments.id, id)).returning();
    return result.length > 0;
  }

  // Inspection methods
  async getInspections(): Promise<Inspection[]> {
    return await db.select().from(inspections).orderBy(desc(inspections.updatedAt));
  }

  async getInspection(id: string): Promise<Inspection | undefined> {
    const result = await db.select().from(inspections).where(eq(inspections.id, id));
    return result[0];
  }

  async createInspection(inspection: InsertInspection): Promise<Inspection> {
    const result = await db.insert(inspections).values({
      ...inspection,
      savedAt: new Date(),
    }).returning();
    return result[0];
  }

  async updateInspection(id: string, inspection: Partial<InsertInspection>): Promise<Inspection | undefined> {
    const result = await db.update(inspections).set({
      ...inspection,
      updatedAt: new Date(),
      savedAt: new Date(),
    }).where(eq(inspections.id, id)).returning();
    return result[0];
  }

  async deleteInspection(id: string): Promise<boolean> {
    const result = await db.delete(inspections).where(eq(inspections.id, id)).returning();
    return result.length > 0;
  }
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private rubros: Map<string, Rubro>;
  private clients: Map<string, Client>;
  private instruments: Map<string, Instrument>;
  private inspections: Map<string, Inspection>;

  constructor() {
    this.users = new Map();
    this.rubros = new Map();
    this.clients = new Map();
    this.instruments = new Map();
    this.inspections = new Map();
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

  async getRubros(): Promise<Rubro[]> {
    return Array.from(this.rubros.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getRubro(id: string): Promise<Rubro | undefined> {
    return this.rubros.get(id);
  }

  async createRubro(rubro: InsertRubro): Promise<Rubro> {
    const id = randomUUID();
    const newRubro: Rubro = { ...rubro, id, createdAt: new Date() };
    this.rubros.set(id, newRubro);
    return newRubro;
  }

  async updateRubro(id: string, rubro: Partial<InsertRubro>): Promise<Rubro | undefined> {
    const existing = this.rubros.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...rubro };
    this.rubros.set(id, updated);
    return updated;
  }

  async deleteRubro(id: string): Promise<boolean> {
    return this.rubros.delete(id);
  }

  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async createClient(client: InsertClient): Promise<Client> {
    const id = randomUUID();
    const newClient: Client = { ...client, id, createdAt: new Date() };
    this.clients.set(id, newClient);
    return newClient;
  }

  async updateClient(id: string, client: Partial<InsertClient>): Promise<Client | undefined> {
    const existing = this.clients.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...client };
    this.clients.set(id, updated);
    return updated;
  }

  async deleteClient(id: string): Promise<boolean> {
    return this.clients.delete(id);
  }

  async getInstruments(): Promise<Instrument[]> {
    return Array.from(this.instruments.values()).sort((a, b) => 
      a.type.localeCompare(b.type) || a.brand.localeCompare(b.brand)
    );
  }

  async getInstrument(id: string): Promise<Instrument | undefined> {
    return this.instruments.get(id);
  }

  async createInstrument(instrument: InsertInstrument): Promise<Instrument> {
    const id = randomUUID();
    const newInstrument: Instrument = { ...instrument, id, createdAt: new Date() };
    this.instruments.set(id, newInstrument);
    return newInstrument;
  }

  async updateInstrument(id: string, instrument: Partial<InsertInstrument>): Promise<Instrument | undefined> {
    const existing = this.instruments.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...instrument };
    this.instruments.set(id, updated);
    return updated;
  }

  async deleteInstrument(id: string): Promise<boolean> {
    return this.instruments.delete(id);
  }

  async getInspections(): Promise<Inspection[]> {
    return Array.from(this.inspections.values()).sort((a, b) => 
      b.updatedAt.getTime() - a.updatedAt.getTime()
    );
  }

  async getInspection(id: string): Promise<Inspection | undefined> {
    return this.inspections.get(id);
  }

  async createInspection(inspection: InsertInspection): Promise<Inspection> {
    const id = randomUUID();
    const now = new Date();
    const newInspection: Inspection = { 
      ...inspection, 
      id, 
      createdAt: now,
      updatedAt: now,
      savedAt: now,
    };
    this.inspections.set(id, newInspection);
    return newInspection;
  }

  async updateInspection(id: string, inspection: Partial<InsertInspection>): Promise<Inspection | undefined> {
    const existing = this.inspections.get(id);
    if (!existing) return undefined;
    const updated = { 
      ...existing, 
      ...inspection, 
      updatedAt: new Date(),
      savedAt: new Date(),
    };
    this.inspections.set(id, updated);
    return updated;
  }

  async deleteInspection(id: string): Promise<boolean> {
    return this.inspections.delete(id);
  }
}

export const storage = new DbStorage();
