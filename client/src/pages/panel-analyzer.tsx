import { useState, useRef } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Upload, Camera, Loader2, AlertTriangle, CheckCircle, XCircle, Trash2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

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
                <div className="max-w-4xl mx-auto space-y-6">
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