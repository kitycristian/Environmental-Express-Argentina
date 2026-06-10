import { useClients } from "@/lib/hooks";
import { useQuery } from "@tanstack/react-query";
import { format, isThisMonth } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, Users, TrendingUp, Clock, ExternalLink,
  Building2, ArrowRight, Sparkles, Home,
} from "lucide-react";

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
  const { data: clients = [] } = useClients();
  const { data: inspections = [] } = useQuery<any[]>({ queryKey: ["/api/inspections"] });

  const inspThisMonth = inspections.filter(i => {
    try { return isThisMonth(new Date(i.updatedAt || i.createdAt)); } catch { return false; }
  }).length;

  const recentInspections = [...inspections]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .slice(0, 5);

  return (
    <div className="pb-20 stagger">
      {/* ── Header ── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
          <Home size={14} />
          <span>Panel principal</span>
        </div>
        <h1 className="text-[28px] font-bold tracking-tight text-foreground leading-none">Inicio</h1>
        <p className="text-muted-foreground mt-1.5 text-[14px]">Resumen de actividad</p>
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

      {/* ── AI Card + Recent Inspections ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
              <p className="text-[12px] mt-1 opacity-70">Guardá una desde "Nueva Inspección".</p>
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
    </div>
  );
}
