import { useState } from "react";
import { useStore } from "@/lib/store";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Building2, MapPin, Calendar, ArrowRight, Lightbulb, Volume2, Thermometer,
  Wind, Beaker, Factory, CheckCircle2, ChevronsUpDown, Plus, Check,
  Save, FileText, Image as ImageIcon, Trash2, Zap, PenTool, Gauge, BarChart3,
  Sparkles, ClipboardList, Users, TrendingUp, Clock, ExternalLink
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { MEASUREMENT_LABELS, MeasurementType } from "@/lib/types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { MeasurementModal } from "@/components/measurement-modal";
import { SketchEditor } from "@/components/sketch-editor";
import { useClients, useCreateInspection } from "@/lib/hooks";
import { useQuery } from "@tanstack/react-query";
import { format, isThisMonth } from "date-fns";
import { es } from "date-fns/locale";

const SHEET_ROUTES: Record<string, string> = {
  lighting: '/lighting-sheet',
  grounding: '/grounding',
  noise: '/noise-sheet',
  thermal_load: '/thermal-sheet',
  cold_stress: '/cold-sheet',
  chemical_agents: '/chemical-sheet',
  particulate_matter: '/particulate-sheet',
  ventilation: '/ventilation-sheet',
  thickness: '/thickness-sheet',
};

const TYPE_COLORS: Record<string, { bg: string; icon: string; border: string }> = {
  lighting:          { bg: '#FFF8E7', icon: '#F59E0B', border: '#FCD34D' },
  noise:             { bg: '#EFF6FF', icon: '#3B82F6', border: '#93C5FD' },
  thermal_load:      { bg: '#FFF1F2', icon: '#EF4444', border: '#FCA5A5' },
  cold_stress:       { bg: '#EFF6FF', icon: '#0EA5E9', border: '#7DD3FC' },
  particulate_matter:{ bg: '#F5F3FF', icon: '#8B5CF6', border: '#C4B5FD' },
  chemical_agents:   { bg: '#ECFDF5', icon: '#10B981', border: '#6EE7B7' },
  ventilation:       { bg: '#F0F9FF', icon: '#06B6D4', border: '#67E8F9' },
  grounding:         { bg: '#FFFBEB', icon: '#D97706', border: '#FCD34D' },
  thickness:         { bg: '#F8FAFC', icon: '#64748B', border: '#CBD5E1' },
};

function getIcon(type: MeasurementType, size = 20) {
  const props = { size };
  switch (type) {
    case 'lighting': return <Lightbulb {...props} />;
    case 'noise': return <Volume2 {...props} />;
    case 'thermal_load': return <Thermometer {...props} />;
    case 'cold_stress': return <Wind {...props} />;
    case 'chemical_agents': return <Beaker {...props} />;
    case 'particulate_matter': return <Factory {...props} />;
    case 'ventilation': return <Wind {...props} />;
    case 'grounding': return <Zap {...props} />;
    case 'thickness': return <Gauge {...props} />;
    default: return <Building2 {...props} />;
  }
}

function getInspectionProtocols(insp: any): string {
  const protocols: string[] = [];
  const np = insp.noiseProtocol || insp.noise_protocol;
  const tp = insp.thermalProtocol || insp.thermal_protocol;
  const cp = insp.coldProtocol || insp.cold_protocol;
  if (np?.rows?.length) protocols.push("Ruido");
  if (tp?.rows?.length) protocols.push("Calor");
  if (cp?.rows?.length) protocols.push("Frío");
  const est = insp.establishment || {};
  if (est.sectors?.length) protocols.push("Iluminación");
  return protocols.length ? protocols.join(", ") : "Sin protocolo";
}

function getInspectionStatus(insp: any): { label: string; color: string } {
  const np = insp.noiseProtocol || insp.noise_protocol;
  const tp = insp.thermalProtocol || insp.thermal_protocol;
  const hasData = np?.rows?.length || tp?.rows?.length;
  if (!hasData) return { label: "Pendiente", color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
  const noiseRows = np?.rows || [];
  const hasNonCompliant = noiseRows.some((r: any) => r.cumple === "NO") ||
    (tp?.rows || []).some((r: any) => r.cumpleVla === "NO");
  if (hasNonCompliant) return { label: "No cumple", color: "bg-red-100 text-red-700 border-red-200" };
  return { label: "Cumple", color: "bg-green-100 text-green-700 border-green-200" };
}

export default function Dashboard() {
  const establishment = useStore((state) => state.establishment);
  const updateEstablishment = useStore((state) => state.updateEstablishment);
  const sectors = useStore((state) => state.sectors);
  const saveInspection = useStore((state) => state.saveInspection);
  const noiseProtocol = useStore((s) => s.noiseProtocol);
  const thermalProtocol = useStore((s) => s.thermalProtocol);
  const coldProtocol = useStore((s) => s.coldProtocol);

  const { data: clients = [] } = useClients();
  const { data: inspections = [] } = useQuery<any[]>({ queryKey: ["/api/inspections"] });
  const [, setLocation] = useLocation();
  const [openClientSelect, setOpenClientSelect] = useState(false);
  const [activeMeasurementType, setActiveMeasurementType] = useState<MeasurementType | null>(null);
  const [sketchEditorOpen, setSketchEditorOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const getMeasurementStats = (type: MeasurementType) => {
    if (type === 'noise') {
      const filled = noiseProtocol.rows.filter(r => r.sector || r.valorMedido).length;
      return { count: filled, completed: noiseProtocol.rows.filter(r => r.cumple).length, isFullyComplete: filled > 0 && noiseProtocol.rows.every(r => r.cumple) };
    }
    if (type === 'thermal_load') {
      const filled = thermalProtocol.rows.filter(r => r.sector || r.tbs).length;
      return { count: filled, completed: thermalProtocol.rows.filter(r => r.cumpleVla).length, isFullyComplete: filled > 0 };
    }
    if (type === 'cold_stress') {
      const filled = coldProtocol.rows.filter(r => r.sector || r.tbs).length;
      return { count: filled, completed: coldProtocol.rows.filter(r => r.tee).length, isFullyComplete: filled > 0 };
    }
    const measurements = sectors.flatMap(s => s.measurements.filter(m => m.type === type));
    const count = measurements.length;
    const completed = measurements.filter(m => m.status === 'compliant' || m.status === 'non_compliant').length;
    return { count, completed, isFullyComplete: count > 0 && count === completed };
  };

  const handleSave = () => {
    saveInspection();
    toast({ title: "✓ Inspección guardada", description: "Los datos se guardaron en el historial." });
  };

  const loadClientToEstablishment = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    updateEstablishment({ name: client.name, razonSocial: client.razonSocial, cuit: client.cuit, address: client.address });
  };

  const handleSketchUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      updateEstablishment({ sketchImage: reader.result as string });
      toast({ title: "Croquis cargado" });
    };
    reader.readAsDataURL(file);
  };

  const totalProtocols = Object.keys(MEASUREMENT_LABELS).filter(k => {
    const stats = getMeasurementStats(k as MeasurementType);
    return stats.count > 0;
  }).length;

  // Metrics
  const inspThisMonth = inspections.filter(i => {
    try { return isThisMonth(new Date(i.updatedAt || i.createdAt)); } catch { return false; }
  }).length;

  const recentInspections = [...inspections]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .slice(0, 5);

  return (
    <div className="pb-20 stagger">
      <MeasurementModal isOpen={!!activeMeasurementType} onClose={() => setActiveMeasurementType(null)} type={activeMeasurementType} />

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <BarChart3 size={14} />
            <span>{totalProtocols} protocolos activos</span>
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-none">
            Tablero de Inspección
          </h1>
          <p className="text-muted-foreground mt-1.5 text-[14px]">
            Relevamientos de higiene y seguridad en tiempo real
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleSave} className="gap-2 text-[13px] h-9">
            <Save className="h-3.5 w-3.5" /> Guardar
          </Button>
          {user?.role === 'admin' && (
            <Link href="/report">
              <Button className="gap-2 text-[13px] h-9 bg-primary hover:bg-primary/90">
                <FileText className="h-3.5 w-3.5" /> Generar Informe
              </Button>
            </Link>
          )}

          <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="justify-between w-[220px] h-9 text-[13px] shadow-sm">
                {establishment.name
                  ? <span className="truncate">{establishment.name}</span>
                  : <span className="text-muted-foreground">Seleccionar Cliente...</span>}
                <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[220px] p-0">
              <Command>
                <CommandInput placeholder="Buscar cliente..." />
                <CommandList>
                  <CommandEmpty>No encontrado.</CommandEmpty>
                  <CommandGroup heading="Clientes">
                    {clients.map((client) => (
                      <CommandItem key={client.id} value={client.name} onSelect={() => { loadClientToEstablishment(client.id); setOpenClientSelect(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", establishment.name === client.name ? "opacity-100" : "opacity-0")} />
                        {client.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {user?.role === 'admin' && (
                    <CommandGroup>
                      <Link href="/clients">
                        <CommandItem className="text-primary font-medium cursor-pointer">
                          <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
                        </CommandItem>
                      </Link>
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="eea-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <ClipboardList className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="text-[28px] font-bold text-foreground leading-none">{inspThisMonth}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">Inspecciones este mes</div>
          </div>
        </div>
        <div className="eea-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <div className="text-[28px] font-bold text-foreground leading-none">{clients.length}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">Clientes activos</div>
          </div>
        </div>
        <div className="eea-card p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <div className="text-[28px] font-bold text-foreground leading-none">{inspections.length}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">Informes en historial</div>
          </div>
        </div>
      </div>

      {/* ── AI Card + Recent Inspections (side by side on desktop) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* AI Card */}
        <Link href="/report">
          <div className="eea-card p-5 cursor-pointer group hover:shadow-md transition-all border-2 border-[hsl(144,60%,40%)]/20 hover:border-[hsl(144,60%,40%)]/50 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[hsl(144,60%,40%)] to-[hsl(200,80%,40%)] flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[hsl(144,60%,40%)] text-white px-2 py-0.5 rounded-full">NUEVO</span>
              </div>
              <div className="font-semibold text-[15px] text-foreground leading-tight mb-1.5">
                Análisis IA disponible
              </div>
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Analizá tableros eléctricos con visión artificial e identificá riesgos y no conformidades automáticamente.
              </p>
            </div>
            <div className="flex items-center gap-1 text-[13px] font-medium text-[hsl(144,60%,35%)] mt-4 group-hover:gap-2 transition-all">
              <span>Abrir Analizador</span>
              <ArrowRight size={14} />
            </div>
          </div>
        </Link>

        {/* Recent Inspections Table */}
        <div className="eea-card lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-[14px]">Inspecciones recientes</span>
            </div>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="text-[12px] h-7 gap-1 text-primary hover:text-primary">
                Ver todo <ExternalLink size={11} />
              </Button>
            </Link>
          </div>

          {recentInspections.length === 0 ? (
            <div className="px-5 py-8 text-center text-muted-foreground text-[13px]">
              <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p>Todavía no hay inspecciones guardadas.</p>
              <p className="text-[12px] mt-1">Guardá una inspección desde el botón "Guardar" arriba.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentInspections.map((insp) => {
                const est = insp.establishment || {};
                const empresa = est.razonSocial || est.name || "Sin nombre";
                const protocols = getInspectionProtocols(insp);
                const status = getInspectionStatus(insp);
                const date = insp.updatedAt || insp.createdAt;
                return (
                  <div key={insp.id} className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors">
                    <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-[13px] truncate">{empresa}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{protocols}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>
                        {status.label}
                      </span>
                      {date && (
                        <span className="text-[11px] text-muted-foreground hidden sm:block">
                          {format(new Date(date), "dd/MM", { locale: es })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Establishment Card ── */}
      <div className="eea-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Building2 size={16} className="text-primary" />
          <span className="font-semibold text-[13px] text-foreground">Datos del Establecimiento</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="field-label">Establecimiento</label>
            <Input value={establishment.name} onChange={(e) => updateEstablishment({ name: e.target.value })} placeholder="Nombre Fantasía" className="h-9 text-[13px]" />
          </div>
          <div>
            <label className="field-label">Dirección</label>
            <Input value={establishment.address} onChange={(e) => updateEstablishment({ address: e.target.value })} placeholder="Dirección completa" className="h-9 text-[13px]" />
          </div>
          <div>
            <label className="field-label">CUIT</label>
            <Input value={establishment.cuit} onChange={(e) => updateEstablishment({ cuit: e.target.value })} placeholder="XX-XXXXXXXX-X" className="h-9 text-[13px]" />
          </div>
          <div>
            <label className="field-label">Fecha de Relevamiento</label>
            <Input type="date" value={establishment.date} onChange={(e) => updateEstablishment({ date: e.target.value })} className="h-9 text-[13px]" />
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center gap-3">
          <span className="field-label mb-0">Croquis del Establecimiento (Anexo 1)</span>
          {establishment.sketchImage ? (
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[12px] text-green-700 font-semibold">
                <CheckCircle2 size={13} /> Cargado
              </span>
              <div className="border rounded-lg p-1.5 bg-white">
                <img src={establishment.sketchImage} alt="Croquis" className="max-h-24 max-w-[180px] object-contain" />
              </div>
              <Button variant="ghost" size="sm" className="text-destructive h-7 px-2 text-[12px]" onClick={() => updateEstablishment({ sketchImage: undefined })}>
                <Trash2 size={12} className="mr-1" /> Eliminar
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <div className="relative">
                <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5">
                  <ImageIcon size={12} /> Subir imagen
                </Button>
                <Input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => e.target.files?.[0] && handleSketchUpload(e.target.files[0])} />
              </div>
              <Button variant="outline" size="sm" className="h-8 text-[12px] gap-1.5" onClick={() => setSketchEditorOpen(true)}>
                <PenTool size={12} /> Dibujar
              </Button>
              <SketchEditor open={sketchEditorOpen} onOpenChange={setSketchEditorOpen}
                onSave={(imageData) => { updateEstablishment({ sketchImage: imageData }); toast({ title: "Croquis guardado" }); }}
                initialImage={establishment.sketchImage} />
            </div>
          )}
        </div>
      </div>

      {/* ── Protocol Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(MEASUREMENT_LABELS).map(([key, label]) => {
          const type = key as MeasurementType;
          const stats = getMeasurementStats(type);
          const hasData = stats.count > 0;
          const colors = TYPE_COLORS[type] || TYPE_COLORS.thickness;
          const route = SHEET_ROUTES[type];

          return (
            <div
              key={key}
              className={`protocol-card group ${hasData ? 'has-data' : ''}`}
              onClick={() => route ? setLocation(route) : setActiveMeasurementType(type)}
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: colors.bg, color: colors.icon }}>
                    {getIcon(type, 18)}
                  </div>
                  {hasData && (
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                      <CheckCircle2 size={11} />
                      Activo
                    </div>
                  )}
                </div>

                <div className="mb-3">
                  <div className="font-semibold text-[14px] text-foreground leading-tight">{label}</div>
                  {hasData && (
                    <div className="text-[22px] font-bold text-foreground mt-1 leading-none">
                      {stats.count}
                      <span className="text-[13px] font-normal text-muted-foreground ml-1">sectores</span>
                    </div>
                  )}
                </div>

                {hasData && stats.count > 0 && (
                  <div className="mb-4">
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.round((stats.completed / stats.count) * 100)}%`, background: colors.icon }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{stats.completed}/{stats.count} completos</div>
                  </div>
                )}

                <div className={`flex items-center justify-between text-[13px] font-medium pt-3 border-t transition-colors
                  ${hasData ? 'border-green-100 text-green-700 group-hover:text-green-800' : 'border-border text-muted-foreground group-hover:text-primary'}`}>
                  <span>{hasData ? 'Continuar carga' : 'Comenzar'}</span>
                  <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
