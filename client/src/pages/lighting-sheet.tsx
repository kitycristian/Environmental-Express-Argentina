import { useState, useEffect } from "react";
import { useStore, sampleSectors } from "@/lib/store";
import { Link } from "wouter";
import { MeasurementType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, FileUp, Sheet, Loader2, Database, FileDown, Wand2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useClients } from "@/lib/hooks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
// @ts-ignore
import { Document, Packer, Paragraph, TextRun, Table as DocxTable, TableRow as DocxTableRow, TableCell as DocxTableCell, WidthType, BorderStyle, AlignmentType, Header, Footer } from "docx";
// @ts-ignore
import { saveAs } from "file-saver";

const type: MeasurementType = 'lighting';

// ── Mantenimiento preventivo items ────────────────────────────────────────────
const MANT_ITEMS = [
  { key: "limpieza_luminarias", label: "Limpieza periódica de luminarias, difusores y pantallas" },
  { key: "reemplazo_lamparas", label: "Reemplazo inmediato de lámparas/LEDs fundidos" },
  { key: "limpieza_ventanas", label: "Limpieza de ventanas y superficies translúcidas" },
  { key: "pintura_colores", label: "Pintura de techos y paredes en colores claros (factor reflexión ≥ 0,5)" },
  { key: "control_reflexiones", label: "Control de reflexiones molestas y deslumbramientos" },
  { key: "plan_mantenimiento", label: "Plan de mantenimiento preventivo de luminarias (cronograma anual)" },
  { key: "iluminacion_emergencia", label: "Iluminación de emergencia en vías de evacuación y salidas" },
  { key: "vida_util", label: "Control de vida útil de lámparas (reemplazo antes del fin de vida útil)" },
  { key: "iluminacion_localizada", label: "Iluminación localizada adicional en puestos con tareas visuales demandantes" },
  { key: "medicion_anual", label: "Medición anual de niveles de iluminación (cumplimiento SRT 84/2012)" },
  { key: "capacitacion", label: "Capacitación del personal en higiene visual y condiciones lumínicas" },
  { key: "registro_documentacion", label: "Registro y documentación de mediciones y trabajos de mantenimiento" },
];

// ── Valor legal preset options ────────────────────────────────────────────────
const LEGAL_LUX_OPTIONS = [
  { value: "50", label: "50 lux — Depósitos, cámaras frías" },
  { value: "100", label: "100 lux — Pasillos, depósitos generales" },
  { value: "200", label: "200 lux — Comedores, vestuarios" },
  { value: "300", label: "300 lux — Oficinas, laboratorios, farmacia" },
  { value: "500", label: "500 lux — Salón de ventas, carnicería, recepción" },
];

export default function LightingSheet() {
  const sectors = useStore((state) => state.sectors);
  const updateSector = useStore((state) => state.updateSector);
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const addPoint = useStore((state) => state.addPoint);
  const updatePoint = useStore((state) => state.updatePoint);
  const addSectorWithMeasurement = useStore((state) => state.addSectorWithMeasurement);
  const lightingProtocol = useStore((s) => s.lightingProtocol);
  const updateLightingCompany = useStore((s) => s.updateLightingCompany);
  const updateLightingText = useStore((s) => s.updateLightingText);
  const updateLightingMantenimiento = useStore((s) => s.updateLightingMantenimiento);
  const establishment = useStore((s) => s.establishment);
  const digitalSignature = useStore((state) => state.digitalSignature);
  const signatoryName = useStore((state) => state.signatoryName);
  const signatoryTitle = useStore((state) => state.signatoryTitle);
  const signatoryRegistration = useStore((state) => state.signatoryRegistration);

  const { toast } = useToast();
  const [visiblePointsOverride, setVisiblePointsOverride] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const { data: clients = [] } = useClients();
  const [activeTab, setActiveTab] = useState<'general' | 'mediciones' | 'conclusiones'>('general');
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  // ── Google Sheets state ───────────────────────────────────────────────────
  const [gsDialogOpen, setGsDialogOpen] = useState(false);
  const [gsStep, setGsStep] = useState<'url' | 'sheets' | 'preview'>('url');
  const [gsLoading, setGsLoading] = useState(false);
  const [gsUrl, setGsUrl] = useState("");
  const [gsError, setGsError] = useState("");
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<string>("");
  const [sheetsList, setSheetsList] = useState<any[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [gsPreviewData, setGsPreviewData] = useState<string[][]>([]);
  const [gsAllSheetsData, setGsAllSheetsData] = useState<Record<string, string[][]>>({});
  const [gsHeaderRow, setGsHeaderRow] = useState(0);
  const [gsDataStartRow, setGsDataStartRow] = useState(1);
  const [gsColumnMap, setGsColumnMap] = useState<Record<string, number>>({
    sector: 0, subsector: 1, ancho: 2, largo: 3, alto: 4, limite: 5
  });

  const company = lightingProtocol.company;
  const mantenimiento = lightingProtocol.mantenimiento;

  const activeSectors = sectors.filter(s => s.measurements.some(m => m.type === type));

  const maxPointsInData = Math.max(9, ...activeSectors.map(s => {
    const m = s.measurements.find(m => m.type === type);
    return m ? m.points.length : 0;
  }));
  const visiblePoints = visiblePointsOverride ?? maxPointsInData;

  const missingCalibration = !company.instrumento1Cert || !company.instrumento1FechaCal;

  useEffect(() => {
    activeSectors.forEach(sector => {
      const measurement = sector.measurements.find(m => m.type === type);
      if (measurement && measurement.points.length < 9) {
        const needed = 9 - measurement.points.length;
        for (let i = 0; i < needed; i++) {
          addPoint(sector.id, measurement.id, { values: { lux: '' } });
        }
      }
    });
  }, [activeSectors.length]);

  // ── Calculations ──────────────────────────────────────────────────────────
  const calculateRoomIndex = (l: number, w: number, h: number) => {
    if (!l || !w || !h) return 0;
    return parseFloat(((l * w) / (h * (l + w))).toFixed(2));
  };

  const getMinPoints = (k: number) => {
    if (k < 1) return 4;
    if (k < 2) return 9;
    if (k < 3) return 16;
    return 25;
  };

  const getSectorCalcs = (measurement: any) => {
    const points = measurement.points;
    const values = points.map((p: any) => Number(p.values.lux) || 0).filter((v: number) => v > 0);
    const eMedia = values.length > 0 ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) : 0;
    const eMinima = values.length > 0 ? Math.min(...values) : 0;
    const uniformidadCumple = values.length > 0 && eMinima >= (eMedia / 2);
    const valorLegal = Number(measurement.config?.limit) || 0;
    const cumpleLimite = valorLegal > 0 ? eMedia >= valorLegal : null;
    const w = measurement.config?.width || 0;
    const l = measurement.config?.length || 0;
    const h = measurement.config?.height || 0;
    const k = calculateRoomIndex(l, w, h);
    const minPts = getMinPoints(k);
    const rowOk = uniformidadCumple && cumpleLimite === true;
    const rowFail = !uniformidadCumple || cumpleLimite === false;
    return { eMedia, eMinima, uniformidadCumple, valorLegal, cumpleLimite, k, minPts, rowOk, rowFail };
  };

  // ── Event handlers ────────────────────────────────────────────────────────
  const handleAddRow = () => {
    addSectorWithMeasurement({ name: `Sector ${activeSectors.length + 1}`, description: "", dimensions: "", activity: "", workersCount: 0 }, type);
  };

  const handleImportSectors = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (client && Array.isArray(client.sectors)) {
      (client.sectors as string[]).forEach((sectorName) => {
        addSectorWithMeasurement({ name: sectorName, description: "", dimensions: "", activity: "", workersCount: 0 }, type);
      });
      setImportDialogOpen(false);
      setSelectedClientId("");
    }
  };

  const handleCellChange = (sectorId: string, measurementId: string, field: string, value: string) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector) return;
    const measurement = sector.measurements.find(m => m.id === measurementId);
    if (!measurement) return;
    updateMeasurement(sectorId, measurementId, {
      config: { ...measurement.config, [field]: value === '' ? null : parseFloat(value) || value }
    });
  };

  const handleConfigChange = (sectorId: string, measurementId: string, field: string, value: string) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector) return;
    const measurement = sector.measurements.find(m => m.id === measurementId);
    if (!measurement) return;
    updateMeasurement(sectorId, measurementId, { config: { ...measurement.config, [field]: value } });
  };

  const handlePointChange = (sectorId: string, measurementId: string, pointId: string, value: string) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector) return;
    const measurement = sector.measurements.find(m => m.id === measurementId);
    if (!measurement) return;
    const point = measurement.points.find(p => p.id === pointId);
    if (!point) return;
    updatePoint(sectorId, measurementId, pointId, { values: { ...point.values, lux: value } });
  };

  // ── AI generation ─────────────────────────────────────────────────────────
  const generateAI = async (field: "conclusiones" | "recomendaciones") => {
    setAiLoading(field);
    try {
      const summary = activeSectors.map((s, i) => {
        const m = s.measurements.find(ms => ms.type === type);
        if (!m) return "";
        const { eMedia, eMinima, uniformidadCumple, valorLegal, cumpleLimite } = getSectorCalcs(m);
        return `${i + 1}. ${s.name}${s.description ? " / " + s.description : ""}: E media=${eMedia} lux, E mínima=${eMinima} lux, Uniformidad=${uniformidadCumple ? "CUMPLE" : "NO CUMPLE"}, Límite=${valorLegal} lux, Límite=${cumpleLimite === null ? "N/D" : cumpleLimite ? "CUMPLE" : "NO CUMPLE"}`;
      }).filter(Boolean).join("\n");

      const resp = await fetch("/api/lighting/generate-text", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, summary, empresa: company.razonSocial || "la empresa" })
      });
      if (!resp.ok) throw new Error("Error del servidor");
      const { text } = await resp.json();
      updateLightingText(field, text);
      toast({ title: "Texto generado con IA" });
    } catch {
      toast({ title: "Error", description: "No se pudo generar el texto", variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  };

  // ── Load sample data ──────────────────────────────────────────────────────
  const loadSampleData = () => {
    useStore.getState().loadInspectionData(
      { id: 'default', name: 'DORINKA SRL', razonSocial: 'DORINKA SRL', cuit: '30-67813830-0', address: 'Av. Villafañez y Dr. Manuel Navarro S/N', date: '2024-03-26', responsible: '' },
      JSON.parse(JSON.stringify(sampleSectors))
    );
    updateLightingCompany({
      razonSocial: "DORINKA SRL (Store #1026 Catamarca)",
      direccion: "Av. Villafañez y Dr. Manuel Navarro S/N",
      localidad: "San Fernando del Valle de Catamarca",
      provincia: "Catamarca", cp: "4700", cuit: "30-67813830-0",
      fechaMedicion: "26/03/2024", horaInicio: "09:00", horaFin: "13:30",
      turnos: "2 Turnos de Trabajo. 6:00 AM - 23:30 PM",
      instrumento1Marca: "TES", instrumento1Modelo: "1336A", instrumento1Serie: "070203457",
      instrumento1Cert: "24R00000821", instrumento1FechaCal: "05/02/2024",
      instrumento2Marca: "", instrumento2Modelo: "", instrumento2Serie: "",
      tempExterior: "33.3", humedad: "43.2", presionAtm: "713.4",
      metodologia: "Metodología de la cuadrícula (Guía SRT 2012)",
      observacionesGenerales: ""
    });
    updateLightingText("conclusiones", "Analizando los resultados de la medición realizada, los sectores en general CUMPLEN con los valores mínimos de iluminancia establecidos en el Decreto 351/79 Anexo IV. Algunos sectores presentan valores por debajo del límite mínimo, requiriendo acciones correctivas.");
    updateLightingText("recomendaciones", "Reemplazar luminarias fuera de servicio. Implementar plan de mantenimiento preventivo de luminarias. Realizar limpieza periódica de difusores. Evaluar cambio a tecnología LED en sectores con bajo rendimiento lumínico.");
    toast({ title: "Datos cargados", description: "Sectores con mediciones de iluminación — DORINKA SRL" });
  };

  // ── PDF / DOCX ────────────────────────────────────────────────────────────
  const downloadPDF = () => {
    if (activeSectors.length === 0) {
      toast({ title: "Sin datos", description: "Agregue sectores antes de exportar", variant: "destructive" });
      return;
    }
    const prev = document.title;
    document.title = "Protocolo_Iluminacion";
    window.print();
    document.title = prev;
    toast({ title: "Impresión iniciada", description: "Use 'Guardar como PDF' en el diálogo de impresión." });
  };

  const downloadDOCX = async () => {
    if (activeSectors.length === 0) {
      toast({ title: "Sin datos", description: "Agregue sectores antes de exportar", variant: "destructive" });
      return;
    }
    const maxPts = Math.max(...activeSectors.map(s => {
      const m = s.measurements.find(m => m.type === type);
      return m ? m.points.length : 0;
    }));
    const pointHeaders = Array.from({ length: maxPts }, (_, i) => `P${i + 1}`);
    const allHeaders = ['#', 'Hora', 'Sector', 'Sección/Puesto', 'T.Ilum.', 'T.Fuente', 'T.Sistema', 'Ancho', 'Largo', 'Alto', 'K', 'Min Ptos', 'Ptos Med', ...pointHeaders, 'E mín', 'E media', 'E mín≥E med/2', 'Val.Legal', 'Cumple Unif.', 'Cumple Límite', 'F/S'];

    const borderStyle = {
      top: { style: BorderStyle.SINGLE, size: 1, color: '003366' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '003366' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '003366' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '003366' },
    };
    const makeCell = (text: string, isHeader = false, isGreen = false, isRed = false) =>
      new DocxTableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold: isHeader || isGreen || isRed, size: 14, color: isHeader ? 'FFFFFF' : isGreen ? '15803D' : isRed ? 'B91C1C' : '000000', font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { before: 20, after: 20 } })],
        shading: isHeader ? { fill: '003366' } : isGreen ? { fill: 'DCFCE7' } : isRed ? { fill: 'FEE2E2' } : undefined,
        borders: borderStyle, verticalAlign: 'center' as any,
      });

    const children: any[] = [];
    const heading = (text: string) => new Paragraph({ children: [new TextRun({ text, bold: true, font: "Arial", size: 24, color: "003366" })], spacing: { before: 200, after: 80 } });
    const lv = (label: string, value: string) => new Paragraph({ children: [new TextRun({ text: label + ": ", bold: true, font: "Arial", size: 20 }), new TextRun({ text: value, font: "Arial", size: 20 })], spacing: { after: 40 } });

    children.push(new Paragraph({ children: [new TextRun({ text: 'PROTOCOLO DE MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL', bold: true, size: 28, color: '003366', font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }));
    children.push(new Paragraph({ children: [new TextRun({ text: 'Resolución SRT N° 84/2012 — Decreto 351/79 Anexo IV', size: 20, color: '666666', font: 'Arial' })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }));

    children.push(heading("Datos del Establecimiento"));
    children.push(lv("Razón Social", company.razonSocial));
    children.push(lv("Dirección", company.direccion));
    children.push(lv("Localidad", `${company.localidad} – ${company.provincia} – C.P.: ${company.cp}`));
    children.push(lv("C.U.I.T.", company.cuit));
    children.push(lv("Fecha de medición", company.fechaMedicion));
    children.push(lv("Horario", `Inicio: ${company.horaInicio}  –  Fin: ${company.horaFin}`));
    children.push(lv("Turnos habituales", company.turnos));
    children.push(heading("Instrumentos"));
    children.push(lv("Luxómetro", `${company.instrumento1Marca} ${company.instrumento1Modelo} | Serie: ${company.instrumento1Serie}`));
    children.push(lv("Certificado", `${company.instrumento1Cert} — Fecha: ${company.instrumento1FechaCal}`));
    if (company.instrumento2Modelo) children.push(lv("Instrumento 2", `${company.instrumento2Marca} ${company.instrumento2Modelo} | Serie: ${company.instrumento2Serie}`));
    children.push(heading("Datos de la Medición"));

    const dataRows = activeSectors.map((sector, i) => {
      const measurement = sector.measurements.find(m => m.type === type);
      if (!measurement) return null;
      const { eMedia, eMinima, uniformidadCumple, valorLegal, cumpleLimite, k, minPts } = getSectorCalcs(measurement);
      const pts = measurement.points;
      const pointValues = Array.from({ length: maxPts }, (_, j) => pts[j] ? String(pts[j].values.lux || '-') : '-');
      const unifText = pts.length > 0 ? (uniformidadCumple ? 'SI' : 'NO') : '-';
      const limitText = valorLegal > 0 ? (cumpleLimite ? 'SI' : 'NO') : '-';
      const cellValues = [
        String(i + 1),
        measurement.config?.hora || '-',
        sector.name,
        sector.description || '',
        measurement.config?.tipoIluminacion || '-',
        measurement.config?.tipoFuente || '-',
        measurement.config?.tipoSistema || '-',
        measurement.config?.width ? String(measurement.config.width) : '-',
        measurement.config?.length ? String(measurement.config.length) : '-',
        measurement.config?.height ? String(measurement.config.height) : '-',
        k ? String(k) : '-', String(minPts), String(pts.length),
        ...pointValues,
        eMinima ? String(eMinima) : '-', eMedia ? String(eMedia) : '-',
        pts.length > 0 ? (uniformidadCumple ? `SI (${eMinima}≥${Math.round(eMedia/2)})` : `NO (${eMinima}<${Math.round(eMedia/2)})`) : '-',
        valorLegal ? String(valorLegal) : '-',
        unifText, limitText,
        measurement.config?.fueraDeServicio ? 'F/S' : '',
      ];
      return new DocxTableRow({
        children: cellValues.map((val, ci) => {
          const isUnif = ci === cellValues.length - 3;
          const isLimit = ci === cellValues.length - 2;
          const isGreen = (isUnif || isLimit) && val === 'SI';
          const isRed = (isUnif || isLimit) && val === 'NO';
          return makeCell(String(val), false, isGreen, isRed);
        }),
      });
    }).filter(Boolean) as any[];

    children.push(new DocxTable({ rows: [new DocxTableRow({ children: allHeaders.map(h => makeCell(h, true)), tableHeader: true }), ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }));

    const addSection = (title: string, text: string) => {
      if (!text) return;
      children.push(heading(title));
      children.push(new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 18 })], spacing: { after: 100 } }));
    };
    addSection("Observaciones", lightingProtocol.observaciones);
    addSection("Conclusiones", lightingProtocol.conclusiones);
    addSection("Recomendaciones", lightingProtocol.recomendaciones);

    if (signatoryName || digitalSignature) {
      children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
      children.push(new Paragraph({ children: [new TextRun({ text: "________________________", font: "Arial", size: 20 })], alignment: AlignmentType.CENTER, spacing: { before: 200 } }));
      if (signatoryName) children.push(new Paragraph({ children: [new TextRun({ text: signatoryName, bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.CENTER }));
      if (signatoryTitle) children.push(new Paragraph({ children: [new TextRun({ text: signatoryTitle, font: "Arial", size: 18 })], alignment: AlignmentType.CENTER }));
      if (signatoryRegistration) children.push(new Paragraph({ children: [new TextRun({ text: `Mat. ${signatoryRegistration}`, font: "Arial", size: 18 })], alignment: AlignmentType.CENTER }));
    }

    try {
      const docDocument = new Document({
        sections: [{
          properties: { page: { size: { orientation: 'landscape' as any }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
          headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: `${company.razonSocial} — Protocolo de Iluminación`, italics: true, size: 16, color: '999999', font: 'Arial' })], alignment: AlignmentType.RIGHT })] }) },
          footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: 'Environmental Express Argentina — Iluminación — Res. SRT 84/2012', size: 14, color: '666666', font: 'Arial' })], alignment: AlignmentType.CENTER })] }) },
          children,
        }],
      });
      const blob = await Packer.toBlob(docDocument);
      saveAs(blob, 'Protocolo_Iluminacion.docx');
      toast({ title: "DOCX generado", description: "Protocolo_Iluminacion.docx descargado" });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo generar el DOCX", variant: "destructive" });
    }
  };

  // ── Google Sheets helpers ─────────────────────────────────────────────────
  const extractSpreadsheetId = (url: string) => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const buildCombinedHeaders = (data: string[][], upToRow: number): string[] => {
    if (data.length === 0) return [];
    const maxCols = Math.max(...data.slice(0, upToRow + 1).map(r => r.length));
    const combined: string[] = [];
    for (let col = 0; col < maxCols; col++) {
      const parts: string[] = [];
      for (let row = 0; row <= upToRow && row < data.length; row++) {
        const val = String(data[row]?.[col] ?? '').trim();
        if (val && !parts.includes(val)) parts.push(val);
      }
      combined.push(parts.join(' - ') || `Columna ${col + 1}`);
    }
    return combined;
  };

  const detectHeaderRow = (data: string[][]): { headerRow: number; dataStart: number } => {
    const keywords = ['sector', 'subsector', 'ancho', 'largo', 'alto', 'dimensiones', 'puesto', 'descripcion', 'iluminancia', 'valor', 'ptos'];
    let bestRow = 0; let bestScore = 0;
    for (let r = 0; r < Math.min(data.length, 10); r++) {
      const rowText = (data[r] || []).map(c => String(c ?? '').toLowerCase().trim());
      let score = 0;
      rowText.forEach(cell => keywords.forEach(kw => { if (cell.includes(kw)) score++; }));
      if (score > bestScore) { bestScore = score; bestRow = r; }
    }
    let dataStart = bestRow + 1;
    for (let r = bestRow + 1; r < Math.min(data.length, bestRow + 5); r++) {
      const rowText = (data[r] || []).map(c => String(c ?? '').toLowerCase().trim());
      const hasSubHeaders = rowText.some(cell => keywords.some(kw => cell.includes(kw)));
      if (hasSubHeaders) dataStart = r + 1;
      else break;
    }
    return { headerRow: bestRow, dataStart };
  };

  const autoMapColumns = (data: string[][], headerRowOverride?: number) => {
    if (data.length === 0) return;
    const { headerRow: detectedHeaderRow, dataStart: detectedDataStart } = detectHeaderRow(data);
    const hRow = headerRowOverride ?? detectedHeaderRow;
    setGsHeaderRow(hRow);
    if (headerRowOverride === undefined) setGsDataStartRow(detectedDataStart);
    const allHeaders = buildCombinedHeaders(data, Math.max(hRow, detectedDataStart - 1));
    const searchTexts = allHeaders.map(h => h.toLowerCase());
    const autoMap: Record<string, number> = { sector: -1, subsector: -1, ancho: -1, largo: -1, alto: -1, limite: -1 };
    searchTexts.forEach((h, i) => {
      if (h.includes('sector') && !h.includes('sub')) autoMap.sector = i;
      if (h.includes('subsector') || h.includes('puesto')) autoMap.subsector = i;
      if (h.includes('ancho') || h === 'w') autoMap.ancho = i;
      if (h.includes('largo') || h === 'l') autoMap.largo = i;
      if (h.includes('alto') || h === 'h' || h.includes('altura')) autoMap.alto = i;
      if (h.includes('limite') || h.includes('límite')) autoMap.limite = i;
    });
    setGsColumnMap(autoMap);
  };

  const handleLoadFromUrl = async () => {
    const id = extractSpreadsheetId(gsUrl);
    if (!id) { toast({ title: "URL inválida", variant: "destructive" }); return; }
    setSelectedSpreadsheet(id); setGsLoading(true); setGsError("");
    try {
      const res = await fetch(`/api/google-sheets/${id}/sheets`);
      if (!res.ok) {
        const errData = await res.json();
        const msg = errData.message || 'No se pudo acceder a esa hoja.';
        if (msg.startsWith('EXCEL_FILE:')) setGsError(msg.replace('EXCEL_FILE:', ''));
        else toast({ title: "Error", description: msg, variant: "destructive" });
        return;
      }
      setSheetsList(await res.json()); setGsStep('sheets');
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setGsLoading(false); }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setGsLoading(true); setGsError("");
    try {
      const formData = new FormData(); formData.append('file', file);
      const res = await fetch('/api/upload-excel', { method: 'POST', body: formData });
      if (!res.ok) { const err = await res.json(); throw new Error(err.message || 'Error'); }
      const result = await res.json();
      setGsAllSheetsData(result.data);
      setSheetsList(result.sheets.map((name: string, i: number) => ({ sheetId: i, title: name })));
      setSelectedSpreadsheet('local-file'); setGsStep('sheets');
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setGsLoading(false); }
  };

  const handleSelectSheet = async (sheetTitle: string) => {
    setSelectedSheet(sheetTitle); setGsLoading(true);
    try {
      let data: string[][];
      if (selectedSpreadsheet === 'local-file' && gsAllSheetsData[sheetTitle]) data = gsAllSheetsData[sheetTitle];
      else {
        const range = encodeURIComponent(`${sheetTitle}!A1:AZ200`);
        const res = await fetch(`/api/google-sheets/${selectedSpreadsheet}/data?range=${range}`);
        if (!res.ok) throw new Error('Error al leer datos');
        data = await res.json();
      }
      setGsPreviewData(data); autoMapColumns(data); setGsStep('preview');
    } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
    finally { setGsLoading(false); }
  };

  const combinedHeaders = gsPreviewData.length > 0 ? buildCombinedHeaders(gsPreviewData, Math.max(gsHeaderRow, gsDataStartRow - 1)) : [];
  const resultHeaderKeywords = ['valor max', 'valor min', 'e mínima', 'e minima', 'e media', 'e. media', 'limite', 'límite', 'cumple', 'uniformidad'];

  const findLuxColumns = () => {
    const mappedCols = [gsColumnMap.sector, gsColumnMap.subsector, gsColumnMap.ancho, gsColumnMap.largo, gsColumnMap.alto, gsColumnMap.limite].filter(c => c >= 0);
    const headers = combinedHeaders.map(h => h.toLowerCase());
    let luxStart = -1, luxEnd = -1;
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const isResultCol = resultHeaderKeywords.some(kw => h.includes(kw));
      if (!isResultCol && (h.match(/^\d+$/) || h.includes('iluminancia') || h.includes('punto'))) {
        if (luxStart < 0) luxStart = i; luxEnd = i + 1;
      } else if (luxStart >= 0 && isResultCol) break;
    }
    if (luxStart < 0) {
      const afterMapped = Math.max(...mappedCols, 0) + 1;
      const firstDataRow = gsPreviewData[gsDataStartRow];
      if (firstDataRow) {
        for (let i = afterMapped; i < firstDataRow.length; i++) {
          const h = (headers[i] || '').toLowerCase();
          if (resultHeaderKeywords.some(kw => h.includes(kw))) break;
          const val = String(firstDataRow[i] || '');
          if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 0) { if (luxStart < 0) luxStart = i; luxEnd = i + 1; }
          else if (luxStart >= 0) break;
        }
      }
    }
    return { startCol: luxStart >= 0 ? luxStart : 0, endCol: luxEnd >= 0 ? luxEnd : Math.max(...mappedCols, 0) + 1 };
  };

  const handleImportFromGoogleSheets = () => {
    const dataRows = gsPreviewData.slice(gsDataStartRow);
    if (dataRows.length === 0) { toast({ title: "Sin datos", variant: "destructive" }); return; }
    const { startCol: luxStartCol, endCol: luxEndCol } = findLuxColumns();
    let imported = 0;
    let currentSectorId: string | null = null; let currentMeasurementId: string | null = null;
    dataRows.forEach((row) => {
      const sectorNum = gsColumnMap.sector >= 0 ? String(row[gsColumnMap.sector] || '').trim() : '';
      const subsectorName = gsColumnMap.subsector >= 0 ? String(row[gsColumnMap.subsector] || '').trim() : '';
      const hasLuxData = (() => { for (let c = luxStartCol; c < luxEndCol && c < row.length; c++) { const val = String(row[c] || '').trim(); if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 0) return true; } return false; })();
      const isSectorRow = sectorNum !== '' && subsectorName !== '';
      const isContinuationRow = sectorNum === '' && currentSectorId !== null && hasLuxData;
      if (isSectorRow) {
        addSectorWithMeasurement({ name: subsectorName, description: '', dimensions: '', activity: '', workersCount: 0 }, type);
        const newSectors = useStore.getState().sectors;
        const lastSector = newSectors[newSectors.length - 1];
        const measurement = lastSector?.measurements.find(m => m.type === type);
        currentSectorId = lastSector?.id || null; currentMeasurementId = measurement?.id || null;
        if (measurement && currentSectorId) {
          const config: Record<string, any> = {};
          if (gsColumnMap.ancho >= 0 && row[gsColumnMap.ancho]) config.width = parseFloat(row[gsColumnMap.ancho]) || 0;
          if (gsColumnMap.largo >= 0 && row[gsColumnMap.largo]) config.length = parseFloat(row[gsColumnMap.largo]) || 0;
          if (gsColumnMap.alto >= 0 && row[gsColumnMap.alto]) config.height = parseFloat(row[gsColumnMap.alto]) || 0;
          if (gsColumnMap.limite >= 0 && row[gsColumnMap.limite]) config.limit = parseFloat(row[gsColumnMap.limite]) || 0;
          if (Object.keys(config).length > 0) updateMeasurement(currentSectorId, measurement.id, { config: { ...measurement.config, ...config } });
        }
        imported++;
      }
      if ((isSectorRow || isContinuationRow) && currentSectorId && currentMeasurementId) {
        for (let c = luxStartCol; c < luxEndCol && c < row.length; c++) {
          const val = String(row[c] || '').trim();
          if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 0) addPoint(currentSectorId, currentMeasurementId, { values: { lux: val } });
        }
      }
    });
    const currentSectors = useStore.getState().sectors.filter(s => s.measurements.some(m => m.type === type));
    const maxActualPoints = Math.max(9, ...currentSectors.map(s => { const m = s.measurements.find(m => m.type === type); return m ? m.points.length : 0; }));
    setVisiblePointsOverride(maxActualPoints);
    setGsDialogOpen(false);
    toast({ title: `${imported} sectores importados` });
  };

  // ── Render helpers ────────────────────────────────────────────────────────
  const cellClass = "border px-1 py-0.5 text-xs text-center";
  const inputClass = "w-full h-6 text-xs text-center border-0 bg-transparent focus:bg-yellow-50 focus:outline-none";
  const headerClass = "border border-blue-800 px-1 py-1 text-xs font-bold text-center whitespace-nowrap bg-[#003366] text-white";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-xs">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="btn-back">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          </Link>
          <h1 className="text-sm font-bold text-[#003366]" data-testid="heading-lighting">
            PROTOCOLO — ILUMINACIÓN (Res. SRT 84/2012)
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadSampleData} className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs" data-testid="btn-load-sample">
            <Database className="h-3.5 w-3.5 mr-1" /> Datos Muestra
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPDF} className="text-xs" data-testid="btn-download-pdf">
            <FileDown className="h-3.5 w-3.5 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={downloadDOCX} className="text-xs" data-testid="btn-download-docx">
            <FileDown className="h-3.5 w-3.5 mr-1" /> DOCX
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setGsDialogOpen(true); setGsStep('url'); setGsUrl(""); setGsError(""); setSelectedSpreadsheet(""); setSelectedSheet(""); setGsPreviewData([]); setGsAllSheetsData({}); setSheetsList([]); }} className="text-xs" data-testid="btn-google-sheets">
            <Sheet className="h-3.5 w-3.5 mr-1" /> Excel/Sheets
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)} className="text-xs" data-testid="btn-import">
            <FileUp className="h-3.5 w-3.5 mr-1" /> Importar
          </Button>
          <Button onClick={handleAddRow} size="sm" className="text-xs" data-testid="btn-add-row">
            <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Fila
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3">
        <div className="flex gap-1">
          {[
            { key: 'general' as const, label: missingCalibration ? "⚠ Datos Generales" : "Datos Generales" },
            { key: 'mediciones' as const, label: "Tabla de Mediciones" },
            { key: 'conclusiones' as const, label: "Análisis y Conclusiones" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
              className={`px-4 py-1.5 text-xs font-medium rounded-t border border-b-0 transition-colors ${activeTab === tab.key ? 'bg-white text-[#003366] border-gray-300 shadow-sm' : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: Datos Generales ──────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <div className="flex-1 overflow-auto p-4 pt-0">
          <div className="bg-white rounded-b rounded-tr border border-gray-300 shadow-sm p-4 space-y-5 max-w-5xl">
            {/* Establecimiento */}
            <section>
              <h3 className="text-xs font-bold text-[#003366] border-b pb-1 mb-3">Datos del Establecimiento</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Razón Social</label><Input className="mt-1 h-8 text-xs" value={company.razonSocial} onChange={e => updateLightingCompany({ razonSocial: e.target.value })} data-testid="input-razon-social" /></div>
                <div><label className="text-xs font-medium text-gray-600">C.U.I.T.</label><Input className="mt-1 h-8 text-xs" value={company.cuit} onChange={e => updateLightingCompany({ cuit: e.target.value })} data-testid="input-cuit" /></div>
                <div><label className="text-xs font-medium text-gray-600">Dirección</label><Input className="mt-1 h-8 text-xs" value={company.direccion} onChange={e => updateLightingCompany({ direccion: e.target.value })} data-testid="input-direccion" /></div>
                <div><label className="text-xs font-medium text-gray-600">Localidad</label><Input className="mt-1 h-8 text-xs" value={company.localidad} onChange={e => updateLightingCompany({ localidad: e.target.value })} data-testid="input-localidad" /></div>
                <div><label className="text-xs font-medium text-gray-600">Provincia</label><Input className="mt-1 h-8 text-xs" value={company.provincia} onChange={e => updateLightingCompany({ provincia: e.target.value })} data-testid="input-provincia" /></div>
                <div><label className="text-xs font-medium text-gray-600">C.P.</label><Input className="mt-1 h-8 text-xs" value={company.cp} onChange={e => updateLightingCompany({ cp: e.target.value })} data-testid="input-cp" /></div>
                <div><label className="text-xs font-medium text-gray-600">Fecha de Medición</label><Input className="mt-1 h-8 text-xs" value={company.fechaMedicion} onChange={e => updateLightingCompany({ fechaMedicion: e.target.value })} data-testid="input-fecha" /></div>
                <div><label className="text-xs font-medium text-gray-600">Hora Inicio</label><Input className="mt-1 h-8 text-xs" value={company.horaInicio} onChange={e => updateLightingCompany({ horaInicio: e.target.value })} data-testid="input-hora-inicio" /></div>
                <div><label className="text-xs font-medium text-gray-600">Hora Fin</label><Input className="mt-1 h-8 text-xs" value={company.horaFin} onChange={e => updateLightingCompany({ horaFin: e.target.value })} data-testid="input-hora-fin" /></div>
                <div className="col-span-2"><label className="text-xs font-medium text-gray-600">Turnos Habituales</label><Input className="mt-1 h-8 text-xs" value={company.turnos} onChange={e => updateLightingCompany({ turnos: e.target.value })} data-testid="input-turnos" /></div>
              </div>
            </section>

            {/* Instrumento 1 */}
            <section>
              <h3 className="text-xs font-bold text-[#003366] border-b pb-1 mb-3">Instrumento 1 — Luxómetro</h3>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Marca</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Marca} onChange={e => updateLightingCompany({ instrumento1Marca: e.target.value })} data-testid="input-inst1-marca" /></div>
                <div><label className="text-xs font-medium text-gray-600">Modelo</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Modelo} onChange={e => updateLightingCompany({ instrumento1Modelo: e.target.value })} data-testid="input-inst1-modelo" /></div>
                <div><label className="text-xs font-medium text-gray-600">N° de Serie</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Serie} onChange={e => updateLightingCompany({ instrumento1Serie: e.target.value })} data-testid="input-inst1-serie" /></div>
                <div><label className={`text-xs font-medium ${!company.instrumento1Cert ? "text-amber-600" : "text-gray-600"}`}>N° Certificado {!company.instrumento1Cert && "⚠"}</label><Input className={`mt-1 h-8 text-xs ${!company.instrumento1Cert ? "border-amber-400" : ""}`} value={company.instrumento1Cert} onChange={e => updateLightingCompany({ instrumento1Cert: e.target.value })} data-testid="input-inst1-cert" /></div>
                <div><label className={`text-xs font-medium ${!company.instrumento1FechaCal ? "text-amber-600" : "text-gray-600"}`}>Fecha Calibración {!company.instrumento1FechaCal && "⚠"}</label><Input className={`mt-1 h-8 text-xs ${!company.instrumento1FechaCal ? "border-amber-400" : ""}`} value={company.instrumento1FechaCal} onChange={e => updateLightingCompany({ instrumento1FechaCal: e.target.value })} data-testid="input-inst1-fecha" /></div>
              </div>
            </section>

            {/* Instrumento 2 */}
            <section>
              <h3 className="text-xs font-bold text-[#003366] border-b pb-1 mb-3">Instrumento 2 — Medidor de Distancia Láser (opcional)</h3>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Marca</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2Marca} onChange={e => updateLightingCompany({ instrumento2Marca: e.target.value })} data-testid="input-inst2-marca" /></div>
                <div><label className="text-xs font-medium text-gray-600">Modelo</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2Modelo} onChange={e => updateLightingCompany({ instrumento2Modelo: e.target.value })} data-testid="input-inst2-modelo" /></div>
                <div><label className="text-xs font-medium text-gray-600">N° de Serie</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2Serie} onChange={e => updateLightingCompany({ instrumento2Serie: e.target.value })} data-testid="input-inst2-serie" /></div>
              </div>
            </section>

            {/* Condiciones atmosféricas */}
            <section>
              <h3 className="text-xs font-bold text-[#003366] border-b pb-1 mb-3">Condiciones Atmosféricas</h3>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium text-gray-600">Temperatura (°C)</label><Input className="mt-1 h-8 text-xs" value={company.tempExterior} onChange={e => updateLightingCompany({ tempExterior: e.target.value })} data-testid="input-temp" /></div>
                <div><label className="text-xs font-medium text-gray-600">Humedad Relativa (%)</label><Input className="mt-1 h-8 text-xs" value={company.humedad} onChange={e => updateLightingCompany({ humedad: e.target.value })} data-testid="input-humedad" /></div>
                <div><label className="text-xs font-medium text-gray-600">Presión Atm. (mmHg)</label><Input className="mt-1 h-8 text-xs" value={company.presionAtm} onChange={e => updateLightingCompany({ presionAtm: e.target.value })} data-testid="input-presion" /></div>
              </div>
            </section>

            {/* Metodología */}
            <section>
              <h3 className="text-xs font-bold text-[#003366] border-b pb-1 mb-3">Metodología</h3>
              <Textarea className="text-xs min-h-[60px] resize-y" value={company.metodologia} onChange={e => updateLightingCompany({ metodologia: e.target.value })} data-testid="textarea-metodologia" />
            </section>

            {/* Observaciones generales */}
            <section>
              <h3 className="text-xs font-bold text-[#003366] border-b pb-1 mb-3">Observaciones Generales</h3>
              <Textarea className="text-xs min-h-[60px] resize-y" value={company.observacionesGenerales} onChange={e => updateLightingCompany({ observacionesGenerales: e.target.value })} placeholder="Observaciones generales del establecimiento..." data-testid="textarea-obs-generales" />
            </section>
          </div>
        </div>
      )}

      {/* ── TAB 2: Tabla de Mediciones ─────────────────────────────────────── */}
      {activeTab === 'mediciones' && (
        <div className="flex-1 overflow-auto p-4 pt-0">
          <div className="bg-white rounded-b rounded-tr border border-gray-300 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs" style={{ minWidth: `${900 + visiblePoints * 50}px` }}>
                <thead>
                  <tr>
                    <th rowSpan={2} className={headerClass} style={{ width: '28px' }}>#</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '60px' }}>Hora</th>
                    <th rowSpan={2} className={headerClass} style={{ minWidth: '150px' }}>Sector</th>
                    <th rowSpan={2} className={headerClass} style={{ minWidth: '160px' }}>Sección / Puesto</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '90px' }}>Tipo Ilum.</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '90px' }}>Tipo Fuente</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '80px' }}>Tipo Sist.</th>
                    <th colSpan={3} className={headerClass}>Dimensiones (m)</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '35px' }}>K</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '35px' }}>Min</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '35px' }}>Ptos</th>
                    <th colSpan={visiblePoints} className={headerClass}>Iluminancia por Punto (LUX)</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '50px' }}>E mínima</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '50px' }}>E media</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '70px' }}>E mín ≥ E med/2</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '80px' }}>Valor Legal (lux)</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '55px' }}>Cumple Unif.</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '55px' }}>Cumple Límite</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '30px' }}>F/S</th>
                    <th rowSpan={2} className={headerClass} style={{ width: '24px' }}></th>
                  </tr>
                  <tr>
                    <th className={headerClass} style={{ width: '45px' }}>Ancho</th>
                    <th className={headerClass} style={{ width: '45px' }}>Largo</th>
                    <th className={headerClass} style={{ width: '45px' }}>Alto</th>
                    {Array.from({ length: visiblePoints }).map((_, i) => (
                      <th key={i} className={headerClass} style={{ width: '42px' }}>{i + 1}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {activeSectors.map((sector, rowIndex) => {
                    const measurement = sector.measurements.find(m => m.type === type);
                    if (!measurement) return null;
                    const { eMedia, eMinima, uniformidadCumple, valorLegal, cumpleLimite, k, minPts, rowOk, rowFail } = getSectorCalcs(measurement);
                    const points = measurement.points;
                    const rowBg = rowFail ? "bg-red-50" : rowOk ? "bg-green-50" : "";

                    return (
                      <tr key={sector.id} className={cn("hover:brightness-95", rowBg)} data-testid={`row-sector-${rowIndex}`}>
                        <td className={cn(cellClass, "bg-gray-50 font-bold")}>{rowIndex + 1}</td>
                        <td className={cellClass}>
                          <input className={inputClass} value={measurement.config?.hora || ''} onChange={e => handleConfigChange(sector.id, measurement.id, 'hora', e.target.value)} placeholder="HH:MM" data-testid={`input-hora-${rowIndex}`} />
                        </td>
                        <td className={cn(cellClass, "text-left")}>
                          <input className={cn(inputClass, "text-left")} value={sector.name} onChange={e => updateSector(sector.id, { name: e.target.value })} data-testid={`input-name-${rowIndex}`} />
                        </td>
                        <td className={cn(cellClass, "text-left")}>
                          <input className={cn(inputClass, "text-left")} value={sector.description || ''} onChange={e => updateSector(sector.id, { description: e.target.value })} placeholder="Sección/Puesto..." data-testid={`input-subsector-${rowIndex}`} />
                        </td>
                        <td className={cellClass}>
                          <Select value={measurement.config?.tipoIluminacion || ''} onValueChange={v => handleConfigChange(sector.id, measurement.id, 'tipoIluminacion', v)}>
                            <SelectTrigger className="h-6 text-xs border-0 rounded-none px-0.5"><SelectValue placeholder="–" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Natural">Natural</SelectItem>
                              <SelectItem value="Artificial">Artificial</SelectItem>
                              <SelectItem value="Mixta">Mixta</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className={cellClass}>
                          <Select value={measurement.config?.tipoFuente || ''} onValueChange={v => handleConfigChange(sector.id, measurement.id, 'tipoFuente', v)}>
                            <SelectTrigger className="h-6 text-xs border-0 rounded-none px-0.5"><SelectValue placeholder="–" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Incandescente">Incandescente</SelectItem>
                              <SelectItem value="Descarga">Descarga</SelectItem>
                              <SelectItem value="LED">LED</SelectItem>
                              <SelectItem value="Mixta">Mixta</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className={cellClass}>
                          <Select value={measurement.config?.tipoSistema || ''} onValueChange={v => handleConfigChange(sector.id, measurement.id, 'tipoSistema', v)}>
                            <SelectTrigger className="h-6 text-xs border-0 rounded-none px-0.5"><SelectValue placeholder="–" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="General">General</SelectItem>
                              <SelectItem value="Localizada">Localizada</SelectItem>
                              <SelectItem value="Mixta">Mixta</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className={cellClass}><input type="number" className={inputClass} value={measurement.config?.width || ''} onChange={e => handleCellChange(sector.id, measurement.id, 'width', e.target.value)} placeholder="-" data-testid={`input-width-${rowIndex}`} /></td>
                        <td className={cellClass}><input type="number" className={inputClass} value={measurement.config?.length || ''} onChange={e => handleCellChange(sector.id, measurement.id, 'length', e.target.value)} placeholder="-" data-testid={`input-length-${rowIndex}`} /></td>
                        <td className={cellClass}><input type="number" className={inputClass} value={measurement.config?.height || ''} onChange={e => handleCellChange(sector.id, measurement.id, 'height', e.target.value)} placeholder="-" data-testid={`input-height-${rowIndex}`} /></td>
                        <td className={cn(cellClass, "bg-gray-50 font-medium")}>{k || '-'}</td>
                        <td className={cn(cellClass, "bg-gray-50")}>{minPts}</td>
                        <td className={cn(cellClass, "bg-gray-50 font-bold")}>{points.length}</td>

                        {/* Lux point cells */}
                        {Array.from({ length: visiblePoints }).map((_, i) => {
                          const point = points[i];
                          return (
                            <td key={i} className={cn(cellClass, "p-0")}>
                              <input
                                type="number"
                                className={cn(inputClass, "focus:bg-yellow-50")}
                                value={point?.values.lux || ''}
                                onChange={e => {
                                  if (point) handlePointChange(sector.id, measurement.id, point.id, e.target.value);
                                }}
                                onFocus={() => {
                                  if (!point) addPoint(sector.id, measurement.id, { values: { lux: '' } });
                                }}
                                data-testid={`input-lux-${rowIndex}-${i}`}
                              />
                            </td>
                          );
                        })}

                        {/* Calculated columns */}
                        <td className={cn(cellClass, "bg-blue-50 font-semibold")}>{eMinima || '-'}</td>
                        <td className={cn(cellClass, "bg-blue-50 font-semibold")}>{eMedia || '-'}</td>
                        <td className={cn(cellClass, points.length > 0 ? (uniformidadCumple ? "bg-green-100 text-green-800 font-semibold" : "bg-red-100 text-red-800 font-semibold") : "bg-gray-50 text-gray-400")}>
                          {points.length > 0 ? `${eMinima}≥${Math.round(eMedia / 2)} ${uniformidadCumple ? "✓" : "✗"}` : '—'}
                        </td>

                        {/* Valor Legal — select preset or manual */}
                        <td className={cellClass}>
                          <Select
                            value={LEGAL_LUX_OPTIONS.find(o => String(measurement.config?.limit) === o.value) ? String(measurement.config?.limit) : "manual"}
                            onValueChange={v => { if (v !== "manual") handleCellChange(sector.id, measurement.id, 'limit', v); }}
                          >
                            <SelectTrigger className="h-6 text-xs border-0 rounded-none px-0.5 w-full"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {LEGAL_LUX_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.value} lux</SelectItem>)}
                              <SelectItem value="manual">Manual…</SelectItem>
                            </SelectContent>
                          </Select>
                          <input type="number" className={cn(inputClass, "border-t border-dashed border-gray-200")} value={measurement.config?.limit || ''} onChange={e => handleCellChange(sector.id, measurement.id, 'limit', e.target.value)} placeholder="lux" data-testid={`input-limit-${rowIndex}`} />
                        </td>

                        {/* Cumple uniformidad */}
                        <td className={cn(cellClass, points.length > 0 ? (uniformidadCumple ? "bg-green-100 text-green-800 font-bold" : "bg-red-100 text-red-800 font-bold") : "")}>
                          {points.length > 0 ? (uniformidadCumple ? "SI" : "NO") : '—'}
                        </td>
                        {/* Cumple límite */}
                        <td className={cn(cellClass, cumpleLimite === true ? "bg-green-100 text-green-800 font-bold" : cumpleLimite === false ? "bg-red-100 text-red-800 font-bold" : "")}>
                          {cumpleLimite === null ? '—' : cumpleLimite ? 'SI' : 'NO'}
                        </td>
                        {/* F/S checkbox */}
                        <td className={cellClass}>
                          <input
                            type="checkbox"
                            checked={!!measurement.config?.fueraDeServicio}
                            onChange={e => handleConfigChange(sector.id, measurement.id, 'fueraDeServicio', e.target.checked ? 'true' : '')}
                            className="w-3 h-3 mx-auto block"
                            data-testid={`checkbox-fs-${rowIndex}`}
                            title="Fuera de Servicio"
                          />
                        </td>
                        {/* Delete */}
                        <td className={cellClass}>
                          <button
                            onClick={() => { const m = sector.measurements.find(ms => ms.type === type); if (m) { useStore.getState().deleteMeasurement(sector.id, m.id); useStore.getState().deleteSector(sector.id); } }}
                            className="text-red-400 hover:text-red-600"
                            data-testid={`btn-delete-${rowIndex}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-2 border-t flex items-center gap-3">
              <Button size="sm" variant="outline" onClick={handleAddRow} className="text-xs" data-testid="btn-add-row-bottom">
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Sector
              </Button>
              <span className="text-gray-400 text-xs">Columnas azules = calculadas automáticamente</span>
              <span className={cn("text-xs px-2 py-0.5 rounded", activeSectors.some(s => { const m = s.measurements.find(ms => ms.type === type); if (!m) return false; const { rowFail } = getSectorCalcs(m); return rowFail; }) ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")}>
                {activeSectors.filter(s => { const m = s.measurements.find(ms => ms.type === type); if (!m) return false; const { rowOk } = getSectorCalcs(m); return rowOk; }).length}/{activeSectors.length} sectores cumplen
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Análisis y Conclusiones ────────────────────────────────── */}
      {activeTab === 'conclusiones' && (
        <div className="flex-1 overflow-auto p-4 pt-0">
          <div className="bg-white rounded-b rounded-tr border border-gray-300 shadow-sm p-4 space-y-5 max-w-5xl">
            {/* Observaciones particulares */}
            <section>
              <label className="text-xs font-semibold text-gray-700">Observaciones Particulares de los Sectores</label>
              <Textarea className="mt-1 text-xs min-h-[80px] resize-y" value={lightingProtocol.observaciones} onChange={e => updateLightingText("observaciones", e.target.value)} placeholder="Describir características particulares de los sectores medidos..." data-testid="textarea-observaciones" />
            </section>

            {/* Mantenimiento preventivo */}
            <section>
              <h3 className="text-xs font-bold text-[#003366] border-b pb-1 mb-3">
                Plan de Mantenimiento Preventivo — Checklist SRT 84/2012
              </h3>
              <div className="grid grid-cols-1 gap-1.5">
                {MANT_ITEMS.map(item => (
                  <label key={item.key} className="flex items-start gap-2 p-2 rounded border hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={!!mantenimiento[item.key]}
                      onChange={e => updateLightingMantenimiento(item.key, e.target.checked)}
                      className="mt-0.5 w-3.5 h-3.5 rounded"
                      data-testid={`checkbox-mant-${item.key}`}
                    />
                    <span className={cn("text-xs", mantenimiento[item.key] ? "text-green-700 font-medium line-through" : "text-gray-700")}>{item.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {Object.values(mantenimiento).filter(Boolean).length} de {MANT_ITEMS.length} recomendaciones implementadas
              </p>
            </section>

            {/* Conclusiones */}
            <section>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">Conclusiones</label>
                <Button size="sm" variant="outline" className="h-6 text-xs text-purple-700 border-purple-300 hover:bg-purple-50" onClick={() => generateAI("conclusiones")} disabled={!!aiLoading} data-testid="btn-ai-conclusiones">
                  {aiLoading === "conclusiones" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />} Generar con IA
                </Button>
              </div>
              <Textarea className="text-xs min-h-[100px] resize-y" value={lightingProtocol.conclusiones} onChange={e => updateLightingText("conclusiones", e.target.value)} placeholder="Conclusiones del estudio de iluminación..." data-testid="textarea-conclusiones" />
            </section>

            {/* Recomendaciones */}
            <section>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">Recomendaciones</label>
                <Button size="sm" variant="outline" className="h-6 text-xs text-purple-700 border-purple-300 hover:bg-purple-50" onClick={() => generateAI("recomendaciones")} disabled={!!aiLoading} data-testid="btn-ai-recomendaciones">
                  {aiLoading === "recomendaciones" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />} Generar con IA
                </Button>
              </div>
              <Textarea className="text-xs min-h-[100px] resize-y" value={lightingProtocol.recomendaciones} onChange={e => updateLightingText("recomendaciones", e.target.value)} placeholder="Medidas de mejora lumínica, mantenimiento, cambios de tecnología..." data-testid="textarea-recomendaciones" />
            </section>
          </div>
        </div>
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Importar Sectores del Cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {clients.filter(c => c.sectors && (c.sectors as string[]).length > 0).length === 0 ? (
              <div className="p-4 text-center text-muted-foreground border rounded-md bg-muted/50">
                <p className="font-medium">No hay clientes con sectores definidos</p>
                <p className="text-sm mt-1">Primero agregue sectores a un cliente desde la página de Clientes</p>
              </div>
            ) : (
              <>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger data-testid="select-client-import"><SelectValue placeholder="Seleccione un cliente..." /></SelectTrigger>
                  <SelectContent>
                    {clients.filter(c => c.sectors && (c.sectors as string[]).length > 0).map(client => (
                      <SelectItem key={client.id} value={client.id}>{client.name} ({(client.sectors as string[]).length} sectores)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedClientId && (
                  <div className="p-3 bg-muted rounded text-sm">
                    <p className="font-medium mb-2">Sectores a importar:</p>
                    <div className="flex flex-wrap gap-1">
                      {(clients.find(c => c.id === selectedClientId)?.sectors as string[] || []).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 bg-white border rounded text-xs">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportSectors} disabled={!selectedClientId} data-testid="btn-confirm-import">Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Google Sheets dialog */}
      <Dialog open={gsDialogOpen} onOpenChange={setGsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Sheet className="h-5 w-5 text-green-600" /> Importar desde Google Sheets</DialogTitle></DialogHeader>
          {gsLoading && <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /><span className="ml-2 text-muted-foreground">Cargando...</span></div>}

          {!gsLoading && gsStep === 'url' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="font-semibold">Opción 1: Subir archivo Excel/CSV</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
                  <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" id="excel-upload" data-testid="input-excel-upload" />
                  <label htmlFor="excel-upload" className="cursor-pointer">
                    <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Hacé clic para seleccionar un archivo</p>
                    <p className="text-xs text-muted-foreground">.xlsx, .xls o .csv</p>
                  </label>
                </div>
              </div>
              <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">o</span></div></div>
              <div className="space-y-2">
                <Label className="font-semibold">Opción 2: URL de Google Sheets</Label>
                <input type="text" className="w-full border rounded px-3 py-2 text-sm" placeholder="https://docs.google.com/spreadsheets/d/..." value={gsUrl} onChange={e => { setGsUrl(e.target.value); setGsError(""); }} onKeyDown={e => e.key === 'Enter' && handleLoadFromUrl()} data-testid="input-gs-url" />
                {gsError && <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">{gsError}</div>}
                <Button onClick={handleLoadFromUrl} disabled={!gsUrl.trim()} className="w-full" data-testid="btn-gs-load">Cargar hoja</Button>
              </div>
            </div>
          )}

          {!gsLoading && gsStep === 'sheets' && (
            <div className="space-y-2 py-2">
              <Button variant="ghost" size="sm" onClick={() => setGsStep('url')} className="mb-2"><ArrowLeft className="h-4 w-4 mr-1" /> Cambiar URL</Button>
              <Label>Seleccioná la hoja/pestaña:</Label>
              <div className="space-y-1">
                {sheetsList.map((sheet: any) => (
                  <div key={sheet.sheetId} className="flex items-center gap-3 p-2 rounded border hover:bg-muted cursor-pointer transition-colors" onClick={() => handleSelectSheet(sheet.title)} data-testid={`gs-sheet-${sheet.sheetId}`}>
                    <span className="text-sm">{sheet.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!gsLoading && gsStep === 'preview' && (
            <div className="space-y-4 py-2">
              <Button variant="ghost" size="sm" onClick={() => setGsStep('sheets')} className="mb-2"><ArrowLeft className="h-4 w-4 mr-1" /> Volver</Button>
              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded border">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Fila de datos desde:</Label>
                  <Select value={String(gsDataStartRow)} onValueChange={v => setGsDataStartRow(parseInt(v))}>
                    <SelectTrigger className="h-8 text-xs" data-testid="gs-data-start"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {gsPreviewData.slice(0, 15).map((row, i) => (
                        <SelectItem key={i} value={String(i)}>Fila {i + 1}: {row.slice(0, 3).filter(Boolean).join(' | ').substring(0, 40)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1"><Label className="text-xs font-semibold">Total filas a importar:</Label><p className="text-sm font-medium pt-1">{Math.max(0, gsPreviewData.length - gsDataStartRow)} filas</p></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(['sector', 'subsector', 'ancho', 'largo', 'alto', 'limite'] as const).map(field => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs capitalize">{field === 'limite' ? 'Límite Legal' : field}</Label>
                    <Select value={gsColumnMap[field] >= 0 ? String(gsColumnMap[field]) : "none"} onValueChange={v => setGsColumnMap(prev => ({ ...prev, [field]: v === 'none' ? -1 : parseInt(v) }))}>
                      <SelectTrigger className="h-8 text-xs" data-testid={`gs-map-${field}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- No mapear --</SelectItem>
                        {combinedHeaders.map((header, i) => <SelectItem key={i} value={String(i)}>{header}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Las columnas numéricas después de la última columna mapeada se importarán como puntos de medición LUX.</p>
              {gsPreviewData.length > 0 && (
                <div className="border rounded overflow-auto max-h-48">
                  <table className="w-full text-xs border-collapse">
                    <thead><tr className="bg-blue-900 text-white">{combinedHeaders.map((h, i) => <th key={i} className="border border-blue-800 px-2 py-1 whitespace-nowrap">{h}</th>)}</tr></thead>
                    <tbody>
                      {gsPreviewData.slice(gsDataStartRow, gsDataStartRow + 5).map((row, ri) => (
                        <tr key={ri} className={ri === 0 ? "bg-green-50 font-medium" : "hover:bg-gray-50"}>
                          {combinedHeaders.map((_, ci) => <td key={ci} className="border px-2 py-0.5 whitespace-nowrap">{row[ci] ?? ''}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {gsPreviewData.length - gsDataStartRow > 5 && <p className="text-xs text-center py-1 text-muted-foreground">... y {gsPreviewData.length - gsDataStartRow - 5} filas más</p>}
                </div>
              )}
            </div>
          )}
          {!gsLoading && gsStep === 'preview' && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setGsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleImportFromGoogleSheets} disabled={gsColumnMap.sector < 0} data-testid="btn-gs-import">Importar {Math.max(0, gsPreviewData.length - gsDataStartRow)} filas</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
