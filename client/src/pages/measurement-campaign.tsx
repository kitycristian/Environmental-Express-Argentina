import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { useRoute, Link } from "wouter";
import { MeasurementType, MEASUREMENT_LABELS, Measurement, Rubro } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronUp, MapPin, Search, Building2, ListPlus, Settings, Save } from "lucide-react";
import { MeasurementEditor, LightingGridEditor } from "@/components/measurement-editor";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export default function MeasurementCampaign() {
  const [match, params] = useRoute("/campaign/:type");
  const type = params?.type as MeasurementType;
  
  const sectors = useStore((state) => state.sectors);
  const establishment = useStore((state) => state.establishment);
  const clients = useStore((state) => state.clients);
  const rubros = useStore((state) => state.rubros);
  const addSector = useStore((state) => state.addSector);
  const addMeasurement = useStore((state) => state.addMeasurement);
  const deleteMeasurement = useStore((state) => state.deleteMeasurement);
  const updateSector = useStore((state) => state.updateSector);
  const addRubro = useStore((state) => state.addRubro);
  const updateRubro = useStore((state) => state.updateRubro);
  const deleteRubro = useStore((state) => state.deleteRubro);

  const [isNewSectorOpen, setIsNewSectorOpen] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  
  // Rubro states
  const [selectedRubro, setSelectedRubro] = useState<string>("manual");
  const [selectedRubroSectors, setSelectedRubroSectors] = useState<string[]>([]);
  const [isRubroManagerOpen, setIsRubroManagerOpen] = useState(false);
  const [editingRubro, setEditingRubro] = useState<Rubro | null>(null);
  const [newRubroName, setNewRubroName] = useState("");
  const [newRubroSectorsText, setNewRubroSectorsText] = useState("");

  // Auto-detect rubro from client
  useEffect(() => {
    if (establishment.name && clients.length > 0) {
        // Try to find the client by name (fuzzy match or exact)
        const client = clients.find(c => c.name === establishment.name);
        if (client && client.rubroId) {
            setSelectedRubro(client.rubroId);
        }
    }
  }, [establishment.name, clients]);

  if (!type || !MEASUREMENT_LABELS[type]) {
    return <div>Tipo de medición no válido</div>;
  }

  // Filter sectors that have this measurement type
  const activeSectors = sectors.filter(s => s.measurements.some(m => m.type === type));
  
  // Filter for search
  const filteredSectors = activeSectors.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRubroSectors = (rubroId: string) => {
    const rubro = rubros.find(r => r.id === rubroId);
    return rubro ? rubro.sectors : [];
  };

  const handleCreateRubroSectors = () => {
    // Determine which sectors to add
    const rubro = rubros.find(r => r.id === selectedRubro);
    const sectorsToAdd = rubro ? rubro.sectors : [];
    
    const targetSectors = selectedRubroSectors.length > 0 ? selectedRubroSectors : sectorsToAdd;
    
    targetSectors.forEach(sectorName => {
        useStore.getState().addSectorWithMeasurement({
            name: sectorName,
            description: "",
            dimensions: "",
            activity: "",
            workersCount: 0
        }, type);
    });
    
    setIsNewSectorOpen(false);
    setSelectedRubro("manual");
    setSelectedRubroSectors([]);
  };

  const handleSaveRubro = () => {
      const sectorsList = newRubroSectorsText.split('\n').map(s => s.trim()).filter(s => s.length > 0);
      
      if (editingRubro) {
          updateRubro(editingRubro.id, {
              name: newRubroName,
              sectors: sectorsList
          });
      } else {
          addRubro({
              name: newRubroName,
              sectors: sectorsList
          });
      }
      setEditingRubro(null);
      setNewRubroName("");
      setNewRubroSectorsText("");
      setIsRubroManagerOpen(false);
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
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nuevo Sector para {MEASUREMENT_LABELS[type]}</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="manual" value={selectedRubro === 'manual' ? 'manual' : 'rubro'} onValueChange={(val) => val === 'manual' ? setSelectedRubro('manual') : setSelectedRubro(rubros[0]?.id)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">Manual</TabsTrigger>
                  <TabsTrigger value="rubro">Importar por Rubro</TabsTrigger>
                </TabsList>
                
                <TabsContent value="manual" className="space-y-4 py-4">
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
                    <div className="flex justify-end pt-4">
                         <Button onClick={() => {
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
                    </div>
                </TabsContent>
                
                <TabsContent value="rubro" className="space-y-4 py-4">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex-1 space-y-1">
                            <Label>Seleccionar Rubro</Label>
                            <Select value={selectedRubro === 'manual' ? '' : selectedRubro} onValueChange={(val) => {
                                setSelectedRubro(val);
                                setSelectedRubroSectors([]);
                            }}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Seleccione un rubro" />
                                </SelectTrigger>
                                <SelectContent>
                                    {rubros.map(r => (
                                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button variant="outline" size="icon" className="mt-6" onClick={() => {
                            setNewRubroName("");
                            setNewRubroSectorsText("");
                            setEditingRubro(null);
                            setIsRubroManagerOpen(true);
                        }}>
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>

                    {selectedRubro !== 'manual' && (
                        <>
                            <div className="bg-blue-50 p-3 rounded-md border border-blue-100 mb-2">
                                <div className="flex items-center gap-2 text-blue-800 font-medium mb-1">
                                    <Building2 className="h-4 w-4" />
                                    Sectores de {rubros.find(r => r.id === selectedRubro)?.name}
                                </div>
                                <p className="text-xs text-blue-600">
                                    Seleccione los sectores que desea agregar a la campaña.
                                </p>
                            </div>
                            
                            <div className="h-[250px] overflow-y-auto border rounded-md p-2 space-y-1 bg-white">
                                {getRubroSectors(selectedRubro).map((sector) => (
                                    <div key={sector} className="flex items-center space-x-2 hover:bg-gray-50 p-2 rounded cursor-pointer" onClick={() => {
                                        if (selectedRubroSectors.includes(sector)) {
                                            setSelectedRubroSectors(selectedRubroSectors.filter(s => s !== sector));
                                        } else {
                                            setSelectedRubroSectors([...selectedRubroSectors, sector]);
                                        }
                                    }}>
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-300 text-primary focus:ring-primary"
                                            checked={selectedRubroSectors.includes(sector)}
                                            readOnly
                                        />
                                        <span className="text-sm">{sector}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="flex justify-between items-center pt-4 border-t mt-2">
                                <div className="text-xs text-muted-foreground">
                                    {selectedRubroSectors.length} seleccionados
                                </div>
                                <div className="space-x-2">
                                    <Button variant="outline" size="sm" onClick={() => setSelectedRubroSectors(getRubroSectors(selectedRubro))}>
                                        Todos
                                    </Button>
                                    <Button onClick={handleCreateRubroSectors} disabled={selectedRubroSectors.length === 0}>
                                        Importar
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

          {/* Rubro Manager Dialog */}
          <Dialog open={isRubroManagerOpen} onOpenChange={setIsRubroManagerOpen}>
            <DialogContent>
              <DialogHeader>
                 <DialogTitle>{editingRubro ? 'Editar Rubro' : 'Nuevo Rubro'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                 <div className="space-y-2">
                    <Label>Nombre del Rubro</Label>
                    <Input value={newRubroName} onChange={(e) => setNewRubroName(e.target.value)} placeholder="Ej. Metalúrgica, Oficina, etc." />
                 </div>
                 <div className="space-y-2">
                    <Label>Listado de Sectores (uno por línea)</Label>
                    <Textarea 
                        value={newRubroSectorsText} 
                        onChange={(e) => setNewRubroSectorsText(e.target.value)} 
                        className="h-[200px]"
                        placeholder={"Recepción\nProducción\nBaños\n..."} 
                    />
                 </div>
              </div>
              <DialogFooter>
                 <Button variant="outline" onClick={() => setIsRubroManagerOpen(false)}>Cancelar</Button>
                 <Button onClick={handleSaveRubro}>Guardar Rubro</Button>
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
                      {measurement.type === 'lighting' ? (
                          <LightingGridEditor measurement={measurement} />
                      ) : (
                          <MeasurementEditor measurement={measurement} />
                      )}
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
