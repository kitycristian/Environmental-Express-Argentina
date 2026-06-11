import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, FileDown, FileUp, Database, Sparkles, Loader2 } from "lucide-react";
import { useClients } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
// @ts-ignore
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, Header, Footer } from "docx";
// @ts-ignore
import { saveAs } from "file-saver";
import { useStore, NoiseRow } from "@/lib/store";

// ─── Noise Limits (Anexo V Resol. MTEySS 295/03) ─────────────────────────────
const NOISE_LIMITS = [
  { dba: 80, min: 1440 }, { dba: 82, min: 960 }, { dba: 85, min: 480 },
  { dba: 88, min: 240 }, { dba: 91, min: 120 }, { dba: 94, min: 60 },
  { dba: 97, min: 30 }, { dba: 100, min: 15 }, { dba: 103, min: 7.5 },
  { dba: 106, min: 3.75 },
];

const getPermittedMin = (laeq: number): number => {
  if (laeq < 80) return Infinity;
  return 480 / Math.pow(2, (laeq - 85) / 3);
};

interface CalcResult {
  teMin: number | null;
  tPermMin: number | null;
  fraccion: number | null;
  cumple: string;
}

const calcRow = (row: NoiseRow): CalcResult => {
  if (row.tipoRuido === "Impulso o Impacto") {
    const lc = parseFloat(row.lcPicoDbc);
    if (!isNaN(lc)) return { teMin: null, tPermMin: null, fraccion: null, cumple: lc < 140 ? "SI" : "NO" };
    return { teMin: null, tPermMin: null, fraccion: null, cumple: "-" };
  }
  if (row.esPuestoMovil) {
    const d = parseFloat(row.dosis);
    if (!isNaN(d)) return { teMin: null, tPermMin: null, fraccion: null, cumple: d < 100 ? "SI" : "NO" };
    return { teMin: null, tPermMin: null, fraccion: null, cumple: "-" };
  }
  const laeq = parseFloat(row.laeqTe);
  const teH = parseFloat(row.tiempoExposicion);
  if (!isNaN(laeq) && !isNaN(teH)) {
    const teMin = teH * 60;
    const tPermMin = getPermittedMin(laeq);
    const fraccion = tPermMin === Infinity ? 0 : teMin / tPermMin;
    return { teMin, tPermMin: tPermMin === Infinity ? null : tPermMin, fraccion, cumple: fraccion < 1 ? "SI" : "NO" };
  }
  return { teMin: null, tPermMin: null, fraccion: null, cumple: "-" };
};

const fmtNum = (n: number | null, dec = 3) =>
  n === null ? "-" : isFinite(n) ? n.toFixed(dec) : "Sin límite";

type TabKey = "general" | "mediciones" | "calculos" | "referencia" | "conclusiones";

const TABS: { key: TabKey; label: string }[] = [
  { key: "general", label: "Datos Generales" },
  { key: "mediciones", label: "Tabla de Mediciones" },
  { key: "calculos", label: "Cálculos" },
  { key: "referencia", label: "Valores de Referencia" },
  { key: "conclusiones", label: "Conclusiones" },
];

export default function NoiseSheet() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [generatingField, setGeneratingField] = useState<string | null>(null);

  const noiseProtocol = useStore((s) => s.noiseProtocol);
  const _updateNoiseRow = useStore((s) => s.updateNoiseRow);
  const _addNoiseRow = useStore((s) => s.addNoiseRow);
  const _deleteNoiseRow = useStore((s) => s.deleteNoiseRow);
  const _updateNoiseCompany = useStore((s) => s.updateNoiseCompany);
  const _updateNoiseText = useStore((s) => s.updateNoiseText);
  const _setNoiseRows = useStore((s) => s.setNoiseRows);
  const establishment = useStore((s) => s.establishment);
  const digitalSignature = useStore((s) => s.digitalSignature);
  const signatoryName = useStore((s) => s.signatoryName);
  const signatoryTitle = useStore((s) => s.signatoryTitle);
  const signatoryRegistration = useStore((s) => s.signatoryRegistration);
  const { data: clients = [] } = useClients();

  const rows = noiseProtocol.rows;
  const company = noiseProtocol.company;
  const conclusiones = noiseProtocol.conclusiones;
  const recomendaciones = noiseProtocol.recomendaciones;

  const setCompany = (data: Partial<typeof company>) =>
    _updateNoiseCompany({ ...company, ...data });

  const updateRow = (id: string, field: keyof NoiseRow, value: string | boolean) =>
    _updateNoiseRow(id, { [field]: value } as Partial<NoiseRow>);

  const addRow = () => _addNoiseRow({
    id: String(Date.now()),
    sector: "", puestoTrabajo: "", tipoRuido: "Continuo", esPuestoMovil: false,
    tiempoExposicion: "", tiempoIntegracion: "", laeqTe: "", lcPicoDbc: "",
    sumaFracciones: "", dosis: "", cumple: "", observaciones: ""
  });

  const deleteRow = (id: string) => {
    if (rows.length > 1) _deleteNoiseRow(id);
  };

  const handleImportSectors = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (client && Array.isArray(client.sectors)) {
      const newRows = (client.sectors as string[]).map((sectorName, index) => ({
        id: String(Date.now() + index),
        sector: sectorName, puestoTrabajo: "", tipoRuido: "Continuo", esPuestoMovil: false,
        tiempoExposicion: "", tiempoIntegracion: "", laeqTe: "", lcPicoDbc: "",
        sumaFracciones: "", dosis: "", cumple: "", observaciones: ""
      }));
      _setNoiseRows([...rows, ...newRows]);
      setImportDialogOpen(false);
      setSelectedClientId("");
    }
  };

  const preloadFromEstablishment = () => {
    if (establishment?.name) {
      setCompany({
        razonSocial: establishment.name || "",
        direccion: establishment.address || "",
        localidad: establishment.city || "",
        provincia: establishment.province || "",
        cuit: establishment.cuit || "",
      });
      toast({ title: "Datos cargados", description: "Datos del establecimiento precargados." });
    }
  };

  const loadSampleData = () => {
    setCompany({
      razonSocial: "DORINKA SRL (Store #1026 Catamarca)",
      direccion: "Av. Villafañez y Dr. Manuel Navarro S/N",
      localidad: "San Fernando del Valle de Catamarca",
      provincia: "Catamarca", cp: "4700", cuit: "30-67813830-0",
      fechaMedicion: "26/03/2024", horaInicio: "14:00", horaFin: "18:50",
      jornadaLaboral: "8 Horas",
      turnos: "2 Turnos de Trabajo. 6:00 AM - 23:30 PM",
      instrumento1Marca: "TES", instrumento1Modelo: "1353H",
      instrumento1Tipo: "Sonómetro Integrador",
      instrumento1Serie: "130105756", instrumento1Cert: "24R00000809",
      instrumento1FechaCal: "05/02/2024", instrumento1Norma: "IRAM 4074 / IEC 804 Clase 2",
      instrumento2Marca: "CRIFFER", instrumento2Modelo: "Sonus 2 Plus",
      instrumento2Tipo: "Dosímetro",
      instrumento2Serie: "180316", instrumento2Cert: "24R00000808",
      instrumento2FechaCal: "07/02/2024",
      tempExterior: "22", humedad: "55", presionAtm: "1013",
      condicionesNormales: "Fuentes de ruido: Generador Eléctrico, Compresor Rack Frío, Herramientas Manuales Eléctricas (Amoladora, Taladro), Muzak",
      condicionesMedicion: "Equipos funcionando en condiciones normales de operación"
    });
    _setNoiseRows([
      { id: "1", sector: "Generador (Sala Máquinas)", puestoTrabajo: "Op. MTO", tipoRuido: "Continuo", esPuestoMovil: false, tiempoExposicion: "0.5", tiempoIntegracion: "30", laeqTe: "105.6", lcPicoDbc: "", sumaFracciones: "", dosis: "", cumple: "", observaciones: "Ingreso solo MTO. Protector auditivo obligatorio" },
      { id: "2", sector: "Autocenter", puestoTrabajo: "Asociado Autocenter", tipoRuido: "Intermitente", esPuestoMovil: false, tiempoExposicion: "6", tiempoIntegracion: "360", laeqTe: "83.0", lcPicoDbc: "", sumaFracciones: "", dosis: "", cumple: "", observaciones: "MTO liviano de vehículos" },
      { id: "3", sector: "Autocenter", puestoTrabajo: "Llave de impacto", tipoRuido: "Impulso o Impacto", esPuestoMovil: false, tiempoExposicion: "0.03", tiempoIntegracion: "2", laeqTe: "", lcPicoDbc: "98.7", sumaFracciones: "", dosis: "", cumple: "", observaciones: "LC Pico medido con integrador" },
      { id: "4", sector: "Rack Frío (Sala Máquinas)", puestoTrabajo: "Op. Servicios Generales", tipoRuido: "Continuo", esPuestoMovil: false, tiempoExposicion: "0.25", tiempoIntegracion: "15", laeqTe: "87.6", lcPicoDbc: "", sumaFracciones: "", dosis: "", cumple: "", observaciones: "Ingreso solo MTO" },
      { id: "5", sector: "Carnicería", puestoTrabajo: "Op. Carnicería", tipoRuido: "Continuo", esPuestoMovil: false, tiempoExposicion: "1", tiempoIntegracion: "60", laeqTe: "86.1", lcPicoDbc: "", sumaFracciones: "", dosis: "", cumple: "", observaciones: "Sierra eléctrica vertical" },
      { id: "6", sector: "Recepción", puestoTrabajo: "Asociado Recepción", tipoRuido: "Continuo", esPuestoMovil: true, tiempoExposicion: "8", tiempoIntegracion: "480", laeqTe: "", lcPicoDbc: "", sumaFracciones: "", dosis: "59", cumple: "", observaciones: "Dosimetría puesto móvil" },
    ]);
    _updateNoiseText("conclusiones", "Analizando las mediciones de ruido según Res. MTEySS N° 295/2003 y Res. SRT N° 85/2012, las fracciones de dosis en los puestos fijos no superan la unidad en los sectores Autocenter, Rack Frío y Carnicería. El sector Generador presenta niveles que superan el límite para el tiempo de exposición del personal de mantenimiento, requiriendo uso obligatorio de protección auditiva. El puesto de Recepción (dosimetría) registró Dosis=59%, por debajo del 100% permitido.");
    _updateNoiseText("recomendaciones", "1) Uso obligatorio de protección auditiva tipo copa NRR≥25dB para ingreso a sala de máquinas/generador. 2) Señalización de zonas con riesgo de ruido. 3) Capacitación del personal en conservación auditiva. 4) Medición anual de ruido. 5) Mantenimiento preventivo de compresores y generador para reducir nivel de emisión sonora.");
    toast({ title: "Datos de ejemplo cargados", description: "DORINKA SRL — 6 puntos de medición" });
  };

  const buildAISummary = () => rows.map((r, i) => {
    const c = calcRow(r);
    if (r.tipoRuido === "Impulso o Impacto")
      return `Punto ${i + 1}: ${r.sector} / ${r.puestoTrabajo} | Tipo: Impulso | LC pico: ${r.lcPicoDbc} dBC | Cumple: ${c.cumple}`;
    if (r.esPuestoMovil)
      return `Punto ${i + 1}: ${r.sector} / ${r.puestoTrabajo} | Puesto móvil | Dosis: ${r.dosis}% | Cumple: ${c.cumple}`;
    return `Punto ${i + 1}: ${r.sector} / ${r.puestoTrabajo} | ${r.tipoRuido} | LAeq,Te: ${r.laeqTe} dBA | Te: ${r.tiempoExposicion}h | Fracción: ${c.fraccion !== null ? c.fraccion.toFixed(3) : "-"} | Cumple: ${c.cumple}`;
  }).join("\n");

  const generateAI = async (field: "conclusiones" | "recomendaciones") => {
    if (!company.razonSocial.trim()) {
      toast({ title: "Complete la razón social primero", variant: "destructive" });
      return;
    }
    setGeneratingField(field);
    try {
      const res = await fetch("/api/noise/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, summary: buildAISummary(), empresa: company.razonSocial }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      _updateNoiseText(field, data.text);
      toast({ title: "Texto generado con IA" });
    } catch (e: any) {
      toast({ title: "Error IA", description: e.message, variant: "destructive" });
    } finally {
      setGeneratingField(null);
    }
  };

  const downloadDOCX = async () => {
    if (!company.razonSocial.trim()) {
      toast({ title: "Complete la razón social primero", variant: "destructive" });
      return;
    }
    try {
      const children: any[] = [];
      const h = (text: string) => new Paragraph({ children: [new TextRun({ text, bold: true, font: "Arial", size: 24, color: "003366" })], spacing: { before: 200, after: 80 } });
      const lv = (label: string, value: string) => new Paragraph({ children: [new TextRun({ text: label + ": ", bold: true, font: "Arial", size: 20 }), new TextRun({ text: value, font: "Arial", size: 20 })], spacing: { after: 40 } });
      const cell = (text: string, bold = false, opts: any = {}) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold, font: "Arial", size: opts.size || 16, color: opts.color })], alignment: opts.align || AlignmentType.CENTER })],
        shading: opts.shading, margins: { top: 30, bottom: 30, left: 50, right: 50 }
      });

      children.push(new Paragraph({ children: [new TextRun({ text: "PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", bold: true, font: "Arial", size: 28, color: "003366" })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }));
      children.push(new Paragraph({ children: [new TextRun({ text: "Resolución SRT N° 85/2012 — Anexo V Resolución MTEySS N° 295/2003", font: "Arial", size: 18, color: "666666" })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }));

      children.push(h("Datos del Establecimiento"));
      children.push(lv("Razón Social", company.razonSocial));
      children.push(lv("Dirección", `${company.direccion}, ${company.localidad}, ${company.provincia} (C.P. ${company.cp})`));
      children.push(lv("C.U.I.T.", company.cuit));
      children.push(lv("Jornada Laboral", company.jornadaLaboral));
      children.push(lv("Turnos Habituales", company.turnos));
      children.push(lv("Fecha de Medición", company.fechaMedicion));
      children.push(lv("Horario", `Inicio: ${company.horaInicio} — Fin: ${company.horaFin}`));

      children.push(h("Instrumentos Utilizados"));
      children.push(lv("Inst. 1 Tipo", company.instrumento1Tipo));
      children.push(lv("Inst. 1 Marca/Modelo", `${company.instrumento1Marca} ${company.instrumento1Modelo}`));
      children.push(lv("N° Serie / Certificado", `${company.instrumento1Serie} / ${company.instrumento1Cert}`));
      children.push(lv("Fecha Calibración", company.instrumento1FechaCal));
      children.push(lv("Norma", company.instrumento1Norma));
      if (company.instrumento2Marca) {
        children.push(lv("Inst. 2 Tipo", company.instrumento2Tipo));
        children.push(lv("Inst. 2 Marca/Modelo", `${company.instrumento2Marca} ${company.instrumento2Modelo}`));
        children.push(lv("N° Serie / Certificado", `${company.instrumento2Serie} / ${company.instrumento2Cert}`));
        children.push(lv("Fecha Calibración", company.instrumento2FechaCal));
      }

      children.push(h("Condiciones Atmosféricas"));
      children.push(lv("Temperatura Exterior", `${company.tempExterior} °C`));
      children.push(lv("Humedad Relativa", `${company.humedad} %`));
      children.push(lv("Presión Atmosférica", `${company.presionAtm} hPa`));

      children.push(h("Condiciones de la Medición"));
      if (company.condicionesNormales) children.push(lv("Condiciones habituales", company.condicionesNormales));
      if (company.condicionesMedicion) children.push(lv("Durante la medición", company.condicionesMedicion));

      children.push(h("Datos de Medición"));
      const hdr = ["N°", "Sector", "Puesto", "Tipo Ruido", "Te (hs)", "T.Int. (min)", "LAeq,Te dBA", "LC pico dBC", "Σ Ci/Ti", "Dosis %", "¿Cumple?"];
      const hdrRow = new TableRow({ children: hdr.map(t => cell(t, true, { shading: { fill: "003366" }, color: "FFFFFF", size: 14 })), tableHeader: true });
      const dataRows = rows.map((r, i) => {
        const c = calcRow(r);
        const isImpulso = r.tipoRuido === "Impulso o Impacto";
        const isMobile = r.esPuestoMovil;
        const fracStr = c.fraccion !== null ? c.fraccion.toFixed(3) : "-";
        return new TableRow({ children: [
          cell(String(i + 1).padStart(2, "0"), false, { size: 14 }),
          cell(r.sector, false, { align: AlignmentType.LEFT, size: 14 }),
          cell(r.puestoTrabajo + (isMobile ? " (Móvil)" : ""), false, { align: AlignmentType.LEFT, size: 14 }),
          cell(r.tipoRuido, false, { size: 14 }),
          cell(r.tiempoExposicion, false, { size: 14 }),
          cell(r.tiempoIntegracion, false, { size: 14 }),
          cell(isImpulso || isMobile ? "-" : r.laeqTe, false, { size: 14 }),
          cell(isImpulso ? r.lcPicoDbc : "-", false, { size: 14 }),
          cell(isImpulso || isMobile ? "-" : fracStr, false, { size: 14 }),
          cell(isMobile ? r.dosis + "%" : "-", false, { size: 14 }),
          cell(c.cumple, true, { size: 14, color: c.cumple === "SI" ? "008000" : c.cumple === "NO" ? "CC0000" : "666666" }),
        ]});
      });
      children.push(new Table({ rows: [hdrRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }));

      if (conclusiones) { children.push(h("Conclusiones")); children.push(new Paragraph({ children: [new TextRun({ text: conclusiones, font: "Arial", size: 18 })], spacing: { after: 100 } })); }
      if (recomendaciones) { children.push(h("Recomendaciones")); children.push(new Paragraph({ children: [new TextRun({ text: recomendaciones, font: "Arial", size: 18 })], spacing: { after: 100 } })); }

      if (signatoryName || digitalSignature) {
        children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
        children.push(new Paragraph({ children: [new TextRun({ text: "________________________", font: "Arial", size: 20 })], alignment: AlignmentType.CENTER, spacing: { before: 200 } }));
        if (signatoryName) children.push(new Paragraph({ children: [new TextRun({ text: signatoryName, bold: true, font: "Arial", size: 20 })], alignment: AlignmentType.CENTER }));
        if (signatoryTitle) children.push(new Paragraph({ children: [new TextRun({ text: signatoryTitle, font: "Arial", size: 18 })], alignment: AlignmentType.CENTER }));
        if (signatoryRegistration) children.push(new Paragraph({ children: [new TextRun({ text: "Mat. " + signatoryRegistration, font: "Arial", size: 18 })], alignment: AlignmentType.CENTER }));
      }

      const docFile = new Document({
        sections: [{
          properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
          headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: `${company.razonSocial} — Ruido Laboral`, italics: true, size: 16, color: "999999" })], alignment: AlignmentType.RIGHT })] }) },
          footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "Environmental Express Argentina — Protocolo de Ruido — Res. SRT 85/2012", size: 14, color: "999999" })], alignment: AlignmentType.CENTER })] }) },
          children
        }]
      });
      const blob = await Packer.toBlob(docFile);
      saveAs(blob, `Ruido_${company.razonSocial.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.docx`);
      toast({ title: "DOCX generado correctamente" });
    } catch (e) {
      toast({ title: "Error al generar DOCX", variant: "destructive" });
    }
  };

  // ─── Calc summaries ────────────────────────────────────────────────────────
  const fixedRows = rows.filter(r => !r.esPuestoMovil && r.tipoRuido !== "Impulso o Impacto");
  const totalFraccion = fixedRows.reduce((acc, r) => {
    const c = calcRow(r);
    return acc + (c.fraccion ?? 0);
  }, 0);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <h1 className="text-sm font-bold text-[#003366]" data-testid="heading-noise">
            PROTOCOLO DE MEDICIÓN DE RUIDO — Res. SRT 85/2012
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadSampleData} className="text-orange-600 border-orange-300 hover:bg-orange-50" data-testid="button-sample">
            <Database className="h-4 w-4 mr-1" /> Ejemplo
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="button-import">
            <FileUp className="h-4 w-4 mr-1" /> Importar
          </Button>
          <Button size="sm" variant="outline" onClick={downloadDOCX} data-testid="button-export-docx">
            <FileDown className="h-4 w-4 mr-1" /> DOCX
          </Button>
        </div>
      </div>

      {/* Import dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Importar Sectores del Cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {clients.filter(c => c.sectors && (c.sectors as string[]).length > 0).length === 0 ? (
              <p className="text-sm text-muted-foreground text-center">No hay clientes con sectores definidos.</p>
            ) : (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger><SelectValue placeholder="Seleccione un cliente..." /></SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.sectors && (c.sectors as string[]).length > 0).map(client => (
                    <SelectItem key={client.id} value={client.id}>{client.name} ({(client.sectors as string[]).length} sectores)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportSectors} disabled={!selectedClientId}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <div className="flex-1 overflow-auto p-4">
        <div className="flex gap-1 mb-3 flex-wrap">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 text-xs font-medium rounded-t border border-b-0 transition-colors ${activeTab === tab.key ? "bg-white text-[#003366] border-gray-300 font-semibold" : "bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200"}`}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: Datos Generales ─────────────────────────────────────────── */}
        {activeTab === "general" && (
          <div className="space-y-4">
            {/* Establecimiento */}
            <div className="bg-white rounded border shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[#003366] uppercase tracking-wide">Datos del Establecimiento</h3>
                {establishment?.name && (
                  <Button size="sm" variant="outline" onClick={preloadFromEstablishment} className="text-xs h-7">
                    Precargar desde Establecimiento
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><label className="text-xs font-medium">Razón Social</label><Input className="mt-1 h-8 text-xs" value={company.razonSocial} onChange={e => setCompany({ razonSocial: e.target.value })} data-testid="input-razon-social" /></div>
                <div className="col-span-2"><label className="text-xs font-medium">Dirección</label><Input className="mt-1 h-8 text-xs" value={company.direccion} onChange={e => setCompany({ direccion: e.target.value })} data-testid="input-direccion" /></div>
                <div><label className="text-xs font-medium">Localidad</label><Input className="mt-1 h-8 text-xs" value={company.localidad} onChange={e => setCompany({ localidad: e.target.value })} data-testid="input-localidad" /></div>
                <div><label className="text-xs font-medium">Provincia</label><Input className="mt-1 h-8 text-xs" value={company.provincia} onChange={e => setCompany({ provincia: e.target.value })} data-testid="input-provincia" /></div>
                <div><label className="text-xs font-medium">C.P.</label><Input className="mt-1 h-8 text-xs" value={company.cp} onChange={e => setCompany({ cp: e.target.value })} data-testid="input-cp" /></div>
                <div><label className="text-xs font-medium">C.U.I.T.</label><Input className="mt-1 h-8 text-xs" value={company.cuit} onChange={e => setCompany({ cuit: e.target.value })} data-testid="input-cuit" /></div>
                <div><label className="text-xs font-medium">Fecha de Medición</label><Input className="mt-1 h-8 text-xs" value={company.fechaMedicion} onChange={e => setCompany({ fechaMedicion: e.target.value })} data-testid="input-fecha" /></div>
                <div><label className="text-xs font-medium">Jornada Laboral</label><Input className="mt-1 h-8 text-xs" value={company.jornadaLaboral} onChange={e => setCompany({ jornadaLaboral: e.target.value })} data-testid="input-jornada" /></div>
                <div><label className="text-xs font-medium">Hora Inicio</label><Input className="mt-1 h-8 text-xs" value={company.horaInicio} onChange={e => setCompany({ horaInicio: e.target.value })} data-testid="input-hora-inicio" /></div>
                <div><label className="text-xs font-medium">Hora Fin</label><Input className="mt-1 h-8 text-xs" value={company.horaFin} onChange={e => setCompany({ horaFin: e.target.value })} data-testid="input-hora-fin" /></div>
                <div className="col-span-2"><label className="text-xs font-medium">Turnos Habituales</label><Input className="mt-1 h-8 text-xs" value={company.turnos} onChange={e => setCompany({ turnos: e.target.value })} data-testid="input-turnos" /></div>
              </div>
            </div>

            {/* Instrumentos */}
            <div className="bg-white rounded border shadow-sm p-4 space-y-4">
              <h3 className="text-xs font-bold text-[#003366] uppercase tracking-wide">Instrumento 1 — Sonómetro Integrador</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Tipo</label>
                  <Select value={company.instrumento1Tipo} onValueChange={v => setCompany({ instrumento1Tipo: v })}>
                    <SelectTrigger className="mt-1 h-8 text-xs" data-testid="select-inst1-tipo"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sonómetro Integrador">Sonómetro Integrador</SelectItem>
                      <SelectItem value="Sonómetro">Sonómetro</SelectItem>
                      <SelectItem value="Analizador de Frecuencias">Analizador de Frecuencias</SelectItem>
                      <SelectItem value="Dosímetro">Dosímetro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs font-medium">Marca</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Marca} onChange={e => setCompany({ instrumento1Marca: e.target.value })} data-testid="input-inst1-marca" /></div>
                <div><label className="text-xs font-medium">Modelo</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Modelo} onChange={e => setCompany({ instrumento1Modelo: e.target.value })} data-testid="input-inst1-modelo" /></div>
                <div><label className="text-xs font-medium">N° Serie</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Serie} onChange={e => setCompany({ instrumento1Serie: e.target.value })} data-testid="input-inst1-serie" /></div>
                <div><label className="text-xs font-medium">N° Certificado Cal.</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Cert} onChange={e => setCompany({ instrumento1Cert: e.target.value })} data-testid="input-inst1-cert" /></div>
                <div><label className="text-xs font-medium">Fecha Calibración</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1FechaCal} onChange={e => setCompany({ instrumento1FechaCal: e.target.value })} data-testid="input-inst1-fecha" /></div>
                <div className="col-span-2"><label className="text-xs font-medium">Norma Cumplida</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Norma} onChange={e => setCompany({ instrumento1Norma: e.target.value })} placeholder="IRAM 4074 / IEC 804 Clase 2" data-testid="input-inst1-norma" /></div>
              </div>

              <h3 className="text-xs font-bold text-[#003366] uppercase tracking-wide border-t pt-3">Instrumento 2 — Dosímetro (opcional)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Tipo</label>
                  <Select value={company.instrumento2Tipo} onValueChange={v => setCompany({ instrumento2Tipo: v })}>
                    <SelectTrigger className="mt-1 h-8 text-xs" data-testid="select-inst2-tipo"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dosímetro">Dosímetro</SelectItem>
                      <SelectItem value="Sonómetro Integrador">Sonómetro Integrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><label className="text-xs font-medium">Marca</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2Marca} onChange={e => setCompany({ instrumento2Marca: e.target.value })} data-testid="input-inst2-marca" /></div>
                <div><label className="text-xs font-medium">Modelo</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2Modelo} onChange={e => setCompany({ instrumento2Modelo: e.target.value })} data-testid="input-inst2-modelo" /></div>
                <div><label className="text-xs font-medium">N° Serie</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2Serie} onChange={e => setCompany({ instrumento2Serie: e.target.value })} data-testid="input-inst2-serie" /></div>
                <div><label className="text-xs font-medium">N° Certificado Cal.</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2Cert} onChange={e => setCompany({ instrumento2Cert: e.target.value })} data-testid="input-inst2-cert" /></div>
                <div><label className="text-xs font-medium">Fecha Calibración</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2FechaCal} onChange={e => setCompany({ instrumento2FechaCal: e.target.value })} data-testid="input-inst2-fecha" /></div>
              </div>
            </div>

            {/* Condiciones atmosféricas */}
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-xs font-bold text-[#003366] uppercase tracking-wide mb-3">Condiciones Atmosféricas</h3>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-xs font-medium">Temperatura (°C)</label><Input className="mt-1 h-8 text-xs" value={company.tempExterior} onChange={e => setCompany({ tempExterior: e.target.value })} data-testid="input-temp" /></div>
                <div><label className="text-xs font-medium">Humedad (%)</label><Input className="mt-1 h-8 text-xs" value={company.humedad} onChange={e => setCompany({ humedad: e.target.value })} data-testid="input-humedad" /></div>
                <div><label className="text-xs font-medium">Presión Atm. (hPa)</label><Input className="mt-1 h-8 text-xs" value={company.presionAtm} onChange={e => setCompany({ presionAtm: e.target.value })} data-testid="input-presion" /></div>
              </div>
            </div>

            {/* Condiciones */}
            <div className="bg-white rounded border shadow-sm p-4 space-y-3">
              <h3 className="text-xs font-bold text-[#003366] uppercase tracking-wide">Condiciones de la Medición</h3>
              <div>
                <label className="text-xs font-medium">Condiciones Normales / Habituales de Trabajo (fuentes de ruido)</label>
                <Textarea className="mt-1 text-xs h-20" value={company.condicionesNormales} onChange={e => setCompany({ condicionesNormales: e.target.value })} placeholder="Describir las fuentes de ruido habituales en el establecimiento..." data-testid="input-condiciones-normales" />
              </div>
              <div>
                <label className="text-xs font-medium">Condiciones al Momento de la Medición</label>
                <Textarea className="mt-1 text-xs h-20" value={company.condicionesMedicion} onChange={e => setCompany({ condicionesMedicion: e.target.value })} placeholder="Describir las condiciones operativas durante la medición..." data-testid="input-condiciones-medicion" />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: Tabla de Mediciones ───────────────────────────────────────── */}
        {activeTab === "mediciones" && (
          <div className="bg-white rounded border shadow-sm">
            <div className="flex items-center justify-between p-3 border-b">
              <h3 className="text-xs font-bold text-[#003366] uppercase tracking-wide">
                Puntos de Medición — {rows.length} punto{rows.length !== 1 ? "s" : ""}
              </h3>
              <Button size="sm" onClick={addRow} className="h-7 text-xs bg-[#003366] hover:bg-[#004080]" data-testid="button-add-row">
                <Plus className="h-3 w-3 mr-1" /> Agregar punto
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white">
                    <th className="p-2 text-center font-semibold border-r border-blue-700 w-8">#</th>
                    <th className="p-2 text-left font-semibold border-r border-blue-700 min-w-[110px]">Sector</th>
                    <th className="p-2 text-left font-semibold border-r border-blue-700 min-w-[120px]">Puesto / Tipo</th>
                    <th className="p-2 text-center font-semibold border-r border-blue-700 min-w-[90px]">Tipo de Ruido</th>
                    <th className="p-2 text-center font-semibold border-r border-blue-700 w-16">Te (hs)</th>
                    <th className="p-2 text-center font-semibold border-r border-blue-700 w-16">T.Int (min)</th>
                    <th className="p-2 text-center font-semibold border-r border-blue-700 w-20">LAeq,Te dBA</th>
                    <th className="p-2 text-center font-semibold border-r border-blue-700 w-20">LC pico dBC</th>
                    <th className="p-2 text-center font-semibold border-r border-blue-700 w-20">Σ Ci/Ti</th>
                    <th className="p-2 text-center font-semibold border-r border-blue-700 w-16">Dosis %</th>
                    <th className="p-2 text-center font-semibold border-r border-blue-700 w-16">¿Cumple?</th>
                    <th className="p-2 text-left font-semibold border-r border-blue-700 min-w-[140px]">Observaciones</th>
                    <th className="p-2 text-center font-semibold w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const calc = calcRow(row);
                    const isImpulso = row.tipoRuido === "Impulso o Impacto";
                    const isMobile = row.esPuestoMovil;
                    const cumpleColor = calc.cumple === "SI" ? "text-green-700 bg-green-50" : calc.cumple === "NO" ? "text-red-700 bg-red-50" : "text-gray-500";
                    const rowBg = calc.cumple === "NO" ? "bg-red-50/40" : calc.cumple === "SI" ? "bg-green-50/20" : "";
                    return (
                      <tr key={row.id} className={`border-b hover:bg-blue-50/30 ${rowBg}`} data-testid={`row-noise-${row.id}`}>
                        <td className="p-1 text-center font-medium text-gray-500 border-r">{idx + 1}</td>
                        <td className="p-1 border-r">
                          <Input className="h-7 text-xs border-0 bg-transparent p-1 focus:bg-white focus:border focus:border-blue-300" value={row.sector} onChange={e => updateRow(row.id, "sector", e.target.value)} data-testid={`input-sector-${row.id}`} />
                        </td>
                        <td className="p-1 border-r">
                          <div className="space-y-0.5">
                            <Input className="h-7 text-xs border-0 bg-transparent p-1 focus:bg-white focus:border focus:border-blue-300" value={row.puestoTrabajo} onChange={e => updateRow(row.id, "puestoTrabajo", e.target.value)} placeholder="Puesto..." data-testid={`input-puesto-${row.id}`} />
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={row.esPuestoMovil} onChange={e => updateRow(row.id, "esPuestoMovil", e.target.checked)} className="w-3 h-3" data-testid={`check-movil-${row.id}`} />
                              <span className="text-[10px] text-gray-500">Puesto móvil</span>
                            </label>
                          </div>
                        </td>
                        <td className="p-1 border-r">
                          <Select value={row.tipoRuido} onValueChange={v => updateRow(row.id, "tipoRuido", v)}>
                            <SelectTrigger className="h-7 text-xs border-0 bg-transparent focus:bg-white focus:border focus:border-blue-300" data-testid={`select-tipo-${row.id}`}><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Continuo">Continuo</SelectItem>
                              <SelectItem value="Intermitente">Intermitente</SelectItem>
                              <SelectItem value="Impulso o Impacto">Impulso o Impacto</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-1 border-r">
                          <Input className="h-7 text-xs border-0 bg-transparent p-1 text-center focus:bg-white focus:border focus:border-blue-300" value={row.tiempoExposicion} onChange={e => updateRow(row.id, "tiempoExposicion", e.target.value)} placeholder="hs" data-testid={`input-te-${row.id}`} />
                        </td>
                        <td className="p-1 border-r">
                          <Input className="h-7 text-xs border-0 bg-transparent p-1 text-center focus:bg-white focus:border focus:border-blue-300" value={row.tiempoIntegracion} onChange={e => updateRow(row.id, "tiempoIntegracion", e.target.value)} placeholder="min" data-testid={`input-tint-${row.id}`} />
                        </td>
                        <td className="p-1 border-r">
                          {isImpulso || isMobile ? (
                            <span className="block text-center text-gray-400">—</span>
                          ) : (
                            <Input className="h-7 text-xs border-0 bg-transparent p-1 text-center focus:bg-white focus:border focus:border-blue-300" value={row.laeqTe} onChange={e => updateRow(row.id, "laeqTe", e.target.value)} placeholder="dBA" data-testid={`input-laeq-${row.id}`} />
                          )}
                        </td>
                        <td className="p-1 border-r">
                          {isImpulso ? (
                            <Input className="h-7 text-xs border-0 bg-transparent p-1 text-center focus:bg-white focus:border focus:border-blue-300" value={row.lcPicoDbc} onChange={e => updateRow(row.id, "lcPicoDbc", e.target.value)} placeholder="dBC" data-testid={`input-lc-${row.id}`} />
                          ) : (
                            <span className="block text-center text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-1 border-r text-center">
                          {isImpulso || isMobile ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            <span className={`font-medium ${calc.fraccion !== null && calc.fraccion >= 1 ? "text-red-600" : "text-gray-700"}`}>
                              {calc.fraccion !== null ? calc.fraccion.toFixed(3) : "—"}
                            </span>
                          )}
                        </td>
                        <td className="p-1 border-r">
                          {isMobile ? (
                            <Input className="h-7 text-xs border-0 bg-transparent p-1 text-center focus:bg-white focus:border focus:border-blue-300" value={row.dosis} onChange={e => updateRow(row.id, "dosis", e.target.value)} placeholder="%" data-testid={`input-dosis-${row.id}`} />
                          ) : (
                            <span className="block text-center text-gray-400">—</span>
                          )}
                        </td>
                        <td className={`p-1 border-r text-center font-bold text-xs ${cumpleColor}`}>
                          {calc.cumple}
                        </td>
                        <td className="p-1 border-r">
                          <Input className="h-7 text-xs border-0 bg-transparent p-1 focus:bg-white focus:border focus:border-blue-300" value={row.observaciones} onChange={e => updateRow(row.id, "observaciones", e.target.value)} data-testid={`input-obs-${row.id}`} />
                        </td>
                        <td className="p-1 text-center">
                          <Button variant="ghost" size="sm" onClick={() => deleteRow(row.id)} className="h-6 w-6 p-0 text-red-400 hover:text-red-600 hover:bg-red-50" disabled={rows.length <= 1} data-testid={`button-delete-${row.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t bg-gray-50 flex items-center gap-4 text-xs">
              <span className="text-gray-500">
                Σ fracciones (puestos fijos):
                <span className={`ml-1 font-bold ${totalFraccion >= 1 ? "text-red-600" : "text-green-700"}`}>
                  {totalFraccion.toFixed(3)}
                </span>
                {totalFraccion >= 1 && <span className="ml-2 text-red-600 font-semibold">⚠ SUPERA EL LÍMITE</span>}
                {totalFraccion > 0 && totalFraccion < 1 && <span className="ml-2 text-green-600">✓ CUMPLE</span>}
              </span>
            </div>
          </div>
        )}

        {/* ── TAB 3: Cálculos ───────────────────────────────────────────────────── */}
        {activeTab === "calculos" && (
          <div className="space-y-4">
            {/* Puestos fijos */}
            <div className="bg-white rounded border shadow-sm">
              <div className="p-3 border-b bg-[#003366]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wide">Cálculo de Fracciones — Puestos Fijos (Sonómetro)</h3>
                <p className="text-[10px] text-blue-200 mt-0.5">Fracción = Te (min) / T permitido (min) según Anexo V Resol. 295/03</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="p-2 border-r text-center w-8">#</th>
                      <th className="p-2 border-r text-left">Sector / Puesto</th>
                      <th className="p-2 border-r text-center">Tipo</th>
                      <th className="p-2 border-r text-center">LAeq,Te (dBA)</th>
                      <th className="p-2 border-r text-center">Te ingresado (hs)</th>
                      <th className="p-2 border-r text-center">Te (min)</th>
                      <th className="p-2 border-r text-center">T permitido (min)</th>
                      <th className="p-2 border-r text-center font-bold">Fracción Ci/Ti</th>
                      <th className="p-2 text-center">¿Cumple?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter(r => !r.esPuestoMovil && r.tipoRuido !== "Impulso o Impacto").map((row, idx) => {
                      const c = calcRow(row);
                      const cumpleColor = c.cumple === "SI" ? "text-green-700 bg-green-50" : c.cumple === "NO" ? "text-red-700 bg-red-50" : "";
                      return (
                        <tr key={row.id} className="border-b hover:bg-gray-50" data-testid={`calc-row-${row.id}`}>
                          <td className="p-2 border-r text-center text-gray-400">{idx + 1}</td>
                          <td className="p-2 border-r font-medium">{row.sector} / {row.puestoTrabajo}</td>
                          <td className="p-2 border-r text-center">{row.tipoRuido}</td>
                          <td className="p-2 border-r text-center">{row.laeqTe || "—"}</td>
                          <td className="p-2 border-r text-center">{row.tiempoExposicion || "—"}</td>
                          <td className="p-2 border-r text-center">{c.teMin !== null ? c.teMin.toFixed(1) : "—"}</td>
                          <td className="p-2 border-r text-center">{c.tPermMin !== null ? c.tPermMin.toFixed(2) : "—"}</td>
                          <td className={`p-2 border-r text-center font-bold ${c.fraccion !== null && c.fraccion >= 1 ? "text-red-600" : "text-gray-800"}`}>
                            {c.fraccion !== null ? c.fraccion.toFixed(4) : "—"}
                          </td>
                          <td className={`p-2 text-center font-bold ${cumpleColor}`}>{c.cumple}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={`border-t-2 font-bold ${totalFraccion >= 1 ? "bg-red-50" : "bg-green-50"}`}>
                      <td colSpan={7} className="p-2 text-right text-sm">Suma total de fracciones Σ Ci/Ti =</td>
                      <td className={`p-2 text-center text-sm ${totalFraccion >= 1 ? "text-red-700" : "text-green-700"}`}>{totalFraccion.toFixed(4)}</td>
                      <td className={`p-2 text-center text-sm ${totalFraccion >= 1 ? "text-red-700" : "text-green-700"}`}>{fixedRows.length > 0 ? (totalFraccion < 1 ? "CUMPLE" : "NO CUMPLE") : "—"}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Puntos impulso */}
            {rows.some(r => r.tipoRuido === "Impulso o Impacto") && (
              <div className="bg-white rounded border shadow-sm">
                <div className="p-3 border-b bg-[#003366]">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wide">Ruido de Impulso o Impacto</h3>
                  <p className="text-[10px] text-blue-200 mt-0.5">Límite: LC pico &lt; 140 dBC (Resol. MTEySS 295/03)</p>
                </div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="p-2 border-r text-center w-8">#</th>
                      <th className="p-2 border-r text-left">Sector / Puesto</th>
                      <th className="p-2 border-r text-center">LC pico medido (dBC)</th>
                      <th className="p-2 border-r text-center">Límite permisible</th>
                      <th className="p-2 text-center">¿Cumple?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter(r => r.tipoRuido === "Impulso o Impacto").map((row, idx) => {
                      const c = calcRow(row);
                      return (
                        <tr key={row.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 border-r text-center text-gray-400">{idx + 1}</td>
                          <td className="p-2 border-r font-medium">{row.sector} / {row.puestoTrabajo}</td>
                          <td className="p-2 border-r text-center font-bold">{row.lcPicoDbc || "—"}</td>
                          <td className="p-2 border-r text-center">140 dBC</td>
                          <td className={`p-2 text-center font-bold ${c.cumple === "SI" ? "text-green-700 bg-green-50" : c.cumple === "NO" ? "text-red-700 bg-red-50" : ""}`}>{c.cumple}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Puestos móviles */}
            {rows.some(r => r.esPuestoMovil) && (
              <div className="bg-white rounded border shadow-sm">
                <div className="p-3 border-b bg-[#003366]">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wide">Puestos Móviles — Dosimetría</h3>
                  <p className="text-[10px] text-blue-200 mt-0.5">Dosis proyectada = (Dosis medida × Tiempo total jornada) / Tiempo de medición</p>
                </div>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-100 text-gray-700">
                      <th className="p-2 border-r text-center w-8">#</th>
                      <th className="p-2 border-r text-left">Sector / Puesto</th>
                      <th className="p-2 border-r text-center">Te total jornada (min)</th>
                      <th className="p-2 border-r text-center">T medición (min)</th>
                      <th className="p-2 border-r text-center">Dosis medida %</th>
                      <th className="p-2 border-r text-center">Dosis proyectada %</th>
                      <th className="p-2 text-center">¿Cumple?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter(r => r.esPuestoMovil).map((row, idx) => {
                      const c = calcRow(row);
                      const teMin = parseFloat(row.tiempoExposicion) * 60;
                      const tIntMin = parseFloat(row.tiempoIntegracion);
                      const dosisMed = parseFloat(row.dosis);
                      const dosisProyectada = (!isNaN(dosisMed) && !isNaN(teMin) && !isNaN(tIntMin) && tIntMin > 0)
                        ? (dosisMed * teMin) / tIntMin : null;
                      return (
                        <tr key={row.id} className="border-b hover:bg-gray-50">
                          <td className="p-2 border-r text-center text-gray-400">{idx + 1}</td>
                          <td className="p-2 border-r font-medium">{row.sector} / {row.puestoTrabajo}</td>
                          <td className="p-2 border-r text-center">{!isNaN(teMin) ? teMin.toFixed(0) : "—"}</td>
                          <td className="p-2 border-r text-center">{row.tiempoIntegracion || "—"}</td>
                          <td className="p-2 border-r text-center font-bold">{row.dosis ? `${row.dosis}%` : "—"}</td>
                          <td className={`p-2 border-r text-center font-bold ${dosisProyectada !== null && dosisProyectada >= 100 ? "text-red-600" : "text-gray-800"}`}>
                            {dosisProyectada !== null ? `${dosisProyectada.toFixed(1)}%` : "—"}
                          </td>
                          <td className={`p-2 text-center font-bold ${c.cumple === "SI" ? "text-green-700 bg-green-50" : c.cumple === "NO" ? "text-red-700 bg-red-50" : ""}`}>{c.cumple}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: Valores de Referencia ─────────────────────────────────────── */}
        {activeTab === "referencia" && (
          <div className="space-y-4">
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-1">Valores Límite de Exposición al Ruido</h3>
              <p className="text-xs text-gray-500 mb-3">Anexo V, Resolución MTEySS N° 295/2003 — Tabla de tiempos máximos de exposición</p>
              <table className="w-full max-w-sm text-sm border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white">
                    <th className="p-2 border text-center">Duración por día</th>
                    <th className="p-2 border text-center">Nivel de Presión Acústica (dBA)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["24 horas", "80"], ["16 horas", "82"], ["8 horas", "85"], ["4 horas", "88"],
                    ["2 horas", "91"], ["1 hora", "94"], ["30 minutos", "97"], ["15 minutos", "100"],
                    ["7,5 minutos", "103"], ["3,75 minutos", "106"],
                  ].map(([dur, nivel], i) => (
                    <tr key={i} className={`border-b ${i % 2 === 0 ? "bg-gray-50" : "bg-white"} hover:bg-blue-50/30`}>
                      <td className="p-2 border text-center">{dur}</td>
                      <td className="p-2 border text-center font-bold text-[#003366]">{nivel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-1">Ruido de Impulso o Impacto</h3>
              <p className="text-xs text-gray-600">El nivel de presión acústica de pico ponderado C (LC pico) no debe superar los <strong>140 dBC</strong>.</p>
              <p className="text-xs text-gray-500 mt-2">Fuente: Resolución MTEySS N° 295/2003, Capítulo 13 — Ruido y Vibraciones.</p>
            </div>

            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-1">Fórmula de Cálculo de Fracción</h3>
              <div className="bg-gray-50 p-3 rounded font-mono text-sm">
                <p>Ci/Ti = Te (min) / T_permitido (min)</p>
                <p className="mt-1">T_permitido = 480 / 2^((LAeq − 85) / 3)</p>
              </div>
              <p className="text-xs text-gray-500 mt-2">La suma de fracciones Σ Ci/Ti no debe superar 1 (equivalente a dosis del 100%).</p>
            </div>

            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-1">Marco Legal</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• <strong>Resolución SRT N° 85/2012</strong> — Protocolo para la Medición del Nivel de Ruido en el Ambiente Laboral.</li>
                <li>• <strong>Resolución MTEySS N° 295/2003</strong>, Anexo V — Agentes Físicos: Ruido.</li>
                <li>• <strong>Ley 19.587</strong> — Higiene y Seguridad en el Trabajo.</li>
                <li>• <strong>Decreto 351/79</strong> — Reglamentación de la Ley 19.587, Anexo V.</li>
              </ul>
            </div>
          </div>
        )}

        {/* ── TAB 5: Conclusiones ──────────────────────────────────────────────── */}
        {activeTab === "conclusiones" && (
          <div className="space-y-4">
            {/* Resumen por puesto */}
            <div className="bg-white rounded border shadow-sm">
              <div className="p-3 border-b">
                <h3 className="text-xs font-bold text-[#003366] uppercase tracking-wide">Resumen de Cumplimiento por Puesto</h3>
              </div>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 text-gray-700">
                    <th className="p-2 border-r text-center w-8">#</th>
                    <th className="p-2 border-r text-left">Sector</th>
                    <th className="p-2 border-r text-left">Puesto</th>
                    <th className="p-2 border-r text-center">Tipo Ruido</th>
                    <th className="p-2 border-r text-center">Valor medido</th>
                    <th className="p-2 border-r text-center">Indicador</th>
                    <th className="p-2 text-center">¿Cumple?</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const c = calcRow(row);
                    const isImpulso = row.tipoRuido === "Impulso o Impacto";
                    const isMobile = row.esPuestoMovil;
                    const valorMedido = isImpulso ? `${row.lcPicoDbc} dBC` : isMobile ? `Dosis ${row.dosis}%` : `${row.laeqTe} dBA`;
                    const indicador = isImpulso ? "LC pico < 140 dBC" : isMobile ? "Dosis < 100%" : `Σ Ci/Ti = ${c.fraccion !== null ? c.fraccion.toFixed(3) : "—"}`;
                    return (
                      <tr key={row.id} className={`border-b ${c.cumple === "NO" ? "bg-red-50/50" : c.cumple === "SI" ? "bg-green-50/30" : ""}`} data-testid={`summary-row-${row.id}`}>
                        <td className="p-2 border-r text-center text-gray-400">{idx + 1}</td>
                        <td className="p-2 border-r font-medium">{row.sector}</td>
                        <td className="p-2 border-r">{row.puestoTrabajo}{isMobile && " (Móvil)"}</td>
                        <td className="p-2 border-r text-center">{row.tipoRuido}</td>
                        <td className="p-2 border-r text-center">{valorMedido || "—"}</td>
                        <td className="p-2 border-r text-center text-gray-500">{indicador}</td>
                        <td className={`p-2 text-center font-bold ${c.cumple === "SI" ? "text-green-700" : c.cumple === "NO" ? "text-red-700" : "text-gray-400"}`}>{c.cumple}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Conclusiones textarea */}
            <div className="bg-white rounded border shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#003366] uppercase tracking-wide">Conclusiones</label>
                <Button size="sm" variant="outline" onClick={() => generateAI("conclusiones")} disabled={generatingField === "conclusiones"} className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50" data-testid="button-ai-conclusiones">
                  {generatingField === "conclusiones" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  {generatingField === "conclusiones" ? "Generando..." : "Generar con IA"}
                </Button>
              </div>
              <Textarea className="text-xs h-36 resize-none" value={conclusiones} onChange={e => _updateNoiseText("conclusiones", e.target.value)} placeholder="Redacte las conclusiones del informe de ruido..." data-testid="textarea-conclusiones" />
            </div>

            {/* Recomendaciones textarea */}
            <div className="bg-white rounded border shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-[#003366] uppercase tracking-wide">Recomendaciones</label>
                <Button size="sm" variant="outline" onClick={() => generateAI("recomendaciones")} disabled={generatingField === "recomendaciones"} className="h-7 text-xs border-blue-300 text-blue-700 hover:bg-blue-50" data-testid="button-ai-recomendaciones">
                  {generatingField === "recomendaciones" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  {generatingField === "recomendaciones" ? "Generando..." : "Generar con IA"}
                </Button>
              </div>
              <Textarea className="text-xs h-36 resize-none" value={recomendaciones} onChange={e => _updateNoiseText("recomendaciones", e.target.value)} placeholder="Redacte las recomendaciones de control del ruido..." data-testid="textarea-recomendaciones" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
