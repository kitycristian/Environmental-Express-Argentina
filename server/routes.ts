import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
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

  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const panelUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

  app.post("/api/analyze-panel", panelUpload.single('image'), async (req, res) => {
    try {
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

  return httpServer;
}
