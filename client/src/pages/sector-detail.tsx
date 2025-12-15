import { useStore } from "@/lib/store";
import { useRoute, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Settings, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MEASUREMENT_LABELS, MeasurementType } from "@/lib/types";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { MeasurementEditor } from "@/components/measurement-editor";

export default function SectorDetail() {
  const [match, params] = useRoute("/sector/:id");
  const id = params?.id;
  
  const sectors = useStore((state) => state.sectors);
  const updateSector = useStore((state) => state.updateSector);
  const deleteSector = useStore((state) => state.deleteSector);
  const addMeasurement = useStore((state) => state.addMeasurement);
  
  const sector = sectors.find((s) => s.id === id);

  if (!sector) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-xl font-semibold text-muted-foreground">Sector no encontrado</h2>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inicio
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 border-b pb-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            {sector.name}
          </h1>
          <p className="text-sm text-muted-foreground">Gestión de mediciones y datos del área</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="w-full md:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Medición
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {Object.entries(MEASUREMENT_LABELS).map(([key, label]) => (
                <DropdownMenuItem key={key} onClick={() => addMeasurement(sector.id, key as MeasurementType)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sector Details Form */}
      <Card className="bg-muted/10 border-none shadow-none">
        <CardContent className="p-0 grid gap-4 md:grid-cols-4">
           <div className="space-y-1.5">
             <Label className="text-xs text-muted-foreground">Nombre del Sector</Label>
             <Input 
               className="bg-background"
               value={sector.name} 
               onChange={(e) => updateSector(sector.id, { name: e.target.value })} 
             />
           </div>
           <div className="space-y-1.5">
             <Label className="text-xs text-muted-foreground">Actividad Principal</Label>
             <Input 
               className="bg-background"
               value={sector.activity || ''} 
               onChange={(e) => updateSector(sector.id, { activity: e.target.value })}
               placeholder="Ej. Soldadura" 
             />
           </div>
           <div className="space-y-1.5">
             <Label className="text-xs text-muted-foreground">Dimensiones</Label>
             <Input 
               className="bg-background"
               value={sector.dimensions || ''} 
               onChange={(e) => updateSector(sector.id, { dimensions: e.target.value })}
               placeholder="Ej. 50m2" 
             />
           </div>
           <div className="space-y-1.5">
             <Label className="text-xs text-muted-foreground">Cant. Trabajadores</Label>
             <Input 
               className="bg-background"
               type="number"
               value={sector.workersCount || ''} 
               onChange={(e) => updateSector(sector.id, { workersCount: parseInt(e.target.value) || 0 })} 
             />
           </div>
           <div className="md:col-span-4 flex justify-end">
             <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
                if(confirm("¿Eliminar este sector y todas sus mediciones?")) {
                  deleteSector(sector.id);
                  window.location.href = "/";
                }
             }}>
               <Trash2 className="mr-2 h-4 w-4" /> Eliminar Sector
             </Button>
           </div>
        </CardContent>
      </Card>

      <Separator />
      
      <div className="space-y-6">
        <h2 className="text-lg font-bold tracking-tight">Mediciones en curso</h2>
        {sector.measurements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-lg bg-muted/5 text-center">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg">Sin mediciones</h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              Selecciona el tipo de riesgo o agente a medir en este sector para comenzar la carga de datos.
            </p>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">Agregar Primera Medición</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {Object.entries(MEASUREMENT_LABELS).map(([key, label]) => (
                  <DropdownMenuItem key={key} onClick={() => addMeasurement(sector.id, key as MeasurementType)}>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : (
          <div className="grid gap-8">
             {sector.measurements.map(m => (
               <MeasurementEditor key={m.id} measurement={m} />
             ))}
          </div>
        )}
      </div>
    </div>
  );
}
