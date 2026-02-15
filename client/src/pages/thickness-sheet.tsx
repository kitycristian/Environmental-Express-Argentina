import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Save, FileDown, FileUp, Upload, Camera, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClients } from "@/lib/hooks";
import { cn } from "@/lib/utils";
// @ts-ignore
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// @ts-ignore
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, Header, Footer } from "docx";

interface CompanyInfo {
  empresa: string;
  cuit: string;
  domicilio: string;
  localidad: string;
  provincia: string;
}

interface InstrumentInfo {
  tipo: string;
  serie: string;
  marca: string;
  modelo: string;
  rango: string;
  medioAcople: string;
  fechaCalibracion: string;
  certificado: string;
}

interface TransducerInfo {
  tipo: string;
  serie: string;
  marca: string;
  modelo: string;
  rango: string;
  medioAcople: string;
  fechaCalibracion: string;
  certificado: string;
}

interface BlockInfo {
  tipo: string;
  serie: string;
  marca: string;
  modelo: string;
  estandar: string;
  rango: string;
}

interface VesselInfo {
  denominacion: string;
  marca: string;
  modelo: string;
  serie: string;
  fechaUltimaInspeccion: string;
  peso: string;
  fluido: string;
  capacidad: string;
  diametroInterno: string;
  alturaTotal: string;
  espesorMinimoEnvolvente: string;
  espesorMinimoCasquetes: string;
  tipoCasquetes: string;
  materialCuerpo: string;
  materialCasquetes: string;
  unionesChapas: string;
  temperaturaTrabajoMin: string;
  temperaturaTrabajoMax: string;
  presionTrabajo: string;
  presionPruebaHidraulica: string;
  origen: string;
  normaDiseno: string;
}

interface EnvelopeMeasurement {
  angulo: string;
  valores: string[];
}

interface CasqueteMeasurement {
  generatriz: string;
  angulo: string;
  resultado: string;
}

interface VisualInspectionRow {
  descripcion: string;
  estado: "bien" | "regular" | "reparar" | "";
  observaciones: string;
}

interface AsmeCalc {
  presionDiseno: string;
  diametroInterior: string;
  tensionAdmisible: string;
  eficienciaJuntas: string;
  sobreespesorCorrosion: string;
  espesorMinimoMedido: string;
}

const DEFAULT_VISUAL_ROWS: VisualInspectionRow[] = [
  { descripcion: "Cuerpo", estado: "", observaciones: "" },
  { descripcion: "Cabezales", estado: "", observaciones: "" },
  { descripcion: "Soportes", estado: "", observaciones: "" },
  { descripcion: "Patas", estado: "", observaciones: "" },
  { descripcion: "Escaleras y Plataformas", estado: "", observaciones: "" },
  { descripcion: "Pintura", estado: "", observaciones: "" },
  { descripcion: "Conexiones", estado: "", observaciones: "" },
  { descripcion: "Man Hole (MH)", estado: "", observaciones: "" },
  { descripcion: "Instrumentos", estado: "", observaciones: "" },
  { descripcion: "Misceláneos", estado: "", observaciones: "" },
  { descripcion: "Cañerías Vinculadas", estado: "", observaciones: "" },
  { descripcion: "Identificaciones", estado: "", observaciones: "" },
];

export default function ThicknessSheet() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: clients = [] } = useClients();
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("empresa");

  const [company, setCompany] = useState<CompanyInfo>({
    empresa: "", cuit: "", domicilio: "", localidad: "", provincia: ""
  });

  const [instrument, setInstrument] = useState<InstrumentInfo>({
    tipo: "Medidor de espesores de paredes ultrasónico", serie: "", marca: "", modelo: "", rango: "", medioAcople: "Gel", fechaCalibracion: "", certificado: ""
  });

  const [transducer, setTransducer] = useState<TransducerInfo>({
    tipo: "Transductor", serie: "", marca: "", modelo: "", rango: "1 – 200 mm", medioAcople: "Gel", fechaCalibracion: "", certificado: ""
  });

  const [block, setBlock] = useState<BlockInfo>({
    tipo: "Bloque Patrón Dimensional de 5 Pasos", serie: "", marca: "", modelo: "", estandar: "ASTM E797", rango: "0,1-0,5 mm"
  });

  const [vessel, setVessel] = useState<VesselInfo>({
    denominacion: "", marca: "", modelo: "", serie: "", fechaUltimaInspeccion: "", peso: "", fluido: "", capacidad: "", diametroInterno: "", alturaTotal: "", espesorMinimoEnvolvente: "", espesorMinimoCasquetes: "", tipoCasquetes: "Elipsoidal", materialCuerpo: "", materialCasquetes: "", unionesChapas: "Soldadas", temperaturaTrabajoMin: "", temperaturaTrabajoMax: "", presionTrabajo: "", presionPruebaHidraulica: "", origen: "", normaDiseno: ""
  });

  const [sectorCount, setSectorCount] = useState(6);
  const [envelopeMeasurements, setEnvelopeMeasurements] = useState<EnvelopeMeasurement[]>([
    { angulo: "0°", valores: Array(6).fill("") },
    { angulo: "90°", valores: Array(6).fill("") },
    { angulo: "180°", valores: Array(6).fill("") },
    { angulo: "270°", valores: Array(6).fill("") },
  ]);

  const [casqueteSuperior, setCasqueteSuperior] = useState<CasqueteMeasurement[]>([
    { generatriz: "A", angulo: "0°", resultado: "" },
    { generatriz: "B", angulo: "90°", resultado: "" },
    { generatriz: "C", angulo: "180°", resultado: "" },
    { generatriz: "D", angulo: "270°", resultado: "" },
  ]);

  const [casqueteInferior, setCasqueteInferior] = useState<CasqueteMeasurement[]>([
    { generatriz: "A", angulo: "0°", resultado: "" },
    { generatriz: "B", angulo: "90°", resultado: "" },
    { generatriz: "C", angulo: "180°", resultado: "" },
    { generatriz: "D", angulo: "270°", resultado: "" },
  ]);

  const [visualInspection, setVisualInspection] = useState<VisualInspectionRow[]>([...DEFAULT_VISUAL_ROWS]);

  const [asmeCalc, setAsmeCalc] = useState<AsmeCalc>({
    presionDiseno: "", diametroInterior: "", tensionAdmisible: "1200", eficienciaJuntas: "1", sobreespesorCorrosion: "1", espesorMinimoMedido: ""
  });

  const [conclusiones, setConclusiones] = useState("");
  const [recomendaciones, setRecomendaciones] = useState("");
  const [elementosSeguridad, setElementosSeguridad] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [fechaInforme, setFechaInforme] = useState(new Date().toISOString().split('T')[0]);

  const handleImportClient = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (client) {
      setCompany({
        empresa: client.name || "",
        cuit: client.cuit || "",
        domicilio: client.address || "",
        localidad: client.city || "",
        provincia: client.province || "",
      });
      setImportDialogOpen(false);
      setSelectedClientId("");
      toast({ title: "Datos del cliente importados" });
    }
  };

  const calcEspesorLongitudinal = () => {
    const P = parseFloat(asmeCalc.presionDiseno);
    const D = parseFloat(asmeCalc.diametroInterior);
    const S = parseFloat(asmeCalc.tensionAdmisible);
    const E = parseFloat(asmeCalc.eficienciaJuntas);
    if (isNaN(P) || isNaN(D) || isNaN(S) || isNaN(E)) return "-";
    const t = (P * D) / (2 * S * E - 0.6 * P);
    return t.toFixed(2);
  };

  const calcEspesorCircunferencial = () => {
    const P = parseFloat(asmeCalc.presionDiseno);
    const D = parseFloat(asmeCalc.diametroInterior);
    const S = parseFloat(asmeCalc.tensionAdmisible);
    const E = parseFloat(asmeCalc.eficienciaJuntas);
    if (isNaN(P) || isNaN(D) || isNaN(S) || isNaN(E)) return "-";
    const t = (P * D) / (2 * S * E + 0.4 * P);
    return t.toFixed(2);
  };

  const calcEspesorMinRequerido = () => {
    const tl = parseFloat(calcEspesorLongitudinal());
    const tc = parseFloat(calcEspesorCircunferencial());
    const sc = parseFloat(asmeCalc.sobreespesorCorrosion);
    if (isNaN(tl) || isNaN(tc)) return "-";
    const tMax = Math.max(tl, tc);
    return (tMax + (isNaN(sc) ? 0 : sc)).toFixed(2);
  };

  const calcPMTA = () => {
    const t = parseFloat(asmeCalc.espesorMinimoMedido);
    const D = parseFloat(asmeCalc.diametroInterior);
    const S = parseFloat(asmeCalc.tensionAdmisible);
    const E = parseFloat(asmeCalc.eficienciaJuntas);
    if (isNaN(t) || isNaN(D) || isNaN(S) || isNaN(E)) return "-";
    const pmta = (2 * S * E * t) / (D + 0.6 * t);
    return pmta.toFixed(2);
  };

  const getMinMeasuredEnvelope = () => {
    let min = Infinity;
    envelopeMeasurements.forEach(row => {
      row.valores.forEach(v => {
        const n = parseFloat(v);
        if (!isNaN(n) && n > 0 && n < min) min = n;
      });
    });
    return min === Infinity ? null : min;
  };

  const updateEnvelopeValue = (rowIdx: number, colIdx: number, value: string) => {
    setEnvelopeMeasurements(prev => {
      const updated = [...prev];
      updated[rowIdx] = { ...updated[rowIdx], valores: [...updated[rowIdx].valores] };
      updated[rowIdx].valores[colIdx] = value;
      return updated;
    });
  };

  const addSector = () => {
    setSectorCount(prev => prev + 1);
    setEnvelopeMeasurements(prev => prev.map(row => ({
      ...row,
      valores: [...row.valores, ""]
    })));
  };

  const removeSector = () => {
    if (sectorCount <= 1) return;
    setSectorCount(prev => prev - 1);
    setEnvelopeMeasurements(prev => prev.map(row => ({
      ...row,
      valores: row.valores.slice(0, -1)
    })));
  };

  const validateBeforeExport = (): boolean => {
    if (!company.empresa.trim()) {
      toast({ title: "Datos incompletos", description: "Ingrese el nombre de la empresa", variant: "destructive" });
      return false;
    }
    return true;
  };

  const downloadPDF = () => {
    if (!validateBeforeExport()) return;
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = doc.internal.pageSize.width;
      const ph = doc.internal.pageSize.height;
      const m = 20;
      const cw = pw - m * 2;
      let y = m;

      const addHeader = () => {
        doc.setFillColor(0, 51, 102);
        doc.rect(0, 0, pw, 30, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(255, 255, 255);
        doc.text("INFORME DE CONTROL DE RECIPIENTE", pw / 2, 12, { align: "center" });
        doc.setFontSize(10);
        doc.text("SOMETIDO A PRESIÓN", pw / 2, 19, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`EMPRESA: ${company.empresa}`, pw / 2, 26, { align: "center" });
      };

      const addFooter = (pageNum: number, total: number) => {
        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.text(`Environmental Express Argentina - Pág. ${pageNum}/${total}`, pw / 2, ph - 8, { align: "center" });
      };

      const checkPage = (needed: number) => {
        if (y + needed > ph - 20) {
          doc.addPage();
          y = m;
        }
      };

      const sectionTitle = (title: string) => {
        checkPage(15);
        doc.setFillColor(0, 51, 102);
        doc.rect(m, y, cw, 7, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(title, m + 3, y + 5);
        y += 10;
        doc.setTextColor(50, 50, 50);
      };

      const addField = (label: string, value: string) => {
        checkPage(6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(label, m + 2, y);
        doc.setFont("helvetica", "normal");
        doc.text(value, m + 55, y);
        y += 5;
      };

      addHeader();
      y = 38;

      sectionTitle("1. IDENTIFICACIÓN DE LA EMPRESA");
      addField("Empresa:", company.empresa);
      addField("C.U.I.T.:", company.cuit);
      addField("Domicilio:", company.domicilio);
      addField("Localidad:", company.localidad);
      addField("Provincia:", company.provincia);
      y += 3;

      sectionTitle("2. OBJETO DEL INFORME");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const objText = "Llevar a cabo la medición de espesores por ultrasonido a fin de detectar la corrosión interna y disminución de espesor, en recipientes sometidos a presión, tal como es exigido por el código ASME. Con los datos obtenidos se procede al recálculo de la Presión Máxima de Trabajo Admisible (PMTA).";
      const objLines = doc.splitTextToSize(objText, cw - 4);
      for (const line of objLines) { checkPage(4); doc.text(line, m + 2, y); y += 4; }
      y += 3;

      sectionTitle("3. INSTRUMENTOS DE MEDICIÓN");
      addField("Tipo:", instrument.tipo);
      addField("N° Serie:", instrument.serie);
      addField("Marca:", instrument.marca);
      addField("Modelo:", instrument.modelo);
      addField("Rango:", instrument.rango);
      addField("Medio Acople:", instrument.medioAcople);
      addField("Vto. Calibración:", instrument.fechaCalibracion);
      addField("N° Certificado:", instrument.certificado);
      y += 3;

      sectionTitle("4. TRANSDUCTOR");
      addField("Tipo:", transducer.tipo);
      addField("N° Serie:", transducer.serie);
      addField("Marca:", transducer.marca);
      addField("Modelo:", transducer.modelo);
      addField("Rango:", transducer.rango);
      y += 3;

      sectionTitle("5. MEMORIA DESCRIPTIVA DEL RECIPIENTE");
      addField("Denominación:", vessel.denominacion);
      addField("Marca:", vessel.marca);
      addField("Modelo:", vessel.modelo);
      addField("N° Serie:", vessel.serie);
      addField("Fluido:", vessel.fluido);
      addField("Capacidad:", vessel.capacidad);
      addField("Diámetro Interno:", vessel.diametroInterno + " mm");
      addField("Altura Total:", vessel.alturaTotal + " mm");
      addField("Casquetes/Tapas:", vessel.tipoCasquetes);
      addField("Material Cuerpo:", vessel.materialCuerpo);
      addField("Presión Trabajo:", vessel.presionTrabajo + " Kg/cm²");
      addField("Presión Prueba:", vessel.presionPruebaHidraulica + " Bar");
      addField("Temp. Trabajo:", `${vessel.temperaturaTrabajoMin}°C / ${vessel.temperaturaTrabajoMax}°C`);
      addField("Norma Diseño:", vessel.normaDiseno);
      y += 3;

      sectionTitle("6. VERIFICACIÓN DE ESPESORES - ASME VIII Div. 1");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      addField("Espesor Long.:", calcEspesorLongitudinal() + " mm");
      addField("Espesor Circ.:", calcEspesorCircunferencial() + " mm");
      addField("Esp. Mín. Req. (c/corr.):", calcEspesorMinRequerido() + " mm");
      addField("Esp. Mín. Medido:", asmeCalc.espesorMinimoMedido + " mm");
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(0, 51, 102);
      checkPage(10);
      doc.text(`PMTA: ${calcPMTA()} Kg/cm²`, pw / 2, y, { align: "center" });
      y += 8;
      doc.setTextColor(50, 50, 50);

      sectionTitle("7. REGISTRO DE MEDICIONES - ENVOLVENTE");
      const envHeaders = ["Ángulo", ...Array.from({ length: sectorCount }, (_, i) => `Sector ${i + 1}`)];
      const envData = envelopeMeasurements.map(row => [row.angulo, ...row.valores.slice(0, sectorCount)]);
      autoTable(doc, {
        startY: y,
        head: [envHeaders],
        body: envData,
        margin: { left: m, right: m },
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        theme: "grid",
      });
      y = (doc as any).lastAutoTable.finalY + 5;

      sectionTitle("8. CASQUETE SUPERIOR");
      const casqSupData = casqueteSuperior.map(r => [r.generatriz, r.angulo, r.resultado]);
      autoTable(doc, {
        startY: y,
        head: [["Generatriz", "Ángulo", "Resultado Prom."]],
        body: casqSupData,
        margin: { left: m, right: m },
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        theme: "grid",
      });
      y = (doc as any).lastAutoTable.finalY + 5;

      sectionTitle("9. CASQUETE INFERIOR");
      const casqInfData = casqueteInferior.map(r => [r.generatriz, r.angulo, r.resultado]);
      autoTable(doc, {
        startY: y,
        head: [["Generatriz", "Ángulo", "Resultado Prom."]],
        body: casqInfData,
        margin: { left: m, right: m },
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        theme: "grid",
      });
      y = (doc as any).lastAutoTable.finalY + 5;

      sectionTitle("10. INSPECCIÓN VISUAL");
      const viData = visualInspection.map(r => [
        r.descripcion,
        r.estado === "bien" ? "X" : "",
        r.estado === "regular" ? "X" : "",
        r.estado === "reparar" ? "X" : "",
        r.observaciones
      ]);
      autoTable(doc, {
        startY: y,
        head: [["Descripción", "Bien", "Regular", "Req. Reparar", "Observaciones"]],
        body: viData,
        margin: { left: m, right: m },
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255 },
        theme: "grid",
      });
      y = (doc as any).lastAutoTable.finalY + 5;

      sectionTitle("11. CONCLUSIONES");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const concLines = doc.splitTextToSize(conclusiones || "-", cw - 4);
      for (const line of concLines) { checkPage(4); doc.text(line, m + 2, y); y += 4; }
      y += 3;

      sectionTitle("12. RECOMENDACIONES");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const recLines = doc.splitTextToSize(recomendaciones || "-", cw - 4);
      for (const line of recLines) { checkPage(4); doc.text(line, m + 2, y); y += 4; }

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter(i, totalPages);
      }

      doc.save(`Informe_Espesores_${company.empresa || "Recipiente"}.pdf`);
      toast({ title: "PDF descargado correctamente" });
    } catch (err) {
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    }
  };

  const downloadDOCX = async () => {
    if (!validateBeforeExport()) return;
    try {
      const children: any[] = [];

      const heading = (text: string, level: number = 1) => new Paragraph({
        children: [new TextRun({ text, bold: true, font: "Arial", size: level === 1 ? 28 : 22, color: "003366" })],
        alignment: level === 1 ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 200, after: 100 },
        border: level === 2 ? { bottom: { style: BorderStyle.SINGLE, size: 1, color: "003366" } } : undefined,
      });

      const field = (label: string, value: string) => new Paragraph({
        children: [
          new TextRun({ text: `${label}: `, bold: true, font: "Arial", size: 20 }),
          new TextRun({ text: value, font: "Arial", size: 20 }),
        ],
        spacing: { after: 60 },
      });

      const bodyText = (text: string) => new Paragraph({
        children: [new TextRun({ text, font: "Arial", size: 20 })],
        spacing: { after: 80 },
      });

      children.push(heading("INFORME DE CONTROL DE RECIPIENTE SOMETIDO A PRESIÓN"));
      children.push(new Paragraph({
        children: [new TextRun({ text: `EMPRESA: ${company.empresa}`, bold: true, font: "Arial", size: 24, color: "003366" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 300 },
      }));

      children.push(heading("1. IDENTIFICACIÓN DE LA EMPRESA", 2));
      children.push(field("Empresa", company.empresa));
      children.push(field("C.U.I.T.", company.cuit));
      children.push(field("Domicilio", company.domicilio));
      children.push(field("Localidad", company.localidad));
      children.push(field("Provincia", company.provincia));

      children.push(heading("2. OBJETO DEL INFORME", 2));
      children.push(bodyText("Llevar a cabo la medición de espesores por ultrasonido a fin de detectar la corrosión interna y disminución de espesor, en recipientes sometidos a presión, tal como es exigido por el código ASME. Con los datos obtenidos se procede al recálculo de la Presión Máxima de Trabajo Admisible (PMTA)."));

      children.push(heading("3. INSTRUMENTOS DE MEDICIÓN", 2));
      children.push(field("Tipo", instrument.tipo));
      children.push(field("N° Serie", instrument.serie));
      children.push(field("Marca", instrument.marca));
      children.push(field("Modelo", instrument.modelo));
      children.push(field("Vto. Calibración", instrument.fechaCalibracion));
      children.push(field("N° Certificado", instrument.certificado));

      children.push(heading("4. MEMORIA DESCRIPTIVA DEL RECIPIENTE", 2));
      children.push(field("Denominación", vessel.denominacion));
      children.push(field("Marca", vessel.marca));
      children.push(field("Modelo", vessel.modelo));
      children.push(field("Fluido", vessel.fluido));
      children.push(field("Capacidad", vessel.capacidad));
      children.push(field("Diámetro Interno", vessel.diametroInterno + " mm"));
      children.push(field("Presión Trabajo", vessel.presionTrabajo + " Kg/cm²"));
      children.push(field("Norma Diseño", vessel.normaDiseno));

      children.push(heading("5. VERIFICACIÓN DE ESPESORES - ASME VIII Div. 1", 2));
      children.push(field("Espesor Mín. Longitudinal", calcEspesorLongitudinal() + " mm"));
      children.push(field("Espesor Mín. Circunferencial", calcEspesorCircunferencial() + " mm"));
      children.push(field("Espesor Mín. Requerido (c/corrosión)", calcEspesorMinRequerido() + " mm"));
      children.push(field("Espesor Mín. Medido", asmeCalc.espesorMinimoMedido + " mm"));
      children.push(new Paragraph({
        children: [new TextRun({ text: `PMTA: ${calcPMTA()} Kg/cm²`, bold: true, font: "Arial", size: 26, color: "003366" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 200 },
      }));

      children.push(heading("6. REGISTRO DE MEDICIONES - ENVOLVENTE", 2));
      const envBorderStyle = { style: BorderStyle.SINGLE, size: 1, color: "999999" } as const;
      const envBorders = { top: envBorderStyle, bottom: envBorderStyle, left: envBorderStyle, right: envBorderStyle };
      const envHeaderCells = ["Ángulo", ...Array.from({ length: sectorCount }, (_, i) => `S${i + 1}`)].map(
        text => new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold: true, font: "Arial", size: 18, color: "FFFFFF" })], alignment: AlignmentType.CENTER })],
          shading: { fill: "003366" },
          borders: envBorders,
          margins: { top: 40, bottom: 40, left: 40, right: 40 },
        })
      );
      const envRows = envelopeMeasurements.map(row => new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: row.angulo, bold: true, font: "Arial", size: 18 })], alignment: AlignmentType.CENTER })],
            borders: envBorders, margins: { top: 40, bottom: 40, left: 40, right: 40 },
          }),
          ...row.valores.slice(0, sectorCount).map(v => new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: v || "-", font: "Arial", size: 18 })], alignment: AlignmentType.CENTER })],
            borders: envBorders, margins: { top: 40, bottom: 40, left: 40, right: 40 },
          })),
        ]
      }));
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: envHeaderCells }), ...envRows] }));

      children.push(heading("7. CONCLUSIONES", 2));
      children.push(bodyText(conclusiones || "-"));

      children.push(heading("8. RECOMENDACIONES", 2));
      children.push(bodyText(recomendaciones || "-"));

      const docx = new Document({
        sections: [{
          properties: {},
          headers: {
            default: new Header({
              children: [new Paragraph({
                children: [new TextRun({ text: "Environmental Express Argentina - Informe de Espesores", font: "Arial", size: 16, color: "999999" })],
                alignment: AlignmentType.RIGHT,
              })],
            }),
          },
          footers: {
            default: new Footer({
              children: [new Paragraph({
                children: [new TextRun({ text: "Environmental Express Argentina - Servicios de Higiene y Seguridad Laboral", font: "Arial", size: 14, color: "999999" })],
                alignment: AlignmentType.CENTER,
              })],
            }),
          },
          children,
        }],
      });

      const blob = await Packer.toBlob(docx);
      saveAs(blob, `Informe_Espesores_${company.empresa || "Recipiente"}.docx`);
      toast({ title: "DOCX descargado correctamente" });
    } catch (err) {
      toast({ title: "Error", description: "No se pudo generar el DOCX", variant: "destructive" });
    }
  };

  const fieldGroup = (label: string, value: string, onChange: (v: string) => void, placeholder?: string, type?: string) => (
    <div className="space-y-1">
      <Label className="text-xs text-gray-600">{label}</Label>
      <Input className="h-8 text-sm" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} type={type} data-testid={`input-${label.toLowerCase().replace(/\s/g, '-')}`} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <h1 className="text-sm font-bold text-blue-900" data-testid="heading-thickness">
            CONTROL DE RECIPIENTE SOMETIDO A PRESIÓN - MEDICIÓN DE ESPESORES
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="button-import-client">
            <FileUp className="h-4 w-4 mr-1" /> Importar Cliente
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPDF} data-testid="button-export-pdf">
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={downloadDOCX} data-testid="button-export-docx">
            <FileDown className="h-4 w-4 mr-1" /> DOCX
          </Button>
        </div>
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Datos del Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger><SelectValue placeholder="Seleccione un cliente..." /></SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportClient} disabled={!selectedClientId}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-auto p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1" data-testid="tabs-list">
            <TabsTrigger value="empresa" className="text-xs">Empresa</TabsTrigger>
            <TabsTrigger value="instrumentos" className="text-xs">Instrumentos</TabsTrigger>
            <TabsTrigger value="recipiente" className="text-xs">Recipiente</TabsTrigger>
            <TabsTrigger value="asme" className="text-xs">Cálculo ASME</TabsTrigger>
            <TabsTrigger value="mediciones" className="text-xs">Mediciones</TabsTrigger>
            <TabsTrigger value="visual" className="text-xs">Insp. Visual</TabsTrigger>
            <TabsTrigger value="conclusiones" className="text-xs">Conclusiones</TabsTrigger>
          </TabsList>

          <TabsContent value="empresa">
            <Card>
              <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                <CardTitle className="text-sm">1. Identificación de la Empresa</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid gap-4 md:grid-cols-2">
                {fieldGroup("Empresa", company.empresa, v => setCompany(p => ({ ...p, empresa: v })), "Nombre de la empresa")}
                {fieldGroup("C.U.I.T.", company.cuit, v => setCompany(p => ({ ...p, cuit: v })), "XX-XXXXXXXX-X")}
                {fieldGroup("Domicilio", company.domicilio, v => setCompany(p => ({ ...p, domicilio: v })))}
                {fieldGroup("Localidad", company.localidad, v => setCompany(p => ({ ...p, localidad: v })))}
                {fieldGroup("Provincia", company.provincia, v => setCompany(p => ({ ...p, provincia: v })))}
                {fieldGroup("Fecha del Informe", fechaInforme, v => setFechaInforme(v), "", "date")}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instrumentos">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                  <CardTitle className="text-sm">Medidor de Espesores Ultrasónico</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4 md:grid-cols-2">
                  {fieldGroup("Tipo", instrument.tipo, v => setInstrument(p => ({ ...p, tipo: v })))}
                  {fieldGroup("N° Serie", instrument.serie, v => setInstrument(p => ({ ...p, serie: v })))}
                  {fieldGroup("Marca", instrument.marca, v => setInstrument(p => ({ ...p, marca: v })), "Ej: KRAUTKRAMER")}
                  {fieldGroup("Modelo", instrument.modelo, v => setInstrument(p => ({ ...p, modelo: v })), "Ej: DM5E")}
                  {fieldGroup("Rango", instrument.rango, v => setInstrument(p => ({ ...p, rango: v })), "Ej: 1-200 mm")}
                  {fieldGroup("Medio de Acople", instrument.medioAcople, v => setInstrument(p => ({ ...p, medioAcople: v })))}
                  {fieldGroup("Vto. Calibración", instrument.fechaCalibracion, v => setInstrument(p => ({ ...p, fechaCalibracion: v })), "", "date")}
                  {fieldGroup("N° Certificado", instrument.certificado, v => setInstrument(p => ({ ...p, certificado: v })))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                  <CardTitle className="text-sm">Transductor</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4 md:grid-cols-2">
                  {fieldGroup("Tipo", transducer.tipo, v => setTransducer(p => ({ ...p, tipo: v })))}
                  {fieldGroup("N° Serie", transducer.serie, v => setTransducer(p => ({ ...p, serie: v })))}
                  {fieldGroup("Marca", transducer.marca, v => setTransducer(p => ({ ...p, marca: v })))}
                  {fieldGroup("Modelo", transducer.modelo, v => setTransducer(p => ({ ...p, modelo: v })), "Ej: DA501")}
                  {fieldGroup("Rango", transducer.rango, v => setTransducer(p => ({ ...p, rango: v })))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                  <CardTitle className="text-sm">Bloque de Calibración</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 grid gap-4 md:grid-cols-2">
                  {fieldGroup("Tipo", block.tipo, v => setBlock(p => ({ ...p, tipo: v })))}
                  {fieldGroup("N° Serie", block.serie, v => setBlock(p => ({ ...p, serie: v })))}
                  {fieldGroup("Marca", block.marca, v => setBlock(p => ({ ...p, marca: v })))}
                  {fieldGroup("Modelo", block.modelo, v => setBlock(p => ({ ...p, modelo: v })))}
                  {fieldGroup("Estándar", block.estandar, v => setBlock(p => ({ ...p, estandar: v })))}
                  {fieldGroup("Rango", block.rango, v => setBlock(p => ({ ...p, rango: v })))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recipiente">
            <Card>
              <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                <CardTitle className="text-sm">Memoria Descriptiva del Recipiente</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {fieldGroup("Denominación", vessel.denominacion, v => setVessel(p => ({ ...p, denominacion: v })), "Ej: Recipiente - Compresor")}
                {fieldGroup("Marca", vessel.marca, v => setVessel(p => ({ ...p, marca: v })))}
                {fieldGroup("Modelo", vessel.modelo, v => setVessel(p => ({ ...p, modelo: v })))}
                {fieldGroup("N° Serie", vessel.serie, v => setVessel(p => ({ ...p, serie: v })))}
                {fieldGroup("Última Inspección", vessel.fechaUltimaInspeccion, v => setVessel(p => ({ ...p, fechaUltimaInspeccion: v })), "", "date")}
                {fieldGroup("Peso (Kg)", vessel.peso, v => setVessel(p => ({ ...p, peso: v })))}
                {fieldGroup("Fluido", vessel.fluido, v => setVessel(p => ({ ...p, fluido: v })), "Ej: Aire")}
                {fieldGroup("Capacidad (L)", vessel.capacidad, v => setVessel(p => ({ ...p, capacidad: v })))}
                {fieldGroup("Diámetro Interno (mm)", vessel.diametroInterno, v => setVessel(p => ({ ...p, diametroInterno: v })))}
                {fieldGroup("Altura Total (mm)", vessel.alturaTotal, v => setVessel(p => ({ ...p, alturaTotal: v })))}
                {fieldGroup("Esp. Mín. Envolvente (mm)", vessel.espesorMinimoEnvolvente, v => setVessel(p => ({ ...p, espesorMinimoEnvolvente: v })))}
                {fieldGroup("Esp. Mín. Casquetes (mm)", vessel.espesorMinimoCasquetes, v => setVessel(p => ({ ...p, espesorMinimoCasquetes: v })))}
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Tipo Casquetes/Tapas</Label>
                  <Select value={vessel.tipoCasquetes} onValueChange={v => setVessel(p => ({ ...p, tipoCasquetes: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Elipsoidal">Elipsoidal</SelectItem>
                      <SelectItem value="Semiesférico">Semiesférico</SelectItem>
                      <SelectItem value="Torisférico">Torisférico</SelectItem>
                      <SelectItem value="Plano">Plano</SelectItem>
                      <SelectItem value="Cónico">Cónico</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {fieldGroup("Material Cuerpo", vessel.materialCuerpo, v => setVessel(p => ({ ...p, materialCuerpo: v })))}
                {fieldGroup("Material Casquetes", vessel.materialCasquetes, v => setVessel(p => ({ ...p, materialCasquetes: v })))}
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Uniones de Chapas</Label>
                  <Select value={vessel.unionesChapas} onValueChange={v => setVessel(p => ({ ...p, unionesChapas: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Soldadas">Soldadas</SelectItem>
                      <SelectItem value="Remachadas">Remachadas</SelectItem>
                      <SelectItem value="Atornilladas">Atornilladas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {fieldGroup("Temp. Mín. Trabajo (°C)", vessel.temperaturaTrabajoMin, v => setVessel(p => ({ ...p, temperaturaTrabajoMin: v })))}
                {fieldGroup("Temp. Máx. Trabajo (°C)", vessel.temperaturaTrabajoMax, v => setVessel(p => ({ ...p, temperaturaTrabajoMax: v })))}
                {fieldGroup("Presión Trabajo (Kg/cm²)", vessel.presionTrabajo, v => setVessel(p => ({ ...p, presionTrabajo: v })))}
                {fieldGroup("Presión Prueba Hidráulica (Bar)", vessel.presionPruebaHidraulica, v => setVessel(p => ({ ...p, presionPruebaHidraulica: v })))}
                {fieldGroup("Origen", vessel.origen, v => setVessel(p => ({ ...p, origen: v })))}
                {fieldGroup("Norma de Diseño", vessel.normaDiseno, v => setVessel(p => ({ ...p, normaDiseno: v })), "Ej: ASME VIII Div. 1")}
              </CardContent>
              <CardContent className="border-t pt-4 space-y-4">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Elementos de Seguridad</Label>
                  <Textarea className="text-sm h-20" value={elementosSeguridad} onChange={e => setElementosSeguridad(e.target.value)} placeholder="Ej: Válvula de Seguridad, Manómetro..." data-testid="textarea-elementos-seguridad" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-600">Comentarios</Label>
                  <Textarea className="text-sm h-20" value={comentarios} onChange={e => setComentarios(e.target.value)} placeholder="Comentarios generales sobre el recipiente..." data-testid="textarea-comentarios" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="asme">
            <Card>
              <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Verificación de Espesores - ASME Sección VIII Div. 1
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-6">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {fieldGroup("P - Presión de Diseño (Kg/cm²)", asmeCalc.presionDiseno, v => setAsmeCalc(p => ({ ...p, presionDiseno: v })))}
                  {fieldGroup("D - Diámetro Interior (mm)", asmeCalc.diametroInterior, v => setAsmeCalc(p => ({ ...p, diametroInterior: v })))}
                  {fieldGroup("S - Tensión Admisible (Kg/cm²)", asmeCalc.tensionAdmisible, v => setAsmeCalc(p => ({ ...p, tensionAdmisible: v })))}
                  {fieldGroup("E - Eficiencia de Juntas", asmeCalc.eficienciaJuntas, v => setAsmeCalc(p => ({ ...p, eficienciaJuntas: v })))}
                  {fieldGroup("Sobreespesor Corrosión (mm)", asmeCalc.sobreespesorCorrosion, v => setAsmeCalc(p => ({ ...p, sobreespesorCorrosion: v })))}
                  {fieldGroup("Espesor Mínimo Medido (mm)", asmeCalc.espesorMinimoMedido, v => setAsmeCalc(p => ({ ...p, espesorMinimoMedido: v })))}
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] text-blue-700 font-medium uppercase">Espesor Longitudinal</p>
                      <p className="text-xl font-bold text-blue-900" data-testid="calc-espesor-long">{calcEspesorLongitudinal()} mm</p>
                      <p className="text-[9px] text-blue-600">t = (P×D) / (2SE - 0,6P)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] text-blue-700 font-medium uppercase">Espesor Circunferencial</p>
                      <p className="text-xl font-bold text-blue-900" data-testid="calc-espesor-circ">{calcEspesorCircunferencial()} mm</p>
                      <p className="text-[9px] text-blue-600">t = (P×D) / (2SE + 0,4P)</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-amber-50 border-amber-200">
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] text-amber-700 font-medium uppercase">Esp. Mín. Requerido</p>
                      <p className="text-xl font-bold text-amber-900" data-testid="calc-espesor-min">{calcEspesorMinRequerido()} mm</p>
                      <p className="text-[9px] text-amber-600">Mayor + sobreespesor corr.</p>
                    </CardContent>
                  </Card>
                  <Card className={cn(
                    "border-2",
                    calcPMTA() !== "-" && parseFloat(calcPMTA()) >= parseFloat(asmeCalc.presionDiseno || "0")
                      ? "bg-green-50 border-green-400"
                      : calcPMTA() !== "-" ? "bg-red-50 border-red-400" : "bg-gray-50 border-gray-200"
                  )}>
                    <CardContent className="p-3 text-center">
                      <p className="text-[10px] font-medium uppercase text-gray-700">PMTA</p>
                      <p className="text-2xl font-bold" data-testid="calc-pmta">{calcPMTA()} Kg/cm²</p>
                      <p className="text-[9px] text-gray-600">P = (2SET) / (D + 0,6T)</p>
                      {calcPMTA() !== "-" && parseFloat(asmeCalc.presionDiseno || "0") > 0 && (
                        <p className={cn("text-xs font-bold mt-1", parseFloat(calcPMTA()) >= parseFloat(asmeCalc.presionDiseno) ? "text-green-700" : "text-red-700")}>
                          {parseFloat(calcPMTA()) >= parseFloat(asmeCalc.presionDiseno) ? "✓ VERIFICA" : "✗ NO VERIFICA"}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mediciones">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                  <CardTitle className="text-sm">Registro de Mediciones - Envolvente</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Button size="sm" variant="outline" onClick={addSector} data-testid="button-add-sector">
                      <Plus className="h-3 w-3 mr-1" /> Sector
                    </Button>
                    <Button size="sm" variant="outline" onClick={removeSector} disabled={sectorCount <= 1} data-testid="button-remove-sector">
                      <Trash2 className="h-3 w-3 mr-1" /> Quitar
                    </Button>
                    <span className="text-xs text-gray-500 ml-2">Valores en mm</span>
                    {getMinMeasuredEnvelope() !== null && (
                      <span className="text-xs font-medium ml-auto text-blue-700">
                        Mín. medido envolvente: {getMinMeasuredEnvelope()?.toFixed(2)} mm
                      </span>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-blue-900 text-white">
                          <th className="border border-blue-800 px-2 py-1 w-20">Ángulo</th>
                          {Array.from({ length: sectorCount }, (_, i) => (
                            <th key={i} className="border border-blue-800 px-2 py-1 min-w-[70px]">Sector {i + 1}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {envelopeMeasurements.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-gray-50">
                            <td className="border px-2 py-0.5 text-center bg-gray-50 font-medium">{row.angulo}</td>
                            {row.valores.slice(0, sectorCount).map((val, colIdx) => (
                              <td key={colIdx} className="border p-0">
                                <Input
                                  className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50 text-center"
                                  type="number"
                                  step="0.01"
                                  value={val}
                                  onChange={e => updateEnvelopeValue(rowIdx, colIdx, e.target.value)}
                                  data-testid={`input-env-${rowIdx}-${colIdx}`}
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                    <CardTitle className="text-sm">Casquete Superior</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-blue-900 text-white">
                          <th className="border border-blue-800 px-2 py-1">Generatriz</th>
                          <th className="border border-blue-800 px-2 py-1">Ángulo</th>
                          <th className="border border-blue-800 px-2 py-1">Resultado Prom.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {casqueteSuperior.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="border px-2 py-0.5 text-center bg-gray-50 font-medium">{row.generatriz}</td>
                            <td className="border px-2 py-0.5 text-center">{row.angulo}</td>
                            <td className="border p-0">
                              <Input
                                className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50 text-center"
                                type="number"
                                step="0.01"
                                value={row.resultado}
                                onChange={e => {
                                  const updated = [...casqueteSuperior];
                                  updated[i] = { ...updated[i], resultado: e.target.value };
                                  setCasqueteSuperior(updated);
                                }}
                                data-testid={`input-casq-sup-${i}`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                    <CardTitle className="text-sm">Casquete Inferior</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-blue-900 text-white">
                          <th className="border border-blue-800 px-2 py-1">Generatriz</th>
                          <th className="border border-blue-800 px-2 py-1">Ángulo</th>
                          <th className="border border-blue-800 px-2 py-1">Resultado Prom.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {casqueteInferior.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            <td className="border px-2 py-0.5 text-center bg-gray-50 font-medium">{row.generatriz}</td>
                            <td className="border px-2 py-0.5 text-center">{row.angulo}</td>
                            <td className="border p-0">
                              <Input
                                className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50 text-center"
                                type="number"
                                step="0.01"
                                value={row.resultado}
                                onChange={e => {
                                  const updated = [...casqueteInferior];
                                  updated[i] = { ...updated[i], resultado: e.target.value };
                                  setCasqueteInferior(updated);
                                }}
                                data-testid={`input-casq-inf-${i}`}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="visual">
            <Card>
              <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                <CardTitle className="text-sm">Inspección Visual</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-900 text-white">
                        <th className="border border-blue-800 px-2 py-1 min-w-[180px] text-left">Descripción</th>
                        <th className="border border-blue-800 px-2 py-1 w-16">Bien</th>
                        <th className="border border-blue-800 px-2 py-1 w-16">Regular</th>
                        <th className="border border-blue-800 px-2 py-1 w-20">Req. Reparar</th>
                        <th className="border border-blue-800 px-2 py-1 min-w-[200px]">Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visualInspection.map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="border px-2 py-1 font-medium bg-gray-50">{row.descripcion}</td>
                          <td className="border p-0 text-center">
                            <input
                              type="radio"
                              name={`visual-${i}`}
                              checked={row.estado === "bien"}
                              onChange={() => {
                                const updated = [...visualInspection];
                                updated[i] = { ...updated[i], estado: "bien" };
                                setVisualInspection(updated);
                              }}
                              className="accent-green-600"
                              data-testid={`radio-bien-${i}`}
                            />
                          </td>
                          <td className="border p-0 text-center">
                            <input
                              type="radio"
                              name={`visual-${i}`}
                              checked={row.estado === "regular"}
                              onChange={() => {
                                const updated = [...visualInspection];
                                updated[i] = { ...updated[i], estado: "regular" };
                                setVisualInspection(updated);
                              }}
                              className="accent-yellow-600"
                              data-testid={`radio-regular-${i}`}
                            />
                          </td>
                          <td className="border p-0 text-center">
                            <input
                              type="radio"
                              name={`visual-${i}`}
                              checked={row.estado === "reparar"}
                              onChange={() => {
                                const updated = [...visualInspection];
                                updated[i] = { ...updated[i], estado: "reparar" };
                                setVisualInspection(updated);
                              }}
                              className="accent-red-600"
                              data-testid={`radio-reparar-${i}`}
                            />
                          </td>
                          <td className="border p-0">
                            <Input
                              className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50"
                              value={row.observaciones}
                              onChange={e => {
                                const updated = [...visualInspection];
                                updated[i] = { ...updated[i], observaciones: e.target.value };
                                setVisualInspection(updated);
                              }}
                              data-testid={`input-vi-obs-${i}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conclusiones">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                  <CardTitle className="text-sm">Conclusiones</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <Textarea
                    className="min-h-[120px] text-sm"
                    value={conclusiones}
                    onChange={e => setConclusiones(e.target.value)}
                    placeholder="Ej: El equipo inspeccionado se encuentra en condiciones de trabajar a la presión que actualmente desarrolla..."
                    data-testid="textarea-conclusiones"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                  <CardTitle className="text-sm">Recomendaciones</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <Textarea
                    className="min-h-[120px] text-sm"
                    value={recomendaciones}
                    onChange={e => setRecomendaciones(e.target.value)}
                    placeholder="Ej: Calibrar el dispositivo de alivio de presión anualmente. Repetir el presente estudio en 1 año..."
                    data-testid="textarea-recomendaciones"
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
