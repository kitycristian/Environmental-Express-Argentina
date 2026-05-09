import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Save, FileDown, FileUp, Database, AlertTriangle, Camera, X } from "lucide-react";
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

interface ThermalRow {
  id: string;
  sector: string;
  puestoTrabajo: string;
  tipoActividad: string;
  cargaMetabolica: string;
  exposicionHs: string;
  tbs: string;
  tbh: string;
  tg: string;
  tgbh: string;
  tgbhPonderado: string;
  aclimatado: string;
  vla: string;
  vlp: string;
  cumpleVla: string;
  cumpleVlp: string;
  observaciones: string;
}

interface CompanyData {
  razonSocial: string;
  direccion: string;
  localidad: string;
  provincia: string;
  cp: string;
  cuit: string;
  fechaMedicion: string;
  horaInicio: string;
  horaFin: string;
  turnos: string;
  instrumento1: string;
  instrumento1Serie: string;
  instrumento1Cert: string;
  instrumento1FechaCal: string;
  instrumento2: string;
  instrumento2Serie: string;
  instrumento2Cert: string;
  instrumento2FechaCal: string;
  condicionesAtm: string;
}

export default function ThermalSheet() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // ── Store-backed state (persistent localStorage) ──
  const thermalProtocol = useStore((s) => s.thermalProtocol);
  const _setThermalRows = useStore((s) => s.setThermalRows);
  const _updateThermalCompany = useStore((s) => s.updateThermalCompany);
  const _updateThermalText = useStore((s) => s.updateThermalText);
  const rows = thermalProtocol.rows;
  const setRows = _setThermalRows;
  const company = thermalProtocol.company;
  const setCompany = (data: any) => _updateThermalCompany(typeof data === "function" ? data(thermalProtocol.company) : data);
  const observacionesGenerales = thermalProtocol.observaciones;
  const setObservacionesGenerales = (v: string) => _updateThermalText("observaciones", v);
  const conclusiones = thermalProtocol.conclusiones;
  const setConclusiones = (v: string) => _updateThermalText("conclusiones", v);
  const recomendaciones = thermalProtocol.recomendaciones;
  const setRecomendaciones = (v: string) => _updateThermalText("recomendaciones", v);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'datos' | 'empresa' | 'instrumentos' | 'fotos'>('datos');
  const [sectorPhotos, setSectorPhotos] = useState<Record<string, string[]>>({});
  const { data: clients = [] } = useClients();
  const digitalSignature = useStore((state) => state.digitalSignature);
  const signatoryName = useStore((state) => state.signatoryName);
  const signatoryTitle = useStore((state) => state.signatoryTitle);
  const signatoryRegistration = useStore((state) => state.signatoryRegistration);

  // ── Derived validations ─────────────────────────────────────────────────────
  const missingCalibration = !company.instrumento1Cert.trim() || !company.instrumento1FechaCal.trim();
  const vlaAlerts = rows.filter(r => {
    const tm = parseFloat(r.cargaMetabolica);
    const tgbh = parseFloat(r.tgbhPonderado || r.tgbh);
    return !isNaN(tm) && !isNaN(tgbh) && tm >= 252 && tgbh > 26;
  });

  const handleImportSectors = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (client && Array.isArray(client.sectors)) {
      const newRows = (client.sectors as string[]).map((sectorName, index) => ({
        id: String(rows.length + index + 1),
        sector: sectorName,
        puestoTrabajo: "", tipoActividad: "", cargaMetabolica: "", exposicionHs: "", tbs: "", tbh: "", tg: "", tgbh: "", tgbhPonderado: "", aclimatado: "SI", vla: "", vlp: "", cumpleVla: "", cumpleVlp: "", observaciones: ""
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
      turnos: "2 Turnos de Trabajo. 6:00 AM - 23:30 PM",
      instrumento1: "Monitor de Carga Térmica - TES 1639B",
      instrumento1Serie: "130308165",
      instrumento1Cert: "24R00000820",
      instrumento1FechaCal: "05/02/2024",
      instrumento2: "Termohigrobárómetro - EXTECH SD700",
      instrumento2Serie: "A.070301",
      instrumento2Cert: "24R00000833",
      instrumento2FechaCal: "06/02/2024",
      condicionesAtm: "Temperatura: 33,3 °C | Humedad: 43,2% | Presión Atmosférica: 713,4 mmHg"
    });
    setRows([
      { id: "1", sector: "Panadería", puestoTrabajo: "Asociado de Panadería", tipoActividad: "liviana", cargaMetabolica: "153", exposicionHs: "4", tbs: "29.2", tbh: "29.4", tg: "30.1", tgbh: "29.6", tgbhPonderado: "26.1", aclimatado: "SI", vla: "29.0", vlp: "31.5", cumpleVla: "SI", cumpleVlp: "SI", observaciones: "Horno rotativo operativo a 253°C" },
      { id: "2", sector: "Rotisería", puestoTrabajo: "Asociado de Rotisería", tipoActividad: "liviana", cargaMetabolica: "153", exposicionHs: "4", tbs: "29.2", tbh: "29.2", tg: "29.3", tgbh: "29.2", tgbhPonderado: "25.9", aclimatado: "SI", vla: "29.0", vlp: "31.5", cumpleVla: "SI", cumpleVlp: "SI", observaciones: "Horno eléctrico a 51°C" },
      { id: "3", sector: "Salón de Ventas", puestoTrabajo: "Cajero", tipoActividad: "liviana", cargaMetabolica: "216", exposicionHs: "7", tbs: "22.1", tbh: "22.2", tg: "23.4", tgbh: "22.5", tgbhPonderado: "22.5", aclimatado: "SI", vla: "29.8", vlp: "26.9", cumpleVla: "SI", cumpleVlp: "SI", observaciones: "Refrigeración operativa" },
      { id: "4", sector: "Autocenter", puestoTrabajo: "Asociado de Autocenter", tipoActividad: "moderada", cargaMetabolica: "252", exposicionHs: "5", tbs: "33.5", tbh: "33.0", tg: "32.4", tgbh: "32.8", tgbhPonderado: "27.7", aclimatado: "SI", vla: "26.0", vlp: "29.0", cumpleVla: "NO", cumpleVlp: "SI", observaciones: "MTO liviano en vehículos" },
      { id: "5", sector: "Salón de Ventas", puestoTrabajo: "Repositor", tipoActividad: "moderada", cargaMetabolica: "243", exposicionHs: "6", tbs: "25.1", tbh: "26.3", tg: "28.8", tgbh: "26.9", tgbhPonderado: "25.8", aclimatado: "SI", vla: "26.2", vlp: "29.2", cumpleVla: "SI", cumpleVlp: "SI", observaciones: "Góndola de alimentos" }
    ]);
    setConclusiones("Analizando el índice TGBHindoor ponderado y siguiendo los lineamientos de la Res. SRT N° 30/2023, se puede decir que los puestos de ASOCIADO DE PANADERÍA, ASOCIADO DE ROTISERÍA, CAJERO y REPOSITOR CUMPLEN el Valor Límite de Acción (VLA) y el Valor Límite Permisible (VLP). El puesto de ASOCIADO DE AUTOCENTER CUMPLE el VLP pero NO CUMPLE el VLA, con lo cual se deberán implementar controles generales.");
    setRecomendaciones("Implementar sistema de mantenimiento preventivo en sistemas de extracción e inyección de aire. Evaluar posibilidad de inyectar aire refrigerado en sector panadería. Programar uso de hornos/friteras para evitar simultaneidad. Proveer agua fría en puestos de trabajo. Permitir autolimitación de exposiciones.");
    setObservacionesGenerales("TGBH Ponderado considera que el tiempo restante el operador permanece en el sector refrigerado (Salón de ventas). Personal aclimatado (más de 6 días realizando la tarea). Medición por puesto de trabajo. Ambiente homogéneo (heterogeneidad < 5%).");
    toast({ title: "Datos cargados", description: "Se importaron 5 puntos de medición de carga térmica - DORINKA SRL" });
  };

  const addRow = () => {
    setRows([...rows, {
      id: String(Date.now()),
      sector: "", puestoTrabajo: "", tipoActividad: "", cargaMetabolica: "", exposicionHs: "",
      tbs: "", tbh: "", tg: "", tgbh: "", tgbhPonderado: "", aclimatado: "SI",
      vla: "", vlp: "", cumpleVla: "", cumpleVlp: "", observaciones: ""
    }]);
  };

  const calculateTGBH = (tbh: string, tg: string): string => {
    const tbhVal = parseFloat(tbh);
    const tgVal = parseFloat(tg);
    if (!isNaN(tbhVal) && !isNaN(tgVal)) {
      return (0.7 * tbhVal + 0.3 * tgVal).toFixed(1);
    }
    return "";
  };

  const updateRow = (id: string, field: keyof ThermalRow, value: string) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        if (field === 'tbh' || field === 'tg') {
          updated.tgbh = calculateTGBH(updated.tbh, updated.tg);
        }
        if (field === 'tgbh' || field === 'vla' || field === 'tbh' || field === 'tg') {
          const tgbhVal = parseFloat(updated.tgbhPonderado || updated.tgbh);
          const vlaVal = parseFloat(updated.vla);
          if (!isNaN(tgbhVal) && !isNaN(vlaVal)) {
            updated.cumpleVla = tgbhVal <= vlaVal ? "SI" : "NO";
          }
        }
        if (field === 'tgbh' || field === 'vlp' || field === 'tbh' || field === 'tg') {
          const tgbhVal = parseFloat(updated.tgbhPonderado || updated.tgbh);
          const vlpVal = parseFloat(updated.vlp);
          if (!isNaN(tgbhVal) && !isNaN(vlpVal)) {
            updated.cumpleVlp = tgbhVal <= vlpVal ? "SI" : "NO";
          }
        }
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
    if (missingCalibration) {
      toast({ title: "Certificado de calibración incompleto", description: "Complete el N° de certificado y fecha de calibración del instrumento 1 antes de exportar.", variant: "destructive" });
      setActiveTab('instrumentos');
      return;
    }
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = doc.internal.pageSize.width;
      const ph = doc.internal.pageSize.height;
      const m = 20;
      const cw = pw - m * 2;
      let y = 0;

      const addHeader = () => {
        doc.setFillColor(0, 51, 102);
        doc.rect(0, 0, pw, 25, "F");
        doc.setTextColor(255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.text("INFORME DE MEDICIÓN DE CARGA TÉRMICA EN EL AMBIENTE LABORAL", pw / 2, 10, { align: "center" });
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.text("Resolución SRT N° 30/2023", pw / 2, 16, { align: "center" });
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

      sectionTitle("DATOS PARA LA MEDICIÓN");
      labelValue("Instrumento 1", `${company.instrumento1} | Serie: ${company.instrumento1Serie}`);
      labelValue("Certificado Cal.", `${company.instrumento1Cert} - Fecha: ${company.instrumento1FechaCal}`);
      if (company.instrumento2) {
        labelValue("Instrumento 2", `${company.instrumento2} | Serie: ${company.instrumento2Serie}`);
        labelValue("Certificado Cal.", `${company.instrumento2Cert} - Fecha: ${company.instrumento2FechaCal}`);
      }
      labelValue("Fecha de medición", company.fechaMedicion);
      labelValue("Horario", `Inicio: ${company.horaInicio} - Fin: ${company.horaFin}`);
      labelValue("Turnos habituales", company.turnos);
      labelValue("Condiciones Atmosféricas", company.condicionesAtm);

      sectionTitle("DATOS DE LA MEDICIÓN");
      const headers = [["Pto", "Sector", "Puesto", "Exp.(h)", "TBS\n(°C)", "TBH\n(°C)", "TG\n(°C)", "TGBH\n(°C)", "TGBH\nPond.", "Aclim.", "TM\n(W)", "VLA", "VLP", "¿<VLA?", "¿<VLP?"]];
      const body = rows.map((r, i) => [
        String(i + 1).padStart(2, "0"),
        r.sector,
        r.puestoTrabajo,
        r.exposicionHs,
        r.tbs,
        r.tbh,
        r.tg,
        r.tgbh,
        r.tgbhPonderado,
        r.aclimatado,
        r.cargaMetabolica,
        r.vla,
        r.vlp,
        r.cumpleVla,
        r.cumpleVlp
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
          1: { cellWidth: 22, halign: "left" },
          2: { cellWidth: 25, halign: "left" },
          13: { fontStyle: "bold" },
          14: { fontStyle: "bold" }
        },
        didParseCell: (data: any) => {
          if (data.section === 'body') {
            if (data.column.index === 13 || data.column.index === 14) {
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

      sectionTitle("VALORES DE REFERENCIA - Res. SRT 30/2023");
      const refHeaders = [["Categoría", "Tasa Metabólica (W)", "Rango"]];
      const refBody = [
        ["0 - Descanso", "115", "100 a 125"],
        ["1 - Ligero", "180", "126 a 235"],
        ["2 - Moderado", "300", "236 a 360"],
        ["3 - Pesado", "415", "361 a 465"],
        ["4 - Muy Pesado", "520", "> 466"]
      ];
      autoTable(doc, {
        startY: y,
        head: refHeaders,
        body: refBody,
        margin: { left: m, right: m },
        styles: { fontSize: 7, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255] },
        tableWidth: cw * 0.6
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

      const fileName = `Carga_Termica_${company.razonSocial.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.pdf`;
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
        children: [new TextRun({ text: "INFORME DE MEDICIÓN DE CARGA TÉRMICA EN EL AMBIENTE LABORAL", bold: true, font: "Arial", size: 28, color: "003366" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: "Resolución SRT N° 30/2023", font: "Arial", size: 20, color: "666666" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }));

      children.push(heading("Datos del Establecimiento"));
      children.push(labelVal("Razón Social", company.razonSocial));
      children.push(labelVal("Dirección", company.direccion));
      children.push(labelVal("Localidad", `${company.localidad} - ${company.provincia} - C.P.: ${company.cp}`));
      children.push(labelVal("C.U.I.T.", company.cuit));

      children.push(heading("Datos para la Medición"));
      children.push(labelVal("Instrumento 1", `${company.instrumento1} | Serie: ${company.instrumento1Serie}`));
      children.push(labelVal("Certificado", `${company.instrumento1Cert} - Fecha: ${company.instrumento1FechaCal}`));
      if (company.instrumento2) {
        children.push(labelVal("Instrumento 2", `${company.instrumento2} | Serie: ${company.instrumento2Serie}`));
        children.push(labelVal("Certificado", `${company.instrumento2Cert} - Fecha: ${company.instrumento2FechaCal}`));
      }
      children.push(labelVal("Fecha de medición", company.fechaMedicion));
      children.push(labelVal("Horario", `Inicio: ${company.horaInicio} - Fin: ${company.horaFin}`));
      children.push(labelVal("Condiciones Atmosféricas", company.condicionesAtm));

      children.push(heading("Datos de la Medición"));

      const headerCells = ["Pto", "Sector", "Puesto", "Exp.(h)", "TBS(°C)", "TBH(°C)", "TG(°C)", "TGBH(°C)", "TGBHp", "Aclim.", "TM(W)", "VLA", "VLP", "¿<VLA?", "¿<VLP?"];
      const headerRow = new TableRow({
        children: headerCells.map(h => createCell(h, true, { shading: { fill: "003366" }, color: "FFFFFF", size: 14 })),
        tableHeader: true
      });

      const dataRows = rows.map((r, i) => new TableRow({
        children: [
          createCell(String(i + 1).padStart(2, "0"), false, { size: 14 }),
          createCell(r.sector, false, { align: AlignmentType.LEFT, size: 14 }),
          createCell(r.puestoTrabajo, false, { align: AlignmentType.LEFT, size: 14 }),
          createCell(r.exposicionHs, false, { size: 14 }),
          createCell(r.tbs, false, { size: 14 }),
          createCell(r.tbh, false, { size: 14 }),
          createCell(r.tg, false, { size: 14 }),
          createCell(r.tgbh, false, { size: 14 }),
          createCell(r.tgbhPonderado, false, { size: 14 }),
          createCell(r.aclimatado, false, { size: 14 }),
          createCell(r.cargaMetabolica, false, { size: 14 }),
          createCell(r.vla, false, { size: 14 }),
          createCell(r.vlp, false, { size: 14 }),
          createCell(r.cumpleVla, true, { size: 14, color: r.cumpleVla === "SI" ? "008000" : "CC0000" }),
          createCell(r.cumpleVlp, true, { size: 14, color: r.cumpleVlp === "SI" ? "008000" : "CC0000" })
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
          headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: `${company.razonSocial} - Carga Térmica`, italics: true, size: 16, color: "999999" })], alignment: AlignmentType.RIGHT })] }) },
          footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "Environmental Express Argentina - Informe de Carga Térmica - Res. SRT 30/2023", size: 14, color: "999999" })], alignment: AlignmentType.CENTER })] }) },
          children
        }]
      });

      const blob = await Packer.toBlob(docFile);
      saveAs(blob, `Carga_Termica_${company.razonSocial.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.docx`);
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
          <h1 className="text-sm font-bold text-gray-800" data-testid="heading-thermal">PROTOCOLO DE MEDICIÓN DE CARGA TÉRMICA (Res. SRT 30/2023)</h1>
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

      {vlaAlerts.length > 0 && (
        <div className="bg-amber-50 border-b border-amber-300 px-4 py-2 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-xs text-amber-800">
            <span className="font-bold">ALERTA VLA:</span> {vlaAlerts.length} puesto(s) con TM ≥ 252 W y TGBH &gt; 26°C superan el Valor Límite de Acción.{" "}
            {vlaAlerts.map(r => r.sector || r.puestoTrabajo).filter(Boolean).join(", ")}
          </div>
        </div>
      )}

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
            { key: 'instrumentos' as const, label: missingCalibration ? '⚠ Instrumentos' : 'Instrumentos' },
            { key: 'datos' as const, label: 'Datos de Medición' },
            { key: 'fotos' as const, label: 'Fotos' }
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-1.5 text-xs font-medium rounded-t border border-b-0 ${activeTab === tab.key ? 'bg-white border-gray-300 ' + (tab.key === 'instrumentos' && missingCalibration ? 'text-red-700' : 'text-blue-900') : 'bg-gray-100 border-transparent hover:bg-gray-200 ' + (tab.key === 'instrumentos' && missingCalibration ? 'text-red-500' : 'text-gray-500')}`} data-testid={`tab-${tab.key}`}>
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
            <div><label className="text-xs font-medium">Turnos Habituales</label><Input className="mt-1 h-8 text-xs" value={company.turnos} onChange={e => setCompany({...company, turnos: e.target.value})} data-testid="input-turnos" /></div>
            <div><label className="text-xs font-medium">Hora Inicio</label><Input className="mt-1 h-8 text-xs" value={company.horaInicio} onChange={e => setCompany({...company, horaInicio: e.target.value})} data-testid="input-hora-inicio" /></div>
            <div><label className="text-xs font-medium">Hora Fin</label><Input className="mt-1 h-8 text-xs" value={company.horaFin} onChange={e => setCompany({...company, horaFin: e.target.value})} data-testid="input-hora-fin" /></div>
            <div className="col-span-2"><label className="text-xs font-medium">Condiciones Atmosféricas</label><Input className="mt-1 h-8 text-xs" value={company.condicionesAtm} onChange={e => setCompany({...company, condicionesAtm: e.target.value})} data-testid="input-condiciones" /></div>
          </div>
        )}

        {activeTab === 'instrumentos' && (
          <div className="bg-white rounded border shadow-sm p-4 space-y-4">
            <h3 className="text-xs font-bold text-blue-900 border-b pb-1">Instrumento 1</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium">Descripción</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1} onChange={e => setCompany({...company, instrumento1: e.target.value})} data-testid="input-inst1" /></div>
              <div><label className="text-xs font-medium">N° Serie</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Serie} onChange={e => setCompany({...company, instrumento1Serie: e.target.value})} data-testid="input-inst1-serie" /></div>
              <div><label className={`text-xs font-medium ${!company.instrumento1Cert.trim() ? 'text-red-600' : ''}`}>N° Certificado Cal. {!company.instrumento1Cert.trim() && <span className="text-red-500">*</span>}</label><Input className={`mt-1 h-8 text-xs ${!company.instrumento1Cert.trim() ? 'border-red-400 bg-red-50' : ''}`} value={company.instrumento1Cert} onChange={e => setCompany({...company, instrumento1Cert: e.target.value})} data-testid="input-inst1-cert" /></div>
              <div><label className={`text-xs font-medium ${!company.instrumento1FechaCal.trim() ? 'text-red-600' : ''}`}>Fecha Calibración {!company.instrumento1FechaCal.trim() && <span className="text-red-500">*</span>}</label><Input className={`mt-1 h-8 text-xs ${!company.instrumento1FechaCal.trim() ? 'border-red-400 bg-red-50' : ''}`} value={company.instrumento1FechaCal} onChange={e => setCompany({...company, instrumento1FechaCal: e.target.value})} data-testid="input-inst1-fecha" /></div>
            </div>
            <h3 className="text-xs font-bold text-blue-900 border-b pb-1 pt-2">Instrumento 2</h3>
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
                    <th className="border border-blue-800 px-2 py-1 min-w-[120px]">Sector</th>
                    <th className="border border-blue-800 px-2 py-1 min-w-[130px]">Puesto de Trabajo</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">Exp.(h)</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">TBS(°C)</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">TBH(°C)</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">TG(°C)</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">TGBH(°C)</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">TGBHp</th>
                    <th className="border border-blue-800 px-1 py-1 w-14">Aclim.</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">TM(W)</th>
                    <th className="border border-blue-800 px-1 py-1 w-14">VLA</th>
                    <th className="border border-blue-800 px-1 py-1 w-14">VLP</th>
                    <th className="border border-blue-800 px-1 py-1 w-14">¿&lt;VLA?</th>
                    <th className="border border-blue-800 px-1 py-1 w-14">¿&lt;VLP?</th>
                    <th className="border border-blue-800 px-2 py-1 min-w-[100px]">Obs.</th>
                    <th className="border border-blue-800 px-1 py-1 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border px-1 py-0.5 text-center bg-gray-50 font-medium" data-testid={`cell-row-${index}`}>{String(index + 1).padStart(2, "0")}</td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.sector} onChange={e => updateRow(row.id, 'sector', e.target.value)} data-testid={`input-sector-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.puestoTrabajo} onChange={e => updateRow(row.id, 'puestoTrabajo', e.target.value)} data-testid={`input-puesto-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.exposicionHs} onChange={e => updateRow(row.id, 'exposicionHs', e.target.value)} data-testid={`input-exp-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.tbs} onChange={e => updateRow(row.id, 'tbs', e.target.value)} data-testid={`input-tbs-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.tbh} onChange={e => updateRow(row.id, 'tbh', e.target.value)} data-testid={`input-tbh-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.tg} onChange={e => updateRow(row.id, 'tg', e.target.value)} data-testid={`input-tg-${index}`} /></td>
                      <td className="border px-1 py-0.5 text-center bg-blue-50 font-medium" data-testid={`cell-tgbh-${index}`}>{row.tgbh}</td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center bg-yellow-50" value={row.tgbhPonderado} onChange={e => updateRow(row.id, 'tgbhPonderado', e.target.value)} data-testid={`input-tgbhp-${index}`} /></td>
                      <td className="border p-0">
                        <Select value={row.aclimatado} onValueChange={v => updateRow(row.id, 'aclimatado', v)}>
                          <SelectTrigger className="h-6 text-xs border-0 rounded-none" data-testid={`select-aclim-${index}`}><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="SI">SI</SelectItem><SelectItem value="NO">NO</SelectItem></SelectContent>
                        </Select>
                      </td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.cargaMetabolica} onChange={e => updateRow(row.id, 'cargaMetabolica', e.target.value)} data-testid={`input-tm-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.vla} onChange={e => updateRow(row.id, 'vla', e.target.value)} data-testid={`input-vla-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.vlp} onChange={e => updateRow(row.id, 'vlp', e.target.value)} data-testid={`input-vlp-${index}`} /></td>
                      <td className={`border px-1 py-0.5 text-center font-bold text-xs ${row.cumpleVla === 'SI' ? 'bg-green-100 text-green-700' : row.cumpleVla === 'NO' ? 'bg-red-100 text-red-700' : ''}`} data-testid={`cell-cumple-vla-${index}`}>{row.cumpleVla}</td>
                      <td className={`border px-1 py-0.5 text-center font-bold text-xs ${row.cumpleVlp === 'SI' ? 'bg-green-100 text-green-700' : row.cumpleVlp === 'NO' ? 'bg-red-100 text-red-700' : ''}`} data-testid={`cell-cumple-vlp-${index}`}>{row.cumpleVlp}</td>
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

        {activeTab === 'fotos' && (
          <div className="bg-white rounded border shadow-sm p-4 space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-bold text-blue-900">Galería de Fotos por Sector</h3>
              <span className="text-xs text-gray-400">{Object.values(sectorPhotos).flat().length} foto(s) cargada(s)</span>
            </div>
            {rows.filter((r, i, arr) => arr.findIndex(x => x.sector === r.sector) === i && r.sector).map(r => (
              <div key={r.sector} className="border rounded p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-blue-700" />
                  <span className="text-xs font-semibold text-blue-900">{r.sector}</span>
                  <label className="ml-auto cursor-pointer">
                    <span className="text-xs text-blue-600 hover:underline">+ Agregar foto</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                      const files = Array.from(e.target.files || []);
                      files.forEach(file => {
                        const reader = new FileReader();
                        reader.onload = ev => {
                          setSectorPhotos(prev => ({
                            ...prev,
                            [r.sector]: [...(prev[r.sector] || []), ev.target!.result as string]
                          }));
                        };
                        reader.readAsDataURL(file);
                      });
                      e.target.value = '';
                    }} data-testid={`input-photo-${r.sector}`} />
                  </label>
                </div>
                {(sectorPhotos[r.sector] || []).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Sin fotos. Agregue imágenes del sector.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {(sectorPhotos[r.sector] || []).map((src, idx) => (
                      <div key={idx} className="relative group">
                        <img src={src} alt={`${r.sector} ${idx + 1}`} className="h-20 w-20 object-cover rounded border" />
                        <button onClick={() => setSectorPhotos(prev => ({ ...prev, [r.sector]: prev[r.sector].filter((_, i) => i !== idx) }))} className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity" data-testid={`button-delete-photo-${r.sector}-${idx}`}>
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {rows.filter(r => r.sector).length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-4">Complete los sectores en la pestaña "Datos de Medición" para habilitar la galería.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
