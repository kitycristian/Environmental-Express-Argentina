import { useState } from "react";
import { useStore } from "@/lib/store";
import { useRoute, Link } from "wouter";
import { MeasurementType, MEASUREMENT_LABELS, Measurement } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, MapPin, Search } from "lucide-react";
import { MeasurementEditor } from "@/components/measurement-editor";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";

export default function MeasurementCampaign() {
  const [match, params] = useRoute("/campaign/:type");
  const type = params?.type as MeasurementType;
  
  const sectors = useStore((state) => state.sectors);
  const addSector = useStore((state) => state.addSector);
  const addMeasurement = useStore((state) => state.addMeasurement);
  const deleteSector = useStore((state) => state.deleteSector); // We might want to delete just the measurement, not the sector? 
  // User asked: "Add sectors inside measurement". If I delete from here, do I delete the sector or just the measurement?
  // Usually in this workflow, the sector exists *for* the measurement. Let's assume deleting the card removes the measurement from the sector. If sector has no other measurements, maybe warn?
  // For simplicity: "Delete Measurement from Sector".
  const deleteMeasurement = useStore((state) => state.deleteMeasurement);
  const updateSector = useStore((state) => state.updateSector);

  const [isNewSectorOpen, setIsNewSectorOpen] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  if (!type || !MEASUREMENT_LABELS[type]) {
    return <div>Tipo de medición no válido</div>;
  }

  // Filter sectors that have this measurement type
  const activeSectors = sectors.filter(s => s.measurements.some(m => m.type === type));
  
  // Filter for search
  const filteredSectors = activeSectors.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddSector = () => {
    if (!newSectorName.trim()) return;
    
    // Check if sector already exists (by name) to reuse it? 
    // For now, let's create a new one as requested "Add Sector". 
    // But if they type "Taller", and "Taller" exists, maybe we should just add the measurement to it?
    // Let's keep it simple: Create New Sector + Add Measurement.
    
    // Wait, create sector is async in store? No, synchronous.
    // We need the ID of the new sector to add the measurement.
    // The store `addSector` doesn't return ID. I need to generate ID here or update store to return it.
    // I will use a direct approach: Generate ID here or update store logic.
    // Actually, `addSector` in store uses uuid(). I can't easily get it back without refactoring store.
    // Refactoring store is safer. Or I can just pass a pre-generated ID to `addSector`.
    // Let's check `store.ts`. `addSector` takes `Omit<Sector, 'id' ...>`.
    
    // WORKAROUND: I will modify `store.ts` to accept an ID or I will find the last added sector. 
    // BETTER: I'll just refactor `addSector` in `store.ts` to accept an optional ID, or I'll implement a "addSectorWithMeasurement" action in store?
    // "addSectorWithMeasurement" sounds perfect for this requirement.
    
    // For now, let's assume I can't change store easily (I can, but I want to be fast).
    // I will refactor the store in the next step to support this workflow better. 
    // Wait, I can just use `addSector` and then immediately `addMeasurement` to the last sector? Risky.
    
    // Let's modify the store to return the ID or accept it.
    // Actually, I'll just change the store first.
    return; 
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-500 pb-20">
       {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 border-b pb-4 sticky top-0 bg-background/95 backdrop-blur z-10 pt-2">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs uppercase tracking-widest text-muted-foreground">Campaña</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">
            {MEASUREMENT_LABELS[type]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {activeSectors.length} sectores relevados
          </p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Buscar sector..." 
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Dialog open={isNewSectorOpen} onOpenChange={setIsNewSectorOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Agregar Sector
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nuevo Sector para {MEASUREMENT_LABELS[type]}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="sectorName">Nombre del Sector</Label>
                  <Input 
                    id="sectorName" 
                    value={newSectorName} 
                    onChange={(e) => setNewSectorName(e.target.value)} 
                    placeholder="Ej. Nave de Producción"
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewSectorOpen(false)}>Cancelar</Button>
                <Button onClick={() => {
                  // This will be handled by a new store action I'll create
                  useStore.getState().addSectorWithMeasurement({
                    name: newSectorName,
                    description: "",
                    dimensions: "",
                    activity: "",
                    workersCount: 0
                  }, type);
                  setNewSectorName("");
                  setIsNewSectorOpen(false);
                }}>Crear y Medir</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {filteredSectors.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/5">
            <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h3 className="font-semibold text-lg">No hay sectores registrados</h3>
            <p className="text-muted-foreground mb-4 max-w-sm mx-auto">
              Agrega un sector para comenzar a registrar mediciones de {MEASUREMENT_LABELS[type].toLowerCase()}.
            </p>
            <Button onClick={() => setIsNewSectorOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Primer Sector
            </Button>
          </div>
        ) : (
          filteredSectors.map((sector) => {
            const measurement = sector.measurements.find(m => m.type === type);
            if (!measurement) return null;

            return (
              <Collapsible key={sector.id} defaultOpen className="group">
                <Card className="border shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between p-4 bg-card border-b hover:bg-muted/10 transition-colors">
                    <CollapsibleTrigger asChild>
                       <div className="flex items-center gap-3 cursor-pointer flex-1">
                          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                          <div>
                            <h3 className="font-semibold text-lg">{sector.name}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{sector.measurements.length} mediciones total</span>
                              {sector.workersCount ? <span>• {sector.workersCount} operarios</span> : null}
                            </div>
                          </div>
                          <Badge variant={measurement.status === 'compliant' ? 'default' : measurement.status === 'non_compliant' ? 'destructive' : 'secondary'} className="ml-2">
                             {measurement.status === 'compliant' ? 'CUMPLE' : measurement.status === 'non_compliant' ? 'NO CUMPLE' : 'PENDIENTE'}
                          </Badge>
                       </div>
                    </CollapsibleTrigger>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => {
                        if(confirm(`¿Eliminar la medición de ${MEASUREMENT_LABELS[type]} en ${sector.name}?`)) {
                          deleteMeasurement(sector.id, measurement.id);
                        }
                      }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <CollapsibleContent>
                    <div className="p-4 bg-muted/5 space-y-4">
                      {/* Sector Mini-Edit Fields */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4 bg-background p-3 rounded border">
                         <div>
                            <Label className="text-xs text-muted-foreground">Actividad</Label>
                            <Input 
                              className="h-7 text-xs" 
                              value={sector.activity || ''} 
                              onChange={(e) => updateSector(sector.id, { activity: e.target.value })}
                            />
                         </div>
                         <div>
                            <Label className="text-xs text-muted-foreground">Dimensiones</Label>
                            <Input 
                              className="h-7 text-xs" 
                              value={sector.dimensions || ''} 
                              onChange={(e) => updateSector(sector.id, { dimensions: e.target.value })}
                            />
                         </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">Operarios</Label>
                            <Input 
                              className="h-7 text-xs" 
                              type="number"
                              value={sector.workersCount || ''} 
                              onChange={(e) => updateSector(sector.id, { workersCount: parseInt(e.target.value) || 0 })}
                            />
                         </div>
                      </div>

                      {/* The Editor */}
                      <MeasurementEditor measurement={measurement} />
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })
        )}
      </div>
    </div>
  );
}
