import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
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

// Rubros (Industry Categories)
export const rubros = pgTable("rubros", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sectors: jsonb("sectors").notNull().default('[]'), // Array of sector names
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRubroSchema = createInsertSchema(rubros).omit({
  id: true,
  createdAt: true,
});

export type InsertRubro = z.infer<typeof insertRubroSchema>;
export type Rubro = typeof rubros.$inferSelect;

// Clients
export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  razonSocial: text("razon_social").notNull(),
  cuit: text("cuit").notNull(),
  conditionIva: text("condition_iva").notNull(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  province: text("province").notNull(),
  postalCode: text("postal_code").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  contactName: text("contact_name").notNull(),
  rubroId: varchar("rubro_id").references(() => rubros.id),
  sectors: jsonb("sectors").notNull().default('[]'), // Array of sector names for this client
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
});

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// Instruments
export const instruments = pgTable("instruments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(), // MeasurementType | 'generic'
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  serialNumber: text("serial_number").notNull(),
  calibrationCertificate: text("calibration_certificate").notNull(),
  calibrationDate: text("calibration_date").notNull(),
  attachedDocuments: jsonb("attached_documents"), // { calibrationCertificateImage?, traceablePatternImage? }
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInstrumentSchema = createInsertSchema(instruments).omit({
  id: true,
  createdAt: true,
});

export type InsertInstrument = z.infer<typeof insertInstrumentSchema>;
export type Instrument = typeof instruments.$inferSelect;

// Inspections (Complete saved state)
export const inspections = pgTable("inspections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
  establishment: jsonb("establishment").notNull(), // Full Establishment object
  sectors: jsonb("sectors").notNull(), // Array of Sector objects with measurements
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertInspectionSchema = createInsertSchema(inspections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  savedAt: true,
});

export type InsertInspection = z.infer<typeof insertInspectionSchema>;
export type Inspection = typeof inspections.$inferSelect;
