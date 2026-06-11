import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import crypto from "crypto";
import { requireAuth, requireAdmin, registerAuthRoutes } from "./auth";
import { 
  insertRubroSchema, 
  insertClientSchema, 
  insertInstrumentSchema,
  insertInspectionSchema,
  budgetRequests,
  priceConfig,
  clientPortalUsers,
  clientReports,
} from "@shared/schema";
import { fromError } from "zod-validation-error";
import { getSpreadsheetSheets, readSheetData, parseExcelBuffer } from "./google-sheets";
import multer from "multer";
import OpenAI from "openai";
import { db } from "./storage";
import { eq, desc } from "drizzle-orm";

declare module "express-session" {
  interface SessionData {
    portalUserId?: string;
  }
}

function hashPortalPassword(pass: string) {
  return crypto.createHash("sha256").update(pass + "eea-portal-2024").digest("hex");
}

function generatePassword() {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ── Auth routes (login, logout, me, change-password, users CRUD) ──
  registerAuthRoutes(app);

  // ── Protección global: todas las rutas /api/* excepto las públicas ──
  app.use((req, res, next) => {
    if (!req.path.startsWith("/api/")) return next();
    const PUBLIC = ["/api/login", "/api/logout", "/api/me"];
    if (PUBLIC.includes(req.path)) return next();
    if (req.path.startsWith("/api/portal")) return next();   // portal de clientes
    if (req.path.startsWith("/api/padmin")) return next();  // requireAdmin lo protege a nivel de ruta
    if (req.path === "/api/budget-requests" && req.method === "POST") return next(); // formulario público
    return requireAuth(req, res, next);
  });

  // ============= DESCARGA DE CÓDIGO FUENTE (temporal) =============
  app.get("/api/download-source", (req, res) => {
    try {
      const file = "/tmp/eea-codigo.tar.gz";
      execSync(
        `tar -czf ${file} --exclude='.git' --exclude='node_modules' --exclude='.local' --exclude='attached_assets' --exclude='dist' --exclude='.cache' -C /home/runner/workspace .`,
        { stdio: "pipe" }
      );
      res.setHeader("Content-Disposition", "attachment; filename=eea-codigo.tar.gz");
      res.setHeader("Content-Type", "application/gzip");
      res.sendFile(path.resolve(file));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ============= RUBROS =============
  
  app.get("/api/rubros", async (req, res) => {
    try {
      const rubros = await storage.getRubros();
      res.json(rubros);
    } catch (error) {
      res.status(500).json({ message: "Error fetching rubros" });
    }
  });

  app.get("/api/rubros/:id", async (req, res) => {
    try {
      const rubro = await storage.getRubro(req.params.id);
      if (!rubro) {
        return res.status(404).json({ message: "Rubro not found" });
      }
      res.json(rubro);
    } catch (error) {
      res.status(500).json({ message: "Error fetching rubro" });
    }
  });

  app.post("/api/rubros", async (req, res) => {
    try {
      const validatedData = insertRubroSchema.parse(req.body);
      const rubro = await storage.createRubro(validatedData);
      res.status(201).json(rubro);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      res.status(500).json({ message: "Error creating rubro" });
    }
  });

  app.patch("/api/rubros/:id", async (req, res) => {
    try {
      const rubro = await storage.updateRubro(req.params.id, req.body);
      if (!rubro) {
        return res.status(404).json({ message: "Rubro not found" });
      }
      res.json(rubro);
    } catch (error) {
      res.status(500).json({ message: "Error updating rubro" });
    }
  });

  app.delete("/api/rubros/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteRubro(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Rubro not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting rubro" });
    }
  });

  // ============= CLIENTS =============
  
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Error fetching clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Error fetching client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      res.status(500).json({ message: "Error creating client" });
    }
  });

  app.patch("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Error updating client" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteClient(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting client" });
    }
  });

  // ============= INSTRUMENTS =============
  
  app.get("/api/instruments", async (req, res) => {
    try {
      const instruments = await storage.getInstruments();
      res.json(instruments);
    } catch (error) {
      res.status(500).json({ message: "Error fetching instruments" });
    }
  });

  app.get("/api/instruments/:id", async (req, res) => {
    try {
      const instrument = await storage.getInstrument(req.params.id);
      if (!instrument) {
        return res.status(404).json({ message: "Instrument not found" });
      }
      res.json(instrument);
    } catch (error) {
      res.status(500).json({ message: "Error fetching instrument" });
    }
  });

  app.post("/api/instruments", async (req, res) => {
    try {
      const validatedData = insertInstrumentSchema.parse(req.body);
      const instrument = await storage.createInstrument(validatedData);
      res.status(201).json(instrument);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      res.status(500).json({ message: "Error creating instrument" });
    }
  });

  app.patch("/api/instruments/:id", async (req, res) => {
    try {
      const instrument = await storage.updateInstrument(req.params.id, req.body);
      if (!instrument) {
        return res.status(404).json({ message: "Instrument not found" });
      }
      res.json(instrument);
    } catch (error) {
      res.status(500).json({ message: "Error updating instrument" });
    }
  });

  app.delete("/api/instruments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInstrument(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Instrument not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting instrument" });
    }
  });

  // ============= INSPECTIONS =============
  
  app.get("/api/inspections", async (req, res) => {
    try {
      const inspections = await storage.getInspections();
      res.json(inspections);
    } catch (error) {
      res.status(500).json({ message: "Error fetching inspections" });
    }
  });

  app.get("/api/inspections/:id", async (req, res) => {
    try {
      const inspection = await storage.getInspection(req.params.id);
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      res.json(inspection);
    } catch (error) {
      res.status(500).json({ message: "Error fetching inspection" });
    }
  });

  app.post("/api/inspections", async (req, res) => {
    try {
      const validatedData = insertInspectionSchema.parse(req.body);
      const inspection = await storage.createInspection(validatedData);
      res.status(201).json(inspection);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      res.status(500).json({ message: "Error creating inspection" });
    }
  });

  app.patch("/api/inspections/:id", async (req, res) => {
    try {
      const validatedData = insertInspectionSchema.partial().parse(req.body);
      const inspection = await storage.updateInspection(req.params.id, validatedData);
      if (!inspection) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      res.json(inspection);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ message: fromError(error).toString() });
      }
      res.status(500).json({ message: "Error updating inspection" });
    }
  });

  app.delete("/api/inspections/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInspection(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Inspection not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Error deleting inspection" });
    }
  });

  // ============= GOOGLE SHEETS =============

  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.post("/api/upload-excel", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No se recibió ningún archivo" });
      }
      const result = parseExcelBuffer(req.file.buffer);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Error al procesar el archivo" });
    }
  });

  app.get("/api/google-sheets/:spreadsheetId/sheets", async (req, res) => {
    try {
      const sheets = await getSpreadsheetSheets(req.params.spreadsheetId);
      res.json(sheets);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Error fetching sheets" });
    }
  });

  app.get("/api/google-sheets/:spreadsheetId/data", async (req, res) => {
    try {
      const range = req.query.range as string || 'A1:Z1000';
      const data = await readSheetData(req.params.spreadsheetId, range);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ message: error.message || "Error reading sheet data" });
    }
  });

  // ============= PANEL ANALYZER (AI Vision) =============

  const getOpenAI = () => {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    if (!apiKey && !baseURL) return null;
    return new OpenAI({
      apiKey: apiKey || "replit",
      baseURL,
    });
  };

  const panelUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.post("/api/analyze-panel", panelUpload.single('image'), async (req, res) => {
    try {
      const openai = getOpenAI();
      if (!openai) {
        return res.status(503).json({ message: "Servicio de análisis AI no disponible. Configure OPENAI_API_KEY." });
      }
      if (!req.file) {
        return res.status(400).json({ message: "Se requiere una imagen del tablero eléctrico" });
      }

      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype || 'image/jpeg';

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `Sos un ingeniero electricista matriculado especializado en inspección de tableros eléctricos según normativa argentina. Tenés amplio conocimiento de:
- Reglamentación AEA 90364 (Instalaciones Eléctricas en Inmuebles)
- Ley Nacional 19.587 de Higiene y Seguridad en el Trabajo
- Decreto Reglamentario 351/79 (Capítulo 14 - Instalaciones Eléctricas)
- Resolución SRT 900/2015 (Protocolo para la medición del valor de puesta a tierra)
- Norma IRAM 2281 (Tableros eléctricos)
- Norma IEC 61439 (Conjuntos de aparamenta de baja tensión)

Analizá la imagen del tablero eléctrico y proporcioná un informe técnico COMPLETO y DETALLADO en español argentino. ES OBLIGATORIO que tu respuesta incluya TODAS las secciones siguientes, sin excepción. Cada sección debe tener contenido sustancial.

Tu respuesta DEBE seguir EXACTAMENTE este formato con las secciones marcadas con ##:

## Estado General
Descripción detallada del estado del tablero: tipo (embutido/sobrepuesto), material del gabinete (metálico/plástico), estado de la puerta/tapa, grado de protección IP estimado, estado de pintura/oxidación, limpieza interna, señalización, identificación del tablero.

## Componentes Identificados
Lista detallada de TODOS los componentes visibles: termomagnéticas, interruptores diferenciales (ID/DR), fusibles, bornes, cables, barras de cobre, riel DIN, canaletas, borneras de tierra, interruptores generales, contactores, relés, etc. Para cada uno indicar: marca, modelo si es visible, estado operativo aparente.

## Observaciones de Peligros y Riesgos
SECCIÓN OBLIGATORIA - Lista detallada de TODOS los peligros observados:
- Riesgo de electrocución: cables expuestos, partes activas accesibles, falta de protección diferencial
- Riesgo de incendio: conexiones flojas, cables recalentados, sobrecarga, falta de protección termomagnética adecuada
- Riesgo de cortocircuito: cables sin aislación, empalmes precarios, secciones inadecuadas
- Falta de protección contra contactos directos e indirectos
- Estado de la puesta a tierra (cable verde/amarillo visible o ausente)
- Señalización de peligro eléctrico (presente o ausente)
- Grado de protección IP inadecuado para el ambiente
Para cada peligro indicar la CONSECUENCIA POTENCIAL y el ARTÍCULO NORMATIVO que se incumple.

## No Conformidades según Normativa
SECCIÓN OBLIGATORIA - Lista numerada de CADA incumplimiento normativo encontrado:
1. Descripción precisa del incumplimiento
   - Norma/Ley incumplida (ej: Dec. 351/79 Art. XX, AEA 90364 Sección XXX, IRAM 2281)
   - Riesgo asociado para las personas
   - Gravedad: LEVE / MODERADA / GRAVE / MUY GRAVE

Verificar especialmente: protección diferencial (obligatoria por AEA 90364), puesta a tierra, secciones de conductores, identificación de circuitos, IP del gabinete, accesibilidad, señalización, distancias de seguridad, canalización de cables.

## Recomendaciones y Mejoras
SECCIÓN OBLIGATORIA - Lista numerada de TODAS las acciones correctivas necesarias, ordenadas por PRIORIDAD:
- [CRÍTICA/URGENTE] Acciones inmediatas para eliminar riesgo de vida (electrocución, incendio)
- [ALTA] Adecuaciones normativas obligatorias
- [MEDIA] Mejoras para cumplimiento total de la reglamentación
- [BAJA] Mejoras opcionales de calidad y mantenimiento

Para cada recomendación indicar: qué hacer, por qué (normativa), y plazo sugerido.

## Marco Normativo Aplicable
Enumerar los artículos específicos de la normativa argentina que aplican a las observaciones realizadas:
- Ley 19.587: artículos relevantes sobre obligaciones del empleador
- Dec. 351/79: artículos del Capítulo 14 sobre instalaciones eléctricas
- AEA 90364: secciones sobre protección, puesta a tierra, tableros
- Cualquier otra norma aplicable (IRAM, IEC, Res. SRT)

## Clasificación de Riesgo
Clasificación general del tablero: BAJO / MEDIO / ALTO / CRÍTICO
Justificación detallada de la clasificación basada en los hallazgos.
Indicar si el tablero es APTO o NO APTO para continuar en servicio.
Si es NO APTO, indicar si requiere intervención INMEDIATA o PROGRAMADA.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analizá este tablero eléctrico y generá un informe técnico COMPLETO. Es OBLIGATORIO incluir TODAS las secciones: Estado General, Componentes Identificados, Observaciones de Peligros y Riesgos (con artículos de la ley), No Conformidades según Normativa (con gravedad), Recomendaciones y Mejoras (por prioridad), Marco Normativo Aplicable, y Clasificación de Riesgo. NO omitas ninguna sección."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: "high"
                }
              }
            ]
          }
        ],
        max_tokens: 6000,
      });

      const analysis = response.choices[0]?.message?.content || "No se pudo generar el análisis.";
      
      res.json({ 
        analysis,
        timestamp: new Date().toISOString(),
        filename: req.file.originalname
      });
    } catch (error: any) {
      console.error("Error analyzing panel:", error);
      res.status(500).json({ message: error.message || "Error al analizar el tablero" });
    }
  });

  // ============= GENERADOR DE INFORME DOCX =============

  app.post("/api/generate-report", async (req, res) => {
    try {
      const body = req.body;

      // ── Normalize request: support legacy format + new { protocols, data, signatory, combined }
      let protocols: string[];
      let data: any;
      let signatory: any;
      let combined: boolean;

      if (body.protocols) {
        protocols = body.protocols;
        data = body.data || body;
        signatory = body.signatory;
        combined = body.combined !== false;
      } else {
        // Legacy format
        data = {
          establishment:   body.establishment,
          noiseProtocol:   body.noiseProtocol,
          thermalProtocol: body.thermalProtocol,
          coldProtocol:    body.coldProtocol,
          lightingSectors: body.lightingSectors,
        };
        signatory = body.signatory;
        combined = true;
        // Auto-detect which protocols have data
        protocols = [];
        if (body.thermalProtocol?.rows?.some((r: any) => r.sector || r.tbs))  protocols.push("thermal");
        if (body.coldProtocol?.rows?.some((r: any) => r.sector || r.tbs))     protocols.push("cold");
        if (body.noiseProtocol?.rows?.some((r: any) => r.sector || r.valorMedido)) protocols.push("noise");
        if (body.lightingSectors?.length) protocols.push("lighting");
        if (!protocols.length) protocols = ["thermal", "cold", "noise", "lighting"];
      }

      const establishment = data.establishment || {};
      const empresa = (establishment.razonSocial || establishment.name || "Informe")
        .replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_").substring(0, 40);
      const fecha = new Date().toISOString().split("T")[0];

      const { buildDocument, buildDocumentsZip } = await import("./report-generators/index.js");

      if (combined || protocols.length === 1) {
        const buffer = await buildDocument(data, signatory, protocols);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
        res.setHeader("Content-Disposition", `attachment; filename=Informe_EEA_${empresa}_${fecha}.docx`);
        res.send(buffer);
      } else {
        const buffer = await buildDocumentsZip(data, signatory, protocols);
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Disposition", `attachment; filename=Informes_EEA_${empresa}_${fecha}.zip`);
        res.send(buffer);
      }


    } catch (error: any) {
      console.error("Error generando informe:", error);
      res.status(500).json({ message: String(error?.message || error) });
    }
  });

  // ── PRESUPUESTOS — público ──
  app.post("/api/budget-requests", async (req, res) => {
    try {
      const d = req.body;
      const [created] = await db.insert(budgetRequests).values({
        razonSocial: d.razonSocial || d.empresa || "Sin nombre",
        cuit: d.cuit,
        direccion: d.direccion,
        localidad: d.localidad,
        provincia: d.provincia,
        rubro: d.rubro,
        contactoNombre: d.contactoNombre || d.nombre || "Sin nombre",
        contactoCargo: d.contactoCargo || d.cargo,
        contactoEmail: d.contactoEmail || d.email || "sin-email",
        contactoTelefono: d.contactoTelefono || d.telefono,
        medicionesSolicitadas: d.medicionesSolicitadas || d.mediciones || [],
        detallesPorMedicion: d.detallesPorMedicion || d.detalles || {},
        cantidadTrabajadores: d.cantidadTrabajadores,
        art: d.art,
        fechaEstimada: d.fechaEstimada,
        observaciones: d.observaciones,
        origen: d.origen || "web",
      }).returning();

      if (process.env.SMTP_HOST) {
        try {
          const nodemailer = await import("nodemailer");
          const transporter = nodemailer.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || "587"),
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          });
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: process.env.ADMIN_EMAIL || "contacto@envexar.com",
            subject: `🔔 Nuevo presupuesto: ${created.razonSocial}`,
            text: `Nuevo pedido desde: ${created.origen}\n\nEMPRESA: ${created.razonSocial}\nCUIT: ${created.cuit || "-"}\nCONTACTO: ${created.contactoNombre}\nEMAIL: ${created.contactoEmail}\nMEDICIONES: ${JSON.stringify(created.medicionesSolicitadas)}`,
          });
        } catch (emailErr) {
          console.warn("Email no enviado:", emailErr);
        }
      }

      res.json({ ok: true, id: created.id });
    } catch (error) {
      console.error("Error guardando pedido:", error);
      res.status(500).json({ message: "Error al guardar el pedido" });
    }
  });

  // ── PRESUPUESTOS — privados ──
  app.get("/api/budget-requests", async (req, res) => {
    console.log("GET budget-requests - authenticated:", req.isAuthenticated(), "- session:", req.session?.id);
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    const requests = await db.select().from(budgetRequests).orderBy(desc(budgetRequests.creadoEn));
    console.log("budget-requests found:", requests.length);
    res.json(requests);
  });

  app.get("/api/budget-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    const [request] = await db.select().from(budgetRequests).where(eq(budgetRequests.id, req.params.id));
    if (!request) return res.status(404).json({ message: "No encontrado" });
    if (request.estado === "nuevo") {
      await db.update(budgetRequests).set({ estado: "leido", actualizadoEn: new Date() }).where(eq(budgetRequests.id, req.params.id));
    }
    res.json(request);
  });

  app.patch("/api/budget-requests/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    const { estado, respuesta, presupuestoTotal } = req.body;
    await db.update(budgetRequests).set({ estado, respuesta, presupuestoTotal, actualizadoEn: new Date() }).where(eq(budgetRequests.id, req.params.id));
    res.json({ ok: true });
  });

  app.get("/api/price-config", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    const prices = await db.select().from(priceConfig);
    res.json(prices);
  });

  app.patch("/api/price-config/:medicion", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    await db.update(priceConfig).set({ precioBase: req.body.precio_base, actualizadoEn: new Date() }).where(eq(priceConfig.medicion, req.params.medicion));
    res.json({ ok: true });
  });

  app.post("/api/budget-requests/:id/pdf", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    const [request] = await db.select().from(budgetRequests).where(eq(budgetRequests.id, req.params.id));
    if (!request) return res.status(404).json({ message: "No encontrado" });

    const prices = await db.select().from(priceConfig);
    const priceMap = Object.fromEntries(prices.map(p => [p.medicion, p.precioBase]));
    const mediciones = request.medicionesSolicitadas as string[];
    const items = mediciones.map(m => ({
      nombre: prices.find(p => p.medicion === m)?.descripcion || m,
      precio: priceMap[m] || 0,
    }));
    const total = request.presupuestoTotal ?? items.reduce((acc, i) => acc + i.precio, 0);
    const nro = `PRES-${Date.now().toString().slice(-6)}`;
    const fecha = new Date().toLocaleDateString("es-AR");

    const {
      Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
      WidthType, BorderStyle, AlignmentType, VerticalAlign, ShadingType,
    } = await import("docx");

    const NAVY = "0D2F5E", HDR = "D6E4F0";
    const BD = () => ({ style: BorderStyle.SINGLE, size: 4, color: "999999" });
    const BORDERS = () => ({ top: BD(), bottom: BD(), left: BD(), right: BD() });

    const run = (text: string, opts: any = {}) => new TextRun({
      text: String(text ?? ""), font: "Arial",
      size: (opts.size || 9) * 2, bold: !!opts.bold,
      color: opts.color || "000000", italics: !!opts.italic,
    });

    const mkCell = (text: string, opts: any = {}) => new TableCell({
      children: [new Paragraph({
        children: [run(text, opts)],
        alignment: opts.align || AlignmentType.LEFT,
        spacing: { before: 40, after: 40 },
      })],
      borders: BORDERS(),
      shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill, color: opts.fill } : undefined,
      columnSpan: opts.span,
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      verticalAlign: VerticalAlign.CENTER,
    });

    const hdr = (text: string, opts: any = {}) => mkCell(text, { bold: true, fill: HDR, color: NAVY, ...opts });

    const doc = new Document({
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 720, right: 720, bottom: 1080, left: 720 } } },
        children: [
          new Paragraph({ children: [run("ENVIRONMENTAL EXPRESS ARGENTINA", { size: 16, bold: true, color: NAVY })], alignment: AlignmentType.CENTER, spacing: { before: 200, after: 80 } }),
          new Paragraph({ children: [run("Servicios de Higiene y Seguridad en el Trabajo", { size: 10, italic: true, color: "555555" })], alignment: AlignmentType.CENTER, spacing: { before: 0, after: 400 } }),
          new Table({
            width: { size: 10460, type: WidthType.DXA },
            columnWidths: [5230, 5230],
            rows: [new TableRow({ children: [hdr(`PRESUPUESTO N° ${nro}`, { size: 11 }), hdr(`Fecha: ${fecha}`, { size: 10, align: AlignmentType.RIGHT })] })],
          }),
          new Paragraph({ spacing: { before: 200, after: 80 } }),
          new Table({
            width: { size: 10460, type: WidthType.DXA },
            columnWidths: [10460],
            rows: [
              new TableRow({ children: [hdr("DATOS DEL CLIENTE")] }),
              new TableRow({ children: [mkCell(`Razón Social: ${request.razonSocial}  |  CUIT: ${request.cuit || "-"}`)] }),
              new TableRow({ children: [mkCell(`Dirección: ${request.direccion || "-"}, ${request.localidad || "-"}, ${request.provincia || "-"}`)] }),
              new TableRow({ children: [mkCell(`Rubro: ${request.rubro || "-"}`)] }),
              new TableRow({ children: [mkCell(`Contacto: ${request.contactoNombre} (${request.contactoCargo || "-"})  |  Email: ${request.contactoEmail}  |  Tel: ${request.contactoTelefono || "-"}`)] }),
            ],
          }),
          new Paragraph({ spacing: { before: 200, after: 80 } }),
          new Table({
            width: { size: 10460, type: WidthType.DXA },
            columnWidths: [7000, 1730, 1730],
            rows: [
              new TableRow({ children: [hdr("SERVICIO / ESTUDIO"), hdr("PRECIO UNIT.", { align: AlignmentType.RIGHT }), hdr("SUBTOTAL", { align: AlignmentType.RIGHT })] }),
              ...items.map(item => new TableRow({ children: [mkCell(item.nombre), mkCell(`$ ${item.precio.toLocaleString("es-AR")}`, { align: AlignmentType.RIGHT }), mkCell(`$ ${item.precio.toLocaleString("es-AR")}`, { align: AlignmentType.RIGHT })] })),
              new TableRow({ children: [hdr("TOTAL", { align: AlignmentType.RIGHT, span: 2 }), hdr(`$ ${total.toLocaleString("es-AR")}`, { align: AlignmentType.RIGHT })] }),
            ],
          }),
          new Paragraph({ spacing: { before: 200, after: 80 } }),
          new Table({
            width: { size: 10460, type: WidthType.DXA },
            columnWidths: [10460],
            rows: [
              new TableRow({ children: [hdr("CONDICIONES")] }),
              new TableRow({ children: [mkCell("• Validez: 15 días corridos desde la fecha de emisión.\n• Forma de pago: a convenir.\n• Entrega de informe: 48-72 horas hábiles posteriores a la medición.\n• Los precios no incluyen IVA.\n• Instrumentos calibrados con trazabilidad al INTI.")] }),
            ],
          }),
          ...(request.respuesta ? [
            new Paragraph({ spacing: { before: 200, after: 80 } }),
            new Table({
              width: { size: 10460, type: WidthType.DXA },
              columnWidths: [10460],
              rows: [
                new TableRow({ children: [hdr("OBSERVACIONES")] }),
                new TableRow({ children: [mkCell(request.respuesta)] }),
              ],
            }),
          ] : []),
          new Paragraph({ spacing: { before: 600, after: 80 } }),
          new Paragraph({ children: [run("________________________________", { size: 18, color: NAVY })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [run("Environmental Express Argentina", { size: 16, bold: true, color: NAVY })], alignment: AlignmentType.CENTER }),
          new Paragraph({ children: [run("contacto@envexar.com  |  envexar.com", { size: 14, color: "555555" })], alignment: AlignmentType.CENTER }),
        ],
      }],
    });

    const buffer = await Packer.toBuffer(doc);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename=Presupuesto_EEA_${request.razonSocial.replace(/\s+/g, "_")}_${nro}.docx`);
    res.send(buffer);
  });

  // ── PORTAL ADMIN ──
  app.get("/api/padmin/users", requireAdmin, async (req, res) => {
    const users = await db.select().from(clientPortalUsers).orderBy(desc(clientPortalUsers.creadoEn));
    res.json(users);
  });

  app.post("/api/padmin/users", requireAdmin, async (req, res) => {
    const { nombre, email } = req.body;
    if (!nombre || !email) return res.status(400).json({ message: "nombre y email requeridos" });
    const plainPass = generatePassword();
    const hashed = hashPortalPassword(plainPass);
    try {
      const [user] = await db.insert(clientPortalUsers).values({ nombre, email, password: hashed }).returning();
      if (process.env.SMTP_HOST) {
        try {
          const nodemailer = await import("nodemailer");
          const t = nodemailer.default.createTransport({ host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || "587"), auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
          await t.sendMail({ from: process.env.SMTP_USER, to: email, subject: "Acceso al Portal de Informes — EEA", text: `Hola ${nombre},\n\nTu acceso al portal está listo.\n\nURL: envexar.com/portal\nEmail: ${email}\nContraseña: ${plainPass}\n\nSaludos,\nEnvironmental Express Argentina` });
        } catch (e) { console.warn("Email no enviado:", e); }
      }
      res.json({ ok: true, id: user.id, password: plainPass });
    } catch (err: any) {
      console.error("Error creando usuario portal (padmin):", err);
      if (err?.code === "23505") return res.status(409).json({ message: "Email ya registrado" });
      res.status(500).json({ message: "Error al crear usuario", detail: String(err?.message || err) });
    }
  });

  app.patch("/api/padmin/users/:id", requireAdmin, async (req, res) => {
    await db.update(clientPortalUsers).set({ activo: req.body.activo }).where(eq(clientPortalUsers.id, req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/padmin/users/:id/reset-password", requireAdmin, async (req, res) => {
    const plainPass = crypto.randomBytes(4).toString("hex");
    const hashed = hashPortalPassword(plainPass);
    await db.update(clientPortalUsers).set({ password: hashed }).where(eq(clientPortalUsers.id, req.params.id));
    res.json({ password: plainPass });
  });

  app.delete("/api/padmin/users/:id", requireAdmin, async (req, res) => {
    await db.delete(clientReports).where(eq(clientReports.clientPortalUserId, req.params.id));
    await db.delete(clientPortalUsers).where(eq(clientPortalUsers.id, req.params.id));
    res.json({ ok: true });
  });

  app.get("/api/padmin/reports", requireAdmin, async (req, res) => {
    const reports = await db.select({
      id: clientReports.id, clientPortalUserId: clientReports.clientPortalUserId,
      titulo: clientReports.titulo, descripcion: clientReports.descripcion,
      tipoEstudio: clientReports.tipoEstudio, fechaEstudio: clientReports.fechaEstudio,
      pdfNombre: clientReports.pdfNombre, notificacionEnviada: clientReports.notificacionEnviada,
      creadoEn: clientReports.creadoEn,
    }).from(clientReports).orderBy(desc(clientReports.creadoEn));
    res.json(reports);
  });

  app.post("/api/padmin/reports", requireAdmin, async (req, res) => {
    const { clientPortalUserId, titulo, descripcion, tipoEstudio, fechaEstudio, pdfData, pdfNombre } = req.body;
    if (!clientPortalUserId || !titulo || !pdfData || !pdfNombre)
      return res.status(400).json({ message: "Faltan campos requeridos" });
    const [report] = await db.insert(clientReports).values({ clientPortalUserId, titulo, descripcion, tipoEstudio, fechaEstudio, pdfData, pdfNombre }).returning();
    if (process.env.SMTP_HOST) {
      try {
        const [usuario] = await db.select().from(clientPortalUsers).where(eq(clientPortalUsers.id, clientPortalUserId));
        if (usuario) {
          const nodemailer = await import("nodemailer");
          const t = nodemailer.default.createTransport({ host: process.env.SMTP_HOST, port: parseInt(process.env.SMTP_PORT || "587"), auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
          await t.sendMail({ from: process.env.SMTP_USER, to: usuario.email, subject: `📄 Nuevo informe: ${titulo}`, text: `Hola ${usuario.nombre},\n\nTenés un nuevo informe disponible en el portal.\n\nenvexar.com/portal\n\nSaludos,\nEEA` });
          await db.update(clientReports).set({ notificacionEnviada: true }).where(eq(clientReports.id, report.id));
        }
      } catch (e) { console.warn("Email no enviado:", e); }
    }
    res.json({ ok: true, id: report.id });
  });

  app.delete("/api/padmin/reports/:id", requireAdmin, async (req, res) => {
    await db.delete(clientReports).where(eq(clientReports.id, req.params.id));
    res.json({ ok: true });
  });

  // ── PORTAL DE CLIENTES — admin ──

  app.post("/api/portal/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    const { nombre, email, clientId } = req.body;
    if (!nombre || !email) return res.status(400).json({ message: "nombre y email son requeridos" });
    const plainPass = generatePassword();
    const hashed = hashPortalPassword(plainPass);
    try {
      const [user] = await db.insert(clientPortalUsers).values({
        nombre, email, password: hashed, clientId: clientId || null,
      }).returning();

      // Enviar email con credenciales si hay SMTP configurado
      if (process.env.SMTP_HOST) {
        try {
          const nodemailer = await import("nodemailer");
          const transporter = nodemailer.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || "587"),
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          });
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: email,
            subject: "Acceso al Portal de Informes — Environmental Express Argentina",
            text: `Hola ${nombre},\n\nTu acceso al portal de informes de EEA está listo.\n\nURL: envexar.com/portal\nEmail: ${email}\nContraseña: ${plainPass}\n\nEn el portal podrás ver y descargar todos tus informes de higiene y seguridad.\n\nSaludos,\nEnvironmental Express Argentina`,
          });
        } catch (e) {
          console.warn("Email portal no enviado:", e);
        }
      }

      res.json({ ok: true, id: user.id, password: plainPass });
    } catch (err: any) {
      if (err?.code === "23505") return res.status(409).json({ message: "Ya existe un usuario con ese email" });
      throw err;
    }
  });

  app.get("/api/portal/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    const users = await db.select().from(clientPortalUsers).orderBy(desc(clientPortalUsers.creadoEn));
    res.json(users);
  });

  app.patch("/api/portal/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    await db.update(clientPortalUsers).set({ activo: req.body.activo }).where(eq(clientPortalUsers.id, req.params.id));
    res.json({ ok: true });
  });

  app.delete("/api/portal/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    await db.delete(clientReports).where(eq(clientReports.clientPortalUserId, req.params.id));
    await db.delete(clientPortalUsers).where(eq(clientPortalUsers.id, req.params.id));
    res.json({ ok: true });
  });

  app.post("/api/portal/reports", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    const { clientPortalUserId, titulo, descripcion, tipoEstudio, fechaEstudio, pdfData, pdfNombre } = req.body;
    if (!clientPortalUserId || !titulo || !pdfData || !pdfNombre)
      return res.status(400).json({ message: "Campos requeridos: clientPortalUserId, titulo, pdfData, pdfNombre" });

    const [report] = await db.insert(clientReports).values({
      clientPortalUserId, titulo, descripcion, tipoEstudio, fechaEstudio,
      pdfData, pdfNombre,
    }).returning();

    // Notificación al cliente si hay SMTP
    if (process.env.SMTP_HOST) {
      try {
        const [usuario] = await db.select().from(clientPortalUsers).where(eq(clientPortalUsers.id, clientPortalUserId));
        if (usuario) {
          const nodemailer = await import("nodemailer");
          const transporter = nodemailer.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || "587"),
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
          });
          await transporter.sendMail({
            from: process.env.SMTP_USER,
            to: usuario.email,
            subject: `📄 Nuevo informe disponible: ${titulo}`,
            text: `Hola ${usuario.nombre},\n\nTenés un nuevo informe disponible en tu portal:\n\n"${titulo}"\n\nIngresá en envexar.com/portal para descargarlo.\n\nSaludos,\nEnvironmental Express Argentina`,
          });
          await db.update(clientReports).set({ notificacionEnviada: true }).where(eq(clientReports.id, report.id));
        }
      } catch (e) {
        console.warn("Email notificación informe no enviado:", e);
      }
    }

    res.json({ ok: true, id: report.id });
  });

  app.get("/api/portal/reports", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    const reports = await db.select({
      id: clientReports.id,
      clientPortalUserId: clientReports.clientPortalUserId,
      titulo: clientReports.titulo,
      descripcion: clientReports.descripcion,
      tipoEstudio: clientReports.tipoEstudio,
      fechaEstudio: clientReports.fechaEstudio,
      pdfNombre: clientReports.pdfNombre,
      notificacionEnviada: clientReports.notificacionEnviada,
      creadoEn: clientReports.creadoEn,
    }).from(clientReports).orderBy(desc(clientReports.creadoEn));
    res.json(reports);
  });

  app.delete("/api/portal/reports/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "No autorizado" });
    await db.delete(clientReports).where(eq(clientReports.id, req.params.id));
    res.json({ ok: true });
  });

  // ── PORTAL DE CLIENTES — acceso cliente (sesión independiente) ──

  app.post("/api/portal/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email y contraseña requeridos" });
    const [user] = await db.select().from(clientPortalUsers).where(eq(clientPortalUsers.email, email.toLowerCase().trim()));
    if (!user) return res.status(401).json({ message: "Credenciales inválidas" });
    if (!user.activo) return res.status(403).json({ message: "Acceso desactivado. Contactá a EEA." });
    if (hashPortalPassword(password) !== user.password) return res.status(401).json({ message: "Credenciales inválidas" });
    req.session.portalUserId = user.id;
    req.session.save(() => res.json({ ok: true, id: user.id, nombre: user.nombre, email: user.email, activo: user.activo }));
  });

  app.post("/api/portal/logout", (req, res) => {
    delete req.session.portalUserId;
    req.session.save(() => res.json({ ok: true }));
  });

  app.get("/api/portal/me", async (req, res) => {
    if (!req.session.portalUserId) return res.status(401).json({ message: "No autenticado" });
    const [user] = await db.select({
      id: clientPortalUsers.id,
      nombre: clientPortalUsers.nombre,
      email: clientPortalUsers.email,
      activo: clientPortalUsers.activo,
    }).from(clientPortalUsers).where(eq(clientPortalUsers.id, req.session.portalUserId));
    if (!user || !user.activo) return res.status(401).json({ message: "Sesión inválida" });
    res.json(user);
  });

  app.get("/api/portal/me/reports", async (req, res) => {
    console.log("Portal user ID:", req.session.portalUserId);
    if (!req.session.portalUserId) return res.status(401).json({ message: "No autenticado" });
    const reports = await db.select().from(clientReports)
      .where(eq(clientReports.clientPortalUserId, req.session.portalUserId))
      .orderBy(desc(clientReports.creadoEn));
    console.log("Reports found:", reports.length);
    res.json(reports);
  });

  app.get("/api/portal/me/reports/:id/download", async (req, res) => {
    if (!req.session.portalUserId) return res.status(401).json({ message: "No autenticado" });
    const [report] = await db.select().from(clientReports)
      .where(eq(clientReports.id, req.params.id));
    if (!report || report.clientPortalUserId !== req.session.portalUserId)
      return res.status(404).json({ message: "Informe no encontrado" });
    const buf = Buffer.from(report.pdfData, "base64");
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "no-store, no-cache");
    res.send(buf);
  });

  // ── AI text generation for noise protocol ────────────────────────────────
  app.post("/api/noise/generate-text", requireAuth, async (req, res) => {
    const { field, summary, empresa } = req.body as { field: string; summary: string; empresa: string };
    if (!field || !summary) return res.status(400).json({ message: "Faltan datos" });
    try {
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || "replit",
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const prompts: Record<string, string> = {
        conclusiones: `Sos un profesional en higiene y seguridad laboral argentino. Redactá las CONCLUSIONES técnicas de un informe de Ruido (Resol. SRT 85/2012, Anexo V Resol. MTEySS 295/2003) para la empresa "${empresa}" en base a los siguientes resultados por puesto:\n\n${summary}\n\nRedactá 2-3 párrafos en español formal indicando cumplimiento/no cumplimiento, puestos críticos y estado general. Sin viñetas, solo texto corrido.`,
        recomendaciones: `Sos un profesional en higiene y seguridad laboral argentino. Redactá las RECOMENDACIONES de control del ruido (Resol. SRT 85/2012) para la empresa "${empresa}" en base a los siguientes resultados:\n\n${summary}\n\nRedactá medidas correctivas: EPP, controles de ingeniería, señalización, capacitación, vigilancia médica. 2-3 párrafos en español formal. Sin viñetas.`,
      };
      const prompt = prompts[field];
      if (!prompt) return res.status(400).json({ message: "Campo inválido" });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.4,
      });
      res.json({ text: completion.choices[0]?.message?.content?.trim() ?? "" });
    } catch (err) {
      console.error("Error generando texto IA (ruido):", err);
      res.status(500).json({ message: "Error generando texto" });
    }
  });

  // ── AI text generation for lighting protocol ─────────────────────────────
  app.post("/api/lighting/generate-text", requireAuth, async (req, res) => {
    const { field, summary, empresa } = req.body as { field: string; summary: string; empresa: string };
    if (!field || !summary) return res.status(400).json({ message: "Faltan datos" });
    try {
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const prompts: Record<string, string> = {
        conclusiones: `Sos un profesional en higiene y seguridad laboral argentino. Redactá las CONCLUSIONES técnicas de un informe de Iluminación (Resol. SRT 84/2012, Dec. 351/79 Anexo IV) para la empresa "${empresa}" en base a los siguientes resultados por sector:\n\n${summary}\n\nRedactá 2-3 párrafos técnicos en español formal, indicando si cumplen o no los valores legales, y mencionando los sectores críticos. Sin viñetas, solo texto corrido.`,
        recomendaciones: `Sos un profesional en higiene y seguridad laboral argentino. Redactá las RECOMENDACIONES de mejora lumínica (Resol. SRT 84/2012) para la empresa "${empresa}" en base a los siguientes resultados:\n\n${summary}\n\nRedactá medidas de mejora (reemplazo de luminarias, mantenimiento, redistribución, etc.). 2-3 párrafos en español formal. Sin viñetas, solo texto corrido.`,
      };
      const prompt = prompts[field];
      if (!prompt) return res.status(400).json({ message: "Campo inválido" });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.4,
      });
      res.json({ text: completion.choices[0]?.message?.content?.trim() ?? "" });
    } catch (err) {
      console.error("Error generando texto IA (iluminación):", err);
      res.status(500).json({ message: "Error generando texto" });
    }
  });

  // ── AI text generation for cold stress protocol ─────────────────────────
  app.post("/api/cold/generate-text", requireAuth, async (req, res) => {
    const { field, summary, empresa } = req.body as { field: string; summary: string; empresa: string };
    if (!field || !summary) return res.status(400).json({ message: "Faltan datos" });
    try {
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const prompts: Record<string, string> = {
        conclusiones: `Sos un profesional en higiene y seguridad laboral argentino. Redactá las CONCLUSIONES técnicas de un informe de Estrés por Frío (Res. MTEySS 295/2003) para la empresa "${empresa}" en base a los siguientes resultados:\n\n${summary}\n\nRedactá 2-3 párrafos técnicos concisos en español formal, mencionando el nivel de peligro de cada puesto (Poco Peligroso / Peligro Creciente / Gran Peligro). Sin viñetas, solo texto corrido.`,
        recomendaciones: `Sos un profesional en higiene y seguridad laboral argentino. Redactá las RECOMENDACIONES para prevenir el estrés por frío (Res. MTEySS 295/2003) para la empresa "${empresa}" en base a los siguientes resultados:\n\n${summary}\n\nRedactá medidas de control (EPP, organización del trabajo, vigilancia médica). 2-3 párrafos en español formal. Sin viñetas, solo texto corrido.`,
      };
      const prompt = prompts[field];
      if (!prompt) return res.status(400).json({ message: "Campo inválido" });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.4,
      });
      res.json({ text: completion.choices[0]?.message?.content?.trim() ?? "" });
    } catch (err) {
      console.error("Error generando texto IA (frío):", err);
      res.status(500).json({ message: "Error generando texto" });
    }
  });

  // ── AI text generation for thermal protocol ──────────────────────────────
  app.post("/api/thermal/generate-text", requireAuth, async (req, res) => {
    const { field, summary, empresa } = req.body as { field: string; summary: string; empresa: string };
    if (!field || !summary) return res.status(400).json({ message: "Faltan datos" });
    try {
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const prompts: Record<string, string> = {
        conclusiones: `Sos un profesional en higiene y seguridad laboral argentino. Redactá las CONCLUSIONES técnicas de un informe de medición de Carga Térmica (Res. SRT 30/2023) para la empresa "${empresa}" en base a los siguientes resultados de medición:\n\n${summary}\n\nRedacta 2-3 párrafos técnicos concisos en español formal, mencionando los puestos que cumplen/no cumplen VLA y VLP. Sin viñetas, solo texto corrido.`,
        recomendaciones: `Sos un profesional en higiene y seguridad laboral argentino. Redactá las RECOMENDACIONES técnicas de un informe de medición de Carga Térmica (Res. SRT 30/2023) para la empresa "${empresa}" en base a los siguientes resultados:\n\n${summary}\n\nRedactá medidas de control y mejora concretas. 2-3 párrafos en español formal. Sin viñetas, solo texto corrido.`,
      };
      const prompt = prompts[field];
      if (!prompt) return res.status(400).json({ message: "Campo inválido" });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.4,
      });
      const text = completion.choices[0]?.message?.content?.trim() ?? "";
      res.json({ text });
    } catch (err) {
      console.error("Error generando texto IA:", err);
      res.status(500).json({ message: "Error generando texto" });
    }
  });

  app.post("/api/ventilation/generate-text", requireAuth, async (req, res) => {
    const { field, summary, empresa } = req.body as { field: string; summary: string; empresa: string };
    if (!field || !summary) return res.status(400).json({ message: "Faltan datos" });
    try {
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const prompts: Record<string, string> = {
        conclusiones: `Sos un profesional en higiene y seguridad laboral argentino. Redactá las CONCLUSIONES técnicas de un informe de Medición de Ventilación (Ley 19.587/72, Decreto 351/79 Cap. XI Art. 64) para la empresa "${empresa}" en base a los siguientes resultados:\n\n${summary}\n\nRedactá 2-3 párrafos técnicos concisos en español formal, mencionando los puestos/sectores que cumplen o no cumplen los valores mínimos de cubaje y caudal. Sin viñetas, solo texto corrido.`,
        recomendaciones: `Sos un profesional en higiene y seguridad laboral argentino. Redactá las RECOMENDACIONES técnicas de un informe de Medición de Ventilación (Dec. 351/79 Art. 64) para la empresa "${empresa}" en base a los resultados:\n\n${summary}\n\nRedactá medidas concretas de mejora del sistema de ventilación. 2-3 párrafos en español formal. Sin viñetas.`,
      };
      const prompt = prompts[field];
      if (!prompt) return res.status(400).json({ message: "Campo inválido" });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.4,
      });
      const text = completion.choices[0]?.message?.content?.trim() ?? "";
      res.json({ text });
    } catch (err) {
      console.error("Error generando texto IA:", err);
      res.status(500).json({ message: "Error generando texto" });
    }
  });

  app.post("/api/grounding/generate-text", requireAuth, async (req, res) => {
    const { field, summary, empresa } = req.body as { field: string; summary: string; empresa: string };
    if (!field || !summary) return res.status(400).json({ message: "Faltan datos" });
    try {
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      const prompts: Record<string, string> = {
        conclusiones: `Sos un profesional en higiene y seguridad laboral argentino. Redactá las CONCLUSIONES técnicas del Protocolo de Medición de Puesta a Tierra (Res. SRT 900/2015, Reglamento AEA 90364) para la empresa "${empresa}" en base a los siguientes resultados:\n\n${summary}\n\nRedactá 2-3 párrafos técnicos en español formal mencionando los valores medidos, el cumplimiento del límite de 40Ω y el estado de los dispositivos de protección. Sin viñetas, solo texto corrido.`,
        recomendaciones: `Sos un profesional en higiene y seguridad laboral argentino. Redactá las RECOMENDACIONES para el mantenimiento del sistema de Puesta a Tierra (Res. SRT 900/2015) para la empresa "${empresa}":\n\n${summary}\n\nIncluí: revisión anual de instalaciones, prohibición de intercalar elementos de corte en el conductor de PAT, comprobación de continuidad, limpieza de conexiones. 2-3 párrafos formales.`,
      };
      const prompt = prompts[field];
      if (!prompt) return res.status(400).json({ message: "Campo inválido" });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.4,
      });
      const text = completion.choices[0]?.message?.content?.trim() ?? "";
      res.json({ text });
    } catch (err) {
      console.error("Error generando texto IA:", err);
      res.status(500).json({ message: "Error generando texto" });
    }
  });

  return httpServer;
}
