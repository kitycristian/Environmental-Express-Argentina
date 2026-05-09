import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Save, FileDown, FileUp, Database } from "lucide-react";
import { useClients } from "@/lib/hooks";
import { useToast } from "@/hooks/use-toast";
// @ts-ignore
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
// @ts-ignore
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Header, Footer } from "docx";
// @ts-ignore
import { saveAs } from "file-saver";
import { useStore } from "@/lib/store";
import { useMeasurementStore, NoiseRow, NoiseCompany } from "@/lib/measurement-store";

type CompanyData = NoiseCompany;

export default function NoiseSheet() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const {
    noiseRows, setNoiseRows,
    noiseCompany, setNoiseCompany,
    noiseObs, setNoiseObs,
    noiseConc, setNoiseConc,
    noiseRec, setNoiseRec,
  } = useMeasurementStore();

  const [rows, setRows] = useState<NoiseRow[]>(noiseRows);
  const [company, setCompany] = useState<CompanyData>(noiseCompany);
  const [observacionesGenerales, setObservacionesGenerales] = useState(noiseObs);
  const [conclusiones, setConclusiones] = useState(noiseConc);
  const [recomendaciones, setRecomendaciones] = useState(noiseRec);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'datos' | 'empresa' | 'instrumentos'>('datos');
  const { data: clients = [] } = useClients();
  const digitalSignature = useStore((state) => state.digitalSignature);
  const signatoryName = useStore((state) => state.signatoryName);
  const signatoryTitle = useStore((state) => state.signatoryTitle);
  const signatoryRegistration = useStore((state) => state.signatoryRegistration);

  useEffect(() => { setNoiseRows(rows); }, [rows]);
  useEffect(() => { setNoiseCompany(company); }, [company]);
  useEffect(() => { setNoiseObs(observacionesGenerales); }, [observacionesGenerales]);
  useEffect(() => { setNoiseConc(conclusiones); }, [conclusiones]);
  useEffect(() => { setNoiseRec(recomendaciones); }, [recomendaciones]);

  const handleImportSectors = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (client && Array.isArray(client.sectors)) {
      const newRows = (client.sectors as string[]).map((sectorName, index) => ({
        id: String(rows.length + index + 1),
        sector: sectorName,
        puestoTrabajo: "", tiempoExposicion: "", tiempoIntegracion: "", tipoRuido: "", valorMedido: "", unidad: "dBA", dosisRuido: "", limitePermisible: "85", fraccion: "", cumple: "", observaciones: ""
      }));
      setRows([...rows, ...newRows]);
      setImportDialogOpen(false);
      setSelectedClientId("");
    }
  };

  const loadSampleData = () => {
    setCompany({
      razonSocial: "DORINKA SRL (Store #1026 Catamarca)",
      direccion: "Av. Villafañez y Dr. Manuel Navarro S/N",
      localidad: "San Fernando del Valle de Catamarca",
      provincia: "Catamarca",
      cp: "4700",
      cuit: "30-67813830-0",
      fechaMedicion: "26/03/2024",
      horaInicio: "14:00",
      horaFin: "18:50",
      jornadaLaboral: "8 Horas",
      turnos: "2 Turnos de Trabajo. 6:00 AM - 23:30 PM",
      instrumento1: "Decibelímetro Integrador - TES 1353H",
      instrumento1Serie: "130105756",
      instrumento1Cert: "24R00000809",
      instrumento1FechaCal: "05/02/2024",
      instrumento2: "Dosímetro de Ruido - CRIFFER Sonus 2 Plus",
      instrumento2Serie: "180316",
      instrumento2Cert: "24R00000808",
      instrumento2FechaCal: "07/02/2024",
      condicionesNormales: "Fuentes de ruido: Generador Eléctrico, Compresor Rack Frío, Herramientas Manuales Eléctricas (Amoladora, Taladro), Muzak",
      condicionesMedicion: "Equipos funcionando en condiciones normales de operación"
    });
    setRows([
      { id: "1", sector: "Generador (Sala Máquinas)", puestoTrabajo: "Op. MTO", tiempoExposicion: "0.5 Hs", tiempoIntegracion: "0.5 Hs", tipoRuido: "Continuo", valorMedido: "LAeq=105.6", unidad: "dBA", dosisRuido: "-", limitePermisible: "85 dBA", fraccion: "C/T=8", cumple: "NO", observaciones: "Ingreso solo MTO. Protector auditivo obligatorio" },
      { id: "2", sector: "Autocenter", puestoTrabajo: "Asociado de Autocenter", tiempoExposicion: "6 Hs", tiempoIntegracion: "6 Hs", tipoRuido: "Intermitente", valorMedido: "LAeq=83.0", unidad: "dBA", dosisRuido: "-", limitePermisible: "85 dBA", fraccion: "C/T=0.8", cumple: "SI", observaciones: "MTO liviano de vehículos" },
      { id: "3", sector: "Autocenter", puestoTrabajo: "(Impulso)", tiempoExposicion: "2.13 min", tiempoIntegracion: "2.13 min", tipoRuido: "Impulso", valorMedido: "LCpico=98.7", unidad: "dBC", dosisRuido: "-", limitePermisible: "135 dBC", fraccion: "-", cumple: "SI", observaciones: "Llave de impacto. LC Pico" },
      { id: "4", sector: "Rack Frío (Sala Máquinas)", puestoTrabajo: "Op. Servicios Generales", tiempoExposicion: "0.25 Hs", tiempoIntegracion: "0.25 Hs", tipoRuido: "Continuo", valorMedido: "LAeq=87.6", unidad: "dBA", dosisRuido: "-", limitePermisible: "85 dBA", fraccion: "C/T=0.1", cumple: "SI", observaciones: "Ingreso solo MTO" },
      { id: "5", sector: "Carnicería", puestoTrabajo: "Op. Carnicería", tiempoExposicion: "1 Hr", tiempoIntegracion: "1 Hr", tipoRuido: "Continuo", valorMedido: "LAeq=86.1", unidad: "dBA", dosisRuido: "-", limitePermisible: "85 dBA", fraccion: "C/T=0.3", cumple: "SI", observaciones: "Sierra eléctrica vertical" },
      { id: "6", sector: "Recepción", puestoTrabajo: "Asociado de Recepción", tiempoExposicion: "3 Hs", tiempoIntegracion: "3 Hs", tipoRuido: "Intermitente", valorMedido: "-", unidad: "dBA", dosisRuido: "Dosis=59%", limitePermisible: "-", fraccion: "-", cumple: "SI", observaciones: "Dosimetría" }
    ]);
    setConclusiones("Analizando las mediciones de ruido y siguiendo los lineamientos de la Res. MTEySS N° 295/2003 y Resolución SRT N° 85/2012, las fracciones de dosis no superan la unidad (∑C/T = 0.3 + 0.8 + 0.1 + 0.3 = 1.5 — NOTA: la fracción del generador se evalúa por separado ya que es un ingreso esporádico con protección auditiva obligatoria). Los puestos de trabajo CUMPLEN con los valores límite permisibles, excepto el sector Generador donde el nivel sonoro excede el límite para el tiempo de exposición, requiriendo uso obligatorio de protección auditiva.");
    setRecomendaciones("Uso obligatorio de protección auditiva tipo copa NRR≥25dB para ingreso a sala de máquinas/generador. Señalización de uso obligatorio de protección auditiva. Capacitación sobre conservación auditiva. Medición anual de ruido. Mantenimiento preventivo de compresores y generador.");
    setObservacionesGenerales("Condiciones normales de operación. Fuentes de ruido: Generador Eléctrico, Compresor Rack Frío, Herramientas Manuales Eléctricas (Amoladora, Taladro), Muzak. Equipos funcionando en condiciones normales de operación.");
    toast({ title: "Datos cargados", description: "Se importaron 6 puntos de medición de ruido - DORINKA SRL" });
  };

  const addRow = () => {
    setRows([...rows, {
      id: String(Date.now()),
      sector: "", puestoTrabajo: "", tiempoExposicion: "", tiempoIntegracion: "", tipoRuido: "", valorMedido: "", unidad: "dBA", dosisRuido: "", limitePermisible: "85", fraccion: "", cumple: "", observaciones: ""
    }]);
  };

  const updateRow = (id: string, field: keyof NoiseRow, value: string) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        return updated;
      }
      return row;
    }));
  };

  const deleteRow = (id: string) => {
    if (rows.length > 1) setRows(rows.filter(row => row.id !== id));
  };

  const downloadPDF = () => {
    if (!company.razonSocial.trim()) {
      toast({ title: "Datos incompletos", description: "Complete los datos de la empresa primero", variant: "destructive" });
      return;
    }
    try {
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pw = doc.internal.pageSize.width;
      const ph = doc.internal.pageSize.height;
      const m = 15;
      const cw = pw - m * 2;
      let y = 0;

      const addHeader = () => {
        doc.setFillColor(0, 51, 102);
        doc.rect(0, 0, pw, 25, "F");
        doc.setTextColor(255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", pw / 2, 10, { align: "center" });
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("Resolución SRT N° 85/2012 - MTEySS N° 295/2003", pw / 2, 16, { align: "center" });
        doc.text("ENVIRONMENTAL EXPRESS ARGENTINA", pw / 2, 21, { align: "center" });
        doc.setTextColor(0);
        y = 30;
      };

      const addFooter = () => {
        const pn = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setDrawColor(0, 51, 102);
        doc.setLineWidth(0.5);
        doc.line(m, ph - 15, pw - m, ph - 15);
        doc.setFontSize(7);
        doc.setTextColor(100);
        doc.text("Environmental Express Argentina - Servicios de Higiene y Seguridad Laboral", m, ph - 10);
        doc.text(`Página ${pn}`, pw - m, ph - 10, { align: "right" });
      };

      const checkPage = (need: number) => {
        if (y + need > ph - 25) {
          addFooter();
          doc.addPage();
          addHeader();
        }
      };

      const sectionTitle = (text: string) => {
        checkPage(15);
        doc.setFillColor(0, 51, 102);
        doc.rect(m, y, cw, 7, "F");
        doc.setTextColor(255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(text, m + 3, y + 5);
        doc.setTextColor(0);
        y += 10;
      };

      const labelValue = (label: string, value: string) => {
        checkPage(6);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(label + ":", m, y);
        doc.setFont("helvetica", "normal");
        doc.text(value, m + doc.getTextWidth(label + ": ") + 1, y);
        y += 5;
      };

      addHeader();

      sectionTitle("DATOS DEL ESTABLECIMIENTO");
      labelValue("Razón Social", company.razonSocial);
      labelValue("Dirección", company.direccion);
      labelValue("Localidad", `${company.localidad} - ${company.provincia} - C.P.: ${company.cp}`);
      labelValue("C.U.I.T.", company.cuit);
      labelValue("Jornada Laboral", company.jornadaLaboral);
      labelValue("Turnos Habituales", company.turnos);

      sectionTitle("DATOS PARA LA MEDICIÓN");
      labelValue("Instrumento 1", `${company.instrumento1} | Serie: ${company.instrumento1Serie}`);
      labelValue("Certificado Cal.", `${company.instrumento1Cert} - Fecha: ${company.instrumento1FechaCal}`);
      if (company.instrumento2) {
        labelValue("Instrumento 2", `${company.instrumento2} | Serie: ${company.instrumento2Serie}`);
        labelValue("Certificado Cal.", `${company.instrumento2Cert} - Fecha: ${company.instrumento2FechaCal}`);
      }
      labelValue("Fecha de medición", company.fechaMedicion);
      labelValue("Horario", `Inicio: ${company.horaInicio} - Fin: ${company.horaFin}`);
      labelValue("Condiciones normales", company.condicionesNormales);
      labelValue("Condiciones de medición", company.condicionesMedicion);

      sectionTitle("DATOS DE LA MEDICIÓN");
      const headers = [["Pto", "Sector/Área", "Puesto de Trabajo", "T.Exp.", "T.Integ.", "Tipo Ruido", "Valor Medido", "Unidad", "Dosis", "Límite", "Fracción", "Cumple", "Observaciones"]];
      const body = rows.map((r, i) => [
        String(i + 1).padStart(2, "0"),
        r.sector,
        r.puestoTrabajo,
        r.tiempoExposicion,
        r.tiempoIntegracion,
        r.tipoRuido,
        r.valorMedido,
        r.unidad,
        r.dosisRuido,
        r.limitePermisible,
        r.fraccion,
        r.cumple,
        r.observaciones
      ]);

      autoTable(doc, {
        startY: y,
        head: headers,
        body: body,
        margin: { left: m, right: m },
        styles: { fontSize: 6.5, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, font: "helvetica" },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontStyle: "bold", halign: "center", valign: "middle" },
        bodyStyles: { halign: "center", valign: "middle" },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 30, halign: "left" },
          2: { cellWidth: 30, halign: "left" },
          11: { fontStyle: "bold" },
          12: { cellWidth: 35, halign: "left" }
        },
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            if (data.column.index === 11) {
              if (data.cell.raw === "SI") {
                data.cell.styles.textColor = [0, 128, 0];
              } else if (data.cell.raw === "NO") {
                data.cell.styles.textColor = [200, 0, 0];
                data.cell.styles.fillColor = [255, 230, 230];
              }
            }
          }
        }
      });

      y = (doc as any).lastAutoTable.finalY + 5;

      if (observacionesGenerales) {
        checkPage(20);
        sectionTitle("INFORMACIÓN ADICIONAL");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(observacionesGenerales, cw);
        doc.text(lines, m, y);
        y += lines.length * 3.5 + 5;
      }

      if (conclusiones) {
        checkPage(25);
        sectionTitle("CONCLUSIONES");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(conclusiones, cw);
        doc.text(lines, m, y);
        y += lines.length * 3.5 + 5;
      }

      if (recomendaciones) {
        checkPage(25);
        sectionTitle("RECOMENDACIONES");
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(recomendaciones, cw);
        doc.text(lines, m, y);
        y += lines.length * 3.5 + 5;
      }

      sectionTitle("VALORES DE REFERENCIA - Límites de Exposición al Ruido (Res. MTEySS 295/2003)");
      const refHeaders = [["Nivel Sonoro (dBA)", "Tiempo Máximo de Exposición"]];
      const refBody = [
        ["85", "8 horas"],
        ["88", "4 horas"],
        ["91", "2 horas"],
        ["94", "1 hora"],
        ["97", "30 minutos"],
        ["100", "15 minutos"],
        ["103", "7.5 minutos"],
        ["106", "3.75 minutos"]
      ];
      autoTable(doc, {
        startY: y,
        head: refHeaders,
        body: refBody,
        margin: { left: m, right: m },
        styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        tableWidth: cw * 0.4
      });

      if (digitalSignature || signatoryName) {
        checkPage(40);
        y += 10;
        if (digitalSignature) {
          try {
            doc.addImage(digitalSignature, 'PNG', pw / 2 - 20, y, 40, 20);
            y += 22;
          } catch (e) {}
        }
        doc.setDrawColor(0, 0, 0);
        doc.line(pw / 2 - 30, y, pw / 2 + 30, y);
        y += 4;
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 0, 0);
        if (signatoryName) doc.text(signatoryName, pw / 2, y, { align: "center" });
        y += 4;
        doc.setFont("helvetica", "normal");
        if (signatoryTitle) doc.text(signatoryTitle, pw / 2, y, { align: "center" });
        y += 4;
        if (signatoryRegistration) doc.text("Mat. " + signatoryRegistration, pw / 2, y, { align: "center" });
      }

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addFooter();
      }

      const fileName = `Ruido_${company.razonSocial.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.pdf`;
      doc.save(fileName);
      toast({ title: "PDF generado", description: fileName });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    }
  };

  const downloadDOCX = async () => {
    if (!company.razonSocial.trim()) {
      toast({ title: "Datos incompletos", description: "Complete los datos de la empresa primero", variant: "destructive" });
      return;
    }
    try {
      const children: any[] = [];

      const heading = (text: string, level: number = 1) => new Paragraph({
        children: [new TextRun({ text, bold: true, font: "Arial", size: level === 1 ? 28 : 22, color: "003366" })],
        spacing: { before: 200, after: 100 },
        alignment: AlignmentType.LEFT
      });

      const labelVal = (label: string, value: string) => new Paragraph({
        children: [
          new TextRun({ text: label + ": ", bold: true, font: "Arial", size: 20 }),
          new TextRun({ text: value, font: "Arial", size: 20 })
        ],
        spacing: { after: 40 }
      });

      const createCell = (text: string, bold = false, opts: any = {}) => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text, bold, font: "Arial", size: opts.size || 16, color: opts.color })],
          alignment: opts.align || AlignmentType.CENTER
        })],
        shading: opts.shading,
        width: opts.width,
        margins: { top: 30, bottom: 30, left: 50, right: 50 }
      });

      children.push(new Paragraph({
        children: [new TextRun({ text: "PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", bold: true, font: "Arial", size: 28, color: "003366" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: "Resolución SRT N° 85/2012 - MTEySS N° 295/2003", font: "Arial", size: 20, color: "666666" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }));

      children.push(heading("Datos del Establecimiento"));
      children.push(labelVal("Razón Social", company.razonSocial));
      children.push(labelVal("Dirección", company.direccion));
      children.push(labelVal("Localidad", `${company.localidad} - ${company.provincia} - C.P.: ${company.cp}`));
      children.push(labelVal("C.U.I.T.", company.cuit));
      children.push(labelVal("Jornada Laboral", company.jornadaLaboral));
      children.push(labelVal("Turnos Habituales", company.turnos));

      children.push(heading("Datos para la Medición"));
      children.push(labelVal("Instrumento 1", `${company.instrumento1} | Serie: ${company.instrumento1Serie}`));
      children.push(labelVal("Certificado", `${company.instrumento1Cert} - Fecha: ${company.instrumento1FechaCal}`));
      if (company.instrumento2) {
        children.push(labelVal("Instrumento 2", `${company.instrumento2} | Serie: ${company.instrumento2Serie}`));
        children.push(labelVal("Certificado", `${company.instrumento2Cert} - Fecha: ${company.instrumento2FechaCal}`));
      }
      children.push(labelVal("Fecha de medición", company.fechaMedicion));
      children.push(labelVal("Horario", `Inicio: ${company.horaInicio} - Fin: ${company.horaFin}`));
      children.push(labelVal("Condiciones normales", company.condicionesNormales));
      children.push(labelVal("Condiciones de medición", company.condicionesMedicion));

      children.push(heading("Datos de la Medición"));

      const headerCells = ["Pto", "Sector", "Puesto", "T.Exp.", "T.Integ.", "Tipo", "Valor", "Ud.", "Dosis", "Límite", "Fracción", "Cumple", "Obs."];
      const headerRow = new TableRow({
        children: headerCells.map(h => createCell(h, true, { shading: { fill: "003366" }, color: "FFFFFF", size: 14 })),
        tableHeader: true
      });

      const dataRows = rows.map((r, i) => new TableRow({
        children: [
          createCell(String(i + 1).padStart(2, "0"), false, { size: 14 }),
          createCell(r.sector, false, { align: AlignmentType.LEFT, size: 14 }),
          createCell(r.puestoTrabajo, false, { align: AlignmentType.LEFT, size: 14 }),
          createCell(r.tiempoExposicion, false, { size: 14 }),
          createCell(r.tiempoIntegracion, false, { size: 14 }),
          createCell(r.tipoRuido, false, { size: 14 }),
          createCell(r.valorMedido, false, { size: 14 }),
          createCell(r.unidad, false, { size: 14 }),
          createCell(r.dosisRuido, false, { size: 14 }),
          createCell(r.limitePermisible, false, { size: 14 }),
          createCell(r.fraccion, false, { size: 14 }),
          createCell(r.cumple, true, { size: 14, color: r.cumple === "SI" ? "008000" : "CC0000" }),
          createCell(r.observaciones, false, { align: AlignmentType.LEFT, size: 14 })
        ]
      }));

      children.push(new Table({
        rows: [headerRow, ...dataRows],
        width: { size: 100, type: WidthType.PERCENTAGE }
      }));

      if (observacionesGenerales) {
        children.push(heading("Información Adicional"));
        children.push(new Paragraph({ children: [new TextRun({ text: observacionesGenerales, font: "Arial", size: 18 })], spacing: { after: 100 } }));
      }
      if (conclusiones) {
        children.push(heading("Conclusiones"));
        children.push(new Paragraph({ children: [new TextRun({ text: conclusiones, font: "Arial", size: 18 })], spacing: { after: 100 } }));
      }
      if (recomendaciones) {
        children.push(heading("Recomendaciones"));
        children.push(new Paragraph({ children: [new TextRun({ text: recomendaciones, font: "Arial", size: 18 })], spacing: { after: 100 } }));
      }

      children.push(heading("Valores de Referencia - Límites de Exposición al Ruido"));
      const refHeaderRow = new TableRow({
        children: [
          createCell("Nivel Sonoro (dBA)", true, { shading: { fill: "003366" }, color: "FFFFFF", size: 16 }),
          createCell("Tiempo Máximo de Exposición", true, { shading: { fill: "003366" }, color: "FFFFFF", size: 16 })
        ],
        tableHeader: true
      });
      const refDataRows = [
        ["85", "8 horas"], ["88", "4 horas"], ["91", "2 horas"], ["94", "1 hora"],
        ["97", "30 minutos"], ["100", "15 minutos"], ["103", "7.5 minutos"], ["106", "3.75 minutos"]
      ].map(([nivel, tiempo]) => new TableRow({
        children: [
          createCell(nivel, false, { size: 16 }),
          createCell(tiempo, false, { size: 16 })
        ]
      }));
      children.push(new Table({
        rows: [refHeaderRow, ...refDataRows],
        width: { size: 50, type: WidthType.PERCENTAGE }
      }));

      if (signatoryName || digitalSignature) {
        children.push(new Paragraph({ spacing: { before: 400 }, children: [] }));
        children.push(new Paragraph({
          children: [new TextRun({ text: "________________________", font: "Arial", size: 20 })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200 }
        }));
        if (signatoryName) {
          children.push(new Paragraph({
            children: [new TextRun({ text: signatoryName, bold: true, font: "Arial", size: 20 })],
            alignment: AlignmentType.CENTER
          }));
        }
        if (signatoryTitle) {
          children.push(new Paragraph({
            children: [new TextRun({ text: signatoryTitle, font: "Arial", size: 18 })],
            alignment: AlignmentType.CENTER
          }));
        }
        if (signatoryRegistration) {
          children.push(new Paragraph({
            children: [new TextRun({ text: "Mat. " + signatoryRegistration, font: "Arial", size: 18 })],
            alignment: AlignmentType.CENTER
          }));
        }
      }

      const docFile = new Document({
        sections: [{
          properties: { page: { margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
          headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: `${company.razonSocial} - Ruido Laboral`, italics: true, size: 16, color: "999999" })], alignment: AlignmentType.RIGHT })] }) },
          footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "Environmental Express Argentina - Protocolo de Ruido - Res. SRT 85/2012", size: 14, color: "999999" })], alignment: AlignmentType.CENTER })] }) },
          children
        }]
      });

      const blob = await Packer.toBlob(docFile);
      saveAs(blob, `Ruido_${company.razonSocial.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.docx`);
      toast({ title: "DOCX generado" });
    } catch (e) {
      toast({ title: "Error", description: "No se pudo generar el DOCX", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <h1 className="text-sm font-bold text-gray-800" data-testid="heading-noise">PROTOCOLO DE MEDICIÓN DE RUIDO EN AMBIENTE LABORAL</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadSampleData} className="text-orange-600 border-orange-300 hover:bg-orange-50" data-testid="button-load-sample">
            <Database className="h-4 w-4 mr-1" /> Cargar Datos Informe
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="button-import">
            <FileUp className="h-4 w-4 mr-1" /> Importar
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
          <DialogHeader><DialogTitle>Importar Sectores del Cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {clients.filter(c => c.sectors && (c.sectors as string[]).length > 0).length === 0 ? (
              <div className="p-4 text-center text-muted-foreground border rounded-md bg-muted/50">
                <p className="font-medium">No hay clientes con sectores definidos</p>
              </div>
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
        <div className="flex gap-1 mb-3">
          {[
            { key: 'empresa' as const, label: 'Empresa' },
            { key: 'instrumentos' as const, label: 'Instrumentos' },
            { key: 'datos' as const, label: 'Datos de Medición' }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-1.5 text-xs font-medium rounded-t border border-b-0 ${activeTab === tab.key ? 'bg-white text-blue-900 border-gray-300' : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'}`} data-testid={`tab-${tab.key}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'empresa' && (
          <div className="bg-white rounded border shadow-sm p-4 grid grid-cols-2 gap-4">
            <div><label className="text-xs font-medium">Razón Social</label><Input className="mt-1 h-8 text-xs" value={company.razonSocial} onChange={e => setCompany({...company, razonSocial: e.target.value})} data-testid="input-razon-social" /></div>
            <div><label className="text-xs font-medium">C.U.I.T.</label><Input className="mt-1 h-8 text-xs" value={company.cuit} onChange={e => setCompany({...company, cuit: e.target.value})} data-testid="input-cuit" /></div>
            <div><label className="text-xs font-medium">Dirección</label><Input className="mt-1 h-8 text-xs" value={company.direccion} onChange={e => setCompany({...company, direccion: e.target.value})} data-testid="input-direccion" /></div>
            <div><label className="text-xs font-medium">Localidad</label><Input className="mt-1 h-8 text-xs" value={company.localidad} onChange={e => setCompany({...company, localidad: e.target.value})} data-testid="input-localidad" /></div>
            <div><label className="text-xs font-medium">Provincia</label><Input className="mt-1 h-8 text-xs" value={company.provincia} onChange={e => setCompany({...company, provincia: e.target.value})} data-testid="input-provincia" /></div>
            <div><label className="text-xs font-medium">C.P.</label><Input className="mt-1 h-8 text-xs" value={company.cp} onChange={e => setCompany({...company, cp: e.target.value})} data-testid="input-cp" /></div>
            <div><label className="text-xs font-medium">Fecha de Medición</label><Input className="mt-1 h-8 text-xs" value={company.fechaMedicion} onChange={e => setCompany({...company, fechaMedicion: e.target.value})} data-testid="input-fecha" /></div>
            <div><label className="text-xs font-medium">Jornada Laboral</label><Input className="mt-1 h-8 text-xs" value={company.jornadaLaboral} onChange={e => setCompany({...company, jornadaLaboral: e.target.value})} data-testid="input-jornada" /></div>
            <div><label className="text-xs font-medium">Hora Inicio</label><Input className="mt-1 h-8 text-xs" value={company.horaInicio} onChange={e => setCompany({...company, horaInicio: e.target.value})} data-testid="input-hora-inicio" /></div>
            <div><label className="text-xs font-medium">Hora Fin</label><Input className="mt-1 h-8 text-xs" value={company.horaFin} onChange={e => setCompany({...company, horaFin: e.target.value})} data-testid="input-hora-fin" /></div>
            <div className="col-span-2"><label className="text-xs font-medium">Turnos Habituales</label><Input className="mt-1 h-8 text-xs" value={company.turnos} onChange={e => setCompany({...company, turnos: e.target.value})} data-testid="input-turnos" /></div>
            <div className="col-span-2"><label className="text-xs font-medium">Condiciones Normales (Fuentes de Ruido)</label><Textarea className="mt-1 text-xs h-16" value={company.condicionesNormales} onChange={e => setCompany({...company, condicionesNormales: e.target.value})} data-testid="input-condiciones-normales" /></div>
            <div className="col-span-2"><label className="text-xs font-medium">Condiciones de Medición</label><Textarea className="mt-1 text-xs h-16" value={company.condicionesMedicion} onChange={e => setCompany({...company, condicionesMedicion: e.target.value})} data-testid="input-condiciones-medicion" /></div>
          </div>
        )}

        {activeTab === 'instrumentos' && (
          <div className="bg-white rounded border shadow-sm p-4 space-y-4">
            <h3 className="text-xs font-bold text-blue-900 border-b pb-1">Instrumento 1 - Decibelímetro</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium">Descripción</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1} onChange={e => setCompany({...company, instrumento1: e.target.value})} data-testid="input-inst1" /></div>
              <div><label className="text-xs font-medium">N° Serie</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Serie} onChange={e => setCompany({...company, instrumento1Serie: e.target.value})} data-testid="input-inst1-serie" /></div>
              <div><label className="text-xs font-medium">N° Certificado Cal.</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Cert} onChange={e => setCompany({...company, instrumento1Cert: e.target.value})} data-testid="input-inst1-cert" /></div>
              <div><label className="text-xs font-medium">Fecha Calibración</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1FechaCal} onChange={e => setCompany({...company, instrumento1FechaCal: e.target.value})} data-testid="input-inst1-fecha" /></div>
            </div>
            <h3 className="text-xs font-bold text-blue-900 border-b pb-1 pt-2">Instrumento 2 - Dosímetro</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium">Descripción</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2} onChange={e => setCompany({...company, instrumento2: e.target.value})} data-testid="input-inst2" /></div>
              <div><label className="text-xs font-medium">N° Serie</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2Serie} onChange={e => setCompany({...company, instrumento2Serie: e.target.value})} data-testid="input-inst2-serie" /></div>
              <div><label className="text-xs font-medium">N° Certificado Cal.</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2Cert} onChange={e => setCompany({...company, instrumento2Cert: e.target.value})} data-testid="input-inst2-cert" /></div>
              <div><label className="text-xs font-medium">Fecha Calibración</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2FechaCal} onChange={e => setCompany({...company, instrumento2FechaCal: e.target.value})} data-testid="input-inst2-fecha" /></div>
            </div>
          </div>
        )}

        {activeTab === 'datos' && (
          <div className="bg-white rounded border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="border border-blue-800 px-1 py-1 w-8">Pto</th>
                    <th className="border border-blue-800 px-2 py-1 min-w-[130px]">Sector/Área</th>
                    <th className="border border-blue-800 px-2 py-1 min-w-[130px]">Puesto de Trabajo</th>
                    <th className="border border-blue-800 px-1 py-1 w-20">T. Exposición</th>
                    <th className="border border-blue-800 px-1 py-1 w-20">T. Integración</th>
                    <th className="border border-blue-800 px-1 py-1 w-24">Tipo Ruido</th>
                    <th className="border border-blue-800 px-1 py-1 w-24">Valor Medido</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">Unidad</th>
                    <th className="border border-blue-800 px-1 py-1 w-20">Dosis Ruido</th>
                    <th className="border border-blue-800 px-1 py-1 w-20">Límite</th>
                    <th className="border border-blue-800 px-1 py-1 w-20">Fracción</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">Cumple</th>
                    <th className="border border-blue-800 px-2 py-1 min-w-[120px]">Observaciones</th>
                    <th className="border border-blue-800 px-1 py-1 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border px-1 py-0.5 text-center bg-gray-50 font-medium" data-testid={`cell-row-${index}`}>{String(index + 1).padStart(2, "0")}</td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.sector} onChange={e => updateRow(row.id, 'sector', e.target.value)} data-testid={`input-sector-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.puestoTrabajo} onChange={e => updateRow(row.id, 'puestoTrabajo', e.target.value)} data-testid={`input-puesto-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.tiempoExposicion} onChange={e => updateRow(row.id, 'tiempoExposicion', e.target.value)} data-testid={`input-tiempo-exp-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.tiempoIntegracion} onChange={e => updateRow(row.id, 'tiempoIntegracion', e.target.value)} data-testid={`input-tiempo-int-${index}`} /></td>
                      <td className="border p-0">
                        <Select value={row.tipoRuido} onValueChange={v => updateRow(row.id, 'tipoRuido', v)}>
                          <SelectTrigger className="h-6 text-xs border-0 rounded-none" data-testid={`select-tipo-ruido-${index}`}><SelectValue placeholder="-" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Continuo">Continuo</SelectItem>
                            <SelectItem value="Intermitente">Intermitente</SelectItem>
                            <SelectItem value="Impulso">Impulso</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.valorMedido} onChange={e => updateRow(row.id, 'valorMedido', e.target.value)} data-testid={`input-valor-${index}`} /></td>
                      <td className="border p-0">
                        <Select value={row.unidad} onValueChange={v => updateRow(row.id, 'unidad', v)}>
                          <SelectTrigger className="h-6 text-xs border-0 rounded-none" data-testid={`select-unidad-${index}`}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="dBA">dBA</SelectItem>
                            <SelectItem value="dBC">dBC</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.dosisRuido} onChange={e => updateRow(row.id, 'dosisRuido', e.target.value)} data-testid={`input-dosis-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.limitePermisible} onChange={e => updateRow(row.id, 'limitePermisible', e.target.value)} data-testid={`input-limite-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.fraccion} onChange={e => updateRow(row.id, 'fraccion', e.target.value)} data-testid={`input-fraccion-${index}`} /></td>
                      <td className={`border px-1 py-0.5 text-center font-bold text-xs ${row.cumple === 'SI' ? 'bg-green-100 text-green-700' : row.cumple === 'NO' ? 'bg-red-100 text-red-700' : ''}`} data-testid={`cell-cumple-${index}`}>
                        <Select value={row.cumple} onValueChange={v => updateRow(row.id, 'cumple', v)}>
                          <SelectTrigger className="h-6 text-xs border-0 rounded-none" data-testid={`select-cumple-${index}`}><SelectValue placeholder="-" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SI">SI</SelectItem>
                            <SelectItem value="NO">NO</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.observaciones} onChange={e => updateRow(row.id, 'observaciones', e.target.value)} data-testid={`input-obs-${index}`} /></td>
                      <td className="border px-1 py-0.5"><Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-500" onClick={() => deleteRow(row.id)} data-testid={`button-delete-${index}`}><Trash2 className="h-3 w-3" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 border-t space-y-3">
              <Button variant="outline" size="sm" onClick={addRow} data-testid="button-add-row">
                <Plus className="h-4 w-4 mr-1" /> Agregar Fila
              </Button>
              <div><label className="text-xs font-medium text-gray-600">Observaciones / Información Adicional</label><Textarea className="mt-1 text-xs h-16" value={observacionesGenerales} onChange={e => setObservacionesGenerales(e.target.value)} data-testid="textarea-obs" /></div>
              <div><label className="text-xs font-medium text-gray-600">Conclusiones</label><Textarea className="mt-1 text-xs h-20" value={conclusiones} onChange={e => setConclusiones(e.target.value)} data-testid="textarea-conclusiones" /></div>
              <div><label className="text-xs font-medium text-gray-600">Recomendaciones</label><Textarea className="mt-1 text-xs h-20" value={recomendaciones} onChange={e => setRecomendaciones(e.target.value)} data-testid="textarea-recomendaciones" /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
