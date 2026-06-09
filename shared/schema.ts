import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("operator"),
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
  establishment: jsonb("establishment").notNull(),
  sectors: jsonb("sectors").notNull(),
  noiseProtocol: jsonb("noise_protocol"),
  thermalProtocol: jsonb("thermal_protocol"),
  coldProtocol: jsonb("cold_protocol"),
  digitalSignature: text("digital_signature"),
  signatoryName: text("signatory_name"),
  signatoryTitle: text("signatory_title"),
  signatoryRegistration: text("signatory_registration"),
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

// Budget Requests
export const budgetRequests = pgTable("budget_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  razonSocial: text("razon_social").notNull(),
  cuit: text("cuit"),
  direccion: text("direccion"),
  localidad: text("localidad"),
  provincia: text("provincia"),
  rubro: text("rubro"),
  contactoNombre: text("contacto_nombre").notNull(),
  contactoCargo: text("contacto_cargo"),
  contactoEmail: text("contacto_email").notNull(),
  contactoTelefono: text("contacto_telefono"),
  medicionesSolicitadas: jsonb("mediciones_solicitadas").notNull().default([]),
  detallesPorMedicion: jsonb("detalles_por_medicion"),
  cantidadTrabajadores: text("cantidad_trabajadores"),
  art: text("art"),
  fechaEstimada: text("fecha_estimada"),
  observaciones: text("observaciones"),
  estado: text("estado").notNull().default("nuevo"),
  respuesta: text("respuesta"),
  presupuestoTotal: integer("presupuesto_total"),
  origen: text("origen").default("web"),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
  actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
});

export type BudgetRequest = typeof budgetRequests.$inferSelect;

// Client Portal Users
export const clientPortalUsers = pgTable("client_portal_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  nombre: text("nombre").notNull(),
  activo: boolean("activo").default(true),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export type ClientPortalUser = typeof clientPortalUsers.$inferSelect;

// Client Reports
export const clientReports = pgTable("client_reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientPortalUserId: varchar("client_portal_user_id")
    .references(() => clientPortalUsers.id).notNull(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),
  tipoEstudio: text("tipo_estudio"),
  fechaEstudio: text("fecha_estudio"),
  pdfData: text("pdf_data").notNull(),
  pdfNombre: text("pdf_nombre").notNull(),
  notificacionEnviada: boolean("notificacion_enviada").default(false),
  creadoEn: timestamp("creado_en").notNull().defaultNow(),
});

export type ClientReport = typeof clientReports.$inferSelect;

// Price Config
export const priceConfig = pgTable("price_config", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  medicion: text("medicion").notNull().unique(),
  precioBase: integer("precio_base").notNull().default(0),
  descripcion: text("descripcion"),
  activo: boolean("activo").default(true),
  actualizadoEn: timestamp("actualizado_en").notNull().defaultNow(),
});

export type PriceConfig = typeof priceConfig.$inferSelect;
