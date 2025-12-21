import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Save, Plus, FileText, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { useStore } from "@/lib/store";
import { MeasurementType, MEASUREMENT_LABELS } from "@/lib/types";
import { MeasurementEditor, LightingGridEditor } from "@/components/measurement-editor";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

interface MeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: MeasurementType | null;
}

const LEGAL_FRAMEWORKS: Record<string, string> = {
  lighting: "Res. SRT 84/2012 - Protocolo para la medición de la iluminación en el ambiente laboral.",
  noise: "Res. SRT 85/2012 - Protocolo para la medición del ruido en el ambiente laboral.",
  thermal_load: "Res. SRT 295/2003 - Especificaciones técnicas sobre carga térmica (Estrés por calor).",
  grounding: "Res. SRT 900/2015 - Protocolo para la medición del valor de puesta a tierra y la verificación de la continuidad.",
  cold_stress: "Res. 295/2003 - Estrés por frío.",
  ventilation: "Decreto 351/79 Cap. 11 - Ventilación.",
  particulate_matter: "Res. 295/2003 - Contaminantes químicos (Polvo total y respirable).",
  chemical_agents: "Res. 295/2003 - Contaminantes químicos."
};

export function MeasurementModal({ isOpen, onClose, type }: MeasurementModalProps) {
  const sectors = useStore((state) => state.sectors);
  const addSectorWithMeasurement = useStore((state) => state.addSectorWithMeasurement);
  const addMeasurement = useStore((state) => state.addMeasurement);
  const { toast } = useToast();

  const [selectedSectorId, setSelectedSectorId] = useState<string>("");
  const [isAddingSector, setIsAddingSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");

  // Reset state when type changes
  useEffect(() => {
    if (isOpen) {
        setSelectedSectorId("");
        setIsAddingSector(false);
        setNewSectorName("");
    }
  }, [isOpen, type]);

  if (!type) return null;

  const handleCreateSector = () => {
    if (!newSectorName) return;
    addSectorWithMeasurement({
        name: newSectorName,
        description: "",
        dimensions: "",
        activity: "",
        workersCount: 0
    }, type);
    
    // Find the newly created sector (it's the last one)
    // In a real app we'd get the ID back, but here we can rely on store update
    setTimeout(() => {
        const updatedSectors = useStore.getState().sectors;
        const newSector = updatedSectors[updatedSectors.length - 1];
        if (newSector) {
            setSelectedSectorId(newSector.id);
        }
    }, 100);
    
    setIsAddingSector(false);
    setNewSectorName("");
    toast({ title: "Sector creado", description: `Se ha creado el sector ${newSectorName}` });
  };

  const selectedSector = sectors.find(s => s.id === selectedSectorId);
  const measurement = selectedSector?.measurements.find(m => m.type === type);

  // If sector selected but no measurement of this type, create it
  useEffect(() => {
      if (selectedSectorId && !measurement) {
          addMeasurement(selectedSectorId, type);
      }
  }, [selectedSectorId, measurement, addMeasurement, type]);

  const complianceStatus = measurement?.status === 'compliant' 
    ? { label: "CUMPLE", color: "text-green-600", icon: <CheckCircle2 className="h-5 w-5" /> }
    : measurement?.status === 'non_compliant'
    ? { label: "NO CUMPLE", color: "text-red-600", icon: <AlertTriangle className="h-5 w-5" /> }
    : { label: "PENDIENTE", color: "text-gray-500", icon: <Info className="h-5 w-5" /> };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/10">
          <div className="flex items-center gap-2 mb-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
               {MEASUREMENT_LABELS[type]}
               {selectedSectorId && (
                   <span className="text-muted-foreground font-normal text-base">
                      - {selectedSector?.name}
                   </span>
               )}
            </DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-2 text-primary font-medium">
             <FileText className="h-4 w-4" /> 
             Marco Legal: {LEGAL_FRAMEWORKS[type] || "Normativa vigente"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Sidebar: Sector Selection */}
            <div className="w-full md:w-64 border-r bg-gray-50 p-4 flex flex-col gap-4">
                <div className="space-y-2">
                    <Label>Seleccionar Sector</Label>
                    {!isAddingSector ? (
                        <div className="space-y-2">
                            <Select value={selectedSectorId} onValueChange={setSelectedSectorId}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder="Elegir sector..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {sectors.map(sector => (
                                        <SelectItem key={sector.id} value={sector.id}>{sector.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button 
                                variant="outline" 
                                className="w-full gap-2 text-primary border-primary/20 hover:bg-primary/5"
                                onClick={() => setIsAddingSector(true)}
                            >
                                <Plus className="h-4 w-4" /> Nuevo Sector
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2 animate-in fade-in slide-in-from-left-2">
                            <Input 
                                placeholder="Nombre del sector" 
                                value={newSectorName}
                                onChange={(e) => setNewSectorName(e.target.value)}
                                className="bg-white"
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <Button size="sm" className="flex-1" onClick={handleCreateSector}>Crear</Button>
                                <Button size="sm" variant="ghost" onClick={() => setIsAddingSector(false)}>Cancelar</Button>
                            </div>
                        </div>
                    )}
                </div>

                {selectedSectorId && (
                     <Card className="bg-white shadow-sm">
                        <CardContent className="p-4 space-y-3">
                            <div className="text-xs font-bold text-muted-foreground uppercase">Estado Actual</div>
                            <div className={`flex items-center gap-2 font-bold ${complianceStatus.color}`}>
                                {complianceStatus.icon}
                                {complianceStatus.label}
                            </div>
                            
                            <Button variant="secondary" size="sm" className="w-full gap-2 text-xs">
                                <Camera className="h-3 w-3" /> Captura Rápida
                            </Button>
                        </CardContent>
                     </Card>
                )}
            </div>

            {/* Main Content: Editor */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white">
                <ScrollArea className="flex-1 p-4">
                    {selectedSectorId && measurement ? (
                        <div className="space-y-4">
                            {type === 'lighting' ? (
                                <LightingGridEditor measurement={measurement} />
                            ) : (
                                <MeasurementEditor measurement={measurement} />
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center opacity-60">
                            <div className="bg-gray-100 p-4 rounded-full mb-4">
                                <FileText className="h-8 w-8" />
                            </div>
                            <h3 className="text-lg font-medium mb-1">Seleccione un sector</h3>
                            <p className="text-sm max-w-xs">
                                Elija un sector existente o cree uno nuevo para comenzar a cargar datos de la medición.
                            </p>
                        </div>
                    )}
                </ScrollArea>
                
                {selectedSectorId && (
                    <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                        <div className="text-xs text-muted-foreground">
                            {measurement?.points?.length || 0} puntos registrados
                        </div>
                        <Button onClick={() => {
                            toast({ title: "Guardado", description: "Los datos se han guardado localmente." });
                            // In real app, this might trigger a sync
                        }} className="gap-2 bg-green-600 hover:bg-green-700">
                            <Save className="h-4 w-4" /> Guardar Cambios
                        </Button>
                    </div>
                )}
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
