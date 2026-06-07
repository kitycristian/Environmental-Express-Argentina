import { useState, useEffect } from "react";
import { useStore, sampleSectors } from "@/lib/store";
import { Link } from "wouter";
import { MeasurementType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, FileUp, Sheet, Loader2, Database, FileDown } from "lucide-react";
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

export default function LightingSheet() {
  const sectors = useStore((state) => state.sectors);
  const updateSector = useStore((state) => state.updateSector);
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const addPoint = useStore((state) => state.addPoint);
  const updatePoint = useStore((state) => state.updatePoint);
  const deleteMeasurement = useStore((state) => state.deleteMeasurement);
  const addSectorWithMeasurement = useStore((state) => state.addSectorWithMeasurement);
  const digitalSignature = useStore((state) => state.digitalSignature);
  const signatoryName = useStore((state) => state.signatoryName);
  const signatoryTitle = useStore((state) => state.signatoryTitle);
  const signatoryRegistration = useStore((state) => state.signatoryRegistration);

  const { toast } = useToast();
  const [visiblePointsOverride, setVisiblePointsOverride] = useState<number | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const { data: clients = [] } = useClients();

  const [company, setCompany] = useState<CompanyData>({
    razonSocial: "", direccion: "", localidad: "", provincia: "", cp: "", cuit: "",
    fechaMedicion: "", horaInicio: "", horaFin: "", turnos: "",
    instrumento1: "", instrumento1Serie: "", instrumento1Cert: "", instrumento1FechaCal: "",
    instrumento2: "", instrumento2Serie: "", instrumento2Cert: "", instrumento2FechaCal: "",
    condicionesAtm: ""
  });
  const [activeTab, setActiveTab] = useState<'datos' | 'empresa' | 'instrumentos'>('datos');
  const [observacionesGenerales, setObservacionesGenerales] = useState("");
  const [conclusiones, setConclusiones] = useState("");
  const [recomendaciones, setRecomendaciones] = useState("");

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

  const activeSectors = sectors.filter(s => s.measurements.some(m => m.type === type));

  const maxPointsInData = Math.max(9, ...activeSectors.map(s => {
    const m = s.measurements.find(m => m.type === type);
    return m ? m.points.length : 0;
  }));
  const visiblePoints = visiblePointsOverride ?? maxPointsInData;

  const handleAddRow = () => {
    addSectorWithMeasurement({
      name: `Sector ${activeSectors.length + 1}`,
      description: "",
      dimensions: "",
      activity: "",
      workersCount: 0
    }, type);
  };

  const handleImportSectors = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (client && Array.isArray(client.sectors)) {
      const clientSectors = client.sectors as string[];
      clientSectors.forEach((sectorName, index) => {
        addSectorWithMeasurement({
          name: sectorName,
          description: "",
          dimensions: "",
          activity: "",
          workersCount: 0
        }, type);
      });
      setImportDialogOpen(false);
      setSelectedClientId("");
    }
  };

  const calculateRoomIndex = (l: number, w: number, h: number) => {
    if (!l || !w || !h) return 0;
    const k = (l * w) / (h * (l + w));
    return parseFloat(k.toFixed(2));
  };

  const getMinPoints = (k: number) => {
    if (k < 1) return 4;
    if (k < 2) return 9;
    if (k < 3) return 16;
    return 25;
  };

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

  const handleCellChange = (sectorId: string, measurementId: string, field: string, value: string) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector) return;
    const measurement = sector.measurements.find(m => m.id === measurementId);
    if (!measurement) return;
    
    updateMeasurement(sectorId, measurementId, { 
      config: { ...measurement.config, [field]: value === '' ? null : parseFloat(value) || value } 
    });
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

  const handleOpenGoogleSheets = () => {
    setGsDialogOpen(true);
    setGsStep('url');
    setGsUrl("");
    setGsError("");
    setSelectedSpreadsheet("");
    setSelectedSheet("");
    setGsPreviewData([]);
    setGsAllSheetsData({});
    setSheetsList([]);
  };

  const extractSpreadsheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const handleLoadFromUrl = async () => {
    const id = extractSpreadsheetId(gsUrl);
    if (!id) {
      toast({ title: "URL inválida", description: "Pegá la URL completa de tu hoja de Google Sheets", variant: "destructive" });
      return;
    }
    setSelectedSpreadsheet(id);
    setGsLoading(true);
    setGsError("");
    try {
      const res = await fetch(`/api/google-sheets/${id}/sheets`);
      if (!res.ok) {
        const errData = await res.json();
        const msg = errData.message || 'No se pudo acceder a esa hoja.';
        if (msg.startsWith('EXCEL_FILE:')) {
          setGsError(msg.replace('EXCEL_FILE:', ''));
        } else {
          toast({ title: "Error", description: msg, variant: "destructive" });
        }
        return;
      }
      const data = await res.json();
      setSheetsList(data);
      setGsStep('sheets');
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGsLoading(true);
    setGsError("");
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload-excel', { method: 'POST', body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al procesar el archivo');
      }
      const result = await res.json();
      setGsAllSheetsData(result.data);
      setSheetsList(result.sheets.map((name: string, i: number) => ({ sheetId: i, title: name })));
      setSelectedSpreadsheet('local-file');
      setGsStep('sheets');
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGsLoading(false);
    }
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
    let bestRow = 0;
    let bestScore = 0;
    for (let r = 0; r < Math.min(data.length, 10); r++) {
      const rowText = (data[r] || []).map(c => String(c ?? '').toLowerCase().trim());
      let score = 0;
      rowText.forEach(cell => {
        keywords.forEach(kw => { if (cell.includes(kw)) score++; });
      });
      if (score > bestScore) {
        bestScore = score;
        bestRow = r;
      }
    }
    let dataStart = bestRow + 1;
    for (let r = bestRow + 1; r < Math.min(data.length, bestRow + 5); r++) {
      const rowText = (data[r] || []).map(c => String(c ?? '').toLowerCase().trim());
      const hasSubHeaders = rowText.some(cell => 
        keywords.some(kw => cell.includes(kw)) || cell === 'ancho' || cell === 'largo' || cell === 'alto'
      );
      if (hasSubHeaders) {
        dataStart = r + 1;
      } else {
        break;
      }
    }
    return { headerRow: bestRow, dataStart };
  };

  const autoMapColumns = (data: string[][], headerRowOverride?: number) => {
    if (data.length === 0) return;
    
    const { headerRow: detectedHeaderRow, dataStart: detectedDataStart } = detectHeaderRow(data);
    const hRow = headerRowOverride ?? detectedHeaderRow;
    setGsHeaderRow(hRow);
    if (headerRowOverride === undefined) {
      setGsDataStartRow(detectedDataStart);
    }

    const allHeaders = buildCombinedHeaders(data, Math.max(hRow, detectedDataStart - 1));
    const searchTexts = allHeaders.map(h => h.toLowerCase());
    
    const autoMap: Record<string, number> = { sector: -1, subsector: -1, ancho: -1, largo: -1, alto: -1, limite: -1 };
    searchTexts.forEach((h: string, i: number) => {
      if (h.includes('sector') && !h.includes('sub')) autoMap.sector = i;
      if (h.includes('subsector') || h.includes('puesto') || h.includes('descripcion') || h.includes('descripción')) autoMap.subsector = i;
      if (h.includes('ancho') || h === 'w') autoMap.ancho = i;
      if (h.includes('largo') || h === 'l') autoMap.largo = i;
      if (h.includes('alto') || h === 'h' || h.includes('altura')) autoMap.alto = i;
      if ((h.includes('limite') && h.includes('legal')) || h.includes('límite legal') || h.includes('lux min')) autoMap.limite = i;
    });
    if (autoMap.limite < 0) {
      searchTexts.forEach((h: string, i: number) => {
        if (h.includes('limite') || h.includes('límite')) autoMap.limite = i;
      });
    }
    setGsColumnMap(autoMap);
  };

  const handleSelectSheet = async (sheetTitle: string) => {
    setSelectedSheet(sheetTitle);
    setGsLoading(true);
    try {
      let data: string[][];
      if (selectedSpreadsheet === 'local-file' && gsAllSheetsData[sheetTitle]) {
        data = gsAllSheetsData[sheetTitle];
      } else {
        const range = encodeURIComponent(`${sheetTitle}!A1:AZ200`);
        const res = await fetch(`/api/google-sheets/${selectedSpreadsheet}/data?range=${range}`);
        if (!res.ok) throw new Error('Error al leer datos');
        data = await res.json();
      }
      setGsPreviewData(data);
      autoMapColumns(data);
      setGsStep('preview');
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGsLoading(false);
    }
  };

  const combinedHeaders = gsPreviewData.length > 0 
    ? buildCombinedHeaders(gsPreviewData, Math.max(gsHeaderRow, gsDataStartRow - 1))
    : [];

  const resultHeaderKeywords = ['valor max', 'valor min', 'e mínima', 'e minima', 'e media', 'e. media', 'limite', 'límite', 'cumple', 'uniformidad'];
  
  const findLuxColumns = (): { startCol: number; endCol: number } => {
    const mappedCols = [gsColumnMap.sector, gsColumnMap.subsector, gsColumnMap.ancho, 
      gsColumnMap.largo, gsColumnMap.alto, gsColumnMap.limite].filter(c => c >= 0);
    
    const headers = combinedHeaders.map(h => h.toLowerCase());
    let luxStart = -1;
    let luxEnd = -1;
    
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i];
      const isResultCol = resultHeaderKeywords.some(kw => h.includes(kw));
      
      if (!isResultCol && (h.match(/^\d+$/) || h.includes('iluminancia') || h.includes('punto'))) {
        if (luxStart < 0) luxStart = i;
        luxEnd = i + 1;
      } else if (luxStart >= 0 && isResultCol) {
        break;
      }
    }
    
    if (luxStart < 0) {
      const afterMapped = Math.max(...mappedCols, 0) + 1;
      const firstDataRow = gsPreviewData[gsDataStartRow];
      if (firstDataRow) {
        for (let i = afterMapped; i < firstDataRow.length; i++) {
          const h = (headers[i] || '').toLowerCase();
          if (resultHeaderKeywords.some(kw => h.includes(kw))) break;
          const val = String(firstDataRow[i] || '');
          if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 0) {
            if (luxStart < 0) luxStart = i;
            luxEnd = i + 1;
          } else if (luxStart >= 0) {
            break;
          }
        }
      }
    }
    
    return { startCol: luxStart >= 0 ? luxStart : 0, endCol: luxEnd >= 0 ? luxEnd : Math.max(...mappedCols, 0) + 1 };
  };

  const handleImportFromGoogleSheets = () => {
    const dataRows = gsPreviewData.slice(gsDataStartRow);
    if (dataRows.length === 0) {
      toast({ title: "Sin datos", description: "La hoja no tiene filas de datos para importar", variant: "destructive" });
      return;
    }
    
    const { startCol: luxStartCol, endCol: luxEndCol } = findLuxColumns();
    
    let imported = 0;
    let currentSectorId: string | null = null;
    let currentMeasurementId: string | null = null;
    
    dataRows.forEach((row) => {
      const sectorNum = gsColumnMap.sector >= 0 ? String(row[gsColumnMap.sector] || '').trim() : '';
      const subsectorName = gsColumnMap.subsector >= 0 ? String(row[gsColumnMap.subsector] || '').trim() : '';
      
      const hasLuxData = (() => {
        for (let c = luxStartCol; c < luxEndCol && c < row.length; c++) {
          const val = String(row[c] || '').trim();
          if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 0) return true;
        }
        return false;
      })();
      
      const isSectorRow = sectorNum !== '' && subsectorName !== '';
      const isContinuationRow = sectorNum === '' && currentSectorId !== null && hasLuxData;
      
      if (isSectorRow) {
        addSectorWithMeasurement({
          name: subsectorName,
          description: '',
          dimensions: '',
          activity: '',
          workersCount: 0
        }, type);

        const newSectors = useStore.getState().sectors;
        const lastSector = newSectors[newSectors.length - 1];
        const measurement = lastSector?.measurements.find(m => m.type === type);
        currentSectorId = lastSector?.id || null;
        currentMeasurementId = measurement?.id || null;
        
        if (measurement && currentSectorId) {
          const config: Record<string, any> = {};
          if (gsColumnMap.ancho >= 0 && row[gsColumnMap.ancho]) config.width = parseFloat(row[gsColumnMap.ancho]) || 0;
          if (gsColumnMap.largo >= 0 && row[gsColumnMap.largo]) config.length = parseFloat(row[gsColumnMap.largo]) || 0;
          if (gsColumnMap.alto >= 0 && row[gsColumnMap.alto]) config.height = parseFloat(row[gsColumnMap.alto]) || 0;
          if (gsColumnMap.limite >= 0 && row[gsColumnMap.limite]) config.limit = parseFloat(row[gsColumnMap.limite]) || 0;
          if (Object.keys(config).length > 0) {
            updateMeasurement(currentSectorId, measurement.id, { config: { ...measurement.config, ...config } });
          }
        }
        imported++;
      }
      
      if ((isSectorRow || isContinuationRow) && currentSectorId && currentMeasurementId) {
        for (let c = luxStartCol; c < luxEndCol && c < row.length; c++) {
          const val = String(row[c] || '').trim();
          if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 0) {
            addPoint(currentSectorId, currentMeasurementId, { values: { lux: val } });
          }
        }
      }
    });
    const currentSectors = useStore.getState().sectors.filter(s => s.measurements.some(m => m.type === type));
    const maxActualPoints = Math.max(9, ...currentSectors.map(s => {
      const m = s.measurements.find(m => m.type === type);
      return m ? m.points.length : 0;
    }));
    setVisiblePointsOverride(maxActualPoints);
    
    setGsDialogOpen(false);
    toast({ title: `${imported} sectores importados con todos sus puntos de medición` });
  };

  const loadSampleData = () => {
    useStore.getState().loadInspectionData(
      { id: 'default', name: 'DORINKA SRL', razonSocial: 'DORINKA SRL', cuit: '30-67813830-0', address: 'Av. Villafañez y Dr. Manuel Navarro S/N', date: '2024-03-26', responsible: '' },
      JSON.parse(JSON.stringify(sampleSectors))
    );
    setCompany({
      razonSocial: "DORINKA SRL (Store #1026 Catamarca)",
      direccion: "Av. Villafañez y Dr. Manuel Navarro S/N",
      localidad: "San Fernando del Valle de Catamarca",
      provincia: "Catamarca",
      cp: "4700",
      cuit: "30-67813830-0",
      fechaMedicion: "26/03/2024",
      horaInicio: "09:00",
      horaFin: "13:30",
      turnos: "2 Turnos de Trabajo. 6:00 AM - 23:30 PM",
      instrumento1: "Luxómetro Digital - TES 1336A",
      instrumento1Serie: "070203457",
      instrumento1Cert: "24R00000821",
      instrumento1FechaCal: "05/02/2024",
      instrumento2: "",
      instrumento2Serie: "",
      instrumento2Cert: "",
      instrumento2FechaCal: "",
      condicionesAtm: "Medición con iluminación artificial"
    });
    setConclusiones("Analizando los resultados de la medición realizada, los sectores en general CUMPLEN con los valores mínimos de iluminancia establecidos en el Decreto 351/79 Anexo IV. Algunos sectores como Panadería presentan valores por debajo del límite mínimo, requiriendo acciones correctivas.");
    setRecomendaciones("Reemplazar luminarias fuera de servicio. Implementar plan de mantenimiento preventivo de luminarias. Realizar limpieza periódica de difusores. Evaluar cambio a tecnología LED en sectores con bajo rendimiento lumínico.");
    toast({ title: "Datos cargados", description: "10 sectores con mediciones de iluminación DORINKA SRL" });
  };

  const downloadPDF = () => {
    if (activeSectors.length === 0) {
      toast({ title: "Sin datos", description: "Agregue sectores antes de exportar", variant: "destructive" });
      return;
    }
    const prevTitle = document.title;
    document.title = "Protocolo_Iluminacion";
    window.print();
    document.title = prevTitle;
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
    const allHeaders = ['#', 'Sector', 'Subsector', 'Ancho', 'Largo', 'Alto', 'K', 'Min Ptos', 'Ptos Med', ...pointHeaders, 'E mín', 'E media', 'Límite Legal', 'Cumple E mín', 'Cumple Límite'];

    const borderStyle = {
      top: { style: BorderStyle.SINGLE, size: 1, color: '003366' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: '003366' },
      left: { style: BorderStyle.SINGLE, size: 1, color: '003366' },
      right: { style: BorderStyle.SINGLE, size: 1, color: '003366' },
    };

    const makeCell = (text: string, isHeader = false, isGreen = false, isRed = false) => {
      return new DocxTableCell({
        children: [new Paragraph({
          children: [new TextRun({
            text,
            bold: isHeader || isGreen || isRed,
            size: 14,
            color: isHeader ? 'FFFFFF' : isGreen ? '15803D' : isRed ? 'B91C1C' : '000000',
            font: 'Arial',
          })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 20, after: 20 },
        })],
        shading: isHeader ? { fill: '003366' } : isGreen ? { fill: 'DCFCE7' } : isRed ? { fill: 'FEE2E2' } : undefined,
        borders: borderStyle,
        verticalAlign: 'center' as any,
      });
    };

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

    children.push(new Paragraph({
      children: [new TextRun({ text: 'PROTOCOLO DE MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL', bold: true, size: 28, color: '003366', font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }));
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Resolución SRT N° 84/2012 - Dec. 351/79', size: 20, color: '666666', font: 'Arial' })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
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
    children.push(labelVal("Turnos habituales", company.turnos));
    children.push(labelVal("Condiciones Atmosféricas", company.condicionesAtm));

    children.push(heading("Datos de la Medición"));

    const headerRow = new DocxTableRow({
      children: allHeaders.map(h => makeCell(h, true)),
      tableHeader: true,
    });

    const dataRows = activeSectors.map((sector, i) => {
      const measurement = sector.measurements.find(m => m.type === type);
      if (!measurement) return null;
      const w = measurement.config?.width || 0;
      const l = measurement.config?.length || 0;
      const h = measurement.config?.height || 0;
      const k = calculateRoomIndex(l, w, h);
      const minPts = getMinPoints(k);
      const pts = measurement.points;
      const vals = pts.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
      const eAvg = vals.length > 0 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      const eMin = vals.length > 0 ? Math.min(...vals) : 0;
      const limit = measurement.config?.limit || 0;
      const uniformity = eMin >= (eAvg / 2);
      const limitOk = limit > 0 ? eAvg >= limit : true;

      const pointValues = Array.from({ length: maxPts }, (_, j) => {
        const p = pts[j];
        return p ? (p.values.lux || '-') : '-';
      });

      const uniformityText = vals.length > 0 ? (uniformity ? 'SI' : 'NO') : '-';
      const limitText = limit > 0 ? (limitOk ? 'SI' : 'NO') : '-';

      const cellValues = [
        String(i + 1), sector.name, sector.description || '',
        w ? String(w) : '-', l ? String(l) : '-', h ? String(h) : '-',
        k ? String(k) : '-', String(minPts), String(pts.length),
        ...pointValues,
        eMin ? String(eMin) : '-', eAvg ? String(eAvg) : '-', limit ? String(limit) : '-',
        uniformityText, limitText
      ];

      return new DocxTableRow({
        children: cellValues.map((val, ci) => {
          const isUniformityCol = ci === cellValues.length - 2;
          const isLimitCol = ci === cellValues.length - 1;
          const isGreen = (isUniformityCol || isLimitCol) && val === 'SI';
          const isRed = (isUniformityCol || isLimitCol) && val === 'NO';
          return makeCell(String(val), false, isGreen, isRed);
        }),
      });
    }).filter(Boolean) as any[];

    const table = new DocxTable({
      rows: [headerRow, ...dataRows],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

    children.push(table);

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
        spacing: { after: 40 }
      }));
      if (signatoryName) {
        children.push(new Paragraph({
          children: [new TextRun({ text: signatoryName, bold: true, font: "Arial", size: 20 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 }
        }));
      }
      if (signatoryTitle) {
        children.push(new Paragraph({
          children: [new TextRun({ text: signatoryTitle, font: "Arial", size: 18 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 }
        }));
      }
      if (signatoryRegistration) {
        children.push(new Paragraph({
          children: [new TextRun({ text: `Mat. ${signatoryRegistration}`, font: "Arial", size: 18 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 20 }
        }));
      }
    }

    const docDocument = new Document({
      sections: [{
        properties: {
          page: {
            size: { orientation: 'landscape' as any },
            margin: { top: 720, bottom: 720, left: 720, right: 720 },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              children: [new TextRun({ text: `${company.razonSocial} - Protocolo de Iluminación`, italics: true, size: 16, color: '999999', font: 'Arial' })],
              alignment: AlignmentType.RIGHT,
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Environmental Express Argentina - Servicios de Higiene y Seguridad Laboral', size: 16, color: '666666', font: 'Arial' })],
              alignment: AlignmentType.CENTER,
            })],
          }),
        },
        children,
      }],
    });

    const blob = await Packer.toBlob(docDocument);
    saveAs(blob, 'Protocolo_Iluminacion.docx');
    toast({ title: "DOCX generado", description: "Protocolo_Iluminacion.docx descargado" });
  };

  const cellClass = "border px-1 py-0.5 text-xs text-center";
  const inputClass = "w-full h-6 text-xs text-center border-0 bg-transparent focus:bg-yellow-50 focus:outline-none";
  const headerClass = "border border-blue-800 px-1 py-1 text-xs font-bold text-center whitespace-nowrap bg-blue-900 text-white";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-xs">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="btn-back">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          </Link>
          <h1 className="text-sm font-bold text-gray-800" data-testid="heading-lighting">MEMORIA DE CALCULOS - ILUMINACIÓN</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={loadSampleData} className="bg-orange-500 hover:bg-orange-600 text-white" data-testid="btn-load-sample">
            <Database className="h-4 w-4 mr-1" /> Cargar Datos Informe
          </Button>
          <Button size="sm" variant="outline" onClick={downloadPDF} data-testid="btn-download-pdf">
            <FileDown className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button size="sm" variant="outline" onClick={downloadDOCX} data-testid="btn-download-docx">
            <FileDown className="h-4 w-4 mr-1" /> DOCX
          </Button>
          <Button size="sm" variant="outline" onClick={handleOpenGoogleSheets} data-testid="btn-google-sheets">
            <Sheet className="h-4 w-4 mr-1" /> Importar Excel/Sheets
          </Button>
          <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="btn-import">
            <FileUp className="h-4 w-4 mr-1" /> Importar
          </Button>
          <Button onClick={handleAddRow} size="sm" data-testid="btn-add-row">
            <Plus className="h-4 w-4 mr-1" /> Agregar Fila
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-4">
        <div className="flex gap-1 py-1">
          {[
            { key: 'datos' as const, label: 'Datos de Medición' },
            { key: 'empresa' as const, label: 'Empresa' },
            { key: 'instrumentos' as const, label: 'Instrumentos' },
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${activeTab === tab.key ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              data-testid={`tab-${tab.key}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'empresa' && (
        <div className="p-4 bg-white border-b space-y-3 max-w-4xl">
          <h3 className="text-xs font-bold text-blue-900 border-b pb-1">Datos del Establecimiento</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium">Razón Social</label><Input className="mt-1 h-8 text-xs" value={company.razonSocial} onChange={e => setCompany({...company, razonSocial: e.target.value})} data-testid="input-razon-social" /></div>
            <div><label className="text-xs font-medium">C.U.I.T.</label><Input className="mt-1 h-8 text-xs" value={company.cuit} onChange={e => setCompany({...company, cuit: e.target.value})} data-testid="input-cuit" /></div>
            <div><label className="text-xs font-medium">Dirección</label><Input className="mt-1 h-8 text-xs" value={company.direccion} onChange={e => setCompany({...company, direccion: e.target.value})} data-testid="input-direccion" /></div>
            <div><label className="text-xs font-medium">Localidad</label><Input className="mt-1 h-8 text-xs" value={company.localidad} onChange={e => setCompany({...company, localidad: e.target.value})} data-testid="input-localidad" /></div>
            <div><label className="text-xs font-medium">Provincia</label><Input className="mt-1 h-8 text-xs" value={company.provincia} onChange={e => setCompany({...company, provincia: e.target.value})} data-testid="input-provincia" /></div>
            <div><label className="text-xs font-medium">C.P.</label><Input className="mt-1 h-8 text-xs" value={company.cp} onChange={e => setCompany({...company, cp: e.target.value})} data-testid="input-cp" /></div>
          </div>
          <h3 className="text-xs font-bold text-blue-900 border-b pb-1 pt-2">Datos de la Medición</h3>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="text-xs font-medium">Fecha de Medición</label><Input className="mt-1 h-8 text-xs" value={company.fechaMedicion} onChange={e => setCompany({...company, fechaMedicion: e.target.value})} data-testid="input-fecha" /></div>
            <div><label className="text-xs font-medium">Hora Inicio</label><Input className="mt-1 h-8 text-xs" value={company.horaInicio} onChange={e => setCompany({...company, horaInicio: e.target.value})} data-testid="input-hora-inicio" /></div>
            <div><label className="text-xs font-medium">Hora Fin</label><Input className="mt-1 h-8 text-xs" value={company.horaFin} onChange={e => setCompany({...company, horaFin: e.target.value})} data-testid="input-hora-fin" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium">Turnos habituales</label><Input className="mt-1 h-8 text-xs" value={company.turnos} onChange={e => setCompany({...company, turnos: e.target.value})} data-testid="input-turnos" /></div>
            <div><label className="text-xs font-medium">Condiciones Atmosféricas</label><Input className="mt-1 h-8 text-xs" value={company.condicionesAtm} onChange={e => setCompany({...company, condicionesAtm: e.target.value})} data-testid="input-condiciones" /></div>
          </div>
          <h3 className="text-xs font-bold text-blue-900 border-b pb-1 pt-2">Observaciones / Conclusiones</h3>
          <div className="space-y-2">
            <div><label className="text-xs font-medium">Observaciones Generales</label><Textarea className="mt-1 text-xs min-h-[60px]" value={observacionesGenerales} onChange={e => setObservacionesGenerales(e.target.value)} data-testid="input-observaciones" /></div>
            <div><label className="text-xs font-medium">Conclusiones</label><Textarea className="mt-1 text-xs min-h-[60px]" value={conclusiones} onChange={e => setConclusiones(e.target.value)} data-testid="input-conclusiones" /></div>
            <div><label className="text-xs font-medium">Recomendaciones</label><Textarea className="mt-1 text-xs min-h-[60px]" value={recomendaciones} onChange={e => setRecomendaciones(e.target.value)} data-testid="input-recomendaciones" /></div>
          </div>
        </div>
      )}

      {activeTab === 'instrumentos' && (
        <div className="p-4 bg-white border-b space-y-3 max-w-4xl">
          <h3 className="text-xs font-bold text-blue-900 border-b pb-1">Instrumento 1 - Luxómetro</h3>
          <div className="grid grid-cols-4 gap-3">
            <div><label className="text-xs font-medium">Descripción</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1} onChange={e => setCompany({...company, instrumento1: e.target.value})} data-testid="input-inst1" /></div>
            <div><label className="text-xs font-medium">N° Serie</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Serie} onChange={e => setCompany({...company, instrumento1Serie: e.target.value})} data-testid="input-inst1-serie" /></div>
            <div><label className="text-xs font-medium">N° Certificado Cal.</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1Cert} onChange={e => setCompany({...company, instrumento1Cert: e.target.value})} data-testid="input-inst1-cert" /></div>
            <div><label className="text-xs font-medium">Fecha Calibración</label><Input className="mt-1 h-8 text-xs" value={company.instrumento1FechaCal} onChange={e => setCompany({...company, instrumento1FechaCal: e.target.value})} data-testid="input-inst1-fecha" /></div>
          </div>
          <h3 className="text-xs font-bold text-blue-900 border-b pb-1 pt-2">Instrumento 2 (opcional)</h3>
          <div className="grid grid-cols-4 gap-3">
            <div><label className="text-xs font-medium">Descripción</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2} onChange={e => setCompany({...company, instrumento2: e.target.value})} data-testid="input-inst2" /></div>
            <div><label className="text-xs font-medium">N° Serie</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2Serie} onChange={e => setCompany({...company, instrumento2Serie: e.target.value})} data-testid="input-inst2-serie" /></div>
            <div><label className="text-xs font-medium">N° Certificado Cal.</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2Cert} onChange={e => setCompany({...company, instrumento2Cert: e.target.value})} data-testid="input-inst2-cert" /></div>
            <div><label className="text-xs font-medium">Fecha Calibración</label><Input className="mt-1 h-8 text-xs" value={company.instrumento2FechaCal} onChange={e => setCompany({...company, instrumento2FechaCal: e.target.value})} data-testid="input-inst2-fecha" /></div>
          </div>
        </div>
      )}

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Sectores del Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {clients.filter(c => c.sectors && (c.sectors as string[]).length > 0).length === 0 ? (
              <div className="p-4 text-center text-muted-foreground border rounded-md bg-muted/50">
                <p className="font-medium">No hay clientes con sectores definidos</p>
                <p className="text-sm mt-1">Primero agregue sectores a un cliente desde la página de Clientes</p>
              </div>
            ) : (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger data-testid="select-client-import">
                  <SelectValue placeholder="Seleccione un cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.sectors && (c.sectors as string[]).length > 0).map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({(client.sectors as string[]).length} sectores)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportSectors} disabled={!selectedClientId} data-testid="btn-confirm-import">
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={gsDialogOpen} onOpenChange={setGsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sheet className="h-5 w-5 text-green-600" />
              Importar desde Google Sheets
            </DialogTitle>
          </DialogHeader>

          {gsLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando...</span>
            </div>
          )}

          {!gsLoading && gsStep === 'url' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="font-semibold">Opción 1: Subir archivo Excel/CSV</Label>
                <div className="border-2 border-dashed rounded-lg p-4 text-center hover:bg-muted/50 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-upload"
                    data-testid="input-excel-upload"
                  />
                  <label htmlFor="excel-upload" className="cursor-pointer">
                    <FileUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Hacé clic para seleccionar un archivo</p>
                    <p className="text-xs text-muted-foreground">.xlsx, .xls o .csv</p>
                  </label>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-muted-foreground">o</span></div>
              </div>

              <div className="space-y-2">
                <Label className="font-semibold">Opción 2: URL de Google Sheets</Label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 text-sm"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={gsUrl}
                  onChange={(e) => { setGsUrl(e.target.value); setGsError(""); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleLoadFromUrl()}
                  data-testid="input-gs-url"
                />
                <p className="text-xs text-muted-foreground">
                  Solo funciona con hojas de cálculo nativas de Google Sheets (no archivos Excel subidos a Drive).
                </p>
                {gsError && (
                  <div className="bg-amber-50 border border-amber-200 rounded p-3 text-sm text-amber-800">
                    {gsError}
                  </div>
                )}
                <Button onClick={handleLoadFromUrl} disabled={!gsUrl.trim()} className="w-full" data-testid="btn-gs-load">
                  Cargar hoja
                </Button>
              </div>
            </div>
          )}

          {!gsLoading && gsStep === 'sheets' && (
            <div className="space-y-2 py-2">
              <Button variant="ghost" size="sm" onClick={() => setGsStep('url')} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Cambiar URL
              </Button>
              <Label>Seleccioná la hoja/pestaña:</Label>
              <div className="space-y-1">
                {sheetsList.map((sheet: any) => (
                  <div
                    key={sheet.sheetId}
                    className="flex items-center gap-3 p-2 rounded border hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleSelectSheet(sheet.title)}
                    data-testid={`gs-sheet-${sheet.sheetId}`}
                  >
                    <span className="text-sm">{sheet.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!gsLoading && gsStep === 'preview' && (
            <div className="space-y-4 py-2">
              <Button variant="ghost" size="sm" onClick={() => setGsStep('sheets')} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver
              </Button>

              <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded border">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Fila de datos desde:</Label>
                  <Select
                    value={String(gsDataStartRow)}
                    onValueChange={(v) => {
                      const newStart = parseInt(v);
                      setGsDataStartRow(newStart);
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs" data-testid="gs-data-start">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gsPreviewData.slice(0, 15).map((row, i) => (
                        <SelectItem key={i} value={String(i)}>
                          Fila {i + 1}: {row.slice(0, 3).filter(Boolean).join(' | ').substring(0, 40)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Total filas a importar:</Label>
                  <p className="text-sm font-medium pt-1">{Math.max(0, gsPreviewData.length - gsDataStartRow)} filas</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                {(['sector', 'subsector', 'ancho', 'largo', 'alto', 'limite'] as const).map(field => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs capitalize">{field === 'limite' ? 'Límite Legal' : field}</Label>
                    <Select
                      value={gsColumnMap[field] >= 0 ? String(gsColumnMap[field]) : "none"}
                      onValueChange={(v) => setGsColumnMap(prev => ({ ...prev, [field]: v === 'none' ? -1 : parseInt(v) }))}
                    >
                      <SelectTrigger className="h-8 text-xs" data-testid={`gs-map-${field}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- No mapear --</SelectItem>
                        {combinedHeaders.map((header, i) => (
                          <SelectItem key={i} value={String(i)}>{header}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                Las columnas numéricas después de la última columna mapeada se importarán como puntos de medición LUX.
              </div>

              {gsPreviewData.length > 0 && (
                <div className="border rounded overflow-auto max-h-48">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-900 text-white">
                        {combinedHeaders.map((h, i) => (
                          <th key={i} className="border border-blue-800 px-2 py-1 whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gsPreviewData.slice(gsDataStartRow, gsDataStartRow + 5).map((row, ri) => (
                        <tr key={ri} className={ri === 0 ? "bg-green-50 font-medium" : "hover:bg-gray-50"}>
                          {combinedHeaders.map((_, ci) => (
                            <td key={ci} className="border px-2 py-0.5 whitespace-nowrap">{row[ci] ?? ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {gsPreviewData.length - gsDataStartRow > 5 && (
                    <p className="text-xs text-center py-1 text-muted-foreground">
                      ... y {gsPreviewData.length - gsDataStartRow - 5} filas más
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {!gsLoading && gsStep === 'preview' && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setGsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleImportFromGoogleSheets} disabled={gsColumnMap.sector < 0} data-testid="btn-gs-import">
                Importar {Math.max(0, gsPreviewData.length - gsDataStartRow)} filas
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Spreadsheet Table */}
      {activeTab === 'datos' && (
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth: `${800 + visiblePoints * 50}px` }}>
          <thead>
            <tr>
              <th rowSpan={2} className={headerClass} style={{ width: '30px' }}>#</th>
              <th rowSpan={2} className={headerClass} style={{ width: '180px' }}>Sector</th>
              <th rowSpan={2} className={headerClass} style={{ minWidth: '200px' }}>Subsector</th>
              <th colSpan={3} className={headerClass}>Dimensiones</th>
              <th rowSpan={2} className={headerClass} style={{ width: '40px' }}>K</th>
              <th rowSpan={2} className={headerClass} style={{ width: '40px' }}>Min</th>
              <th rowSpan={2} className={headerClass} style={{ width: '40px' }}>Ptos</th>
              <th colSpan={visiblePoints} className={headerClass}>Iluminancia por Punto Monitoreado (LUX)</th>
              <th rowSpan={2} className={headerClass} style={{ width: '50px' }}>E mínima</th>
              <th rowSpan={2} className={headerClass} style={{ width: '50px' }}>E media</th>
              <th rowSpan={2} className={headerClass} style={{ width: '60px' }}>Límite Legal</th>
              <th rowSpan={2} className={headerClass} style={{ width: '60px' }}>Cumple E mínima</th>
              <th rowSpan={2} className={headerClass} style={{ width: '60px' }}>Cumple Límite</th>
              <th rowSpan={2} className={headerClass} style={{ width: '30px' }}></th>
            </tr>
            <tr>
              <th className={headerClass} style={{ width: '50px' }}>Ancho</th>
              <th className={headerClass} style={{ width: '50px' }}>Largo</th>
              <th className={headerClass} style={{ width: '50px' }}>Alto</th>
              {Array.from({ length: visiblePoints }).map((_, i) => (
                <th key={i} className={headerClass} style={{ width: '45px' }}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeSectors.map((sector, rowIndex) => {
              const measurement = sector.measurements.find(m => m.type === type);
              if (!measurement) return null;

              const width = measurement.config?.width || 0;
              const length = measurement.config?.length || 0;
              const height = measurement.config?.height || 0;
              const roomIndex = calculateRoomIndex(length, width, height);
              const minPoints = getMinPoints(roomIndex);
              const points = measurement.points;
              const values = points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
              const eAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
              const eMin = values.length > 0 ? Math.min(...values) : 0;
              const limit = measurement.config?.limit || 0;
              const uniformityCheck = eMin >= (eAvg / 2);
              const limitCheck = limit > 0 ? eAvg >= limit : true;

              return (
                <tr key={sector.id} className="hover:bg-gray-50" data-testid={`row-sector-${rowIndex}`}>
                  <td className={cn(cellClass, "bg-gray-50 font-bold")}>{rowIndex + 1}</td>
                  <td className={cn(cellClass, "text-left")}>
                    <input
                      className={cn(inputClass, "text-left")}
                      value={sector.name}
                      onChange={(e) => updateSector(sector.id, { name: e.target.value })}
                      title={sector.name}
                      data-testid={`input-name-${rowIndex}`}
                    />
                  </td>
                  <td className={cn(cellClass, "text-left")}>
                    <input
                      className={cn(inputClass, "text-left")}
                      value={sector.description || ''}
                      onChange={(e) => updateSector(sector.id, { description: e.target.value })}
                      placeholder="Subsector..."
                      title={sector.description || ''}
                      data-testid={`input-subsector-${rowIndex}`}
                    />
                  </td>
                  <td className={cn(cellClass)}>
                    <input
                      type="number"
                      className={inputClass}
                      value={width || ''}
                      onChange={(e) => handleCellChange(sector.id, measurement.id, 'width', e.target.value)}
                      placeholder="-"
                      data-testid={`input-width-${rowIndex}`}
                    />
                  </td>
                  <td className={cn(cellClass)}>
                    <input
                      type="number"
                      className={inputClass}
                      value={length || ''}
                      onChange={(e) => handleCellChange(sector.id, measurement.id, 'length', e.target.value)}
                      placeholder="-"
                      data-testid={`input-length-${rowIndex}`}
                    />
                  </td>
                  <td className={cn(cellClass)}>
                    <input
                      type="number"
                      className={inputClass}
                      value={height || ''}
                      onChange={(e) => handleCellChange(sector.id, measurement.id, 'height', e.target.value)}
                      placeholder="-"
                      data-testid={`input-height-${rowIndex}`}
                    />
                  </td>
                  <td className={cn(cellClass, "bg-gray-50")}>{roomIndex || '-'}</td>
                  <td className={cn(cellClass, "bg-gray-50")}>{minPoints}</td>
                  <td className={cn(cellClass, "bg-gray-50 font-bold")}>{points.length}</td>
                  {Array.from({ length: visiblePoints }).map((_, colIndex) => {
                    const point = points[colIndex];
                    const isEditable = point !== undefined;
                    const isNext = colIndex === points.length;
                    return (
                      <td key={colIndex} className={cn(cellClass)}>
                        {isEditable ? (
                          <input
                            type="number"
                            className={cn(inputClass, "font-mono")}
                            value={point.values.lux || ''}
                            onChange={(e) => handlePointChange(sector.id, measurement.id, point.id, e.target.value)}
                            data-testid={`input-point-${rowIndex}-${colIndex}`}
                          />
                        ) : isNext ? (
                          <input
                            className={cn(inputClass, "text-gray-400 cursor-pointer")}
                            placeholder="+"
                            onFocus={() => addPoint(sector.id, measurement.id, { values: { lux: '' } })}
                            data-testid={`input-add-point-${rowIndex}-${colIndex}`}
                          />
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className={cn(cellClass, "font-bold")}>{eMin || '-'}</td>
                  <td className={cn(cellClass, "font-bold")}>{eAvg || '-'}</td>
                  <td className={cn(cellClass)}>
                    <input
                      type="number"
                      className={cn(inputClass, "font-bold")}
                      value={limit || ''}
                      onChange={(e) => handleCellChange(sector.id, measurement.id, 'limit', e.target.value)}
                      placeholder="-"
                      data-testid={`input-limit-${rowIndex}`}
                    />
                  </td>
                  <td className={cn(cellClass, "font-bold", values.length > 0 ? (uniformityCheck ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700") : "")}>
                    {values.length > 0 ? (uniformityCheck ? "SI" : "NO") : "-"}
                  </td>
                  <td className={cn(cellClass, "font-bold", limit > 0 ? (limitCheck ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700") : "")}>
                    {limit > 0 ? (limitCheck ? "SI" : "NO") : "-"}
                  </td>
                  <td className={cellClass}>
                    <button
                      className="text-gray-400 hover:text-red-600 p-1"
                      onClick={() => { if (confirm(`¿Eliminar "${sector.name}"?`)) deleteMeasurement(sector.id, measurement.id); }}
                      data-testid={`btn-delete-${rowIndex}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {activeSectors.length === 0 && (
              <tr>
                <td colSpan={20 + visiblePoints} className="text-center py-8 text-gray-500">
                  No hay sectores. Haz clic en "Agregar Fila" para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
