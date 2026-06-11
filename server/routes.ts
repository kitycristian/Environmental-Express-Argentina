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
    if (!apiKey) return null;
    return new OpenAI({
      apiKey,
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
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
      const { establishment, noiseProtocol, thermalProtocol, coldProtocol,
              lightingSectors, signatory } = req.body;

      const {
        Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
        WidthType, BorderStyle, AlignmentType, Footer, PageNumber,
        VerticalAlign, ShadingType, PageBreak,
      } = await import("docx");

      const NAVY = "0D2F5E", GREEN = "2E7D32", HDR_BLUE = "D6E4F0";
      const WHITE = "FFFFFF", GREEN_OK = "27AE60", RED_FAIL = "C0392B";
      const A4_W = 11906, MARG = 720, CONT_W = A4_W - MARG * 2;

      const BD = (c = "000000", sz = 6) => ({ style: BorderStyle.SINGLE, size: sz, color: c });
      const BORDERS = (c = "999999") => ({ top: BD(c,4), bottom: BD(c,4), left: BD(c,4), right: BD(c,4) });
      const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

      const run = (text: any, opts: any = {}) => new TextRun({
        text: String(text ?? ""),
        font: "Arial",
        size: (opts.size || 9) * 2,
        bold: !!opts.bold,
        color: opts.color || "000000",
        italics: !!opts.italic,
      });

      const cell = (text: any, opts: any = {}) => new TableCell({
        children: [new Paragraph({
          children: [run(text, { size: opts.size || 9, bold: opts.bold, color: opts.color })],
          alignment: opts.align || AlignmentType.LEFT,
          spacing: { before: 30, after: 30 },
        })],
        borders: opts.borders || BORDERS(),
        shading: opts.fill ? { type: ShadingType.CLEAR, color: opts.fill, fill: opts.fill } : undefined,
        columnSpan: opts.span,
        rowSpan: opts.rowSpan,
        width: opts.width ? { size: opts.width, type: WidthType.DXA } : undefined,
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 120, right: 120 },
      });

      const hdr = (text: any, opts: any = {}) =>
        cell(text, { bold: true, fill: HDR_BLUE, color: NAVY, size: opts.size || 9, align: opts.align || AlignmentType.LEFT, ...opts });

      const cumpleCell = (val: any) => {
        const ok = String(val).toUpperCase() === "SI";
        const bad = String(val).toUpperCase() === "NO";
        return cell(val || "-", {
          bold: true, align: AlignmentType.CENTER, size: 8.5,
          fill: ok ? "D4EDDA" : bad ? "FADBD8" : WHITE,
          color: ok ? GREEN_OK : bad ? RED_FAIL : "000000",
        });
      };

      const pageBreakPara = () => new Paragraph({ children: [new PageBreak()] });

      const protocolHeader = (title: string, est: any) => new Table({
        width: { size: CONT_W, type: WidthType.DXA },
        columnWidths: [CONT_W],
        rows: [
          new TableRow({ children: [hdr(title, { align: AlignmentType.CENTER, size: 10 })] }),
          new TableRow({ children: [hdr("Datos del establecimiento")] }),
          new TableRow({ children: [cell(`Razón Social: ${est.razonSocial || est.name || "-"}`)] }),
          new TableRow({ children: [cell(`Dirección: ${est.address || "-"}`)] }),
          new TableRow({ children: [cell(`Localidad: ${est.city || est.localidad || "-"}    C.P.: ${est.postalCode || est.cp || "-"}    Provincia: ${est.province || est.provincia || "-"}`)] }),
          new TableRow({ children: [cell(`C.U.I.T.: ${est.cuit || "-"}`)] }),
        ],
      });

      const makeFooter = () => new Footer({
        children: [
          new Table({
            width: { size: CONT_W, type: WidthType.DXA },
            columnWidths: [Math.floor(CONT_W * 0.65), Math.floor(CONT_W * 0.35)],
            rows: [new TableRow({ children: [
              cell(`${signatory?.title || "Lic. H&SL"} ${signatory?.name || ""}  Mat. Prof. ${signatory?.registration || ""}`, {
                borders: { top: BD(NAVY, 8), bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
                size: 8,
              }),
              cell("Firma, aclaración y registro del Profesional interviniente.", {
                bold: true, align: AlignmentType.RIGHT, size: 8,
                borders: { top: BD(NAVY, 8), bottom: NO_BORDER, left: NO_BORDER, right: NO_BORDER },
              }),
            ]})],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Página ", font: "Arial", size: 16 }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 16 }),
              new TextRun({ text: " de ", font: "Arial", size: 16 }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 16 }),
            ],
            alignment: AlignmentType.RIGHT,
            spacing: { before: 40, after: 0 },
          }),
        ],
      });

      // ── PORTADA ──────────────────────────────────────────────────────────────
      const coverChildren: any[] = [
        new Paragraph({
          children: [run("ENVIRONMENTAL EXPRESS ARGENTINA", { size: 16, bold: true, color: NAVY })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 2400, after: 120 },
        }),
        new Paragraph({
          children: [run("Servicios de Higiene y Seguridad en el Trabajo", { size: 10, italic: true, color: "555555" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 600 },
        }),
        new Paragraph({
          children: [run(establishment.razonSocial || establishment.name || "", { size: 18, bold: true, color: NAVY })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 160 },
        }),
        new Paragraph({
          children: [run(`${establishment.address || ""}, ${establishment.city || ""}`, { size: 11, bold: true, color: "333333" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 80 },
        }),
        new Paragraph({
          children: [run(`Provincia de ${establishment.province || ""}`, { size: 11, bold: true, color: "333333" })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 400 },
        }),
        new Paragraph({
          children: [run(establishment.date
            ? new Date(establishment.date + "T12:00:00").toLocaleDateString("es-AR", { month: "long", year: "numeric" }).toUpperCase()
            : "", { size: 12, bold: true, color: NAVY })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 600 },
        }),
      ];

      const estudios: string[] = [];
      if (thermalProtocol?.rows?.some((r: any) => r.sector || r.tbs)) estudios.push("ESTRÉS POR CALOR — Resol. SRT N° 30/2023");
      if (coldProtocol?.rows?.some((r: any) => r.sector || r.tbs)) estudios.push("ESTRÉS POR FRÍO — Resol. MTEySS N° 295/2003");
      if (noiseProtocol?.rows?.some((r: any) => r.sector || r.valorMedido)) estudios.push("RUIDO LABORAL — Resol. SRT N° 85/2012");
      if (lightingSectors?.length) estudios.push("ILUMINACIÓN — Resol. SRT N° 84/2012");

      if (estudios.length) {
        coverChildren.push(new Paragraph({
          children: [run("ESTUDIOS REALIZADOS:", { size: 10, bold: true, color: NAVY })],
          alignment: AlignmentType.LEFT,
          spacing: { before: 200, after: 120 },
        }));
        estudios.forEach((e: string) => coverChildren.push(new Paragraph({
          children: [run(`• ${e}`, { size: 10, color: "333333" })],
          spacing: { before: 60, after: 60 },
        })));
      }

      // ── SECCIÓN CALOR ─────────────────────────────────────────────────────────
      const buildThermalSection = () => {
        if (!thermalProtocol?.rows?.some((r: any) => r.sector || r.tbs)) return [];
        const est = establishment, rows = thermalProtocol.rows, comp = thermalProtocol.company || {};
        const items: any[] = [pageBreakPara()];

        items.push(new Paragraph({
          children: [run("ESTUDIO DE ESTRÉS POR CALOR SEGÚN RESOL. SRT Nº 30/2023", { size: 13, bold: true, color: NAVY })],
          alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 },
        }));

        items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", est));

        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Datos para la medición")] }),
            new TableRow({ children: [cell(`Marca, modelo y número de serie de los instrumentos: ${comp.instrumento1 || "-"} Serie: ${comp.instrumento1Serie || "-"} Cert: ${comp.instrumento1Cert || "-"}  |  ${comp.instrumento2 || "-"} Serie: ${comp.instrumento2Serie || "-"} Cert: ${comp.instrumento2Cert || "-"}`)] }),
            new TableRow({ children: [cell(`Fecha de calibración: ${comp.instrumento1FechaCal || "-"}`)] }),
            new TableRow({ children: [cell(`Fecha de la medición: ${comp.fechaMedicion || "-"}    Hora de inicio: ${comp.horaInicio || "-"}    Hora finalización: ${comp.horaFin || "-"}`)] }),
            new TableRow({ children: [cell(`Horarios/turnos habituales de trabajo: ${comp.turnos || "-"}`)] }),
            new TableRow({ children: [cell(`Condiciones atmosféricas: ${comp.condicionesAtm || "-"}    Temperatura exterior: ${comp.tempExterior || comp.tempExteriorEnvio || "-"} °C`)] }),
            new TableRow({ children: [hdr("Documentación que se adjuntará")] }),
            new TableRow({ children: [cell("• Certificado de calibración\n• Croquis")] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA },
          columnWidths: [460, 1300, 1500, 600, 650, 650, 650, 700, 800, 700, 900, 800, 800, 900],
          rows: [
            new TableRow({ children: [
              hdr("Pto", { align: AlignmentType.CENTER }),
              hdr("Sector"),
              hdr("Puesto de Trabajo"),
              hdr("Exp. (h)", { align: AlignmentType.CENTER }),
              hdr("TBS (°C)", { align: AlignmentType.CENTER }),
              hdr("TBH (°C)", { align: AlignmentType.CENTER }),
              hdr("TG (°C)", { align: AlignmentType.CENTER }),
              hdr("TGBH (°C)", { align: AlignmentType.CENTER }),
              hdr("TGBH Pond.", { align: AlignmentType.CENTER }),
              hdr("Aclim.", { align: AlignmentType.CENTER }),
              hdr("TM (W)", { align: AlignmentType.CENTER }),
              hdr("VLA", { align: AlignmentType.CENTER }),
              hdr("VLP", { align: AlignmentType.CENTER }),
              hdr("Cumple VLA", { align: AlignmentType.CENTER }),
            ]}),
            ...rows.map((r: any, i: number) => new TableRow({ children: [
              cell(String(i + 1).padStart(2, "0"), { align: AlignmentType.CENTER }),
              cell(r.sector || ""),
              cell(r.puestoTrabajo || ""),
              cell(r.exposicionHs || "", { align: AlignmentType.CENTER }),
              cell(r.tbs || "", { align: AlignmentType.CENTER }),
              cell(r.tbh || "", { align: AlignmentType.CENTER }),
              cell(r.tg || "", { align: AlignmentType.CENTER }),
              cell(r.tgbh || "", { align: AlignmentType.CENTER }),
              cell(r.tgbhPonderado || "", { align: AlignmentType.CENTER, bold: true }),
              cell(r.aclimatado || "", { align: AlignmentType.CENTER }),
              cell(r.cargaMetabolica || "", { align: AlignmentType.CENTER }),
              cell(r.vla || "", { align: AlignmentType.CENTER }),
              cell(r.vlp || "", { align: AlignmentType.CENTER }),
              cumpleCell(r.cumpleVla),
            ]})),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Valores de Referencia")] }),
            new TableRow({ children: [cell(
              "Categorías según Tasa Metabólica ponderada (Resol. SRT 30/2023):\n" +
              "  0 - Descanso: 115 W (100-125)\n" +
              "  1 - Ligero: 180 W (126-235)\n" +
              "  2 - Moderado: 300 W (236-360)\n" +
              "  3 - Pesado: 415 W (361-465)\n" +
              "  4 - Muy Pesado: 520 W (>466)\n\n" +
              "Los Valores Límites representan las condiciones bajo las cuales se cree que casi todos los trabajadores sanos, " +
              "y sin factores de riesgo, pueden estar expuestos repetidamente al calor sin sufrir efectos adversos para la salud. " +
              "El estrés térmico depende de: condiciones higrotérmicas, tasa metabólica y vestimenta.\n\n" +
              "TABLA 1 — Valor de Ajuste por Ropa (VAR):\n" +
              "Ropa trabajo algodón: 0 | Overol tejido: 0 | Overol SMS una capa: +0,5 | " +
              "Overol poliolefina: +1 | Ropa doble capa: +3 | Overol barrera vapor: +11"
            )] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Análisis de los Datos")] }),
            new TableRow({ children: [hdr("Conclusiones")] }),
            new TableRow({ children: [cell(thermalProtocol.conclusiones || "(Sin conclusiones cargadas)")] }),
            new TableRow({ children: [hdr("Controles Generales / Recomendaciones")] }),
            new TableRow({ children: [cell(thermalProtocol.recomendaciones || "(Sin recomendaciones cargadas)")] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Constancia Fotográfica de las Tareas")] }),
            new TableRow({ children: [cell("(Adjuntar fotografías de los puestos evaluados)\n\n\n\n ", { size: 8, color: "888888", align: AlignmentType.CENTER })] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Certificación de Condiciones Meteorológicas")] }),
            new TableRow({ children: [cell("(Adjuntar certificado de condiciones meteorológicas del día de la medición)\n\n\n\n ", { size: 8, color: "888888", align: AlignmentType.CENTER })] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("INSTRUCTIVO PARA COMPLETAR EL PROTOCOLO DE MEDICIÓN DE ESTRÉS POR CALOR", { align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell(
              "El presente protocolo debe completarse siguiendo los lineamientos de la Resolución SRT N° 30/2023.\n\n" +
              "DATOS DEL ESTABLECIMIENTO: Completar con los datos reales del establecimiento evaluado.\n\n" +
              "INSTRUMENTOS: Indicar marca, modelo, número de serie y número de certificado de calibración " +
              "de cada instrumento utilizado (Monitor WBGT, Termohigrómetro, etc.).\n\n" +
              "FECHA DE MEDICIÓN: La medición debe realizarse en el período de mayor carga térmica " +
              "del año (período estival) y con las fuentes de calor encendidas.\n\n" +
              "TGBH PONDERADO: Se calcula considerando el tiempo de exposición y recuperación " +
              "durante una hora cronológica.\n\n" +
              "TASA METABÓLICA (TM): Se determina según el Método a) del punto 4.2.1.1 de la " +
              "Resolución SRT 30/2023 — Evaluación por requisitos de tareas/posturas/biomecánicos.\n\n" +
              "VLA (Valor Límite de Acción): A partir de este valor el empleador debe instrumentar " +
              "controles generales y declarar al personal expuesto ante la ART (ESOP 80001).\n\n" +
              "VLP (Valor Límite Permisible): Límite máximo. Si se supera, el empleador debe realizar " +
              "un estudio detallado o control fisiológico de la tensión térmica."
            )] }),
          ],
        }));

        return items;
      };

      // ── SECCIÓN FRÍO ──────────────────────────────────────────────────────────
      const buildColdSection = () => {
        if (!coldProtocol?.rows?.some((r: any) => r.sector || r.tbs)) return [];
        const est = establishment, rows = coldProtocol.rows, comp = coldProtocol.company || {};
        const items: any[] = [pageBreakPara()];

        items.push(new Paragraph({
          children: [run("ESTUDIO DE ESTRÉS POR FRÍO SEGÚN RESOL. MTEySS Nº 295/2003", { size: 13, bold: true, color: NAVY })],
          alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 },
        }));

        items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Datos para la medición")] }),
            new TableRow({ children: [cell(`Instrumento: ${comp.instrumento1 || "-"} Serie: ${comp.instrumento1Serie || "-"} Cert: ${comp.instrumento1Cert || "-"}`)] }),
            new TableRow({ children: [cell(`Fecha calibración: ${comp.instrumento1FechaCal || "-"}    Fecha medición: ${comp.fechaMedicion || "-"}    Inicio: ${comp.horaInicio || "-"}    Fin: ${comp.horaFin || "-"}`)] }),
            new TableRow({ children: [cell(`Turnos: ${comp.turnos || "-"}    Condiciones atmosféricas: ${comp.condicionesAtm || "-"}`)] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("INFORME DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA },
          columnWidths: [460, 1200, 1200, 700, 700, 700, 750, 750, 900, 700, 700, 700, 700],
          rows: [
            new TableRow({ children: [
              hdr("Punto", { align: AlignmentType.CENTER }),
              hdr("Sector"),
              hdr("Puesto de Trabajo"),
              hdr("Rango T° (°C)", { align: AlignmentType.CENTER }),
              hdr("Ciclos/turno", { align: AlignmentType.CENTER }),
              hdr("Dur. ciclo (min)", { align: AlignmentType.CENTER }),
              hdr("T. neto exp. (min)", { align: AlignmentType.CENTER }),
              hdr("T. integr. (min)", { align: AlignmentType.CENTER }),
              hdr("Carac. exposición", { align: AlignmentType.CENTER }),
              hdr("TBS (°C)", { align: AlignmentType.CENTER }),
              hdr("Veloc. (m/s)", { align: AlignmentType.CENTER }),
              hdr("TEE (°C)", { align: AlignmentType.CENTER }),
              hdr("Exp. > 4h", { align: AlignmentType.CENTER }),
            ]}),
            ...rows.map((r: any, i: number) => new TableRow({ children: [
              cell(String(i + 1).padStart(2, "0"), { align: AlignmentType.CENTER }),
              cell(r.sector || ""), cell(r.puestoTrabajo || ""),
              cell(r.rangoTemp || "", { align: AlignmentType.CENTER }),
              cell(r.ciclosExposicion || "", { align: AlignmentType.CENTER }),
              cell(r.duracionCiclo || "", { align: AlignmentType.CENTER }),
              cell(r.tiempoNetoExposicion || "", { align: AlignmentType.CENTER }),
              cell(r.tiempoIntegracion || "", { align: AlignmentType.CENTER }),
              cell(r.caracteristicasExposicion || "", { align: AlignmentType.CENTER }),
              cell(r.tbs || "", { align: AlignmentType.CENTER }),
              cell(r.velocidadViento || "", { align: AlignmentType.CENTER }),
              cell(r.tee || "", { align: AlignmentType.CENTER, bold: true }),
              cell(r.exposicionMas4h || "", { align: AlignmentType.CENTER }),
            ]})),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("INFORME DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Valores de Referencia (MTEySS 295/2003 — Anexo de estrés por frío)")] }),
            new TableRow({ children: [cell(
              "TEMPERATURA EQUIVALENTE DE ENFRIAMIENTO (TEE) EN RELACIÓN CON LA VELOCIDAD DEL AIRE:\n\n" +
              "La TEE combina la temperatura de bulbo seco (TBS) y la velocidad del viento para estimar " +
              "el efecto refrigerante sobre el cuerpo humano.\n\n" +
              "Rangos de peligro según TEE:\n" +
              "  TEE > 0°C              → SIN PELIGRO\n" +
              "  TEE entre 0 y -10°C   → POCO PELIGROSO — Sensación de frío\n" +
              "  TEE entre -10 y -25°C → PELIGROSO — Riesgo de congelamiento expuesto\n" +
              "  TEE entre -25 y -50°C → MUY PELIGROSO — Peligro de congelamiento en 1 min\n" +
              "  TEE entre -50 y -75°C → EXTREMADAMENTE PELIGROSO — Peligro en 30 segundos\n" +
              "  TEE < -75°C            → PELIGRO MÁXIMO — Congelamiento en segundos\n\n" +
              "Para trabajos a una temperatura equivalente de enfriamiento (TEE) de entre -25°C y -50°C, " +
              "los trabajadores deberán ser provistos de ropa protectora adecuada. " +
              "Se deberán tomar precauciones especiales cuando se realicen actividades por debajo de -25°C.\n\n" +
              "Para temperaturas inferiores a -18°C se deberá proveer a los trabajadores de:\n" +
              "• Ropa aislante seca que mantenga la temperatura corporal por encima de 36°C\n" +
              "• Manoplas o guantes aislantes\n" +
              "• Calzado de seguridad con aislación térmica\n" +
              "• Medias de lana o similares\n\n" +
              "Nota: No se requiere plan de trabajo/calentamiento cuando la TEE es superior a -25°C " +
              "y la exposición es intermitente con períodos de recuperación en ambiente temperado."
            )] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("INFORME DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Observaciones")] }),
            new TableRow({ children: [cell(coldProtocol.observaciones || "-")] }),
            new TableRow({ children: [hdr("Conclusiones")] }),
            new TableRow({ children: [cell(coldProtocol.conclusiones || "(Sin conclusiones cargadas)")] }),
            new TableRow({ children: [hdr("Recomendaciones para Prevenir el Estrés por Frío")] }),
            new TableRow({ children: [cell(coldProtocol.recomendaciones || "(Sin recomendaciones cargadas)")] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("INFORME DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Constancia Fotográfica de las Tareas")] }),
            new TableRow({ children: [cell("(Espacio para fotografías de los puestos evaluados)\n\n\n\n ", { size: 8, color: "888888", align: AlignmentType.CENTER })] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("INFORME DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Certificación de Condiciones Meteorológicas")] }),
            new TableRow({ children: [cell("(Adjuntar certificado de condiciones meteorológicas del día de la medición)\n\n\n\n ", { size: 8, color: "888888", align: AlignmentType.CENTER })] }),
          ],
        }));

        return items;
      };

      // ── SECCIÓN RUIDO ─────────────────────────────────────────────────────────
      const buildNoiseSection = () => {
        if (!noiseProtocol?.rows?.some((r: any) => r.sector || r.valorMedido)) return [];
        const est = establishment, rows = noiseProtocol.rows, comp = noiseProtocol.company || {};
        const items: any[] = [pageBreakPara()];

        items.push(new Paragraph({
          children: [run("ESTUDIO DE RUIDO LABORAL SEGÚN RESOL. SRT Nº 85/2012", { size: 13, bold: true, color: NAVY })],
          alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 },
        }));

        items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Datos para la medición")] }),
            new TableRow({ children: [cell(`(7) Instrumento: ${comp.instrumento1 || "-"} Modelo: ${comp.instrumento1 || "-"} N° Serie: ${comp.instrumento1Serie || "-"} N° Certificado: ${comp.instrumento1Cert || "-"}`)] }),
            new TableRow({ children: [cell(`(8) Fecha calibración Sonómetro: ${comp.instrumento1FechaCal || "-"}    Fecha calibración Dosímetro: ${comp.instrumento2FechaCal || "-"}`)] }),
            new TableRow({ children: [cell(`(9) Fecha medición: ${comp.fechaMedicion || "-"}    (10) Hora inicio: ${comp.horaInicio || "-"}    (11) Hora fin: ${comp.horaFin || "-"}`)] }),
            new TableRow({ children: [cell(`(12) Jornada/turnos: ${comp.jornadaLaboral || "-"} — ${comp.turnos || "-"}`)] }),
            new TableRow({ children: [cell(`(13) Condiciones normales: ${comp.condicionesNormales || "-"}`)] }),
            new TableRow({ children: [cell(`(14) Condiciones al momento de medición: ${comp.condicionesMedicion || "-"}`)] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA },
          columnWidths: [500, 1100, 1300, 800, 800, 900, 800, 800, 800, 700, 900],
          rows: [
            new TableRow({ children: [
              hdr("(23) Punto", { align: AlignmentType.CENTER }),
              hdr("(24) Sector"),
              hdr("(25) Puesto"),
              hdr("(26) T. Exp. (h)", { align: AlignmentType.CENTER }),
              hdr("(27) T. Integ.", { align: AlignmentType.CENTER }),
              hdr("(28) Tipo Ruido", { align: AlignmentType.CENTER }),
              hdr("(29) LC pico dBC", { align: AlignmentType.CENTER }),
              hdr("(30) LAeq dBA", { align: AlignmentType.CENTER }),
              hdr("(31) Fracción", { align: AlignmentType.CENTER }),
              hdr("(32) Dosis %", { align: AlignmentType.CENTER }),
              hdr("(33) Cumple", { align: AlignmentType.CENTER }),
            ]}),
            ...rows.map((r: any, i: number) => new TableRow({ children: [
              cell(String(i + 1).padStart(2, "0"), { align: AlignmentType.CENTER }),
              cell(r.sector || ""), cell(r.puestoTrabajo || ""),
              cell(r.tiempoExposicion || "", { align: AlignmentType.CENTER }),
              cell(r.tiempoIntegracion || "", { align: AlignmentType.CENTER }),
              cell(r.tipoRuido || "", { align: AlignmentType.CENTER }),
              cell(r.tipoRuido === "Impulso" ? r.valorMedido || "" : "No Aplica", { align: AlignmentType.CENTER }),
              cell(r.tipoRuido !== "Impulso" ? r.valorMedido || "" : "No Aplica", { align: AlignmentType.CENTER }),
              cell(r.fraccion || "", { align: AlignmentType.CENTER }),
              cell(r.dosisRuido || "-", { align: AlignmentType.CENTER }),
              cumpleCell(r.cumple),
            ]})),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Valores de Referencia (Resol. MTEySS 295/2003 — Anexo V)")] }),
            new TableRow({ children: [cell(
              "Valores Límites para el Ruido:\n" +
              "24 hs → 80 dBA  |  16 hs → 82 dBA  |  8 hs → 85 dBA  |  4 hs → 88 dBA\n" +
              "2 hs → 91 dBA  |  1 h → 94 dBA  |  30 min → 97 dBA  |  15 min → 100 dBA\n" +
              "7,5 min → 103 dBA  |  3,75 min → 106 dBA\n\n" +
              "No ha de haber exposiciones al ruido por encima de un nivel pico C ponderado de 140 dBC.\n" +
              "El nivel se mide con sonómetro, filtro de ponderación frecuencial A y respuesta lenta."
            )] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Análisis de los Datos y Mejoras a Realizar")] }),
            new TableRow({ children: [hdr("(41) Conclusiones")] }),
            new TableRow({ children: [cell(noiseProtocol.conclusiones || "(Sin conclusiones cargadas)")] }),
            new TableRow({ children: [hdr("(42) Recomendaciones para adecuar el nivel de ruido a la legislación vigente")] }),
            new TableRow({ children: [cell(noiseProtocol.recomendaciones || "(Sin recomendaciones cargadas)")] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("PROTOCOLO PARA MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Constancia Fotográfica De Las Tareas")] }),
            new TableRow({ children: [cell("(Espacio para fotografías de los puestos evaluados)\n\n\n\n ", { size: 8, color: "888888", align: AlignmentType.CENTER })] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(protocolHeader("PROTOCOLO PARA MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Certificación de Condiciones Meteorológicas")] }),
            new TableRow({ children: [cell("(Adjuntar certificado de condiciones meteorológicas del día de la medición)\n\n\n\n ", { size: 8, color: "888888", align: AlignmentType.CENTER })] }),
          ],
        }));

        items.push(pageBreakPara());
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("INSTRUCTIVO PARA COMPLETAR EL PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", { align: AlignmentType.CENTER })] }),
            new TableRow({ children: [cell(
              "1) Identificación del establecimiento (razón social completa).\n" +
              "2) Domicilio real del establecimiento donde se realiza la medición.\n" +
              "3) Localidad del establecimiento.\n" +
              "4) Provincia en la cual se encuentra radicado el establecimiento.\n" +
              "5) Código Postal del establecimiento.\n" +
              "6) C.U.I.T. de la empresa o institución.\n" +
              "7) Marca, modelo y número de serie del instrumento utilizado. Las mediciones se efectuarán " +
              "con un medidor de nivel sonoro integrador (decibelímetro) o dosímetro, Clase o Tipo 2, " +
              "según normas IRAM 4074 e IEC 804.\n" +
              "8) Fecha de la última calibración realizada en laboratorio al instrumento empleado.\n" +
              "9) Fecha de la medición.\n" +
              "10) Hora de inicio de la primera medición.\n" +
              "11) Hora de finalización de la última medición.\n" +
              "12) Duración de la jornada laboral (en horas).\n" +
              "13) Condiciones normales y/o habituales de los puestos de trabajo: fuentes de ruido, " +
              "descripción y condición de funcionamiento.\n" +
              "14) Condiciones de trabajo al momento de efectuar la medición.\n" +
              "15) Adjuntar copia del certificado de calibración del equipo.\n" +
              "16) Adjuntar plano o croquis del establecimiento con los puntos de medición.\n" +
              "23) Punto de medición (número que coincide con el del croquis).\n" +
              "24) Sector de la empresa donde se realiza la medición.\n" +
              "25) Puesto de trabajo o puesto tipo.\n" +
              "26) Tiempo de exposición del trabajador al ruido (en horas).\n" +
              "27) Tiempo de integración o de medición.\n" +
              "28) Tipo de ruido: continuo, intermitente o de impulso/impacto.\n" +
              "29) Nivel pico ponderado C (LCpico en dBC) para ruido de impulso o impacto.\n" +
              "30) Nivel de presión acústica LAeq,Te en dBA.\n" +
              "31) Resultado de la suma de fracciones C1/T1 + C2/T2 + ... + Cn/Tn.\n" +
              "32) Dosis de ruido en porcentaje, obtenida con dosímetro (índice 3dB, criterio 85 dBA/8h).\n" +
              "33) Indica si cumple con el nivel de ruido máximo permitido (SI / NO).\n" +
              "34) Información adicional de importancia."
            )] }),
          ],
        }));

        return items;
      };

      // ── SECCIÓN ILUMINACIÓN ───────────────────────────────────────────────────
      const buildLightingSection = () => {
        if (!lightingSectors?.length) return [];
        const est = establishment;
        const items: any[] = [pageBreakPara()];

        items.push(new Paragraph({
          children: [run("ESTUDIO DE ILUMINACIÓN SEGÚN RESOL. SRT Nº 84/2012", { size: 13, bold: true, color: NAVY })],
          alignment: AlignmentType.CENTER, spacing: { before: 200, after: 200 },
        }));

        items.push(protocolHeader("PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL", est));

        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [new TableRow({ children: [hdr("Datos de la Medición")] })],
        }));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA },
          columnWidths: [500, 600, 1300, 1400, 900, 900, 900, 700, 800, 800, 900, 800, 800],
          rows: [
            new TableRow({ children: [
              hdr("Pto", { align: AlignmentType.CENTER }),
              hdr("Hora", { align: AlignmentType.CENTER }),
              hdr("Sector"),
              hdr("Sección / Puesto"),
              hdr("Tipo Ilumin.", { align: AlignmentType.CENTER }),
              hdr("Fuente", { align: AlignmentType.CENTER }),
              hdr("Tipo Sist.", { align: AlignmentType.CENTER }),
              hdr("E min.", { align: AlignmentType.CENTER }),
              hdr("≥ E med/2", { align: AlignmentType.CENTER }),
              hdr("E max.", { align: AlignmentType.CENTER }),
              hdr("E media (lux)", { align: AlignmentType.CENTER }),
              hdr("VLA (lux)", { align: AlignmentType.CENTER }),
              hdr("Cumple", { align: AlignmentType.CENTER }),
            ]}),
            ...lightingSectors.flatMap((s: any, si: number) =>
              (s.measurements || []).filter((m: any) => m.type === "lighting").map((m: any) => {
                const pts = m.points || [];
                const vals = pts.map((p: any) => parseFloat(p.values?.lux || "0")).filter((v: number) => !isNaN(v) && v > 0);
                const eMin = vals.length ? Math.min(...vals) : 0;
                const eMax = vals.length ? Math.max(...vals) : 0;
                const eMedia = vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0;
                const vla = m.config?.limit || 500;
                const cumple = eMedia >= vla ? "SI" : "NO";
                const eMed2Check = eMin >= eMedia / 2 ? "≥" : "<";
                return new TableRow({ children: [
                  cell(String(si + 1).padStart(2, "0"), { align: AlignmentType.CENTER }),
                  cell(m.hora || "-", { align: AlignmentType.CENTER }),
                  cell(s.name || ""),
                  cell(s.description || s.name || ""),
                  cell(m.config?.lightingType === "natural" ? "Natural" : m.config?.lightingType === "mixed" ? "Mixta" : "Artificial", { align: AlignmentType.CENTER }),
                  cell(m.config?.lightSource || "Mixta", { align: AlignmentType.CENTER }),
                  cell(m.config?.lightingSystemType === "localized" ? "Localizada" : "General", { align: AlignmentType.CENTER }),
                  cell(String(eMin), { align: AlignmentType.CENTER }),
                  cell(eMed2Check, { align: AlignmentType.CENTER }),
                  cell(String(eMax), { align: AlignmentType.CENTER }),
                  cell(String(eMedia), { align: AlignmentType.CENTER, bold: true }),
                  cell(String(vla), { align: AlignmentType.CENTER }),
                  cumpleCell(cumple),
                ]});
              })
            ),
          ],
        }));

        lightingSectors.forEach((s: any) => {
          (s.measurements || []).filter((m: any) => m.type === "lighting").forEach((m: any) => {
            const pts = m.points || [];
            if (!pts.length) return;
            const vals = pts.map((p: any) => parseFloat(p.values?.lux || "0")).filter((v: number) => !isNaN(v) && v > 0);
            const eMedia = vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0;
            const vla = m.config?.limit || 500;

            items.push(new Paragraph({
              children: [run(`SECTOR: ${s.name?.toUpperCase() || ""}${s.description ? ` — ${s.description.toUpperCase()}` : ""}`, { size: 10, bold: true, color: NAVY })],
              spacing: { before: 200, after: 80 },
            }));
            items.push(new Paragraph({
              children: [run(`Dimensiones: ${m.config?.width || "-"} m × ${m.config?.length || "-"} m  |  Altura: ${m.config?.height || "-"} m  |  Valor legal: ${vla} lux`, { size: 9 })],
              spacing: { before: 40, after: 80 },
            }));

            const colW = Math.floor(CONT_W / 9);
            items.push(new Table({
              width: { size: CONT_W, type: WidthType.DXA },
              columnWidths: Array(9).fill(colW),
              rows: [
                new TableRow({ children: pts.slice(0, 9).map((_: any, i: number) => hdr(`P${i + 1}`, { align: AlignmentType.CENTER })) }),
                new TableRow({ children: pts.slice(0, 9).map((p: any) => cell(p.values?.lux || "-", { align: AlignmentType.CENTER, bold: true, size: 10 })) }),
              ],
            }));
            items.push(new Paragraph({
              children: [run(`E media: ${eMedia} lux  |  VLA: ${vla} lux  |  ${eMedia >= vla ? "CUMPLE" : "NO CUMPLE"}`, {
                size: 9, bold: true, color: eMedia >= vla ? GREEN_OK : RED_FAIL,
              })],
              spacing: { before: 80, after: 120 },
            }));
          });
        });

        items.push(pageBreakPara());
        items.push(protocolHeader("PROTOCOLO PARA MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL", est));
        items.push(new Table({
          width: { size: CONT_W, type: WidthType.DXA }, columnWidths: [CONT_W],
          rows: [
            new TableRow({ children: [hdr("Conclusiones")] }),
            new TableRow({ children: [cell(
              "Los resultados obtenidos fueron comparados con los valores de referencia establecidos en la " +
              "Resolución SRT N° 84/2012. Los sectores que no alcanzan el valor mínimo requerido deberán " +
              "implementar las mejoras indicadas en las recomendaciones."
            )] }),
            new TableRow({ children: [hdr("Recomendaciones")] }),
            new TableRow({ children: [cell(
              "• Revisar y reemplazar luminarias en mal estado o con lámparas agotadas.\n" +
              "• En sectores con incumplimiento: aumentar la cantidad de luminarias o instalar iluminación localizada.\n" +
              "• Realizar mantenimiento preventivo periódico de las instalaciones de iluminación.\n" +
              "• Efectuar una nueva medición luego de implementadas las mejoras."
            )] }),
          ],
        }));

        return items;
      };

      // ── ENSAMBLAR DOCUMENTO ───────────────────────────────────────────────────
      const allChildren = [
        ...coverChildren,
        ...buildThermalSection(),
        ...buildColdSection(),
        ...buildNoiseSection(),
        ...buildLightingSection(),
      ];

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              size: { width: 11906, height: 16838 },
              margin: { top: MARG, right: MARG, bottom: 1440, left: MARG },
            },
          },
          footers: { default: makeFooter() },
          children: allChildren,
        }],
      });

      const buffer = await Packer.toBuffer(doc);
      const empresa = (establishment.razonSocial || establishment.name || "Informe")
        .replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_").substring(0, 40);
      const fecha = new Date().toISOString().split("T")[0];

      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      res.setHeader("Content-Disposition", `attachment; filename=Informe_EEA_${empresa}_${fecha}.docx`);
      res.send(buffer);

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

  return httpServer;
}
