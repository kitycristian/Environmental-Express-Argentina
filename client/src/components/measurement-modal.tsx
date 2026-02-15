import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Save, Plus, FileText, CheckCircle2, AlertTriangle, Info, Building2, ListPlus } from "lucide-react";
import { useStore } from "@/lib/store";
import { MeasurementType, MEASUREMENT_LABELS } from "@/lib/types";
import { MeasurementEditor, LightingGridEditor } from "@/components/measurement-editor";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { useRubros } from "@/lib/hooks";

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
  chemical_agents: "Res. 295/2003 - Contaminantes químicos.",
  thickness: "ASME Sección VIII Div. 1 - Control de recipientes sometidos a presión. Medición de espesores por ultrasonido."
};

export function MeasurementModal({ isOpen, onClose, type }: MeasurementModalProps) {
  const sectors = useStore((state) => state.sectors);
  const { data: rubros = [] } = useRubros();
  const addSectorWithMeasurement = useStore((state) => state.addSectorWithMeasurement);
  const addMeasurement = useStore((state) => state.addMeasurement);
  const { toast } = useToast();

  const [selectedSectorId, setSelectedSectorId] = useState<string>("");
  const [isAddingSector, setIsAddingSector] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");
  
  // Bulk Import State
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedRubro, setSelectedRubro] = useState<string>("");
  const [selectedRubroSectors, setSelectedRubroSectors] = useState<string[]>([]);

  // Reset state when type changes
  useEffect(() => {
    if (isOpen) {
        setSelectedSectorId("");
        setIsAddingSector(false);
        setNewSectorName("");
        setIsBulkImportOpen(false);
    }
  }, [isOpen, type]);

  const handleCreateSector = () => {
    if (!newSectorName || !type) return;
    addSectorWithMeasurement({
        name: newSectorName,
        description: "",
        dimensions: "",
        activity: "",
        workersCount: 0
    }, type);
    
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
  
  const handleBulkImport = () => {
      if (!type || selectedRubroSectors.length === 0) return;
      
      selectedRubroSectors.forEach(sectorName => {
        addSectorWithMeasurement({
            name: sectorName,
            description: "",
            dimensions: "",
            activity: "",
            workersCount: 0
        }, type);
      });
      
      toast({ title: "Importación Exitosa", description: `Se han creado ${selectedRubroSectors.length} sectores.` });
      setIsBulkImportOpen(false);
      setSelectedRubro("");
      setSelectedRubroSectors([]);
  };

  const getRubroSectors = (rubroId: string) => {
    const rubro = rubros.find(r => r.id === rubroId);
    return rubro ? rubro.sectors : [];
  };

  const selectedSector = sectors.find(s => s.id === selectedSectorId);
  const measurement = selectedSector?.measurements.find(m => m.type === type);

  // If sector selected but no measurement of this type, create it
  useEffect(() => {
      if (selectedSectorId && !measurement && type) {
          addMeasurement(selectedSectorId, type);
      }
  }, [selectedSectorId, measurement, addMeasurement, type]);

  const complianceStatus = measurement?.status === 'compliant' 
    ? { label: "CUMPLE", color: "text-green-600", icon: <CheckCircle2 className="h-5 w-5" /> }
    : measurement?.status === 'non_compliant'
    ? { label: "NO CUMPLE", color: "text-red-600", icon: <AlertTriangle className="h-5 w-5" /> }
    : { label: "PENDIENTE", color: "text-gray-500", icon: <Info className="h-5 w-5" /> };

  if (!type) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[98vw] max-w-none h-[95vh] max-h-[95vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 md:p-6 border-b bg-primary/5">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl md:text-3xl font-bold flex items-center gap-3">
               {MEASUREMENT_LABELS[type]}
               {selectedSectorId && (
                   <span className="text-primary font-semibold">
                      - {selectedSector?.name}
                   </span>
               )}
            </DialogTitle>
            {selectedSectorId && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-lg font-bold ${
                measurement?.status === 'compliant' ? 'bg-green-100 text-green-700' :
                measurement?.status === 'non_compliant' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {complianceStatus.icon}
                {complianceStatus.label}
              </div>
            )}
          </div>
          <DialogDescription className="flex items-center gap-2 text-primary font-medium text-base">
             <FileText className="h-5 w-5" /> 
             {LEGAL_FRAMEWORKS[type] || "Normativa vigente"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
            {/* Top Bar: Sector Selection - LARGE for field use */}
            <div className="border-b bg-gray-50 p-4">
                {!isAddingSector && !isBulkImportOpen ? (
                    <div className="flex flex-wrap items-center gap-3">
                        <Label className="text-lg font-bold">Sector:</Label>
                        <Select value={selectedSectorId} onValueChange={setSelectedSectorId}>
                            <SelectTrigger className="h-14 text-lg bg-white min-w-[300px] font-semibold">
                                <SelectValue placeholder="Elegir sector..." />
                            </SelectTrigger>
                            <SelectContent>
                                {sectors.map(sector => (
                                    <SelectItem key={sector.id} value={sector.id} className="text-lg py-3">{sector.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button 
                            variant="outline" 
                            className="h-14 gap-2 text-primary border-primary/30 hover:bg-primary/5 text-base px-6"
                            onClick={() => setIsAddingSector(true)}
                        >
                            <Plus className="h-5 w-5" /> Nuevo Sector
                        </Button>
                        <Button 
                            variant="default" 
                            className="h-14 gap-2 text-base px-6"
                            onClick={() => setIsBulkImportOpen(true)}
                        >
                            <ListPlus className="h-5 w-5" /> Importar Masivo
                        </Button>
                    </div>
                ) : isBulkImportOpen ? (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 max-w-2xl">
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-primary">Importar Sectores desde Rubro</span>
                            <Button size="lg" variant="ghost" onClick={() => setIsBulkImportOpen(false)}>
                                Cancelar
                            </Button>
                        </div>
                        
                        <Select value={selectedRubro} onValueChange={setSelectedRubro}>
                            <SelectTrigger className="h-14 text-lg">
                                <SelectValue placeholder="Seleccionar Rubro" />
                            </SelectTrigger>
                            <SelectContent>
                                {rubros.map(r => (
                                    <SelectItem key={r.id} value={r.id} className="text-lg py-3">{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedRubro && (
                            <>
                                <div className="flex gap-2">
                                    <Button 
                                        size="lg" 
                                        variant="outline" 
                                        className="flex-1 text-base h-12"
                                        onClick={() => setSelectedRubroSectors(getRubroSectors(selectedRubro))}
                                    >
                                        Seleccionar Todos
                                    </Button>
                                    <Button 
                                        size="lg" 
                                        variant="ghost" 
                                        className="text-base h-12"
                                        onClick={() => setSelectedRubroSectors([])}
                                    >
                                        Ninguno
                                    </Button>
                                </div>
                                <div className="max-h-[200px] overflow-y-auto border-2 rounded-lg bg-white p-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {getRubroSectors(selectedRubro).map(sector => (
                                        <div 
                                            key={sector} 
                                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${
                                                selectedRubroSectors.includes(sector) 
                                                    ? 'bg-primary/10 border-2 border-primary' 
                                                    : 'bg-gray-50 border-2 border-transparent hover:border-gray-300'
                                            }`}
                                            onClick={() => {
                                                if (selectedRubroSectors.includes(sector)) {
                                                    setSelectedRubroSectors(selectedRubroSectors.filter(s => s !== sector));
                                                } else {
                                                    setSelectedRubroSectors([...selectedRubroSectors, sector]);
                                                }
                                            }}
                                        >
                                            <input type="checkbox" checked={selectedRubroSectors.includes(sector)} readOnly className="h-5 w-5 rounded" />
                                            <span className="text-base font-medium">{sector}</span>
                                        </div>
                                    ))}
                                </div>
                                <Button size="lg" className="w-full h-14 text-lg" onClick={handleBulkImport} disabled={selectedRubroSectors.length === 0}>
                                    Importar {selectedRubroSectors.length} Sectores
                                </Button>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
                        <Input 
                            placeholder="Nombre del nuevo sector" 
                            value={newSectorName}
                            onChange={(e) => setNewSectorName(e.target.value)}
                            className="h-14 text-lg bg-white max-w-md"
                            autoFocus
                        />
                        <Button size="lg" className="h-14 px-8 text-base" onClick={handleCreateSector}>Crear Sector</Button>
                        <Button size="lg" variant="ghost" className="h-14" onClick={() => setIsAddingSector(false)}>Cancelar</Button>
                    </div>
                )}
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* LEFT: Quick navigation for existing sectors */}
                {sectors.length > 0 && (
                    <div className="hidden md:block w-56 border-r bg-gray-50/50 overflow-y-auto">
                        <div className="p-3">
                            <span className="text-xs font-bold uppercase text-gray-500">Sectores ({sectors.length})</span>
                        </div>
                        {sectors.map(sector => {
                            const sectorMeasurement = sector.measurements.find(m => m.type === type);
                            const status = sectorMeasurement?.status;
                            return (
                                <div 
                                    key={sector.id}
                                    onClick={() => setSelectedSectorId(sector.id)}
                                    className={`p-3 cursor-pointer border-l-4 transition-all ${
                                        selectedSectorId === sector.id 
                                            ? 'bg-primary/10 border-primary font-semibold' 
                                            : 'border-transparent hover:bg-gray-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        {status === 'compliant' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                        {status === 'non_compliant' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                                        {!status && <div className="h-4 w-4 rounded-full bg-gray-300" />}
                                        <span className="text-sm truncate">{sector.name}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {/* MAIN: Measurement Editor - LARGE */}
                <div className="flex-1 overflow-hidden flex flex-col bg-white p-0">
                    <ScrollArea className="flex-1">
                        {selectedSectorId && measurement ? (
                            <div className="p-4">
                                {type === 'lighting' ? (
                                    <LightingGridEditor measurement={measurement} />
                                ) : (
                                    <MeasurementEditor measurement={measurement} />
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center p-8">
                                <div className="text-center space-y-4">
                                    <Building2 className="h-16 w-16 text-gray-300 mx-auto" />
                                    <p className="text-xl text-gray-500">Seleccione un sector existente o cree uno nuevo para comenzar.</p>
                                </div>
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
