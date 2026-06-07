import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { 
  insertRubroSchema, 
  insertClientSchema, 
  insertInstrumentSchema,
  insertInspectionSchema,
} from "@shared/schema";
import { fromError } from "zod-validation-error";
import { getSpreadsheetSheets, readSheetData, parseExcelBuffer } from "./google-sheets";
import multer from "multer";
import OpenAI from "openai";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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
          new TableRow({ children: [cell(`Dirección: ${est.address || "-"}    Localidad: ${est.city || "-"}    C.P.: ${est.postalCode || "-"}    Provincia: ${est.province || "-"}`)] }),
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
            new TableRow({ children: [cell(`Condiciones atmosféricas: ${comp.condicionesAtm || "-"}    Temperatura exterior: ${comp.tempExterior || "-"} °C`)] }),
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
            new TableRow({ children: [cell(" \n\n\n\n(Espacio para fotografías de los puestos evaluados)\n\n\n\n ", { size: 8, color: "888888", align: AlignmentType.CENTER })] }),
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
            new TableRow({ children: [hdr("Observaciones")] }),
            new TableRow({ children: [cell(coldProtocol.observaciones || "-")] }),
            new TableRow({ children: [hdr("Conclusiones")] }),
            new TableRow({ children: [cell(coldProtocol.conclusiones || "(Sin conclusiones cargadas)")] }),
            new TableRow({ children: [hdr("Recomendaciones para Prevenir el Estrés por Frío")] }),
            new TableRow({ children: [cell(coldProtocol.recomendaciones || "(Sin recomendaciones cargadas)")] }),
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
          columnWidths: [500, 1200, 1400, 900, 900, 1000, 900, 900, 900, 900],
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

  return httpServer;
}
