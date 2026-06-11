import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, FileText, Download, Sparkles,
  Flame, Snowflake, Volume2, Lightbulb, CheckCircle2, AlertCircle,
} from "lucide-react";

type Protocol = "thermal" | "cold" | "noise" | "lighting";

interface ProtocolMeta {
  key: Protocol;
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  resolution: string;
}

const PROTOCOLS: ProtocolMeta[] = [
  { key: "thermal",  label: "Carga Térmica",    icon: Flame,     color: "text-orange-600", resolution: "SRT N° 30/2023" },
  { key: "cold",     label: "Estrés por Frío",  icon: Snowflake, color: "text-blue-500",   resolution: "MTEySS N° 295/2003" },
  { key: "noise",    label: "Ruido Laboral",    icon: Volume2,   color: "text-purple-600", resolution: "SRT N° 85/2012" },
  { key: "lighting", label: "Iluminación",      icon: Lightbulb, color: "text-yellow-600", resolution: "SRT N° 84/2012" },
];

export default function Report() {
  const { toast } = useToast();

  // Store reads
  const establishment    = useStore((s) => s.establishment);
  const thermalProtocol  = useStore((s) => s.thermalProtocol);
  const coldProtocol     = useStore((s) => s.coldProtocol);
  const noiseProtocol    = useStore((s) => s.noiseProtocol);
  const sectors          = useStore((s) => s.sectors);
  const signatoryName    = useStore((s) => s.signatoryName);
  const signatoryTitle   = useStore((s) => s.signatoryTitle);
  const signatoryRegistration = useStore((s) => s.signatoryRegistration);

  // Store actions
  const updateThermalText = useStore((s) => s.updateThermalText);
  const updateColdText    = useStore((s) => s.updateColdText);
  const updateNoiseText   = useStore((s) => s.updateNoiseText);
  const setSignatoryName  = useStore((s) => s.setSignatoryName);
  const setSignatoryTitle = useStore((s) => s.setSignatoryTitle);
  const setSignatoryRegistration = useStore((s) => s.setSignatoryRegistration);

  // Detect which protocols have data
  const hasThermal  = thermalProtocol?.rows?.some((r: any) => r.sector || r.tbs || r.tgbh);
  const hasCold     = coldProtocol?.rows?.some((r: any) => r.sector || r.tbs || r.tee);
  const hasNoise    = noiseProtocol?.rows?.some((r: any) => r.sector || r.valorMedido);
  const hasLighting = sectors?.some((s: any) => s.measurements?.some((m: any) => m.type === "lighting"));

  const dataMap: Record<Protocol, boolean> = {
    thermal:  hasThermal,
    cold:     hasCold,
    noise:    hasNoise,
    lighting: hasLighting,
  };

  const availableProtocols = PROTOCOLS.filter((p) => dataMap[p.key]);

  // UI state
  const [selected, setSelected] = useState<Record<Protocol, boolean>>(() => {
    const s: Record<Protocol, boolean> = { thermal: true, cold: true, noise: true, lighting: true };
    return s;
  });
  const [combined, setCombined]     = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAIRunning, setIsAIRunning]   = useState(false);

  const selectedProtocols = PROTOCOLS.filter((p) => dataMap[p.key] && selected[p.key]).map((p) => p.key);

  const toggleProtocol = (key: Protocol, val: boolean) => {
    setSelected((s) => ({ ...s, [key]: val }));
  };

  // ── Generate AI conclusions & recommendations
  const handleAIAnalysis = async () => {
    if (!selectedProtocols.length) {
      toast({ title: "Sin protocolos", description: "Seleccioná al menos un protocolo.", variant: "destructive" });
      return;
    }
    setIsAIRunning(true);
    toast({ title: "Analizando con IA...", description: "GPT-4o está redactando las conclusiones." });

    try {
      const buildPayload = (protocol: Protocol) => {
        if (protocol === "thermal") return { protocol: "thermal", rows: thermalProtocol.rows, resolution: "Resol. SRT 30/2023" };
        if (protocol === "cold")    return { protocol: "cold",    rows: coldProtocol.rows,    resolution: "Resol. MTEySS 295/2003" };
        if (protocol === "noise")   return { protocol: "noise",   rows: noiseProtocol.rows,   resolution: "Resol. SRT 85/2012" };
        return null;
      };

      const updateFns: Record<Protocol, ((field: any, val: string) => void) | null> = {
        thermal:  updateThermalText,
        cold:     updateColdText,
        noise:    updateNoiseText,
        lighting: null,
      };

      const empresa = establishment.razonSocial || establishment.name || "la empresa";

      const endpointMap: Record<Protocol, string> = {
        thermal:  "/api/thermal/generate-text",
        cold:     "/api/cold/generate-text",
        noise:    "/api/noise/generate-text",
        lighting: "/api/lighting/generate-text",
      };

      for (const proto of selectedProtocols) {
        if (proto === "lighting") continue;
        const payload = buildPayload(proto);
        if (!payload) continue;

        const summary = payload.rows.map((r: any, i: number) =>
          `Punto ${i + 1} — ${r.sector || "s/s"} / ${r.puestoTrabajo || "s/s"}: ` +
          (proto === "noise"    ? `LAeq=${r.valorMedido || "-"} dBA, Dosis=${r.dosisRuido || "-"}%, Cumple: ${r.cumple || "-"}` :
           proto === "thermal"  ? `TGBHp=${r.tgbhPonderado || "-"}°C, VLA=${r.vla || "-"}°C, CumpleVLA: ${r.cumpleVla || "-"}` :
           proto === "cold"     ? `TBS=${r.tbs || "-"}°C, Viento=${r.velocidadViento || "-"}m/s, TEE=${r.tee || "-"}°C` : "")
        ).join("\n");

        for (const field of ["conclusiones", "recomendaciones"]) {
          const res = await fetch(endpointMap[proto], {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ field, summary, empresa }),
            credentials: "include",
          });
          if (res.ok) {
            const data = await res.json();
            const fn = updateFns[proto];
            if (fn) fn(field as any, data.text || "");
          }
        }
      }

      toast({ title: "Análisis IA completado", description: "Revisá y ajustá las conclusiones antes de generar el informe." });
    } catch (err: any) {
      toast({ title: "Error IA", description: err.message, variant: "destructive" });
    } finally {
      setIsAIRunning(false);
    }
  };

  // ── Generate DOCX
  const handleGenerate = async () => {
    if (!selectedProtocols.length) {
      toast({ title: "Sin protocolos", description: "Seleccioná al menos un protocolo con datos.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    toast({ title: combined ? "Generando DOCX..." : "Generando ZIP con informes separados...", description: "Puede tardar unos segundos." });

    try {
      const lightingSectors = sectors.filter((s: any) =>
        s.measurements?.some((m: any) => m.type === "lighting")
      );

      const res = await fetch("/api/generate-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          protocols: selectedProtocols,
          combined,
          signatory: {
            name:         signatoryName || "",
            title:        signatoryTitle || "Lic. H&SL",
            registration: signatoryRegistration || "",
          },
          data: {
            establishment,
            noiseProtocol,
            thermalProtocol,
            coldProtocol,
            lightingSectors,
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Error del servidor");
      }

      const blob  = await res.blob();
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement("a");
      const empresa = (establishment.razonSocial || establishment.name || "Informe")
        .replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_").substring(0, 30);
      const fecha   = new Date().toISOString().split("T")[0];
      a.href     = url;
      a.download = combined || selectedProtocols.length === 1
        ? `Informe_EEA_${empresa}_${fecha}.docx`
        : `Informes_EEA_${empresa}_${fecha}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({ title: "¡Informe generado!", description: combined ? "El DOCX fue descargado." : "El ZIP con los informes fue descargado." });
    } catch (err: any) {
      toast({ title: "Error al generar", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
                Volver
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-5" />
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#003366]" />
              <span className="font-semibold text-[#003366]">Generador de Informes</span>
            </div>
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedProtocols.length}
            className="bg-[#003366] hover:bg-[#002244] gap-2"
            data-testid="button-generate"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? "Generando..." : combined ? "Generar DOCX" : "Generar ZIP"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Datos del establecimiento */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#003366] uppercase tracking-wide">
              Establecimiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Razón Social</p>
                <p className="font-medium">{establishment.razonSocial || establishment.name || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">CUIT</p>
                <p className="font-medium">{establishment.cuit || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Localidad</p>
                <p className="font-medium">{establishment.city || establishment.localidad || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Fecha</p>
                <p className="font-medium">{establishment.date
                  ? new Date(establishment.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
                  : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Selección de protocolos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#003366] uppercase tracking-wide">
              Protocolos a incluir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {PROTOCOLS.map((p) => {
              const hasData = dataMap[p.key];
              const Icon    = p.icon;
              return (
                <div
                  key={p.key}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                    hasData
                      ? selected[p.key] ? "border-[#003366]/30 bg-blue-50/40" : "border-gray-200 bg-white"
                      : "border-gray-100 bg-gray-50 opacity-60"
                  }`}
                  data-testid={`protocol-row-${p.key}`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={`proto-${p.key}`}
                      checked={hasData && selected[p.key]}
                      disabled={!hasData}
                      onCheckedChange={(v) => toggleProtocol(p.key, !!v)}
                      data-testid={`checkbox-${p.key}`}
                    />
                    <Icon className={`w-4 h-4 ${p.color}`} />
                    <div>
                      <label htmlFor={`proto-${p.key}`} className="text-sm font-medium cursor-pointer">
                        {p.label}
                      </label>
                      <p className="text-xs text-gray-500">Resol. {p.resolution}</p>
                    </div>
                  </div>
                  {hasData ? (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Con datos
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-gray-100 text-gray-500 gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Sin datos
                    </Badge>
                  )}
                </div>
              );
            })}

            {/* Toggle combinado / separado */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <div>
                <p className="text-sm font-medium">Modo de generación</p>
                <p className="text-xs text-gray-500">
                  {combined
                    ? "Un único DOCX con todos los protocolos seleccionados"
                    : "Un DOCX por protocolo, descargado como ZIP"}
                </p>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={combined ? "text-gray-400" : "font-medium"}>Separados</span>
                <Switch
                  checked={combined}
                  onCheckedChange={setCombined}
                  data-testid="switch-combined"
                />
                <span className={combined ? "font-medium" : "text-gray-400"}>Combinado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Datos del firmante */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#003366] uppercase tracking-wide">
              Profesional interviniente
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sig-name" className="text-xs">Nombre y apellido</Label>
              <Input
                id="sig-name"
                value={signatoryName || ""}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="Ej: Juan García"
                className="h-9 text-sm"
                data-testid="input-signatory-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sig-title" className="text-xs">Título / Cargo</Label>
              <Input
                id="sig-title"
                value={signatoryTitle || ""}
                onChange={(e) => setSignatoryTitle(e.target.value)}
                placeholder="Ej: Lic. H&SL / Ing. Laboral"
                className="h-9 text-sm"
                data-testid="input-signatory-title"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sig-reg" className="text-xs">Matrícula profesional</Label>
              <Input
                id="sig-reg"
                value={signatoryRegistration || ""}
                onChange={(e) => setSignatoryRegistration(e.target.value)}
                placeholder="Ej: SRT-12345"
                className="h-9 text-sm"
                data-testid="input-signatory-registration"
              />
            </div>
          </CardContent>
        </Card>

        {/* ── Conclusiones y recomendaciones por protocolo */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-[#003366] uppercase tracking-wide">
              Conclusiones y recomendaciones
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAIAnalysis}
              disabled={isAIRunning || !selectedProtocols.filter((p) => p !== "lighting").length}
              className="gap-2 border-[#003366]/30 text-[#003366]"
              data-testid="button-ai-analysis"
            >
              <Sparkles className="w-4 h-4" />
              {isAIRunning ? "Analizando..." : "Análisis IA"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {availableProtocols.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay protocolos con datos cargados. Completá las mediciones primero.
              </p>
            )}

            {/* Carga Térmica */}
            {hasThermal && (
              <div className="space-y-3" data-testid="section-thermal">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-600" />
                  <h3 className="text-sm font-semibold">Carga Térmica — Resol. SRT 30/2023</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Conclusiones</Label>
                    <Textarea
                      value={thermalProtocol.conclusiones || ""}
                      onChange={(e) => updateThermalText("conclusiones", e.target.value)}
                      placeholder="Redactá las conclusiones del estudio de carga térmica..."
                      className="h-32 text-xs resize-none"
                      data-testid="textarea-thermal-conclusiones"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Recomendaciones</Label>
                    <Textarea
                      value={thermalProtocol.recomendaciones || ""}
                      onChange={(e) => updateThermalText("recomendaciones", e.target.value)}
                      placeholder="Redactá las recomendaciones de control de carga térmica..."
                      className="h-32 text-xs resize-none"
                      data-testid="textarea-thermal-recomendaciones"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Estrés por Frío */}
            {hasCold && (
              <>
                {hasThermal && <Separator />}
                <div className="space-y-3" data-testid="section-cold">
                  <div className="flex items-center gap-2">
                    <Snowflake className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-semibold">Estrés por Frío — Resol. MTEySS 295/2003</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Conclusiones</Label>
                      <Textarea
                        value={coldProtocol.conclusiones || ""}
                        onChange={(e) => updateColdText("conclusiones", e.target.value)}
                        placeholder="Redactá las conclusiones del estudio de estrés por frío..."
                        className="h-32 text-xs resize-none"
                        data-testid="textarea-cold-conclusiones"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Recomendaciones</Label>
                      <Textarea
                        value={coldProtocol.recomendaciones || ""}
                        onChange={(e) => updateColdText("recomendaciones", e.target.value)}
                        placeholder="Redactá las recomendaciones para prevenir estrés por frío..."
                        className="h-32 text-xs resize-none"
                        data-testid="textarea-cold-recomendaciones"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Ruido */}
            {hasNoise && (
              <>
                {(hasThermal || hasCold) && <Separator />}
                <div className="space-y-3" data-testid="section-noise">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-semibold">Ruido Laboral — Resol. SRT 85/2012</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Conclusiones</Label>
                      <Textarea
                        value={noiseProtocol.conclusiones || ""}
                        onChange={(e) => updateNoiseText("conclusiones", e.target.value)}
                        placeholder="Redactá las conclusiones del estudio de ruido..."
                        className="h-32 text-xs resize-none"
                        data-testid="textarea-noise-conclusiones"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Recomendaciones</Label>
                      <Textarea
                        value={noiseProtocol.recomendaciones || ""}
                        onChange={(e) => updateNoiseText("recomendaciones", e.target.value)}
                        placeholder="Redactá las recomendaciones de control del ruido..."
                        className="h-32 text-xs resize-none"
                        data-testid="textarea-noise-recomendaciones"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Iluminación */}
            {hasLighting && (
              <>
                {(hasThermal || hasCold || hasNoise) && <Separator />}
                <div className="space-y-2" data-testid="section-lighting">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-600" />
                    <h3 className="text-sm font-semibold">Iluminación — Resol. SRT 84/2012</h3>
                  </div>
                  <p className="text-xs text-gray-500">
                    Las conclusiones y recomendaciones de iluminación se generan automáticamente con el texto estándar SRT en el DOCX.
                    El análisis IA está disponible sólo para los protocolos de medición (térmica, frío, ruido).
                  </p>
                  <div className="grid gap-2">
                    {sectors
                      .filter((s: any) => s.measurements?.some((m: any) => m.type === "lighting"))
                      .map((s: any) => {
                        const lm = s.measurements.filter((m: any) => m.type === "lighting");
                        return lm.map((m: any) => {
                          const vals = (m.points || []).map((p: any) => parseFloat(p.values?.lux || "0")).filter((v: number) => !isNaN(v) && v > 0);
                          const eMedia = vals.length ? Math.round(vals.reduce((a: number, b: number) => a + b, 0) / vals.length) : 0;
                          const vla = m.config?.limit || 500;
                          const cumple = eMedia >= vla;
                          return (
                            <div key={`${s.id}-${m.id}`} className="flex items-center justify-between rounded border border-gray-200 px-3 py-2 text-xs">
                              <span className="font-medium">{s.name}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-gray-500">E media: <b>{eMedia}</b> lux · VLA: {vla} lux</span>
                                <Badge className={cumple ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                                  {cumple ? "Cumple" : "No cumple"}
                                </Badge>
                              </div>
                            </div>
                          );
                        });
                      })}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Botón final */}
        <div className="flex justify-end gap-3 pb-8">
          <Button
            variant="outline"
            onClick={handleAIAnalysis}
            disabled={isAIRunning || !selectedProtocols.filter((p) => p !== "lighting").length}
            className="gap-2"
            data-testid="button-ai-analysis-bottom"
          >
            <Sparkles className="w-4 h-4" />
            {isAIRunning ? "Analizando..." : "Análisis IA"}
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedProtocols.length}
            className="bg-[#003366] hover:bg-[#002244] gap-2 px-6"
            data-testid="button-generate-bottom"
          >
            <Download className="w-4 h-4" />
            {isGenerating ? "Generando..." : combined ? "Generar Informe DOCX" : "Generar Informes ZIP"}
          </Button>
        </div>
      </div>
    </div>
  );
}
