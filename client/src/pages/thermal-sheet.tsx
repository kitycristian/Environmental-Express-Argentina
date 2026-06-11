import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Trash2, FileDown, AlertTriangle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useStore, ThermalRow } from "@/lib/store";
// @ts-ignore
import { Document, Packer, Paragraph, TextRun, Table, TableRow as DocxRow, TableCell, WidthType, AlignmentType, Header, Footer } from "docx";
// @ts-ignore
import { saveAs } from "file-saver";

// ─── Constants ────────────────────────────────────────────────────────────────
const VAR_OPTIONS = [
  { label: "Ropa de trabajo (pantalón + camisa algodón manga larga)", value: "0" },
  { label: "Overol tejido", value: "0b" },
  { label: "Overol polipropileno SMS", value: "0.5" },
  { label: "Overol poliolefina", value: "1" },
  { label: "Ropa doble capa", value: "3" },
  { label: "Overol barrera de vapor", value: "11" },
];
const VAR_NUMERIC: Record<string, number> = {
  "0": 0, "0b": 0, "0.5": 0.5, "1": 1, "3": 3, "11": 11,
};

const POSTURA_OPTIONS = [
  { label: "Sentado",           value: "Sentado",          sup: 0  },
  { label: "De rodillas",       value: "De rodillas",       sup: 18 },
  { label: "En cuclillas",      value: "En cuclillas",      sup: 18 },
  { label: "De pie",            value: "De pie",            sup: 27 },
  { label: "De pie e inclinado",value: "De pie e inclinado",sup: 36 },
];

const CUERPO_OPTIONS = ["Ambas manos", "Un brazo", "Ambos brazos", "Cuerpo entero"];
const INTENSIDAD_OPTIONS: ("Ligera" | "Moderada" | "Pesada")[] = ["Ligera", "Moderada", "Pesada"];

const TM_MATRIX: Record<string, Record<string, number>> = {
  "Ambas manos":   { Ligera: 15,  Moderada: 30,  Pesada: 40  },
  "Un brazo":      { Ligera: 35,  Moderada: 55,  Pesada: 75  },
  "Ambos brazos":  { Ligera: 65,  Moderada: 100, Pesada: 130 },
  "Cuerpo entero": { Ligera: 105, Moderada: 170, Pesada: 255 },
};

const FACTORES_OPTIONS = [
  "Gasto Energético",
  "Temperatura de Aire",
  "Humedad del Aire",
  "Movimiento del Aire",
  "Intercambio calor radiante",
  "Producto Terminado Caliente",
  "Operación de Horno",
  "Requisito de la Ropa",
];

type TabKey = "general" | "mediciones" | "fichas" | "conclusiones";

// ─── Helper components ─────────────────────────────────────────────────────────
const Section = ({ title }: { title: string }) => (
  <h3 className="text-[11px] font-bold text-primary/80 uppercase tracking-wide border-b border-primary/15 pb-1 mb-3 mt-5 first:mt-0">
    {title}
  </h3>
);

const Field = ({
  label, children, span = 1,
}: { label: string; children: React.ReactNode; span?: number }) => (
  <div className={span === 2 ? "col-span-2" : ""}>
    <label className="text-[11px] font-medium text-muted-foreground block mb-1">{label}</label>
    {children}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────
export default function ThermalSheet() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const thermalProtocol = useStore((s) => s.thermalProtocol);
  const updateThermalRow  = useStore((s) => s.updateThermalRow);
  const addThermalRow     = useStore((s) => s.addThermalRow);
  const deleteThermalRow  = useStore((s) => s.deleteThermalRow);
  const updateThermalCompany = useStore((s) => s.updateThermalCompany);
  const updateThermalText    = useStore((s) => s.updateThermalText);
  const establishment        = useStore((s) => s.establishment);

  const rows          = thermalProtocol.rows;
  const company       = thermalProtocol.company;
  const observaciones = thermalProtocol.observaciones;
  const conclusiones  = thermalProtocol.conclusiones;
  const recomendaciones = thermalProtocol.recomendaciones;

  const [activeTab, setActiveTab]     = useState<TabKey>("general");
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [generatingAI, setGeneratingAI] = useState<"conclusiones" | "recomendaciones" | null>(null);

  const setComp = (data: Partial<typeof company>) => updateThermalCompany(data);

  // ── Cascading calculations ─────────────────────────────────────────────────
  const calcAndUpdate = (id: string, updates: Partial<ThermalRow>) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const m = { ...row, ...updates };

    // TGBH sin ponderar = 0.7 × TBH + 0.3 × TG
    const tbhV = parseFloat(m.tbh);
    const tgV  = parseFloat(m.tg);
    if (!isNaN(tbhV) && !isNaN(tgV)) {
      m.tgbhSinPonderar = (0.7 * tbhV + 0.3 * tgV).toFixed(1);
    }

    // TGBH ponderado = TGBH sin pond. + VAR
    const tgbhSP = parseFloat(m.tgbhSinPonderar);
    const varNum = VAR_NUMERIC[m.varUniforme] ?? 0;
    if (!isNaN(tgbhSP)) {
      m.tgbhPonderado = (tgbhSP + varNum).toFixed(1);
    }

    // TM total = tmSentado + suplementoTM
    const tmBase = parseFloat(m.tmSentado) || 0;
    const sup    = parseFloat(m.suplementoTM) || 0;
    if (tmBase > 0) m.cargaMetabolica = String(tmBase + sup);

    // Compliance
    const tgbhP = parseFloat(m.tgbhPonderado);
    const vla   = parseFloat(m.vla);
    const vlp   = parseFloat(m.vlp);
    if (!isNaN(tgbhP) && !isNaN(vla)) m.cumpleVla = tgbhP <= vla ? "SI" : "NO";
    if (!isNaN(tgbhP) && !isNaN(vlp)) m.cumpleVlp = tgbhP <= vlp ? "SI" : "NO";

    updateThermalRow(id, m);
  };

  const updateTM = (id: string, postura: string, parte: string, intensidad: string) => {
    const posturaOpt = POSTURA_OPTIONS.find((p) => p.value === postura);
    const sup    = posturaOpt?.sup ?? 0;
    const tmBase = TM_MATRIX[parte]?.[intensidad] ?? 0;
    calcAndUpdate(id, {
      posturaSeleccionada: postura,
      parteDelCuerpo: parte,
      intensidadTrabajo: intensidad,
      tmSentado: String(tmBase),
      suplementoTM: String(sup),
    });
  };

  const toggleFactor = (id: string, factor: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    const curr = row.factoresExposicion || [];
    updateThermalRow(id, {
      factoresExposicion: curr.includes(factor)
        ? curr.filter((f) => f !== factor)
        : [...curr, factor],
    });
  };

  const toggleExpand = (id: string) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── VLA alert ─────────────────────────────────────────────────────────────
  const vlaAlerts = rows.filter((r) => {
    const tm   = parseFloat(r.cargaMetabolica);
    const tgbh = parseFloat(r.tgbhPonderado);
    return !isNaN(tm) && !isNaN(tgbh) && tm >= 252 && tgbh > 26;
  });

  // ── AI generation ─────────────────────────────────────────────────────────
  const generateAI = async (field: "conclusiones" | "recomendaciones") => {
    setGeneratingAI(field);
    try {
      const summary = rows
        .map(
          (r, i) =>
            `Puesto ${i + 1}: ${r.puestoTrabajo} (${r.sector}) — TGBHp: ${r.tgbhPonderado}°C, TM: ${r.cargaMetabolica}W, VLA: ${r.vla}, VLP: ${r.vlp}, ¿<VLA?: ${r.cumpleVla}, ¿<VLP?: ${r.cumpleVlp}`
        )
        .join("\n");
      const res = await fetch("/api/thermal/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, summary, empresa: company.razonSocial }),
      });
      if (!res.ok) throw new Error();
      const { text } = await res.json();
      updateThermalText(field, text);
      toast({ title: "Texto generado con IA" });
    } catch {
      toast({ title: "Error", description: "No se pudo generar el texto", variant: "destructive" });
    } finally {
      setGeneratingAI(null);
    }
  };

  // ── DOCX export ───────────────────────────────────────────────────────────
  const downloadDOCX = async () => {
    if (!company.razonSocial.trim()) {
      toast({ title: "Datos incompletos", description: "Complete la razón social primero.", variant: "destructive" });
      return;
    }
    try {
      const children: any[] = [];
      const heading = (text: string, lvl = 1) =>
        new Paragraph({
          children: [new TextRun({ text, bold: true, font: "Arial", size: lvl === 1 ? 28 : 22, color: "003366" })],
          spacing: { before: 200, after: 100 },
          alignment: AlignmentType.LEFT,
        });
      const lv = (label: string, value: string) =>
        new Paragraph({
          children: [
            new TextRun({ text: `${label}: `, bold: true, font: "Arial", size: 20 }),
            new TextRun({ text: value, font: "Arial", size: 20 }),
          ],
          spacing: { after: 40 },
        });
      const cell = (text: string, bold = false, opts: any = {}) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold, font: "Arial", size: 14, color: opts.color })], alignment: opts.align || AlignmentType.CENTER })],
          shading: opts.shading,
          margins: { top: 30, bottom: 30, left: 50, right: 50 },
        });

      children.push(new Paragraph({ children: [new TextRun({ text: "INFORME DE MEDICIÓN DE CARGA TÉRMICA EN EL AMBIENTE LABORAL", bold: true, font: "Arial", size: 28, color: "003366" })], alignment: AlignmentType.CENTER, spacing: { after: 100 } }));
      children.push(new Paragraph({ children: [new TextRun({ text: "Resolución SRT N° 30/2023", font: "Arial", size: 20, color: "666666" })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }));

      children.push(heading("Datos del Establecimiento"));
      children.push(lv("Razón Social", company.razonSocial));
      children.push(lv("Dirección", company.direccion));
      children.push(lv("Localidad", `${company.localidad} — ${company.provincia} — C.P.: ${company.cp}`));
      children.push(lv("C.U.I.T.", company.cuit));
      children.push(lv("Fecha de Medición", `${company.fechaMedicion}  |  ${company.horaInicio} - ${company.horaFin}`));
      children.push(lv("Turnos Habituales", company.turnos));

      children.push(heading("Instrumental Utilizado"));
      const inst1 = `${company.instrumento1Marca} ${company.instrumento1Modelo}`.trim();
      if (inst1) {
        children.push(lv("Instrumento 1", inst1));
        children.push(lv("N° Serie", company.instrumento1Serie));
        children.push(lv("Certificado de Calibración", `${company.instrumento1Cert}  |  Fecha: ${company.instrumento1FechaCal}`));
      }
      const inst2 = `${company.instrumento2Marca} ${company.instrumento2Modelo}`.trim();
      if (inst2) {
        children.push(lv("Instrumento 2", inst2));
        children.push(lv("N° Serie", company.instrumento2Serie));
        children.push(lv("Certificado de Calibración", `${company.instrumento2Cert}  |  Fecha: ${company.instrumento2FechaCal}`));
      }
      children.push(lv("Condiciones Atmosféricas", `Temp. ext.: ${company.tempExterior}°C  |  Humedad: ${company.humedad}%  |  Presión: ${company.presionAtm} mmHg`));
      if (company.condicionesNormales) children.push(lv("Condiciones Normales", company.condicionesNormales));
      if (company.condicionesMedicion) children.push(lv("Condiciones de Medición", company.condicionesMedicion));

      children.push(heading("Datos de Medición"));
      const hdrCells = ["Pto", "Sector", "Puesto", "Exp.(h)", "TBS(°C)", "TBH(°C)", "TG(°C)", "TGBH s/p", "VAR", "TGBHp", "Aclim.", "TM(W)", "VLA", "VLP", "¿<VLA?", "¿<VLP?"];
      const hdrRow = new DocxRow({ children: hdrCells.map((h) => cell(h, true, { shading: { fill: "003366" }, color: "FFFFFF" })), tableHeader: true });
      const dataRows = rows.map((r, i) =>
        new DocxRow({
          children: [
            cell(String(i + 1).padStart(2, "0")),
            cell(r.sector, false, { align: AlignmentType.LEFT }),
            cell(r.puestoTrabajo, false, { align: AlignmentType.LEFT }),
            cell(r.exposicionHs), cell(r.tbs), cell(r.tbh), cell(r.tg),
            cell(r.tgbhSinPonderar),
            cell(String(VAR_NUMERIC[r.varUniforme] ?? 0)),
            cell(r.tgbhPonderado), cell(r.aclimatado), cell(r.cargaMetabolica),
            cell(r.vla), cell(r.vlp),
            cell(r.cumpleVla, true, { color: r.cumpleVla === "SI" ? "008000" : "CC0000" }),
            cell(r.cumpleVlp, true, { color: r.cumpleVlp === "SI" ? "008000" : "CC0000" }),
          ],
        })
      );
      children.push(new Table({ rows: [hdrRow, ...dataRows], width: { size: 100, type: WidthType.PERCENTAGE } }));

      if (observaciones) {
        children.push(heading("Información Adicional"));
        children.push(new Paragraph({ children: [new TextRun({ text: observaciones, font: "Arial", size: 18 })], spacing: { after: 100 } }));
      }
      if (conclusiones) {
        children.push(heading("Conclusiones"));
        children.push(new Paragraph({ children: [new TextRun({ text: conclusiones, font: "Arial", size: 18 })], spacing: { after: 100 } }));
      }
      if (recomendaciones) {
        children.push(heading("Recomendaciones"));
        children.push(new Paragraph({ children: [new TextRun({ text: recomendaciones, font: "Arial", size: 18 })], spacing: { after: 100 } }));
      }

      const docFile = new Document({
        sections: [{
          properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
          headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: `${company.razonSocial} — Carga Térmica`, italics: true, size: 16, color: "999999" })], alignment: AlignmentType.RIGHT })] }) },
          footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "Environmental Express Argentina — Informe de Carga Térmica — Res. SRT 30/2023", size: 14, color: "999999" })], alignment: AlignmentType.CENTER })] }) },
          children,
        }],
      });
      const blob = await Packer.toBlob(docFile);
      saveAs(blob, `Carga_Termica_${company.razonSocial.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.docx`);
      toast({ title: "DOCX generado" });
    } catch {
      toast({ title: "Error", description: "No se pudo generar el DOCX", variant: "destructive" });
    }
  };

  const downloadPDF = () => {
    if (!company.razonSocial.trim()) {
      toast({ title: "Datos incompletos", description: "Complete la razón social primero.", variant: "destructive" });
      return;
    }
    const prevTitle = document.title;
    document.title = `Carga_Termica_${company.razonSocial.substring(0, 30)}`;
    window.print();
    document.title = prevTitle;
  };

  const isMissingCert = !company.instrumento1Cert.trim() || !company.instrumento1FechaCal.trim();

  const TABS: { key: TabKey; label: string }[] = [
    { key: "general",     label: "1. Datos Generales" },
    { key: "mediciones",  label: "2. Tabla de Mediciones" },
    { key: "fichas",      label: "3. Ficha por Puesto" },
    { key: "conclusiones",label: "4. Conclusiones" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/nueva-inspeccion")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <div>
            <div className="text-[10px] text-muted-foreground leading-none">Resolución SRT N° 30/2023</div>
            <div className="text-[13px] font-bold text-primary leading-tight">PROTOCOLO DE CARGA TÉRMICA</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={downloadPDF} data-testid="button-export-pdf">
            <FileDown className="h-3.5 w-3.5 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={downloadDOCX} data-testid="button-export-docx">
            <FileDown className="h-3.5 w-3.5 mr-1" /> DOCX
          </Button>
        </div>
      </div>

      {/* ── VLA alert banner ── */}
      {vlaAlerts.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-[12px] text-amber-800">
            <strong>ALERTA VLA:</strong> {vlaAlerts.length} puesto(s) con TM ≥ 252 W y TGBHp &gt; 26°C superan el Valor Límite de Acción:{" "}
            {vlaAlerts.map((r) => r.puestoTrabajo || r.sector).filter(Boolean).join(", ")}
          </p>
        </div>
      )}

      {/* ── Tab navigation ── */}
      <div className="bg-white border-b px-4 flex gap-0.5">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-[12px] font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            }`}
            data-testid={`tab-${tab.key}`}
          >
            {tab.label}
            {tab.key === "general" && isMissingCert && (
              <span className="ml-1.5 text-red-500">⚠</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 overflow-auto p-4 max-w-5xl mx-auto w-full">

        {/* ════════════════════════════════════════════════════════
            TAB 1 — Datos Generales
        ════════════════════════════════════════════════════════ */}
        {activeTab === "general" && (
          <div className="bg-white rounded-lg border shadow-sm p-5">
            <Section title="Establecimiento" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Razón Social">
                <Input className="h-8 text-xs" value={company.razonSocial || establishment.razonSocial} onChange={(e) => setComp({ razonSocial: e.target.value })} data-testid="input-razon-social" />
              </Field>
              <Field label="C.U.I.T.">
                <Input className="h-8 text-xs" value={company.cuit || establishment.cuit} onChange={(e) => setComp({ cuit: e.target.value })} data-testid="input-cuit" />
              </Field>
              <Field label="Dirección" span={2}>
                <Input className="h-8 text-xs" value={company.direccion || establishment.address} onChange={(e) => setComp({ direccion: e.target.value })} data-testid="input-direccion" />
              </Field>
              <Field label="Localidad">
                <Input className="h-8 text-xs" value={company.localidad} onChange={(e) => setComp({ localidad: e.target.value })} data-testid="input-localidad" />
              </Field>
              <Field label="Provincia">
                <Input className="h-8 text-xs" value={company.provincia} onChange={(e) => setComp({ provincia: e.target.value })} data-testid="input-provincia" />
              </Field>
              <Field label="Código Postal">
                <Input className="h-8 text-xs" value={company.cp} onChange={(e) => setComp({ cp: e.target.value })} data-testid="input-cp" />
              </Field>
            </div>

            <Section title="Fecha y Horario" />
            <div className="grid grid-cols-4 gap-x-4 gap-y-3">
              <Field label="Fecha de Medición">
                <Input className="h-8 text-xs" value={company.fechaMedicion} onChange={(e) => setComp({ fechaMedicion: e.target.value })} data-testid="input-fecha" />
              </Field>
              <Field label="Hora Inicio">
                <Input className="h-8 text-xs" placeholder="HH:MM" value={company.horaInicio} onChange={(e) => setComp({ horaInicio: e.target.value })} data-testid="input-hora-inicio" />
              </Field>
              <Field label="Hora Fin">
                <Input className="h-8 text-xs" placeholder="HH:MM" value={company.horaFin} onChange={(e) => setComp({ horaFin: e.target.value })} data-testid="input-hora-fin" />
              </Field>
              <Field label="Turnos Habituales">
                <Input className="h-8 text-xs" value={company.turnos} onChange={(e) => setComp({ turnos: e.target.value })} data-testid="input-turnos" />
              </Field>
            </div>

            <Section title="Instrumento 1 — Monitor de Carga Térmica" />
            {isMissingCert && (
              <div className="mb-3 flex items-center gap-1.5 text-[11px] text-red-600 font-medium bg-red-50 border border-red-200 rounded px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                Complete el N° de certificado y fecha de calibración antes de exportar el informe.
              </div>
            )}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Marca / Fabricante">
                <Input className="h-8 text-xs" value={company.instrumento1Marca} onChange={(e) => setComp({ instrumento1Marca: e.target.value })} data-testid="input-inst1-marca" />
              </Field>
              <Field label="Modelo">
                <Input className="h-8 text-xs" value={company.instrumento1Modelo} onChange={(e) => setComp({ instrumento1Modelo: e.target.value })} data-testid="input-inst1-modelo" />
              </Field>
              <Field label="N° de Serie">
                <Input className="h-8 text-xs" value={company.instrumento1Serie} onChange={(e) => setComp({ instrumento1Serie: e.target.value })} data-testid="input-inst1-serie" />
              </Field>
              <Field label={!company.instrumento1Cert.trim() ? "N° Certificado de Calibración ⚠" : "N° Certificado de Calibración"}>
                <Input className={`h-8 text-xs ${!company.instrumento1Cert.trim() ? "border-red-400 focus:border-red-500" : ""}`} value={company.instrumento1Cert} onChange={(e) => setComp({ instrumento1Cert: e.target.value })} data-testid="input-inst1-cert" />
              </Field>
              <Field label={!company.instrumento1FechaCal.trim() ? "Fecha de Calibración ⚠" : "Fecha de Calibración"}>
                <Input className={`h-8 text-xs ${!company.instrumento1FechaCal.trim() ? "border-red-400 focus:border-red-500" : ""}`} value={company.instrumento1FechaCal} onChange={(e) => setComp({ instrumento1FechaCal: e.target.value })} data-testid="input-inst1-fecha-cal" />
              </Field>
            </div>

            <Section title="Instrumento 2 — Termohigrobárómetro (opcional)" />
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Field label="Marca / Fabricante">
                <Input className="h-8 text-xs" value={company.instrumento2Marca} onChange={(e) => setComp({ instrumento2Marca: e.target.value })} data-testid="input-inst2-marca" />
              </Field>
              <Field label="Modelo">
                <Input className="h-8 text-xs" value={company.instrumento2Modelo} onChange={(e) => setComp({ instrumento2Modelo: e.target.value })} data-testid="input-inst2-modelo" />
              </Field>
              <Field label="N° de Serie">
                <Input className="h-8 text-xs" value={company.instrumento2Serie} onChange={(e) => setComp({ instrumento2Serie: e.target.value })} data-testid="input-inst2-serie" />
              </Field>
              <Field label="N° Certificado de Calibración">
                <Input className="h-8 text-xs" value={company.instrumento2Cert} onChange={(e) => setComp({ instrumento2Cert: e.target.value })} data-testid="input-inst2-cert" />
              </Field>
              <Field label="Fecha de Calibración">
                <Input className="h-8 text-xs" value={company.instrumento2FechaCal} onChange={(e) => setComp({ instrumento2FechaCal: e.target.value })} data-testid="input-inst2-fecha-cal" />
              </Field>
            </div>

            <Section title="Condiciones Atmosféricas" />
            <div className="grid grid-cols-3 gap-x-4 gap-y-3">
              <Field label="Temperatura Exterior (°C)">
                <Input className="h-8 text-xs" value={company.tempExterior} onChange={(e) => setComp({ tempExterior: e.target.value })} data-testid="input-temp-ext" />
              </Field>
              <Field label="Humedad Relativa (%)">
                <Input className="h-8 text-xs" value={company.humedad} onChange={(e) => setComp({ humedad: e.target.value })} data-testid="input-humedad" />
              </Field>
              <Field label="Presión Atmosférica (mmHg)">
                <Input className="h-8 text-xs" value={company.presionAtm} onChange={(e) => setComp({ presionAtm: e.target.value })} data-testid="input-presion" />
              </Field>
            </div>

            <Section title="Condiciones de Trabajo" />
            <div className="space-y-3">
              <Field label="Condiciones Normales de Trabajo (descripción del proceso habitual)">
                <Textarea className="text-xs min-h-[70px]" value={company.condicionesNormales} onChange={(e) => setComp({ condicionesNormales: e.target.value })} placeholder="Describir el proceso productivo y las condiciones habituales del ambiente de trabajo..." data-testid="textarea-cond-normales" />
              </Field>
              <Field label="Condiciones al Momento de la Medición">
                <Textarea className="text-xs min-h-[70px]" value={company.condicionesMedicion} onChange={(e) => setComp({ condicionesMedicion: e.target.value })} placeholder="Describir las condiciones particulares observadas durante la medición..." data-testid="textarea-cond-medicion" />
              </Field>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB 2 — Tabla de Mediciones
        ════════════════════════════════════════════════════════ */}
        {activeTab === "mediciones" && (
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-primary text-white">
                    {(["Pto","Sector","Puesto de Trabajo","Exp.\n(hs)","TBS\n(°C)","TBH\n(°C)","TG\n(°C)","TGBH\nsin pond.","VAR\nunif.","TGBHp\n(auto)","Aclim.","TM(W)\n(auto)","VLA","VLP","¿<VLA?","¿<VLP?",""]).map((h, i) => (
                      <th
                        key={i}
                        className="border border-primary/60 px-1.5 py-1.5 whitespace-pre-line leading-tight font-semibold text-center align-bottom"
                        style={{ minWidth: i === 1 || i === 2 ? 110 : i === 0 || i === 16 ? 28 : 52 }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-gray-50/80">
                      <td className="border px-1 py-0.5 text-center bg-gray-50 font-medium text-[11px]">{String(idx + 1).padStart(2, "0")}</td>
                      <td className="border p-0">
                        <Input className="h-6 text-[11px] border-0 rounded-none" value={row.sector} onChange={(e) => calcAndUpdate(row.id, { sector: e.target.value })} data-testid={`input-sector-${idx}`} />
                      </td>
                      <td className="border p-0">
                        <Input className="h-6 text-[11px] border-0 rounded-none" value={row.puestoTrabajo} onChange={(e) => calcAndUpdate(row.id, { puestoTrabajo: e.target.value })} data-testid={`input-puesto-${idx}`} />
                      </td>
                      <td className="border p-0">
                        <Input className="h-6 text-[11px] border-0 rounded-none text-center" value={row.exposicionHs} onChange={(e) => calcAndUpdate(row.id, { exposicionHs: e.target.value })} data-testid={`input-exp-${idx}`} />
                      </td>
                      <td className="border p-0">
                        <Input className="h-6 text-[11px] border-0 rounded-none text-center" value={row.tbs} onChange={(e) => calcAndUpdate(row.id, { tbs: e.target.value })} data-testid={`input-tbs-${idx}`} />
                      </td>
                      <td className="border p-0">
                        <Input className="h-6 text-[11px] border-0 rounded-none text-center" value={row.tbh} onChange={(e) => calcAndUpdate(row.id, { tbh: e.target.value })} data-testid={`input-tbh-${idx}`} />
                      </td>
                      <td className="border p-0">
                        <Input className="h-6 text-[11px] border-0 rounded-none text-center" value={row.tg} onChange={(e) => calcAndUpdate(row.id, { tg: e.target.value })} data-testid={`input-tg-${idx}`} />
                      </td>
                      <td className="border px-1.5 py-0.5 text-center bg-blue-50 font-semibold text-blue-800 text-[11px]">
                        {row.tgbhSinPonderar}
                      </td>
                      <td className="border p-0">
                        <Select value={row.varUniforme || "0"} onValueChange={(v) => calcAndUpdate(row.id, { varUniforme: v })}>
                          <SelectTrigger className="h-6 text-[11px] border-0 rounded-none w-14" data-testid={`select-var-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {VAR_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.value === "0b" ? "0" : opt.value}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border px-1.5 py-0.5 text-center bg-amber-50 font-bold text-amber-800 text-[11px]">
                        {row.tgbhPonderado}
                      </td>
                      <td className="border p-0">
                        <Select value={row.aclimatado || "SI"} onValueChange={(v) => calcAndUpdate(row.id, { aclimatado: v })}>
                          <SelectTrigger className="h-6 text-[11px] border-0 rounded-none" data-testid={`select-aclim-${idx}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SI">SI</SelectItem>
                            <SelectItem value="NO">NO</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border px-1.5 py-0.5 text-center bg-green-50 font-bold text-green-800 text-[11px]">
                        {row.cargaMetabolica}
                      </td>
                      <td className="border p-0">
                        <Input className="h-6 text-[11px] border-0 rounded-none text-center" value={row.vla} onChange={(e) => calcAndUpdate(row.id, { vla: e.target.value })} data-testid={`input-vla-${idx}`} />
                      </td>
                      <td className="border p-0">
                        <Input className="h-6 text-[11px] border-0 rounded-none text-center" value={row.vlp} onChange={(e) => calcAndUpdate(row.id, { vlp: e.target.value })} data-testid={`input-vlp-${idx}`} />
                      </td>
                      <td className={`border px-1 py-0.5 text-center font-bold text-[11px] ${row.cumpleVla === "SI" ? "bg-green-100 text-green-700" : row.cumpleVla === "NO" ? "bg-red-100 text-red-700" : ""}`}>
                        {row.cumpleVla}
                      </td>
                      <td className={`border px-1 py-0.5 text-center font-bold text-[11px] ${row.cumpleVlp === "SI" ? "bg-green-100 text-green-700" : row.cumpleVlp === "NO" ? "bg-red-100 text-red-700" : ""}`}>
                        {row.cumpleVlp}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        <button
                          onClick={() => { if (rows.length > 1) deleteThermalRow(row.id); }}
                          className="text-red-400 hover:text-red-600 p-0.5 disabled:opacity-30"
                          disabled={rows.length <= 1}
                          data-testid={`button-delete-${idx}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t">
              <Button variant="outline" size="sm" onClick={() => addThermalRow()} data-testid="button-add-row">
                <Plus className="h-4 w-4 mr-1" /> Agregar Fila
              </Button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB 3 — Ficha por Puesto
        ════════════════════════════════════════════════════════ */}
        {activeTab === "fichas" && (
          <div className="space-y-3">
            {rows.map((row, idx) => {
              const isExpanded = expandedRows.has(row.id);
              return (
                <div key={row.id} className="bg-white rounded-lg border shadow-sm">
                  {/* Accordion header */}
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50/60 transition-colors text-left"
                    onClick={() => toggleExpand(row.id)}
                    data-testid={`button-expand-${idx}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-primary bg-primary/10 rounded px-2 py-0.5 shrink-0">
                        Pto {String(idx + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[13px] font-medium">
                        {row.puestoTrabajo || <span className="text-muted-foreground italic">Sin nombre</span>}
                      </span>
                      {row.sector && <span className="text-[11px] text-muted-foreground">— {row.sector}</span>}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {row.cargaMetabolica && (
                        <span className="text-[11px] text-muted-foreground hidden sm:block">
                          TM: <strong>{row.cargaMetabolica} W</strong>
                        </span>
                      )}
                      {row.tgbhPonderado && (
                        <span className="text-[11px] text-muted-foreground hidden sm:block">
                          TGBHp: <strong>{row.tgbhPonderado}°C</strong>
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t px-4 pb-5 pt-4 space-y-5">

                      {/* ── Tabla de Tasa Metabólica ── */}
                      <div>
                        <p className="text-[11px] font-bold text-primary/80 uppercase tracking-wide mb-3">
                          Tasa Metabólica — Tabla SRT 30/2023 (seleccioná postura + parte del cuerpo × intensidad)
                        </p>

                        {/* Postura buttons */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className="text-[11px] font-medium text-muted-foreground shrink-0">Postura:</span>
                          {POSTURA_OPTIONS.map((p) => (
                            <button
                              key={p.value}
                              onClick={() => updateTM(row.id, p.value, row.parteDelCuerpo || "Cuerpo entero", row.intensidadTrabajo || "Moderada")}
                              className={`px-2.5 py-1 text-[11px] rounded border transition-colors ${
                                row.posturaSeleccionada === p.value
                                  ? "bg-primary text-white border-primary"
                                  : "bg-white text-foreground border-border hover:border-primary/60"
                              }`}
                              data-testid={`btn-postura-${idx}-${p.value}`}
                            >
                              {p.label} <span className="opacity-70">({p.sup > 0 ? `+${p.sup}W` : "0W"})</span>
                            </button>
                          ))}
                        </div>

                        {/* TM matrix */}
                        <div className="overflow-x-auto">
                          <table className="text-[11px] border-collapse">
                            <thead>
                              <tr>
                                <th className="border bg-gray-100 px-3 py-1.5 text-left font-medium text-[11px]">
                                  Parte del Cuerpo
                                </th>
                                {INTENSIDAD_OPTIONS.map((int) => (
                                  <th key={int} className="border bg-gray-100 px-4 py-1.5 text-center font-medium text-[11px]">
                                    {int}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {CUERPO_OPTIONS.map((parte) => (
                                <tr key={parte}>
                                  <td className="border px-3 py-1.5 font-medium bg-gray-50 text-[11px]">{parte}</td>
                                  {INTENSIDAD_OPTIONS.map((intensidad) => {
                                    const val = TM_MATRIX[parte]?.[intensidad] ?? 0;
                                    const isSel = row.parteDelCuerpo === parte && row.intensidadTrabajo === intensidad;
                                    return (
                                      <td
                                        key={intensidad}
                                        onClick={() => updateTM(row.id, row.posturaSeleccionada || "De pie", parte, intensidad)}
                                        className={`border px-4 py-1.5 text-center cursor-pointer transition-colors select-none text-[12px] ${
                                          isSel ? "bg-primary text-white font-bold" : "hover:bg-primary/10"
                                        }`}
                                        data-testid={`cell-tm-${idx}-${parte}-${intensidad}`}
                                      >
                                        {val} W
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {row.cargaMetabolica && (
                          <div className="mt-2.5 inline-flex items-center gap-2 bg-primary/5 border border-primary/20 rounded px-3 py-1.5 text-[11px]">
                            <span className="text-muted-foreground">TM calculada:</span>
                            <span className="font-semibold text-primary">
                              {row.tmSentado} W <span className="text-muted-foreground font-normal">(base)</span>
                              {" + "}
                              {row.suplementoTM} W <span className="text-muted-foreground font-normal">(postura)</span>
                              {" = "}
                              <span className="text-[14px] font-bold">{row.cargaMetabolica} W</span>
                            </span>
                          </div>
                        )}
                      </div>

                      {/* ── VAR por tipo de uniforme ── */}
                      <div>
                        <p className="text-[11px] font-bold text-primary/80 uppercase tracking-wide mb-2">
                          Tipo de Uniforme (VAR adicional al TGBH)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {VAR_OPTIONS.map((opt) => {
                            const isSel = row.varUniforme === opt.value;
                            return (
                              <button
                                key={opt.label}
                                onClick={() => calcAndUpdate(row.id, { varUniforme: opt.value })}
                                className={`flex justify-between items-center px-3 py-2 text-[11px] rounded border transition-colors text-left ${
                                  isSel
                                    ? "bg-primary/10 border-primary text-primary font-medium"
                                    : "bg-white border-border hover:border-primary/50"
                                }`}
                              >
                                <span>{opt.label}</span>
                                <span className="ml-3 font-mono font-bold shrink-0">
                                  +{opt.value === "0b" ? "0" : opt.value}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Factores de Exposición ── */}
                      <div>
                        <p className="text-[11px] font-bold text-primary/80 uppercase tracking-wide mb-2">
                          Factores de Exposición Identificados
                        </p>
                        <div className="grid grid-cols-2 gap-1.5">
                          {FACTORES_OPTIONS.map((factor) => {
                            const checked = (row.factoresExposicion || []).includes(factor);
                            return (
                              <label
                                key={factor}
                                className="flex items-center gap-2 cursor-pointer text-[12px] p-1.5 rounded hover:bg-gray-50 select-none"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleFactor(row.id, factor)}
                                  className="w-3.5 h-3.5 accent-primary"
                                  data-testid={`check-factor-${idx}-${factor}`}
                                />
                                {factor}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      {/* ── Comentario ── */}
                      <div>
                        <label className="text-[11px] font-medium text-muted-foreground block mb-1.5">
                          Comentario del puesto
                        </label>
                        <Textarea
                          className="text-[12px] min-h-[65px]"
                          value={row.comentario || ""}
                          onChange={(e) => updateThermalRow(row.id, { comentario: e.target.value })}
                          placeholder="Observaciones específicas de este puesto de trabajo..."
                          data-testid={`textarea-comentario-${idx}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {rows.length === 0 && (
              <div className="text-center text-muted-foreground text-[13px] py-10">
                No hay puestos cargados. Agregá filas en la pestaña <strong>Tabla de Mediciones</strong>.
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            TAB 4 — Conclusiones
        ════════════════════════════════════════════════════════ */}
        {activeTab === "conclusiones" && (
          <div className="bg-white rounded-lg border shadow-sm p-5 space-y-5">
            <div>
              <label className="text-[12px] font-semibold text-foreground block mb-1.5">
                Observaciones / Información Adicional
              </label>
              <Textarea
                className="text-[13px] min-h-[90px]"
                value={observaciones}
                onChange={(e) => updateThermalText("observaciones", e.target.value)}
                placeholder="Observaciones generales sobre la medición, metodología utilizada, condiciones especiales..."
                data-testid="textarea-obs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-semibold text-foreground">Conclusiones</label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-[11px]"
                  onClick={() => generateAI("conclusiones")}
                  disabled={generatingAI !== null}
                  data-testid="button-ai-conclusiones"
                >
                  <Sparkles className="h-3 w-3" />
                  {generatingAI === "conclusiones" ? "Generando..." : "Generar con IA"}
                </Button>
              </div>
              <Textarea
                className="text-[13px] min-h-[130px]"
                value={conclusiones}
                onChange={(e) => updateThermalText("conclusiones", e.target.value)}
                placeholder="Conclusiones técnicas del protocolo de carga térmica..."
                data-testid="textarea-conclusiones"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-semibold text-foreground">Recomendaciones</label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 text-[11px]"
                  onClick={() => generateAI("recomendaciones")}
                  disabled={generatingAI !== null}
                  data-testid="button-ai-recomendaciones"
                >
                  <Sparkles className="h-3 w-3" />
                  {generatingAI === "recomendaciones" ? "Generando..." : "Generar con IA"}
                </Button>
              </div>
              <Textarea
                className="text-[13px] min-h-[130px]"
                value={recomendaciones}
                onChange={(e) => updateThermalText("recomendaciones", e.target.value)}
                placeholder="Medidas de control y mejora recomendadas..."
                data-testid="textarea-recomendaciones"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
