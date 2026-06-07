import { useState } from "react";
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
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, Header, Footer } from "docx";
// @ts-ignore
import { saveAs } from "file-saver";
import { useStore } from "@/lib/store";

interface ColdRow {
  id: string;
  sector: string;
  puestoTrabajo: string;
  rangoTemp: string;
  ciclosExposicion: string;
  duracionCiclo: string;
  tiempoNetoExposicion: string;
  tiempoIntegracion: string;
  caracteristicasExposicion: string;
  tbs: string;
  velocidadViento: string;
  tee: string;
  tipoUniforme: string;
  equipoUtilizado: string;
  exposicionMas4h: string;
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
  condicionesAtm: string;
}

export default function ColdSheet() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  // ── Store-backed state (persistent localStorage) ──
  const coldProtocol = useStore((s) => s.coldProtocol);
  const _setColdRows = useStore((s) => s.setColdRows);
  const _updateColdCompany = useStore((s) => s.updateColdCompany);
  const _updateColdText = useStore((s) => s.updateColdText);
  const rows = coldProtocol.rows;
  const setRows = _setColdRows;
  const company = coldProtocol.company;
  const setCompany = (data: any) => _updateColdCompany(typeof data === "function" ? data(coldProtocol.company) : data);
  const observacionesGenerales = coldProtocol.observaciones;
  const setObservacionesGenerales = (v: string) => _updateColdText("observaciones", v);
  const conclusiones = coldProtocol.conclusiones;
  const setConclusiones = (v: string) => _updateColdText("conclusiones", v);
  const recomendaciones = coldProtocol.recomendaciones;
  const setRecomendaciones = (v: string) => _updateColdText("recomendaciones", v);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'datos' | 'empresa' | 'instrumentos'>('datos');
  const { data: clients = [] } = useClients();
  const digitalSignature = useStore((state) => state.digitalSignature);
  const signatoryName = useStore((state) => state.signatoryName);
  const signatoryTitle = useStore((state) => state.signatoryTitle);
  const signatoryRegistration = useStore((state) => state.signatoryRegistration);

  // Data persisted in Zustand store (localStorage)

  const handleImportSectors = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (client && Array.isArray(client.sectors)) {
      const newRows = (client.sectors as string[]).map((sectorName, index) => ({
        id: String(rows.length + index + 1),
        sector: sectorName,
        puestoTrabajo: "", rangoTemp: "", ciclosExposicion: "", duracionCiclo: "", tiempoNetoExposicion: "", tiempoIntegracion: "", caracteristicasExposicion: "", tbs: "", velocidadViento: "", tee: "", tipoUniforme: "", equipoUtilizado: "", exposicionMas4h: ""
      }));
      setRows([...rows, ...newRows]);
      setImportDialogOpen(false);
      setSelectedClientId("");
    }
  };

  const loadSampleData = () => {
    setCompany({
      razonSocial: "DORINKA SRL (STORE #1026 CATAMARCA)",
      direccion: "Av. Villafañez y Dr. Manuel Navarro S/N",
      localidad: "San Fernando del Valle de Catamarca",
      provincia: "Catamarca",
      cp: "4700",
      cuit: "30-67813830-0",
      fechaMedicion: "26/03/2024",
      horaInicio: "14:00",
      horaFin: "16:30",
      turnos: "2 Turnos de Trabajo. 6:00 AM - 23:30 PM",
      instrumento1: "Termoanemómetro de Hilo Caliente - TESTO 440",
      instrumento1Serie: "81216382",
      instrumento1Cert: "24R00000812",
      instrumento1FechaCal: "05/02/2024",
      condicionesAtm: "Temperatura: 33,3 °C | Humedad: 43,2% | Presión Atmosférica: 713,4 mmHg"
    });
    setRows([
      { id: "1", sector: "Cámara Congelado Panadería", puestoTrabajo: "Asociado de Panadería", rangoTemp: "-18 < -21°C", ciclosExposicion: "10 ciclos", duracionCiclo: "3 min", tiempoNetoExposicion: "30 min", tiempoIntegracion: "3 min", caracteristicasExposicion: "Intermitente con Periodos de Recuperación", tbs: "-24.4", velocidadViento: "0.45", tee: "-29", tipoUniforme: "Ropa Algodón y Campera Térmica", equipoUtilizado: "Termoanemómetro", exposicionMas4h: "NO" },
      { id: "2", sector: "Cámara Congelado Deli", puestoTrabajo: "Asociado de Deli", rangoTemp: "-18 < -21°C", ciclosExposicion: "10 ciclos", duracionCiclo: "3 min", tiempoNetoExposicion: "30 min", tiempoIntegracion: "3 min", caracteristicasExposicion: "Intermitente con Periodos de Recuperación", tbs: "-23.6", velocidadViento: "1.47", tee: "-29", tipoUniforme: "Ropa Algodón y Campera Térmica", equipoUtilizado: "Termoanemómetro", exposicionMas4h: "NO" },
      { id: "3", sector: "Cámara Congelado Lácteos", puestoTrabajo: "Asociado de Lácteos", rangoTemp: "-18 < -21°C", ciclosExposicion: "10 ciclos", duracionCiclo: "3 min", tiempoNetoExposicion: "30 min", tiempoIntegracion: "3 min", caracteristicasExposicion: "Intermitente con Periodos de Recuperación", tbs: "-24.6", velocidadViento: "0.67", tee: "-29", tipoUniforme: "Ropa Algodón y Campera Térmica", equipoUtilizado: "Termoanemómetro", exposicionMas4h: "NO" },
      { id: "4", sector: "Laboratorio de Carnes", puestoTrabajo: "Asociado de Carnicería", rangoTemp: "+7 ≥ +9°C", ciclosExposicion: "60 ciclos", duracionCiclo: "4 min", tiempoNetoExposicion: "240 min", tiempoIntegracion: "3 min", caracteristicasExposicion: "Continua", tbs: "8.1", velocidadViento: "0.14", tee: "4", tipoUniforme: "Ropa Algodón y Campera Térmica", equipoUtilizado: "Termoanemómetro", exposicionMas4h: "SI" }
    ]);
    setConclusiones("Analizando la TEE y siguiendo los lineamientos de la Ley 19.587/72, Res. MTEySS 295/2003, los puestos evaluados presentan un grado de peligro POCO PELIGROSO. No se requiere plan de trabajo/calentamiento porque la temperatura es superior a -25°C.");
    setRecomendaciones("Proveer ropa aislante seca adecuada (T° cuerpo > 36°C). Usar manoplas aislantes. Prohibir ingreso a cámaras sin EPP adecuado (campera, ropa algodón, medias, calzado seguridad, guantes). Controlar ropa seca. Medición anual. Entrega anual de EPP térmico.");
    setObservacionesGenerales("");
    toast({ title: "Datos cargados", description: "Se importaron 4 puntos de medición de estrés por frío - DORINKA SRL" });
  };

  const addRow = () => {
    setRows([...rows, {
      id: String(Date.now()),
      sector: "", puestoTrabajo: "", rangoTemp: "", ciclosExposicion: "", duracionCiclo: "",
      tiempoNetoExposicion: "", tiempoIntegracion: "", caracteristicasExposicion: "",
      tbs: "", velocidadViento: "", tee: "", tipoUniforme: "", equipoUtilizado: "", exposicionMas4h: ""
    }]);
  };

  const calculateWindChill = (temp: string, wind: string): string => {
    const t = parseFloat(temp);
    const v = parseFloat(wind);
    if (!isNaN(t) && !isNaN(v) && v >= 4.8) {
      const wc = 13.12 + 0.6215 * t - 11.37 * Math.pow(v, 0.16) + 0.3965 * t * Math.pow(v, 0.16);
      return wc.toFixed(1);
    }
    return temp;
  };

  const getRiskLevel = (tempEq: string): string => {
    const t = parseFloat(tempEq);
    if (isNaN(t)) return "";
    if (t > 0) return "BAJO";
    if (t >= -10) return "MODERADO";
    if (t >= -25) return "ALTO";
    return "MUY ALTO";
  };

  const getRiskColor = (risk: string): string => {
    switch (risk) {
      case "BAJO": return "bg-green-100 text-green-700";
      case "MODERADO": return "bg-yellow-100 text-yellow-700";
      case "ALTO": return "bg-orange-100 text-orange-700";
      case "MUY ALTO": return "bg-red-100 text-red-700";
      default: return "";
    }
  };

  const updateRow = (id: string, field: keyof ColdRow, value: string) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        if (field === 'tbs' || field === 'velocidadViento') {
          const wc = calculateWindChill(updated.tbs, updated.velocidadViento);
          if (wc !== updated.tbs) {
            updated.tee = wc;
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
    const prevTitle = document.title;
    document.title = `Estres_Frio_${company.razonSocial.substring(0, 30)}`;
    window.print();
    document.title = prevTitle;
    toast({ title: "Impresión iniciada", description: "Use 'Guardar como PDF' en el diálogo de impresión." });
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
        children: [new TextRun({ text: "PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", bold: true, font: "Arial", size: 28, color: "003366" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 }
      }));
      children.push(new Paragraph({
        children: [new TextRun({ text: "Resolución MTEySS N° 295/2003", font: "Arial", size: 20, color: "666666" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }));

      children.push(heading("Datos del Establecimiento"));
      children.push(labelVal("Razón Social", company.razonSocial));
      children.push(labelVal("Dirección", company.direccion));
      children.push(labelVal("Localidad", `${company.localidad} - ${company.provincia} - C.P.: ${company.cp}`));
      children.push(labelVal("C.U.I.T.", company.cuit));

      children.push(heading("Datos para la Medición"));
      children.push(labelVal("Instrumento", `${company.instrumento1} | Serie: ${company.instrumento1Serie}`));
      children.push(labelVal("Certificado", `${company.instrumento1Cert} - Fecha: ${company.instrumento1FechaCal}`));
      children.push(labelVal("Fecha de medición", company.fechaMedicion));
      children.push(labelVal("Horario", `Inicio: ${company.horaInicio} - Fin: ${company.horaFin}`));
      children.push(labelVal("Turnos habituales", company.turnos));
      children.push(labelVal("Condiciones Atmosféricas", company.condicionesAtm));

      children.push(heading("Datos de la Medición"));

      const headerCells = ["Pto", "Sector", "Puesto", "Rango T.", "Ciclos", "Dur.Ciclo", "T.Neto", "T.Int.", "Caract.Exp.", "TBS(°C)", "Vel(m/s)", "TEE(°C)", "Uniforme", "Equipo", ">4h"];
      const headerRow = new TableRow({
        children: headerCells.map(h => createCell(h, true, { shading: { fill: "003366" }, color: "FFFFFF", size: 14 })),
        tableHeader: true
      });

      const dataRows = rows.map((r, i) => new TableRow({
        children: [
          createCell(String(i + 1).padStart(2, "0"), false, { size: 14 }),
          createCell(r.sector, false, { align: AlignmentType.LEFT, size: 14 }),
          createCell(r.puestoTrabajo, false, { align: AlignmentType.LEFT, size: 14 }),
          createCell(r.rangoTemp, false, { size: 14 }),
          createCell(r.ciclosExposicion, false, { size: 14 }),
          createCell(r.duracionCiclo, false, { size: 14 }),
          createCell(r.tiempoNetoExposicion, false, { size: 14 }),
          createCell(r.tiempoIntegracion, false, { size: 14 }),
          createCell(r.caracteristicasExposicion, false, { align: AlignmentType.LEFT, size: 14 }),
          createCell(r.tbs, false, { size: 14 }),
          createCell(r.velocidadViento, false, { size: 14 }),
          createCell(r.tee, false, { size: 14 }),
          createCell(r.tipoUniforme, false, { align: AlignmentType.LEFT, size: 14 }),
          createCell(r.equipoUtilizado, false, { size: 14 }),
          createCell(r.exposicionMas4h, true, { size: 14, color: r.exposicionMas4h === "SI" ? "CC0000" : "008000" })
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
          headers: { default: new Header({ children: [new Paragraph({ children: [new TextRun({ text: `${company.razonSocial} - Estrés por Frío`, italics: true, size: 16, color: "999999" })], alignment: AlignmentType.RIGHT })] }) },
          footers: { default: new Footer({ children: [new Paragraph({ children: [new TextRun({ text: "Environmental Express Argentina - Protocolo de Estrés por Frío - Res. MTEySS 295/2003", size: 14, color: "999999" })], alignment: AlignmentType.CENTER })] }) },
          children
        }]
      });

      const blob = await Packer.toBlob(docFile);
      saveAs(blob, `Estres_Frio_${company.razonSocial.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.docx`);
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
          <h1 className="text-sm font-bold text-gray-800" data-testid="heading-cold">PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO (Res. MTEySS 295/2003)</h1>
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
            <div><label className="text-xs font-medium">Turnos Habituales</label><Input className="mt-1 h-8 text-xs" value={company.turnos} onChange={e => setCompany({...company, turnos: e.target.value})} data-testid="input-turnos" /></div>
            <div><label className="text-xs font-medium">Hora Inicio</label><Input className="mt-1 h-8 text-xs" value={company.horaInicio} onChange={e => setCompany({...company, horaInicio: e.target.value})} data-testid="input-hora-inicio" /></div>
            <div><label className="text-xs font-medium">Hora Fin</label><Input className="mt-1 h-8 text-xs" value={company.horaFin} onChange={e => setCompany({...company, horaFin: e.target.value})} data-testid="input-hora-fin" /></div>
            <div className="col-span-2"><label className="text-xs font-medium">Condiciones Atmosféricas</label><Input className="mt-1 h-8 text-xs" value={company.condicionesAtm} onChange={e => setCompany({...company, condicionesAtm: e.target.value})} data-testid="input-condiciones" /></div>
          </div>
        )}

        {activeTab === 'instrumentos' && (
          <div className="bg-white rounded border shadow-sm p-4 space-y-4">
            <h3 className="text-xs font-bold text-blue-900 border-b pb-1">Instrumento de Medición</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-medium">Descripción</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1} onChange={e => setCompany({...company, instrumento1: e.target.value})} data-testid="input-inst1" /></div>
              <div><label className="text-xs font-medium">N° Serie</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Serie} onChange={e => setCompany({...company, instrumento1Serie: e.target.value})} data-testid="input-inst1-serie" /></div>
              <div><label className="text-xs font-medium">N° Certificado Cal.</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Cert} onChange={e => setCompany({...company, instrumento1Cert: e.target.value})} data-testid="input-inst1-cert" /></div>
              <div><label className="text-xs font-medium">Fecha Calibración</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1FechaCal} onChange={e => setCompany({...company, instrumento1FechaCal: e.target.value})} data-testid="input-inst1-fecha" /></div>
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
                    <th className="border border-blue-800 px-2 py-1 min-w-[140px]">Sector/Área</th>
                    <th className="border border-blue-800 px-2 py-1 min-w-[130px]">Puesto de Trabajo</th>
                    <th className="border border-blue-800 px-1 py-1 w-24">Rango Temp.</th>
                    <th className="border border-blue-800 px-1 py-1 w-20">Ciclos Exp.</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">Dur. Ciclo</th>
                    <th className="border border-blue-800 px-1 py-1 w-20">T. Neto Exp.</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">T. Integ.</th>
                    <th className="border border-blue-800 px-2 py-1 min-w-[140px]">Caract. Exposición</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">TBS (°C)</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">Vel. (m/s)</th>
                    <th className="border border-blue-800 px-1 py-1 w-16">TEE (°C)</th>
                    <th className="border border-blue-800 px-2 py-1 min-w-[120px]">Tipo Uniforme</th>
                    <th className="border border-blue-800 px-1 py-1 w-24">Equipo</th>
                    <th className="border border-blue-800 px-1 py-1 w-14">&gt;4h</th>
                    <th className="border border-blue-800 px-1 py-1 w-20">Riesgo</th>
                    <th className="border border-blue-800 px-1 py-1 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="border px-1 py-0.5 text-center bg-gray-50 font-medium" data-testid={`cell-row-${index}`}>{String(index + 1).padStart(2, "0")}</td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.sector} onChange={e => updateRow(row.id, 'sector', e.target.value)} data-testid={`input-sector-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.puestoTrabajo} onChange={e => updateRow(row.id, 'puestoTrabajo', e.target.value)} data-testid={`input-puesto-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.rangoTemp} onChange={e => updateRow(row.id, 'rangoTemp', e.target.value)} data-testid={`input-rango-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.ciclosExposicion} onChange={e => updateRow(row.id, 'ciclosExposicion', e.target.value)} data-testid={`input-ciclos-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.duracionCiclo} onChange={e => updateRow(row.id, 'duracionCiclo', e.target.value)} data-testid={`input-dur-ciclo-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.tiempoNetoExposicion} onChange={e => updateRow(row.id, 'tiempoNetoExposicion', e.target.value)} data-testid={`input-tiempo-neto-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.tiempoIntegracion} onChange={e => updateRow(row.id, 'tiempoIntegracion', e.target.value)} data-testid={`input-tiempo-int-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.caracteristicasExposicion} onChange={e => updateRow(row.id, 'caracteristicasExposicion', e.target.value)} data-testid={`input-caract-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.tbs} onChange={e => updateRow(row.id, 'tbs', e.target.value)} data-testid={`input-tbs-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.velocidadViento} onChange={e => updateRow(row.id, 'velocidadViento', e.target.value)} data-testid={`input-viento-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center bg-blue-50 font-medium" value={row.tee} onChange={e => updateRow(row.id, 'tee', e.target.value)} data-testid={`input-tee-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none" value={row.tipoUniforme} onChange={e => updateRow(row.id, 'tipoUniforme', e.target.value)} data-testid={`input-uniforme-${index}`} /></td>
                      <td className="border p-0"><Input className="h-6 text-xs border-0 rounded-none text-center" value={row.equipoUtilizado} onChange={e => updateRow(row.id, 'equipoUtilizado', e.target.value)} data-testid={`input-equipo-${index}`} /></td>
                      <td className="border p-0">
                        <Select value={row.exposicionMas4h} onValueChange={v => updateRow(row.id, 'exposicionMas4h', v)}>
                          <SelectTrigger className="h-6 text-xs border-0 rounded-none" data-testid={`select-exp4h-${index}`}><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="SI">SI</SelectItem><SelectItem value="NO">NO</SelectItem></SelectContent>
                        </Select>
                      </td>
                      <td className={`border px-1 py-0.5 text-center font-bold text-xs ${getRiskColor(getRiskLevel(row.tee))}`} data-testid={`cell-riesgo-${index}`}>{getRiskLevel(row.tee)}</td>
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
