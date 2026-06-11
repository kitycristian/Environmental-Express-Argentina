import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Save, FileDown, FileUp, Database, Wand2, Loader2 } from "lucide-react";
import { useClients } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
// @ts-ignore
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Header, Footer } from "docx";
// @ts-ignore
import { saveAs } from "file-saver";
import { useStore } from "@/lib/store";

// ── Helpers ───────────────────────────────────────────────────────────────────
const calcTEE = (tbs: string, vAire: string): string => {
  const t = parseFloat(tbs);
  const vMs = parseFloat(vAire);
  if (isNaN(t) || isNaN(vMs)) return "";
  const vKmh = vMs * 3.6;
  if (vKmh < 4.8) return t.toFixed(1);
  const wc = 13.12 + 0.6215 * t - 11.37 * Math.pow(vKmh, 0.16) + 0.3965 * t * Math.pow(vKmh, 0.16);
  return wc.toFixed(1);
};

const getNivelPeligro = (tee: string): string => {
  const t = parseFloat(tee);
  if (isNaN(t)) return "";
  if (t > -1) return "Poco Peligroso";
  if (t >= -18) return "Peligro Creciente";
  return "Gran Peligro";
};

const getNivelColor = (nivel: string): string => {
  if (nivel === "Poco Peligroso") return "bg-green-100 text-green-800 font-semibold";
  if (nivel === "Peligro Creciente") return "bg-yellow-100 text-yellow-800 font-semibold";
  if (nivel === "Gran Peligro") return "bg-red-100 text-red-800 font-semibold";
  return "bg-gray-50 text-gray-400";
};

// Tabla 3 — TLVs plan de trabajo/calentamiento en turno de 4 horas (Res. MTEySS 295/2003)
const TLV_TABLE = [
  { temp: "De -26 a -28", sinViento: "75 min / 1", v8: "55 min / 1", v16: "40 min / 1", v24: "30 min / 1", v32: "NP" },
  { temp: "De -29 a -31", sinViento: "55 min / 1", v8: "40 min / 1", v16: "30 min / 1", v24: "NP", v32: "NP" },
  { temp: "De -32 a -34", sinViento: "40 min / 1", v8: "30 min / 1", v16: "NP", v24: "NP", v32: "NP" },
  { temp: "De -35 a -37", sinViento: "30 min / 1", v8: "NP", v16: "NP", v24: "NP", v32: "NP" },
  { temp: "≤ -38", sinViento: "NP", v8: "NP", v16: "NP", v24: "NP", v32: "NP" },
];

export default function ColdSheet() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const coldProtocol = useStore((s) => s.coldProtocol);
  const setColdRows = useStore((s) => s.setColdRows);
  const updateColdCompany = useStore((s) => s.updateColdCompany);
  const updateColdText = useStore((s) => s.updateColdText);
  const establishment = useStore((s) => s.establishment);
  const digitalSignature = useStore((s) => s.digitalSignature);
  const signatoryName = useStore((s) => s.signatoryName);
  const signatoryTitle = useStore((s) => s.signatoryTitle);
  const signatoryRegistration = useStore((s) => s.signatoryRegistration);

  const rows = coldProtocol.rows;
  const company = coldProtocol.company;
  const observaciones = coldProtocol.observaciones;
  const metodologia = coldProtocol.metodologia ?? "";
  const conclusiones = coldProtocol.conclusiones;
  const recomendaciones = coldProtocol.recomendaciones;

  const [activeTab, setActiveTab] = useState<"general" | "mediciones" | "referencia" | "conclusiones">("general");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const { data: clients = [] } = useClients();

  // Sync establishment data into company on mount if empty
  const syncEstab = (field: string) => {
    if (!company[field as keyof typeof company]) {
      const map: Record<string, string> = {
        razonSocial: establishment.razonSocial || establishment.name,
        direccion: establishment.address, localidad: "", provincia: "", cp: "", cuit: establishment.cuit,
      };
      return map[field] || "";
    }
    return company[field as keyof typeof company] as string;
  };

  const updateRow = (id: string, field: string, value: string) => {
    const updated = rows.map(row => {
      if (row.id !== id) return row;
      const next = { ...row, [field]: value };
      if (field === "tbs" || field === "velocidadAire") {
        const tee = calcTEE(field === "tbs" ? value : next.tbs, field === "velocidadAire" ? value : next.velocidadAire);
        next.tee = tee;
        next.nivelPeligro = getNivelPeligro(tee);
      }
      if (field === "tee") {
        next.nivelPeligro = getNivelPeligro(value);
      }
      return next;
    });
    setColdRows(updated);
  };

  const addRow = () => {
    setColdRows([...rows, {
      id: String(Date.now()), sector: "", puestoTrabajo: "", rangoTemp: "", cantidadCiclos: "",
      duracionCiclo: "", tiempoNetoExposicion: "", tiempoIntegracion: "", caracteristicasExposicion: "",
      tbs: "", velocidadAire: "", tee: "", tipoUniforme: "", equipo: "", exposicionMas4h: "NO",
      nivelPeligro: "", observaciones: ""
    }]);
  };

  const deleteRow = (id: string) => {
    if (rows.length > 1) setColdRows(rows.filter(r => r.id !== id));
  };

  const handleImportSectors = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (client && Array.isArray(client.sectors)) {
      const newRows = (client.sectors as string[]).map((sectorName, index) => ({
        id: String(Date.now() + index), sector: sectorName, puestoTrabajo: "", rangoTemp: "",
        cantidadCiclos: "", duracionCiclo: "", tiempoNetoExposicion: "", tiempoIntegracion: "",
        caracteristicasExposicion: "", tbs: "", velocidadAire: "", tee: "", tipoUniforme: "",
        equipo: "", exposicionMas4h: "NO", nivelPeligro: "", observaciones: ""
      }));
      setColdRows([...rows, ...newRows]);
      setImportDialogOpen(false);
      setSelectedClientId("");
    }
  };

  const loadSampleData = () => {
    updateColdCompany({
      razonSocial: "DORINKA SRL (STORE #1026 CATAMARCA)",
      direccion: "Av. Villafañez y Dr. Manuel Navarro S/N",
      localidad: "San Fernando del Valle de Catamarca",
      provincia: "Catamarca", cp: "4700", cuit: "30-67813830-0",
      fechaMedicion: "26/03/2024", horaInicio: "14:00", horaFin: "16:30",
      turnos: "2 Turnos de Trabajo. 6:00 AM - 23:30 PM",
      instrumento1Marca: "TESTO", instrumento1Modelo: "440",
      instrumento1Serie: "81216382", instrumento1Cert: "24R00000812",
      instrumento1FechaCal: "05/02/2024",
      tempExterior: "33.3", humedad: "43.2", presionAtm: "713.4",
      condicionesNormales: "Cámara Congelado Panadería: trabajo de panadería con exposición intermitente a cámara.\nCámara Congelado Deli: asociado de Deli con ingreso frecuente a cámara.\nLaboratorio de Carnes: trabajo continuo en sala refrigerada.",
      condicionesMedicion: "Condiciones habituales de trabajo, sin variaciones en la operación normal."
    });
    setColdRows([
      { id: "1", sector: "Cámara Congelado Panadería", puestoTrabajo: "Asociado de Panadería", rangoTemp: "-18 < -21°C", cantidadCiclos: "10", duracionCiclo: "3", tiempoNetoExposicion: "30", tiempoIntegracion: "3", caracteristicasExposicion: "Intermitente con Periodos de Recuperación", tbs: "-24.4", velocidadAire: "0.45", tee: "-26.3", tipoUniforme: "Ropa Algodón y Campera Térmica", equipo: "Termoanemómetro", exposicionMas4h: "NO", nivelPeligro: "Gran Peligro", observaciones: "" },
      { id: "2", sector: "Cámara Congelado Deli", puestoTrabajo: "Asociado de Deli", rangoTemp: "-18 < -21°C", cantidadCiclos: "10", duracionCiclo: "3", tiempoNetoExposicion: "30", tiempoIntegracion: "3", caracteristicasExposicion: "Intermitente con Periodos de Recuperación", tbs: "-23.6", velocidadAire: "1.47", tee: "-28.5", tipoUniforme: "Ropa Algodón y Campera Térmica", equipo: "Termoanemómetro", exposicionMas4h: "NO", nivelPeligro: "Gran Peligro", observaciones: "" },
      { id: "3", sector: "Laboratorio de Carnes", puestoTrabajo: "Asociado de Carnicería", rangoTemp: "+7 ≥ +9°C", cantidadCiclos: "60", duracionCiclo: "4", tiempoNetoExposicion: "240", tiempoIntegracion: "3", caracteristicasExposicion: "Continua", tbs: "8.1", velocidadAire: "0.14", tee: "8.1", tipoUniforme: "Ropa Algodón y Campera Térmica", equipo: "Termoanemómetro", exposicionMas4h: "SI", nivelPeligro: "Poco Peligroso", observaciones: "" },
    ]);
    updateColdText("conclusiones", "Analizando la TEE y siguiendo los lineamientos de la Ley 19.587/72 y Res. MTEySS 295/2003, los puestos en Cámara Congelado presentan Gran Peligro (TEE < -18°C) con exposición intermitente. El Laboratorio de Carnes presenta nivel Poco Peligroso.");
    updateColdText("recomendaciones", "Proveer ropa aislante seca adecuada. Usar manoplas aislantes. Prohibir ingreso a cámaras sin EPP adecuado (campera térmica, ropa de algodón, medias, calzado de seguridad, guantes). Controlar que la ropa esté seca. Medición anual obligatoria.");
    updateColdText("metodologia", "Las mediciones se realizaron con termoanemómetro de hilo caliente en los puestos de trabajo identificados, siguiendo los lineamientos de la Resolución MTEySS 295/2003. Se registraron TBS y velocidad del aire para el cálculo de TEE (Wind Chill).");
    updateColdText("observaciones", "");
    toast({ title: "Datos cargados", description: "Importados 3 puntos de medición — DORINKA SRL" });
  };

  const generateAI = async (field: "conclusiones" | "recomendaciones") => {
    setAiLoading(field);
    try {
      const summary = rows.filter(r => r.sector || r.tbs).map((r, i) =>
        `${i + 1}. ${r.sector} / ${r.puestoTrabajo}: TBS=${r.tbs}°C, Vel=${r.velocidadAire}m/s, TEE=${r.tee}°C, Nivel=${r.nivelPeligro}, Exp>4h=${r.exposicionMas4h}, Caract=${r.caracteristicasExposicion}`
      ).join("\n");
      const resp = await fetch("/api/cold/generate-text", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, summary, empresa: company.razonSocial || "la empresa" })
      });
      if (!resp.ok) throw new Error("Error del servidor");
      const { text } = await resp.json();
      updateColdText(field, text);
      toast({ title: "Texto generado con IA" });
    } catch {
      toast({ title: "Error", description: "No se pudo generar el texto", variant: "destructive" });
    } finally {
      setAiLoading(null);
    }
  };

  const downloadPDF = () => {
    if (!company.razonSocial?.trim()) {
      toast({ title: "Datos incompletos", description: "Complete los datos del establecimiento primero", variant: "destructive" });
      return;
    }
    const prev = document.title;
    document.title = `Estres_Frio_${company.razonSocial.substring(0, 30)}`;
    window.print();
    document.title = prev;
    toast({ title: "Impresión iniciada", description: "Use 'Guardar como PDF' en el diálogo de impresión." });
  };

  const downloadDOCX = async () => {
    if (!company.razonSocial?.trim()) {
      toast({ title: "Datos incompletos", description: "Complete los datos del establecimiento primero", variant: "destructive" });
      return;
    }
    try {
      const children: any[] = [];
      const heading = (text: string) => new Paragraph({
        children: [new TextRun({ text, bold: true, font: "Arial", size: 24, color: "003366" })],
        spacing: { before: 200, after: 80 }
      });
      const lv = (label: string, value: string) => new Paragraph({
        children: [new TextRun({ text: label + ": ", bold: true, font: "Arial", size: 20 }), new TextRun({ text: value, font: "Arial", size: 20 })],
        spacing: { after: 40 }
      });
      const cell = (text: string, bold = false, opts: any = {}) => new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text, bold, font: "Arial", size: opts.size || 16, color: opts.color })], alignment: opts.align || AlignmentType.CENTER })],
        shading: opts.shading, margins: { top: 30, bottom: 30, left: 50, right: 50 }
      });

      children.push(new Paragraph({ children: [new TextRun({ text: "PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", bold: true, font: "Arial", size: 28, color: "003366" })], alignment: AlignmentType.CENTER, spacing: { after: 60 } }));
      children.push(new Paragraph({ children: [new TextRun({ text: "Resolución MTEySS N° 295/2003", font: "Arial", size: 20, color: "666666" })], alignment: AlignmentType.CENTER, spacing: { after: 200 } }));

      children.push(heading("Datos del Establecimiento"));
      children.push(lv("Razón Social", company.razonSocial));
      children.push(lv("Dirección", company.direccion));
      children.push(lv("Localidad", `${company.localidad} – ${company.provincia} – C.P.: ${company.cp}`));
      children.push(lv("C.U.I.T.", company.cuit));
      children.push(lv("Fecha de medición", company.fechaMedicion));
      children.push(lv("Horario", `Inicio: ${company.horaInicio}  –  Fin: ${company.horaFin}`));
      children.push(lv("Turnos habituales", company.turnos));

      children.push(heading("Instrumento de Medición"));
      children.push(lv("Tipo", "Termoanemómetro de Hilo Caliente"));
      children.push(lv("Marca / Modelo", `${company.instrumento1Marca} ${company.instrumento1Modelo}`));
      children.push(lv("N° Serie", company.instrumento1Serie));
      children.push(lv("Certificado N°", company.instrumento1Cert));
      children.push(lv("Fecha de Calibración", company.instrumento1FechaCal));

      children.push(heading("Condiciones Atmosféricas"));
      children.push(lv("Temperatura exterior", `${company.tempExterior} °C`));
      children.push(lv("Humedad relativa", `${company.humedad} %`));
      children.push(lv("Presión atmosférica", `${company.presionAtm} mmHg`));
      if (company.condicionesNormales) children.push(lv("Condiciones normales", company.condicionesNormales));
      if (company.condicionesMedicion) children.push(lv("Condiciones al momento", company.condicionesMedicion));

      children.push(heading("Tabla de Mediciones"));
      const hdr = ["Pto", "Sector", "Puesto", "Rango T.(°C)", "Ciclos", "Dur.Ciclo(min)", "T.Neto(min)", "T.Int.(min)", "Caract.Exp.", "TBS(°C)", "Vel(m/s)", "TEE(°C)", "Uniforme", "Equipo", ">4hs", "Nivel Peligro"];
      children.push(new Table({
        rows: [
          new TableRow({ children: hdr.map(h => cell(h, true, { shading: { fill: "003366" }, color: "FFFFFF", size: 14 })), tableHeader: true }),
          ...rows.map((r, i) => new TableRow({ children: [
            cell(String(i + 1).padStart(2, "0"), false, { size: 14 }),
            cell(r.sector, false, { align: AlignmentType.LEFT, size: 14 }),
            cell(r.puestoTrabajo, false, { align: AlignmentType.LEFT, size: 14 }),
            cell(r.rangoTemp, false, { size: 14 }),
            cell(r.cantidadCiclos, false, { size: 14 }),
            cell(r.duracionCiclo, false, { size: 14 }),
            cell(r.tiempoNetoExposicion, false, { size: 14 }),
            cell(r.tiempoIntegracion, false, { size: 14 }),
            cell(r.caracteristicasExposicion, false, { align: AlignmentType.LEFT, size: 14 }),
            cell(r.tbs, false, { size: 14 }),
            cell(r.velocidadAire, false, { size: 14 }),
            cell(r.tee, false, { size: 14 }),
            cell(r.tipoUniforme, false, { align: AlignmentType.LEFT, size: 14 }),
            cell(r.equipo, false, { size: 14 }),
            cell(r.exposicionMas4h, true, { size: 14, color: r.exposicionMas4h === "SI" ? "CC0000" : "008000" }),
            cell(r.nivelPeligro, true, { size: 14, color: r.nivelPeligro === "Gran Peligro" ? "CC0000" : r.nivelPeligro === "Peligro Creciente" ? "B45309" : "15803D" }),
          ]}))
        ],
        width: { size: 100, type: WidthType.PERCENTAGE }
      }));

      const addSection = (title: string, text: string) => {
        if (!text) return;
        children.push(heading(title));
        children.push(new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 18 })], spacing: { after: 100 } }));
      };
      addSection("Observaciones", observaciones);
      addSection("Metodología de Medición", metodologia);
      addSection("Conclusiones", conclusiones);
      addSection("Recomendaciones", recomendaciones);

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
          headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: `${company.razonSocial} — Estrés por Frío`, italics: true, size: 16, color: "999999" })], alignment: AlignmentType.RIGHT })] }) },
          footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "Environmental Express Argentina — Protocolo de Estrés por Frío — Res. MTEySS 295/2003", size: 14, color: "999999" })], alignment: AlignmentType.CENTER })] }) },
          children
        }]
      });
      const blob = await Packer.toBlob(docFile);
      saveAs(blob, `Estres_Frio_${company.razonSocial.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.docx`);
      toast({ title: "DOCX generado" });
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "No se pudo generar el DOCX", variant: "destructive" });
    }
  };

  const missingCalibration = !company.instrumento1Cert || !company.instrumento1FechaCal;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <h1 className="text-sm font-bold text-[#003366]" data-testid="heading-cold">
            PROTOCOLO — ESTRÉS POR FRÍO (Res. MTEySS 295/2003)
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadSampleData} className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs" data-testid="button-load-sample">
            <Database className="h-3.5 w-3.5 mr-1" /> Datos Muestra
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)} className="text-xs" data-testid="button-import">
            <FileUp className="h-3.5 w-3.5 mr-1" /> Importar
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPDF} className="text-xs" data-testid="button-export-pdf">
            <FileDown className="h-3.5 w-3.5 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={downloadDOCX} className="text-xs" data-testid="button-export-docx">
            <FileDown className="h-3.5 w-3.5 mr-1" /> DOCX
          </Button>
        </div>
      </div>

      {/* Import dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Importar Sectores del Cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {clients.filter(c => c.sectors && (c.sectors as string[]).length > 0).length === 0 ? (
              <p className="text-sm text-center text-muted-foreground p-4 border rounded bg-muted/50">No hay clientes con sectores definidos</p>
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

      <div className="flex-1 overflow-auto p-4">
        {/* Tabs */}
        <div className="flex gap-1 mb-0">
          {[
            { key: "general" as const, label: missingCalibration ? "⚠ Datos Generales" : "Datos Generales" },
            { key: "mediciones" as const, label: "Tabla de Mediciones" },
            { key: "referencia" as const, label: "Valores de Referencia" },
            { key: "conclusiones" as const, label: "Conclusiones" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`tab-${tab.key}`}
              className={`px-4 py-1.5 text-xs font-medium rounded-t border border-b-0 transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-[#003366] border-gray-300 shadow-sm"
                  : "bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB 1: Datos Generales ─────────────────────────────────── */}
        {activeTab === "general" && (
          <div className="bg-white rounded-b rounded-tr border border-gray-300 shadow-sm p-4 space-y-5">
            {/* Establecimiento */}
            <section>
              <h3 className="text-xs font-bold text-[#003366] border-b pb-1 mb-3">Datos del Establecimiento</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Razón Social</label>
                  <Input className="mt-1 h-8 text-xs" value={company.razonSocial || syncEstab("razonSocial")} onChange={e => updateColdCompany({ razonSocial: e.target.value })} data-testid="input-razon-social" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">C.U.I.T.</label>
                  <Input className="mt-1 h-8 text-xs" value={company.cuit} onChange={e => updateColdCompany({ cuit: e.target.value })} data-testid="input-cuit" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Dirección</label>
                  <Input className="mt-1 h-8 text-xs" value={company.direccion} onChange={e => updateColdCompany({ direccion: e.target.value })} data-testid="input-direccion" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Localidad</label>
                  <Input className="mt-1 h-8 text-xs" value={company.localidad} onChange={e => updateColdCompany({ localidad: e.target.value })} data-testid="input-localidad" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Provincia</label>
                  <Input className="mt-1 h-8 text-xs" value={company.provincia} onChange={e => updateColdCompany({ provincia: e.target.value })} data-testid="input-provincia" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">C.P.</label>
                  <Input className="mt-1 h-8 text-xs" value={company.cp} onChange={e => updateColdCompany({ cp: e.target.value })} data-testid="input-cp" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Fecha de Medición</label>
                  <Input className="mt-1 h-8 text-xs" value={company.fechaMedicion} onChange={e => updateColdCompany({ fechaMedicion: e.target.value })} data-testid="input-fecha" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Hora Inicio</label>
                  <Input className="mt-1 h-8 text-xs" value={company.horaInicio} onChange={e => updateColdCompany({ horaInicio: e.target.value })} data-testid="input-hora-inicio" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Hora Fin</label>
                  <Input className="mt-1 h-8 text-xs" value={company.horaFin} onChange={e => updateColdCompany({ horaFin: e.target.value })} data-testid="input-hora-fin" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600">Turnos Habituales</label>
                  <Input className="mt-1 h-8 text-xs" value={company.turnos} onChange={e => updateColdCompany({ turnos: e.target.value })} data-testid="input-turnos" />
                </div>
              </div>
            </section>

            {/* Instrumento */}
            <section>
              <h3 className="text-xs font-bold text-[#003366] border-b pb-1 mb-3">Instrumento de Medición — Termoanemómetro de Hilo Caliente</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Marca</label>
                  <Input className="mt-1 h-8 text-xs" value={company.instrumento1Marca} onChange={e => updateColdCompany({ instrumento1Marca: e.target.value })} data-testid="input-inst1-marca" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Modelo</label>
                  <Input className="mt-1 h-8 text-xs" value={company.instrumento1Modelo} onChange={e => updateColdCompany({ instrumento1Modelo: e.target.value })} data-testid="input-inst1-modelo" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">N° de Serie</label>
                  <Input className="mt-1 h-8 text-xs" value={company.instrumento1Serie} onChange={e => updateColdCompany({ instrumento1Serie: e.target.value })} data-testid="input-inst1-serie" />
                </div>
                <div>
                  <label className={`text-xs font-medium ${!company.instrumento1Cert ? "text-amber-600" : "text-gray-600"}`}>
                    N° Certificado de Cal. {!company.instrumento1Cert && "⚠"}
                  </label>
                  <Input className={`mt-1 h-8 text-xs ${!company.instrumento1Cert ? "border-amber-400" : ""}`} value={company.instrumento1Cert} onChange={e => updateColdCompany({ instrumento1Cert: e.target.value })} data-testid="input-inst1-cert" />
                </div>
                <div>
                  <label className={`text-xs font-medium ${!company.instrumento1FechaCal ? "text-amber-600" : "text-gray-600"}`}>
                    Fecha de Calibración {!company.instrumento1FechaCal && "⚠"}
                  </label>
                  <Input className={`mt-1 h-8 text-xs ${!company.instrumento1FechaCal ? "border-amber-400" : ""}`} value={company.instrumento1FechaCal} onChange={e => updateColdCompany({ instrumento1FechaCal: e.target.value })} data-testid="input-inst1-fecha" />
                </div>
              </div>
            </section>

            {/* Condiciones atmosféricas */}
            <section>
              <h3 className="text-xs font-bold text-[#003366] border-b pb-1 mb-3">Condiciones Atmosféricas</h3>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Temperatura Exterior (°C)</label>
                  <Input className="mt-1 h-8 text-xs" value={company.tempExterior} onChange={e => updateColdCompany({ tempExterior: e.target.value })} data-testid="input-temp-exterior" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Humedad Relativa (%)</label>
                  <Input className="mt-1 h-8 text-xs" value={company.humedad} onChange={e => updateColdCompany({ humedad: e.target.value })} data-testid="input-humedad" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Presión Atmosférica (mmHg)</label>
                  <Input className="mt-1 h-8 text-xs" value={company.presionAtm} onChange={e => updateColdCompany({ presionAtm: e.target.value })} data-testid="input-presion-atm" />
                </div>
              </div>
            </section>

            {/* Condiciones de trabajo */}
            <section>
              <h3 className="text-xs font-bold text-[#003366] border-b pb-1 mb-3">Condiciones de Trabajo</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600">Condiciones normales de trabajo (una línea por sector)</label>
                  <Textarea className="mt-1 text-xs min-h-[80px] resize-y" value={company.condicionesNormales} onChange={e => updateColdCompany({ condicionesNormales: e.target.value })} placeholder="Describir las condiciones habituales por sector..." data-testid="textarea-condiciones-normales" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600">Condiciones al momento de la medición</label>
                  <Textarea className="mt-1 text-xs min-h-[60px] resize-y" value={company.condicionesMedicion} onChange={e => updateColdCompany({ condicionesMedicion: e.target.value })} placeholder="Describir las condiciones durante la medición..." data-testid="textarea-condiciones-medicion" />
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ── TAB 2: Tabla de Mediciones ────────────────────────────────── */}
        {activeTab === "mediciones" && (
          <div className="bg-white rounded-b rounded-tr border border-gray-300 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white">
                    <th className="border border-blue-800 px-1 py-1.5 w-8 text-center">Pto</th>
                    <th className="border border-blue-800 px-2 py-1.5 min-w-[130px]">Sector / Área</th>
                    <th className="border border-blue-800 px-2 py-1.5 min-w-[120px]">Puesto de Trabajo</th>
                    <th className="border border-blue-800 px-1 py-1.5 w-24 text-center">Rango Temp. Sector (°C)</th>
                    <th className="border border-blue-800 px-1 py-1.5 w-16 text-center">Ciclos por Turno</th>
                    <th className="border border-blue-800 px-1 py-1.5 w-16 text-center">Duración Ciclo (min)</th>
                    <th className="border border-blue-800 px-1 py-1.5 w-20 text-center">T. Neto Exp. (min)</th>
                    <th className="border border-blue-800 px-1 py-1.5 w-16 text-center">T. Integración (min)</th>
                    <th className="border border-blue-800 px-2 py-1.5 min-w-[130px]">Caract. Exposición</th>
                    <th className="border border-blue-800 px-1 py-1.5 w-16 text-center">TBS (°C)</th>
                    <th className="border border-blue-800 px-1 py-1.5 w-16 text-center">Vel. Aire (m/s)</th>
                    <th className="border border-blue-800 px-1 py-1.5 w-16 text-center bg-sky-800">TEE (°C)</th>
                    <th className="border border-blue-800 px-2 py-1.5 min-w-[110px]">Tipo Uniforme</th>
                    <th className="border border-blue-800 px-1 py-1.5 w-24">Equipo</th>
                    <th className="border border-blue-800 px-1 py-1.5 w-14 text-center">Exp. &gt;4hs</th>
                    <th className="border border-blue-800 px-1 py-1.5 w-28 text-center bg-sky-800">Nivel Peligro</th>
                    <th className="border border-blue-800 px-1 py-1.5 w-6"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border px-1 py-0.5 text-center bg-gray-50 font-medium" data-testid={`cell-row-${index}`}>{String(index + 1).padStart(2, "0")}</td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.sector} onChange={e => updateRow(row.id, "sector", e.target.value)} data-testid={`input-sector-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.puestoTrabajo} onChange={e => updateRow(row.id, "puestoTrabajo", e.target.value)} data-testid={`input-puesto-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.rangoTemp} onChange={e => updateRow(row.id, "rangoTemp", e.target.value)} data-testid={`input-rango-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.cantidadCiclos} onChange={e => updateRow(row.id, "cantidadCiclos", e.target.value)} data-testid={`input-ciclos-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.duracionCiclo} onChange={e => updateRow(row.id, "duracionCiclo", e.target.value)} data-testid={`input-dur-ciclo-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.tiempoNetoExposicion} onChange={e => updateRow(row.id, "tiempoNetoExposicion", e.target.value)} data-testid={`input-tiempo-neto-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.tiempoIntegracion} onChange={e => updateRow(row.id, "tiempoIntegracion", e.target.value)} data-testid={`input-tiempo-int-${index}`} /></td>
                      <td className="border p-0">
                        <Select value={row.caracteristicasExposicion} onValueChange={v => updateRow(row.id, "caracteristicasExposicion", v)}>
                          <SelectTrigger className="h-6 text-xs border-0 rounded-none px-1">
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Continua">Continua</SelectItem>
                            <SelectItem value="Intermitente con Periodos de Recuperación">Intermitente c/Rec.</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.tbs} onChange={e => updateRow(row.id, "tbs", e.target.value)} data-testid={`input-tbs-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.velocidadAire} onChange={e => updateRow(row.id, "velocidadAire", e.target.value)} data-testid={`input-vel-${index}`} /></td>
                      <td className="border p-0 bg-sky-50">
                        <Input className="h-6 text-xs border-0 rounded-none text-center bg-sky-50 font-semibold" value={row.tee} onChange={e => updateRow(row.id, "tee", e.target.value)} data-testid={`input-tee-${index}`} />
                      </td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.tipoUniforme} onChange={e => updateRow(row.id, "tipoUniforme", e.target.value)} data-testid={`input-uniforme-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.equipo} onChange={e => updateRow(row.id, "equipo", e.target.value)} data-testid={`input-equipo-${index}`} /></td>
                      <td className="border p-0">
                        <Select value={row.exposicionMas4h} onValueChange={v => updateRow(row.id, "exposicionMas4h", v)}>
                          <SelectTrigger className="h-6 text-xs border-0 rounded-none px-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SI">SI</SelectItem>
                            <SelectItem value="NO">NO</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className={`border px-1 py-0.5 text-center text-xs font-semibold ${getNivelColor(row.nivelPeligro)}`} data-testid={`cell-nivel-${index}`}>
                        {row.nivelPeligro || "—"}
                      </td>
                      <td className="border px-1 py-0.5 text-center">
                        <button onClick={() => deleteRow(row.id)} className="text-red-400 hover:text-red-600" data-testid={`button-delete-${index}`}>
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-2 border-t">
              <Button size="sm" variant="outline" onClick={addRow} className="text-xs" data-testid="button-add-row">
                <Plus className="h-3.5 w-3.5 mr-1" /> Agregar Puesto
              </Button>
            </div>

            {/* Leyenda Nivel de Peligro */}
            <div className="px-3 pb-3">
              <p className="text-xs font-semibold text-gray-600 mb-1">Nivel de Peligro — Tabla 2, Res. MTEySS 295/2003:</p>
              <div className="flex gap-3 flex-wrap">
                <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold">Poco Peligroso: TEE &gt; −1°C</span>
                <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 font-semibold">Peligro Creciente: −18°C ≤ TEE ≤ −1°C</span>
                <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-800 font-semibold">Gran Peligro: TEE &lt; −18°C</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">TEE (Temp. Equivalente de Enfriamiento) se calcula automáticamente a partir de TBS y Velocidad del Aire. Fórmula Wind Chill (v &ge; 4.8 km/h).</p>
            </div>
          </div>
        )}

        {/* ── TAB 3: Valores de Referencia ──────────────────────────────── */}
        {activeTab === "referencia" && (
          <div className="bg-white rounded-b rounded-tr border border-gray-300 shadow-sm p-4">
            <h3 className="text-xs font-bold text-[#003366] mb-1">
              Tabla 3 — TLVs para Plan de Trabajo/Calentamiento en Turno de 4 Horas
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              Resolución MTEySS N° 295/2003 — Anexo V — Temperatura Equivalente de Enfriamiento.
              Valores expresados como "Período máximo de trabajo / N° de interrupciones".
              <strong className="ml-1">NP = No Permitido</strong>.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#003366] text-white">
                    <th className="border border-blue-800 px-3 py-2 min-w-[130px] text-left">Temperatura del Aire (°C)</th>
                    <th className="border border-blue-800 px-2 py-2 text-center min-w-[100px]">Sin viento</th>
                    <th className="border border-blue-800 px-2 py-2 text-center min-w-[100px]">Viento ~8 km/h</th>
                    <th className="border border-blue-800 px-2 py-2 text-center min-w-[100px]">Viento ~16 km/h</th>
                    <th className="border border-blue-800 px-2 py-2 text-center min-w-[100px]">Viento ~24 km/h</th>
                    <th className="border border-blue-800 px-2 py-2 text-center min-w-[100px]">Viento ~32 km/h</th>
                  </tr>
                </thead>
                <tbody>
                  {TLV_TABLE.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="border px-3 py-1.5 font-semibold text-gray-700">{row.temp}</td>
                      {[row.sinViento, row.v8, row.v16, row.v24, row.v32].map((val, j) => (
                        <td key={j} className={`border px-2 py-1.5 text-center ${val === "NP" ? "bg-red-100 text-red-700 font-bold" : "text-gray-700"}`}>
                          {val}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800 space-y-1">
              <p className="font-semibold">Criterios de la Tabla 2 — Niveles de Peligro por TEE:</p>
              <p>• <strong>Poco Peligroso:</strong> TEE &gt; −1°C — No requiere plan especial de calentamiento.</p>
              <p>• <strong>Peligro Creciente:</strong> −18°C ≤ TEE ≤ −1°C — Vigilancia, EPP adecuado, períodos de calentamiento.</p>
              <p>• <strong>Gran Peligro:</strong> TEE &lt; −18°C — Requiere plan de trabajo/calentamiento según Tabla 3; prohibido trabajar sin EPP y plan aprobado.</p>
            </div>
          </div>
        )}

        {/* ── TAB 4: Conclusiones ───────────────────────────────────────── */}
        {activeTab === "conclusiones" && (
          <div className="bg-white rounded-b rounded-tr border border-gray-300 shadow-sm p-4 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-700">Detalles constructivos / Observaciones de los sectores</label>
              <Textarea
                className="mt-1 text-xs min-h-[80px] resize-y"
                value={observaciones}
                onChange={e => updateColdText("observaciones", e.target.value)}
                placeholder="Describir características constructivas de los sectores medidos..."
                data-testid="textarea-observaciones"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700">Metodología de Medición</label>
              <Textarea
                className="mt-1 text-xs min-h-[70px] resize-y"
                value={metodologia}
                onChange={e => updateColdText("metodologia", e.target.value)}
                placeholder="Describir la metodología utilizada en las mediciones..."
                data-testid="textarea-metodologia"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">Conclusiones</label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs text-purple-700 border-purple-300 hover:bg-purple-50"
                  onClick={() => generateAI("conclusiones")}
                  disabled={!!aiLoading}
                  data-testid="button-ai-conclusiones"
                >
                  {aiLoading === "conclusiones" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                  Generar con IA
                </Button>
              </div>
              <Textarea
                className="text-xs min-h-[100px] resize-y"
                value={conclusiones}
                onChange={e => updateColdText("conclusiones", e.target.value)}
                placeholder="Conclusiones del estudio de estrés por frío..."
                data-testid="textarea-conclusiones"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-gray-700">Recomendaciones para prevenir el estrés por frío</label>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs text-purple-700 border-purple-300 hover:bg-purple-50"
                  onClick={() => generateAI("recomendaciones")}
                  disabled={!!aiLoading}
                  data-testid="button-ai-recomendaciones"
                >
                  {aiLoading === "recomendaciones" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Wand2 className="h-3 w-3 mr-1" />}
                  Generar con IA
                </Button>
              </div>
              <Textarea
                className="text-xs min-h-[100px] resize-y"
                value={recomendaciones}
                onChange={e => updateColdText("recomendaciones", e.target.value)}
                placeholder="Medidas de control, EPP, organización del trabajo..."
                data-testid="textarea-recomendaciones"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
