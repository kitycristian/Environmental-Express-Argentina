import { useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, Camera, Loader2, AlertTriangle, CheckCircle, XCircle, Trash2, FileText, Download, FileImage, FileType } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
// @ts-ignore
import jsPDF from "jspdf";
// @ts-ignore
import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, Header, Footer } from "docx";
// @ts-ignore
import html2canvas from "html2canvas";

interface AnalysisResult {
  analysis: string;
  timestamp: string;
  filename: string;
  imageUrl: string;
}

function parseRiskLevel(text: string): { level: string; color: string; icon: typeof CheckCircle } {
  const lower = text.toLowerCase();
  if (lower.includes('crítico')) return { level: 'CRÍTICO', color: 'text-red-700 bg-red-100 border-red-300', icon: XCircle };
  if (lower.includes('alto')) return { level: 'ALTO', color: 'text-orange-700 bg-orange-100 border-orange-300', icon: AlertTriangle };
  if (lower.includes('medio')) return { level: 'MEDIO', color: 'text-yellow-700 bg-yellow-100 border-yellow-300', icon: AlertTriangle };
  return { level: 'BAJO', color: 'text-green-700 bg-green-100 border-green-300', icon: CheckCircle };
}

function AnalysisSection({ title, content, icon }: { title: string; content: string; icon?: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-blue-900 flex items-center gap-2 border-b border-blue-200 pb-1">
        {icon}
        {title}
      </h3>
      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed pl-1">
        {content.trim()}
      </div>
    </div>
  );
}

function parseAnalysis(text: string) {
  const sections: { title: string; content: string }[] = [];
  const parts = text.split(/^## /m).filter(Boolean);
  
  for (const part of parts) {
    const lineEnd = part.indexOf('\n');
    if (lineEnd > 0) {
      sections.push({
        title: part.substring(0, lineEnd).trim(),
        content: part.substring(lineEnd + 1).trim()
      });
    }
  }
  
  return sections;
}

export default function PanelAnalyzer() {
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      await analyzeImage(files[i]);
    }
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const analyzeImage = async (file: File) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const imageUrl = URL.createObjectURL(file);

      const res = await fetch('/api/analyze-panel', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Error al analizar la imagen');
      }

      const data = await res.json();
      const newResult: AnalysisResult = {
        ...data,
        imageUrl,
      };
      
      setResults(prev => {
        const updated = [...prev, newResult];
        setSelectedResult(updated.length - 1);
        return updated;
      });
      
      toast({ title: "Análisis completado", description: `Tablero "${file.name}" analizado exitosamente` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const removeResult = (index: number) => {
    const removedUrl = results[index]?.imageUrl;
    if (removedUrl) URL.revokeObjectURL(removedUrl);
    setResults(prev => {
      const updated = prev.filter((_, i) => i !== index);
      if (selectedResult === index) {
        setSelectedResult(updated.length > 0 ? Math.min(index, updated.length - 1) : null);
      } else if (selectedResult !== null && selectedResult > index) {
        setSelectedResult(selectedResult - 1);
      }
      return updated;
    });
  };

  const reportRef = useRef<HTMLDivElement>(null);

  const loadImageAsBase64 = (url: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.src = url;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = reject;
    });
  };

  const downloadPDF = async (result: AnalysisResult) => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      doc.setFillColor(0, 51, 102);
      doc.rect(0, 0, pageWidth, 35, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("INFORME TÉCNICO", pageWidth / 2, 15, { align: "center" });
      doc.setFontSize(11);
      doc.text("Tablero Eléctrico - Environmental Express Argentina", pageWidth / 2, 23, { align: "center" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha: ${new Date(result.timestamp).toLocaleString('es-AR')}  |  Archivo: ${result.filename}`, pageWidth / 2, 30, { align: "center" });
      y = 45;

      try {
        const imgData = await loadImageAsBase64(result.imageUrl);
        const imgWidth = 70;
        const imgHeight = 50;
        doc.addImage(imgData, "JPEG", margin, y, imgWidth, imgHeight);
        y += imgHeight + 10;
      } catch {
        y += 5;
      }

      const secs = parseAnalysis(result.analysis);
      const riskSec = secs.find(s => s.title.toLowerCase().includes('clasificación') || s.title.toLowerCase().includes('riesgo'));
      if (riskSec) {
        const r = parseRiskLevel(riskSec.content);
        const riskColors: Record<string, number[]> = {
          'BAJO': [34, 139, 34], 'MEDIO': [218, 165, 32], 'ALTO': [255, 140, 0], 'CRÍTICO': [200, 0, 0]
        };
        const c = riskColors[r.level] || [100, 100, 100];
        doc.setFillColor(c[0], c[1], c[2]);
        doc.roundedRect(pageWidth - margin - 50, 45, 50, 12, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(`Riesgo: ${r.level}`, pageWidth - margin - 25, 52.5, { align: "center" });
      }

      for (const section of secs) {
        if (y > 270) { doc.addPage(); y = margin; }
        doc.setFillColor(0, 51, 102);
        doc.rect(margin, y, contentWidth, 7, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text(section.title, margin + 3, y + 5);
        y += 10;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        const lines = doc.splitTextToSize(section.content.trim(), contentWidth - 4);
        for (const line of lines) {
          if (y > 280) { doc.addPage(); y = margin; }
          doc.text(line, margin + 2, y);
          y += 4.5;
        }
        y += 4;
      }

      if (secs.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(50, 50, 50);
        const lines = doc.splitTextToSize(result.analysis, contentWidth);
        for (const line of lines) {
          if (y > 280) { doc.addPage(); y = margin; }
          doc.text(line, margin, y);
          y += 4.5;
        }
      }

      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(`Environmental Express Argentina - Pág. ${i}/${totalPages}`, pageWidth / 2, 290, { align: "center" });
      }

      doc.save(`Informe_Tablero_${result.filename.replace(/\.[^/.]+$/, '')}.pdf`);
      toast({ title: "PDF descargado", description: "El informe fue descargado correctamente" });
    } catch (err: any) {
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    }
  };

  const downloadDOCX = async (result: AnalysisResult) => {
    try {
      const secs = parseAnalysis(result.analysis);
      const riskSec = secs.find(s => s.title.toLowerCase().includes('clasificación') || s.title.toLowerCase().includes('riesgo'));
      const riskText = riskSec ? parseRiskLevel(riskSec.content).level : "";

      const children: any[] = [];

      children.push(new Paragraph({
        children: [new TextRun({ text: "INFORME TÉCNICO - TABLERO ELÉCTRICO", bold: true, font: "Arial", size: 28, color: "003366" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      }));

      children.push(new Paragraph({
        children: [new TextRun({ text: "Environmental Express Argentina", font: "Arial", size: 22, color: "003366", bold: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }));

      const createBorderedCell = (text: string, bold = false, opts: any = {}) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text, bold, font: "Arial", size: 20 })], alignment: opts.alignment || AlignmentType.LEFT })],
          width: opts.width,
          shading: opts.shading,
          margins: { top: 80, bottom: 80, left: 100, right: 100 },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            bottom: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            left: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
            right: { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" },
          },
        });

      children.push(new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ children: [
            createBorderedCell("Archivo:", true, { width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: "E8EDF3" } }),
            createBorderedCell(result.filename, false, { width: { size: 70, type: WidthType.PERCENTAGE } }),
          ]}),
          new TableRow({ children: [
            createBorderedCell("Fecha:", true, { width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: "E8EDF3" } }),
            createBorderedCell(new Date(result.timestamp).toLocaleString('es-AR'), false, { width: { size: 70, type: WidthType.PERCENTAGE } }),
          ]}),
          ...(riskText ? [new TableRow({ children: [
            createBorderedCell("Nivel de Riesgo:", true, { width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: "E8EDF3" } }),
            createBorderedCell(riskText, true, { width: { size: 70, type: WidthType.PERCENTAGE } }),
          ]})] : []),
        ],
      }));

      children.push(new Paragraph({ text: "", spacing: { after: 200 } }));

      for (const section of secs) {
        children.push(new Paragraph({
          children: [new TextRun({ text: section.title, bold: true, font: "Arial", size: 22, color: "003366" })],
          spacing: { before: 200, after: 100 },
          border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: "003366" } },
        }));
        const contentLines = section.content.trim().split('\n');
        for (const line of contentLines) {
          const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•') || line.trim().startsWith('*');
          children.push(new Paragraph({
            children: [new TextRun({ text: isBullet ? line.trim().substring(1).trim() : line, font: "Arial", size: 20 })],
            bullet: isBullet ? { level: 0 } : undefined,
            spacing: { after: 60 },
          }));
        }
      }

      if (secs.length === 0) {
        const lines = result.analysis.split('\n');
        for (const line of lines) {
          children.push(new Paragraph({
            children: [new TextRun({ text: line, font: "Arial", size: 20 })],
            spacing: { after: 60 },
          }));
        }
      }

      const doc = new Document({
        sections: [{
          properties: {},
          headers: {
            default: new Header({
              children: [new Paragraph({
                children: [new TextRun({ text: "Environmental Express Argentina - Informe de Tablero Eléctrico", font: "Arial", size: 16, color: "999999" })],
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

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Informe_Tablero_${result.filename.replace(/\.[^/.]+$/, '')}.docx`);
      toast({ title: "DOCX descargado", description: "El informe Word fue descargado correctamente" });
    } catch (err: any) {
      toast({ title: "Error", description: "No se pudo generar el DOCX", variant: "destructive" });
    }
  };

  const downloadJPG = async () => {
    if (!reportRef.current) return;
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        logging: false,
      });
      canvas.toBlob((blob: Blob | null) => {
        if (blob && currentResult) {
          saveAs(blob, `Informe_Tablero_${currentResult.filename.replace(/\.[^/.]+$/, '')}.jpg`);
          toast({ title: "JPG descargado", description: "La imagen del informe fue descargada correctamente" });
        }
      }, "image/jpeg", 0.92);
    } catch (err: any) {
      toast({ title: "Error", description: "No se pudo generar la imagen", variant: "destructive" });
    }
  };

  const currentResult = selectedResult !== null ? results[selectedResult] : null;
  const sections = currentResult ? parseAnalysis(currentResult.analysis) : [];
  const riskSection = sections.find(s => s.title.toLowerCase().includes('clasificación') || s.title.toLowerCase().includes('riesgo'));
  const risk = riskSection ? parseRiskLevel(riskSection.content) : null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-4">
        <Link href="/grounding">
          <Button variant="outline" size="sm" data-testid="btn-back">
            <ArrowLeft className="h-4 w-4 mr-2" /> Volver
          </Button>
        </Link>
        <h1 className="text-xl font-bold text-blue-900" data-testid="heading-panel-analyzer">
          Analizador de Tableros Eléctricos
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            id="panel-upload"
            data-testid="input-panel-upload"
          />
          {currentResult && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" data-testid="btn-download-report">
                  <Download className="h-4 w-4 mr-2" />
                  Descargar Informe
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => downloadPDF(currentResult)} data-testid="btn-download-pdf">
                  <FileText className="h-4 w-4 mr-2 text-red-600" />
                  Descargar PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadDOCX(currentResult)} data-testid="btn-download-docx">
                  <FileType className="h-4 w-4 mr-2 text-blue-600" />
                  Descargar Word (DOCX)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadJPG()} data-testid="btn-download-jpg">
                  <FileImage className="h-4 w-4 mr-2 text-green-600" />
                  Descargar Imagen (JPG)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzing}
            className="bg-blue-900 hover:bg-blue-800"
            data-testid="btn-upload-panel"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Subir Foto de Tablero
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {results.length === 0 && !analyzing ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div
              className="max-w-lg text-center space-y-6 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              data-testid="panel-upload-zone"
            >
              <div className="w-24 h-24 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
                <Camera className="h-12 w-12 text-blue-900" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Importar Fotos de Tableros</h2>
                <p className="text-gray-600">
                  Subí fotos de tableros eléctricos y la inteligencia artificial analizará el estado del tablero,
                  identificará no conformidades y recomendará mejoras según la normativa argentina.
                </p>
              </div>
              <div className="border-2 border-dashed border-blue-300 rounded-xl p-8 hover:bg-blue-50 transition-colors">
                <Upload className="h-8 w-8 mx-auto mb-3 text-blue-400" />
                <p className="text-sm font-medium text-blue-700">Hacé clic para seleccionar imágenes</p>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG o WEBP - Máximo 10MB por imagen</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="w-64 bg-white border-r overflow-y-auto flex-shrink-0">
              <div className="p-3 border-b bg-gray-50">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Tableros Analizados ({results.length})
                </p>
              </div>
              {results.map((result, index) => {
                const secs = parseAnalysis(result.analysis);
                const riskSec = secs.find(s => s.title.toLowerCase().includes('clasificación') || s.title.toLowerCase().includes('riesgo'));
                const r = riskSec ? parseRiskLevel(riskSec.content) : null;
                return (
                  <div
                    key={index}
                    className={cn(
                      "p-3 border-b cursor-pointer hover:bg-blue-50 transition-colors flex items-start gap-2",
                      selectedResult === index && "bg-blue-50 border-l-4 border-l-blue-900"
                    )}
                    onClick={() => setSelectedResult(index)}
                    data-testid={`panel-result-${index}`}
                  >
                    <img src={result.imageUrl} alt="" className="w-12 h-12 rounded object-cover flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{result.filename}</p>
                      {r && (
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border mt-1 inline-block", r.color)}>
                          {r.level}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeResult(index); }}
                      className="text-gray-400 hover:text-red-600 p-1 flex-shrink-0"
                      data-testid={`btn-remove-panel-${index}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
              {analyzing && (
                <div className="p-4 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analizando...
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {currentResult ? (
                <div ref={reportRef} className="max-w-4xl mx-auto space-y-6">
                  <div className="flex gap-6">
                    <div className="flex-shrink-0">
                      <img
                        src={currentResult.imageUrl}
                        alt="Tablero eléctrico"
                        className="w-80 h-auto rounded-lg shadow-md border"
                        data-testid="img-panel-current"
                      />
                      <p className="text-xs text-gray-500 mt-2 text-center">{currentResult.filename}</p>
                    </div>
                    
                    <div className="flex-1 space-y-2">
                      {risk && (
                        <div className={cn("p-4 rounded-lg border-2 flex items-center gap-3", risk.color)} data-testid="panel-risk-badge">
                          <risk.icon className="h-8 w-8 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide">Clasificación de Riesgo</p>
                            <p className="text-2xl font-bold">{risk.level}</p>
                          </div>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Analizado: {new Date(currentResult.timestamp).toLocaleString('es-AR')}
                      </p>
                    </div>
                  </div>

                  <Card>
                    <CardHeader className="pb-2 bg-blue-900 text-white rounded-t-lg">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Informe Técnico de Tablero Eléctrico
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-5">
                      {sections.map((section, i) => (
                        <AnalysisSection key={i} title={section.title} content={section.content} />
                      ))}
                      {sections.length === 0 && (
                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                          {currentResult.analysis}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>Seleccioná un tablero del panel izquierdo</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}