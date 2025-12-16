import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Calendar, ArrowRight, Lightbulb, Volume2, Thermometer, Wind, Beaker, Factory, Check, ChevronsUpDown, Plus, Save, FileText, Image as ImageIcon, Trash2, Zap, Sparkles } from "lucide-react";
import { useLocation, Link } from "wouter";
import { MEASUREMENT_LABELS, MeasurementType } from "@/lib/types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

export default function Dashboard() {
  const establishment = useStore((state) => state.establishment);
  const updateEstablishment = useStore((state) => state.updateEstablishment);
  const sectors = useStore((state) => state.sectors);
  const clients = useStore((state) => state.clients);
  const loadClientToEstablishment = useStore((state) => state.loadClientToEstablishment);
  const saveInspection = useStore((state) => state.saveInspection);
  
  // Data Generation Actions
  const addSector = useStore((state) => state.addSector);
  const addMeasurement = useStore((state) => state.addMeasurement);
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const addPoint = useStore((state) => state.addPoint);
  const addSectorWithMeasurement = useStore((state) => state.addSectorWithMeasurement);

  const [, setLocation] = useLocation();
  const [openClientSelect, setOpenClientSelect] = useState(false);
  const { toast } = useToast();
  const user = useAuth((state) => state.user);

  const getMeasurementCount = (type: MeasurementType) => {
    return sectors.filter(s => s.measurements.some(m => m.type === type)).length;
  };

  const handleGenerateTestData = () => {
    // 1. Setup Establishment
    updateEstablishment({
        name: "Industrias Metalúrgicas S.A.",
        razonSocial: "Ind. Metalúrgicas Sociedad Anónima",
        cuit: "30-71234567-8",
        address: "Av. Industrial 1234, Parque Industrial",
        city: "Córdoba",
        province: "Córdoba",
        postalCode: "5000",
        responsible: "Ing. Juan Pérez",
        conditions: {
            temperature: "24",
            humidity: "45",
            pressure: "1013",
            windSpeed: "12"
        }
    });

    // 2. Add Production Sector with multiple measurements
    const prodSector = { name: "Nave de Producción", dimensions: "50x20x8", workersCount: 15 };
    addSector(prodSector);
    
    // We need to wait a tick or find the sector we just added. 
    // Since state update might be async or we don't have the ID returned easily from the hook wrapper 
    // (the store action doesn't return ID in the current implementation shown in read output),
    // we might need to rely on the fact that it's added to the end.
    // However, for safety in this "mockup" mode, let's just use a timeout or assume user refreshes.
    // BETTER: Modify the store to return ID, but I can't modify store easily without potentially breaking things.
    // ALTERNATIVE: Just tell the user "Datos generados" and rely on them seeing it.
    // BUT wait, I need to add measurements TO the sector.
    
    // Let's grab the sectors from store immediately after? No, closure.
    // I will trigger the adds, and the store will handle it. 
    // Since I can't get the ID of the newly created sector easily without refactoring the store,
    // I will implement a "Add Demo Data" action in the store if possible? No, I shouldn't touch store logic too much.
    
    // Hack: Generate ID here if I could, but store generates it.
    // Let's verify store.ts again.
    // addSector: (sector) => set(state => ({ sectors: [...state.sectors, { ...sector, id: uuidv4(), measurements: [] }] }))
    
    // Okay, I can't get the ID back. 
    // I will modify this handler to just toast "Funcionalidad de demo requiere recarga" or similar? No that's bad.
    
    // Let's try to add a 'Demo' button that just fills the Establishment info for now, 
    // OR I can use the `addSectorWithMeasurement` which I saw in the store!
    // addSectorWithMeasurement: (sectorData, type) => ...
    
    // That creates a sector AND a measurement. That helps!
    
    // Sector 1: Producción - Iluminación
    addSectorWithMeasurement({ name: "Nave de Producción", description: "Área de mecanizado y montaje" }, 'lighting');
    // Sector 2: Producción - Ruido (I'll add another sector with same name? No that's confusing).
    
    // Okay, let's just add distinct sectors for the demo to make it robust without ID access.
    addSectorWithMeasurement({ name: "Sector Mecanizado (Ruido)", description: "Tornos y Fresadoras" }, 'noise');
    addSectorWithMeasurement({ name: "Fundición (Carga Térmica)", description: "Hornos de fundición" }, 'thermal_load');
    addSectorWithMeasurement({ name: "Oficinas (Iluminación)", description: "Administración" }, 'lighting');

    toast({
        title: "Datos de Prueba Generados",
        description: "Se han cargado sectores y datos de ejemplo. Edite las mediciones para ver los detalles.",
    });
  };

  const handleSave = () => {
      saveInspection();
      toast({
        title: "Inspección Guardada",
        description: "Se ha guardado una copia en el historial local.",
      });
  };

  const handleSketchUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      updateEstablishment({ sketchImage: reader.result as string });
      toast({ title: "Croquis cargado correctamente" });
    };
    reader.readAsDataURL(file);
  };

  const getIcon = (type: MeasurementType) => {
    switch(type) {
      case 'lighting': return <Lightbulb className="h-6 w-6" />;
      case 'noise': return <Volume2 className="h-6 w-6" />;
      case 'thermal_load': return <Thermometer className="h-6 w-6" />;
      case 'cold_stress': return <Wind className="h-6 w-6" />;
      case 'chemical_agents': return <Beaker className="h-6 w-6" />;
      case 'particulate_matter': return <Factory className="h-6 w-6" />;
      case 'ventilation': return <Wind className="h-6 w-6" />;
      case 'grounding': return <Zap className="h-6 w-6" />;
      default: return <Building2 className="h-6 w-6" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Tablero de Inspección</h1>
          <p className="text-muted-foreground">
            Gestión de relevamientos de higiene y seguridad.
          </p>
        </div>
        
        {/* Actions & Client Selector */}
        <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
           <div className="flex gap-2">
             <Button variant="secondary" onClick={handleGenerateTestData} className="gap-2 bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border border-yellow-300">
               <Sparkles className="h-4 w-4" /> Demo
             </Button>
             <Button variant="outline" onClick={handleSave} className="gap-2">
               <Save className="h-4 w-4" /> Guardar
             </Button>
             {user?.role === 'admin' && (
               <Link href="/report">
                  <Button variant="default" className="gap-2">
                      <FileText className="h-4 w-4" /> Generar Informe
                  </Button>
               </Link>
             )}
           </div>
           
           <Popover open={openClientSelect} onOpenChange={setOpenClientSelect}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" aria-expanded={openClientSelect} className="justify-between w-[250px] shadow-sm">
                {establishment.name ? (
                  <span className="truncate">{establishment.name}</span>
                ) : (
                  <span className="text-muted-foreground">Seleccionar Cliente...</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0">
              <Command>
                <CommandInput placeholder="Buscar cliente..." />
                <CommandList>
                  <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                  <CommandGroup heading="Mis Clientes">
                    {clients.map((client) => (
                      <CommandItem
                        key={client.id}
                        value={client.name}
                        onSelect={() => {
                          loadClientToEstablishment(client.id);
                          setOpenClientSelect(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", establishment.name === client.name ? "opacity-100" : "opacity-0")} />
                        {client.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {user?.role === 'admin' && (
                    <CommandGroup heading="Acciones">
                        <Link href="/clients">
                          <CommandItem className="cursor-pointer text-primary font-medium">
                            <Plus className="mr-2 h-4 w-4" /> Crear Nuevo Cliente
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


      {/* Establishment Info Card - Compact */}
      <Card className="bg-muted/10 border-none shadow-none">
        <CardContent className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-xs text-muted-foreground">Establecimiento</Label>
            <Input 
              id="name" 
              value={establishment.name} 
              onChange={(e) => updateEstablishment({ name: e.target.value })} 
              placeholder="Nombre Fantasía"
              className="bg-background h-8"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="address" className="text-xs text-muted-foreground">Dirección</Label>
            <Input 
              id="address" 
              value={establishment.address} 
              onChange={(e) => updateEstablishment({ address: e.target.value })}
              placeholder="Dirección"
              className="bg-background h-8"
            />
          </div>
          <div className="space-y-1">
             <Label htmlFor="cuit" className="text-xs text-muted-foreground">CUIT</Label>
             <Input 
               id="cuit" 
               value={establishment.cuit} 
               onChange={(e) => updateEstablishment({ cuit: e.target.value })}
               placeholder="XX-XXXXXXXX-X"
               className="bg-background h-8"
             />
          </div>
          <div className="space-y-1">
            <Label htmlFor="date" className="text-xs text-muted-foreground">Fecha de Relevamiento</Label>
            <Input 
              id="date" 
              type="date"
              value={establishment.date} 
              onChange={(e) => updateEstablishment({ date: e.target.value })}
              className="bg-background h-8"
            />
          </div>
          
          <div className="col-span-full border-t pt-4 mt-2">
            <div className="flex items-center gap-4">
                <Label className="text-xs text-muted-foreground">Croquis del Establecimiento (Anexo 1)</Label>
                {establishment.sketchImage ? (
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <Check className="h-3 w-3" /> Cargado
                        </span>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                            onClick={() => updateEstablishment({ sketchImage: undefined })}
                        >
                            <Trash2 className="h-3 w-3 mr-1" /> Eliminar
                        </Button>
                    </div>
                ) : (
                    <div className="relative">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-2">
                            <ImageIcon className="h-3 w-3" /> Subir Croquis
                        </Button>
                        <Input 
                            type="file" 
                            accept="image/*" 
                            className="absolute inset-0 opacity-0 cursor-pointer"
                            onChange={(e) => e.target.files?.[0] && handleSketchUpload(e.target.files[0])}
                        />
                    </div>
                )}
            </div>
            {establishment.sketchImage && (
                <div className="mt-2 border rounded-md p-2 bg-white w-fit max-w-xs">
                    <img src={establishment.sketchImage} alt="Croquis" className="max-h-32 object-contain" />
                </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(MEASUREMENT_LABELS).map(([key, label]) => {
           const type = key as MeasurementType;
           const count = getMeasurementCount(type);
           
           return (
             <Card 
               key={key} 
               className="group cursor-pointer hover:border-primary/50 hover:shadow-lg transition-all relative overflow-hidden"
               onClick={() => setLocation(`/campaign/${type}`)}
             >
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 {getIcon(type)}
               </div>
               <CardHeader className="pb-2">
                 <div className="flex items-center gap-3">
                   <div className="p-2 rounded-lg bg-primary/10 text-green-600 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                     {getIcon(type)}
                   </div>
                   <CardTitle className="text-lg">{label}</CardTitle>
                 </div>
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold">
                   {count}
                   <span className="text-sm font-normal text-muted-foreground ml-2">sectores</span>
                 </div>
                 <p className="text-xs text-muted-foreground mt-1">
                   {count > 0 ? "En progreso" : "Sin mediciones"}
                 </p>
               </CardContent>
               <CardFooter className="pt-0">
                  <Button variant="ghost" className="w-full justify-between group-hover:text-primary p-0 h-auto hover:bg-transparent">
                    Ver Mediciones <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
               </CardFooter>
             </Card>
           );
        })}
      </div>
    </div>
  );
}
