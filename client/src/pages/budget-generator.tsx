import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { FileText, Inbox, DollarSign, Building2, User, Mail, Phone, ExternalLink, Save, Download } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type BudgetRequest = {
  id: string;
  razonSocial: string;
  cuit?: string;
  direccion?: string;
  localidad?: string;
  provincia?: string;
  rubro?: string;
  contactoNombre: string;
  contactoCargo?: string;
  contactoEmail: string;
  contactoTelefono?: string;
  medicionesSolicitadas: string[];
  detallesPorMedicion?: Record<string, any>;
  cantidadTrabajadores?: string;
  art?: string;
  fechaEstimada?: string;
  observaciones?: string;
  estado: string;
  respuesta?: string;
  presupuestoTotal?: number;
  origen?: string;
  creadoEn: string;
};

type PriceConfig = {
  id: string;
  medicion: string;
  precioBase: number;
  descripcion?: string;
  activo?: boolean;
};

const ESTADO_CONFIG: Record<string, { label: string; color: string; dot?: boolean }> = {
  nuevo: { label: "Nuevo", color: "bg-red-100 text-red-700 border-red-200", dot: true },
  leido: { label: "Leído", color: "bg-amber-100 text-amber-700 border-amber-200" },
  respondido: { label: "Respondido", color: "bg-blue-100 text-blue-700 border-blue-200" },
  cerrado: { label: "Cerrado", color: "bg-gray-100 text-gray-600 border-gray-200" },
};

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CONFIG[estado] || { label: estado, color: "bg-gray-100 text-gray-600 border-gray-200" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.color}`}>
      {cfg.dot && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />}
      {cfg.label}
    </span>
  );
}

function MedicionPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
      {label}
    </span>
  );
}

// ── TAB 1: Pedidos Recibidos ──
function PedidosTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState("");
  const [estadoEdit, setEstadoEdit] = useState("");
  const [presupuestoTotal, setPresupuestoTotal] = useState<number | undefined>();

  const { data: pedidos = [], isLoading } = useQuery<BudgetRequest[]>({
    queryKey: ["/api/budget-requests"],
  });

  const { data: detalle } = useQuery<BudgetRequest>({
    queryKey: ["/api/budget-requests", selectedId],
    queryFn: () =>
      fetch(`/api/budget-requests/${selectedId}`, { credentials: "include" }).then(r => r.json()),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (detalle) {
      setRespuesta(detalle.respuesta || "");
      setEstadoEdit(detalle.estado);
      setPresupuestoTotal(detalle.presupuestoTotal ?? undefined);
    }
  }, [detalle]);

  const patchMutation = useMutation({
    mutationFn: (data: any) =>
      apiRequest("PATCH", `/api/budget-requests/${selectedId}`, data),
    onSuccess: () => {
      toast({ title: "✓ Guardado", description: "Pedido actualizado." });
      queryClient.invalidateQueries({ queryKey: ["/api/budget-requests"] });
    },
  });

  const handleDownloadPdf = async () => {
    if (!selectedId) return;
    const resp = await fetch(`/api/budget-requests/${selectedId}/pdf`, {
      method: "POST",
      credentials: "include",
    });
    if (!resp.ok) {
      toast({ title: "Error generando documento", variant: "destructive" });
      return;
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Presupuesto_EEA.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="text-center py-16 text-muted-foreground">Cargando pedidos…</div>;
  }

  if (pedidos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <Inbox className="h-12 w-12 text-muted-foreground/40" />
        <p className="text-muted-foreground max-w-md">
          Aún no recibiste pedidos. Cuando los clientes completen el formulario en tu web o hablen con Vera, los pedidos aparecerán acá.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {pedidos.map((p) => (
          <Card key={p.id} className="border border-border hover:border-primary/30 transition-colors" data-testid={`card-pedido-${p.id}`}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <EstadoBadge estado={p.estado} />
                    {p.origen && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border">
                        {p.origen === "vera" ? "🤖 vera" : "🌐 web-form"}
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground truncate">{p.razonSocial}</h3>
                  <p className="text-xs text-muted-foreground">
                    {p.cuit ? `CUIT ${p.cuit}` : ""}
                    {p.rubro ? ` · ${p.rubro}` : ""}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                    <User className="h-3 w-3" />
                    <span>{p.contactoNombre}</span>
                    <Mail className="h-3 w-3 ml-1" />
                    <span className="truncate">{p.contactoEmail}</span>
                    {p.contactoTelefono && (
                      <>
                        <Phone className="h-3 w-3 ml-1" />
                        <span>{p.contactoTelefono}</span>
                      </>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(p.medicionesSolicitadas || []).map((m) => (
                      <MedicionPill key={m} label={m} />
                    ))}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground">
                    {p.creadoEn
                      ? format(new Date(p.creadoEn), "d MMM yyyy HH:mm", { locale: es })
                      : ""}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedId(p.id)}
                    data-testid={`button-ver-pedido-${p.id}`}
                  >
                    Ver detalle <ExternalLink className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          {detalle && (
            <>
              <SheetHeader className="mb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {detalle.razonSocial}
                </SheetTitle>
                <EstadoBadge estado={detalle.estado} />
              </SheetHeader>

              <div className="space-y-5 text-sm">
                <section>
                  <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Datos empresa</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    <span className="text-muted-foreground">CUIT</span><span>{detalle.cuit || "-"}</span>
                    <span className="text-muted-foreground">Dirección</span><span>{detalle.direccion || "-"}</span>
                    <span className="text-muted-foreground">Localidad</span><span>{detalle.localidad || "-"}</span>
                    <span className="text-muted-foreground">Provincia</span><span>{detalle.provincia || "-"}</span>
                    <span className="text-muted-foreground">Rubro</span><span>{detalle.rubro || "-"}</span>
                    <span className="text-muted-foreground">Trabajadores</span><span>{detalle.cantidadTrabajadores || "-"}</span>
                    <span className="text-muted-foreground">ART</span><span>{detalle.art || "-"}</span>
                    <span className="text-muted-foreground">Fecha estimada</span><span>{detalle.fechaEstimada || "-"}</span>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Contacto</h4>
                  <div className="grid grid-cols-2 gap-1.5">
                    <span className="text-muted-foreground">Nombre</span><span>{detalle.contactoNombre}</span>
                    <span className="text-muted-foreground">Cargo</span><span>{detalle.contactoCargo || "-"}</span>
                    <span className="text-muted-foreground">Email</span><span className="truncate">{detalle.contactoEmail}</span>
                    <span className="text-muted-foreground">Teléfono</span><span>{detalle.contactoTelefono || "-"}</span>
                  </div>
                </section>

                <section>
                  <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Mediciones solicitadas</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(detalle.medicionesSolicitadas || []).map((m) => (
                      <MedicionPill key={m} label={m} />
                    ))}
                  </div>
                </section>

                {detalle.detallesPorMedicion &&
                  Object.keys(detalle.detallesPorMedicion).length > 0 && (
                    <section>
                      <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Detalles técnicos</h4>
                      <pre className="bg-muted rounded-lg p-3 text-xs overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(detalle.detallesPorMedicion, null, 2)}
                      </pre>
                    </section>
                  )}

                {detalle.observaciones && (
                  <section>
                    <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Observaciones del cliente</h4>
                    <p className="text-muted-foreground bg-muted rounded-lg p-3">{detalle.observaciones}</p>
                  </section>
                )}

                <section className="border-t pt-4 space-y-3">
                  <h4 className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Respuesta interna</h4>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground w-24">Estado</label>
                    <Select value={estadoEdit} onValueChange={setEstadoEdit}>
                      <SelectTrigger className="h-8 text-xs" data-testid="select-estado">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nuevo">Nuevo</SelectItem>
                        <SelectItem value="leido">Leído</SelectItem>
                        <SelectItem value="respondido">Respondido</SelectItem>
                        <SelectItem value="cerrado">Cerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground w-24">Total ($)</label>
                    <Input
                      type="number"
                      className="h-8 text-xs"
                      value={presupuestoTotal ?? ""}
                      onChange={e =>
                        setPresupuestoTotal(e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="Monto total"
                      data-testid="input-presupuesto-total"
                    />
                  </div>
                  <Textarea
                    placeholder="Escribí tu respuesta o notas internas…"
                    value={respuesta}
                    onChange={e => setRespuesta(e.target.value)}
                    rows={4}
                    className="text-sm"
                    data-testid="textarea-respuesta"
                  />
                  <Button
                    className="w-full"
                    onClick={() =>
                      patchMutation.mutate({ estado: estadoEdit, respuesta, presupuestoTotal })
                    }
                    disabled={patchMutation.isPending}
                    data-testid="button-guardar-pedido"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {patchMutation.isPending ? "Guardando…" : "Guardar"}
                  </Button>
                </section>

                <section className="border-t pt-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleDownloadPdf}
                    data-testid="button-descargar-presupuesto"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Generar Presupuesto DOCX
                  </Button>
                </section>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── TAB 2: Precios ──
function PreciosTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});

  const { data: prices = [], isLoading } = useQuery<PriceConfig[]>({
    queryKey: ["/api/price-config"],
  });

  useEffect(() => {
    if (prices.length > 0) {
      setLocalPrices(Object.fromEntries(prices.map(p => [p.medicion, p.precioBase])));
    }
  }, [prices]);

  const saveMutation = useMutation({
    mutationFn: ({ medicion, precio_base }: { medicion: string; precio_base: number }) =>
      apiRequest("PATCH", `/api/price-config/${medicion}`, { precio_base }),
    onSuccess: () => {
      toast({ title: "✓ Precio actualizado" });
      queryClient.invalidateQueries({ queryKey: ["/api/price-config"] });
    },
  });

  if (isLoading) {
    return <div className="text-center py-16 text-muted-foreground">Cargando precios…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/60 border-b">
              <th className="text-left p-3 font-semibold text-muted-foreground">Medición</th>
              <th className="text-left p-3 font-semibold text-muted-foreground">Normativa</th>
              <th className="text-right p-3 font-semibold text-muted-foreground w-36">Precio base ($)</th>
              <th className="p-3 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p, i) => (
              <tr key={p.medicion} className={i % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                <td className="p-3 font-medium capitalize">{p.medicion.replace(/_/g, " ")}</td>
                <td className="p-3 text-muted-foreground text-xs">{p.descripcion}</td>
                <td className="p-3">
                  <Input
                    type="number"
                    className="h-8 text-right w-28 ml-auto"
                    value={localPrices[p.medicion] ?? 0}
                    onChange={e =>
                      setLocalPrices(prev => ({ ...prev, [p.medicion]: Number(e.target.value) }))
                    }
                    data-testid={`input-precio-${p.medicion}`}
                  />
                </td>
                <td className="p-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs w-full"
                    onClick={() =>
                      saveMutation.mutate({
                        medicion: p.medicion,
                        precio_base: localPrices[p.medicion] ?? 0,
                      })
                    }
                    disabled={saveMutation.isPending}
                    data-testid={`button-guardar-precio-${p.medicion}`}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    Guardar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Estos precios se usan como base al exportar el PDF desde un pedido recibido.
      </p>
    </div>
  );
}

// ── PÁGINA PRINCIPAL ──
export default function BudgetGenerator() {
  const { data: pedidos = [] } = useQuery<BudgetRequest[]>({
    queryKey: ["/api/budget-requests"],
  });
  const nuevos = pedidos.filter(p => p.estado === "nuevo").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          Presupuestos
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestión de pedidos de presupuesto y configuración de precios.
        </p>
      </div>

      <Tabs defaultValue="pedidos">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="pedidos" className="relative" data-testid="tab-pedidos">
            Pedidos recibidos
            {nuevos > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                {nuevos}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="precios" data-testid="tab-precios">
            <DollarSign className="h-3.5 w-3.5 mr-1" />
            Precios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="mt-4">
          <PedidosTab />
        </TabsContent>

        <TabsContent value="precios" className="mt-4">
          <PreciosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
