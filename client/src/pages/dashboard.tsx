import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Calendar, ArrowRight, Lightbulb, Volume2, Thermometer, Wind, Beaker, Factory, Check, ChevronsUpDown, Plus, Save, FileText, Image as ImageIcon, Trash2, Zap, PenTool, CheckCircle2, History } from "lucide-react";
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

export default function Dashboard() {
  const establishment = useStore((state) => state.establishment);
  const updateEstablishment = useStore((state) => state.updateEstablishment);
  const sectors = useStore((state) => state.sectors);
  
  const { data: clients = [] } = useClients();
  const createInspection = useCreateInspection();
  
  const [, setLocation] = useLocation();
  const [openClientSelect, setOpenClientSelect] = useState(false);
  const [activeMeasurementType, setActiveMeasurementType] = useState<MeasurementType | null>(null);
  const [sketchEditorOpen, setSketchEditorOpen] = useState(false);
  const { toast } = useToast();
  const user = useAuth((state) => state.user);

  const getMeasurementStats = (type: MeasurementType) => {
    const measurements = sectors.flatMap(s => s.measurements.filter(m => m.type === type));
    const count = measurements.length;
    const completed = measurements.filter(m => m.status === 'compliant' || m.status === 'non_compliant').length;
    const isFullyComplete = count > 0 && count === completed;
    return { count, completed, isFullyComplete };
  };

  const handleSave = () => {
      createInspection.mutate({
        establishment,
        sectors
      });
  };

  const loadClientToEstablishment = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (!client) return;
    
    updateEstablishment({
      name: client.name,
      razonSocial: client.razonSocial,
      cuit: client.cuit,
      address: client.address,
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <MeasurementModal 
        isOpen={!!activeMeasurementType} 
        onClose={() => setActiveMeasurementType(null)} 
        type={activeMeasurementType}
      />

      <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Tablero de Inspección</h1>
          <p className="text-muted-foreground">
            Gestión de relevamientos de higiene y seguridad en tiempo real.
          </p>
        </div>
        
        {/* Actions & Client Selector */}
        <div className="flex flex-col md:flex-row items-end md:items-center gap-3">
           <div className="flex gap-2">
             <Link href="/history">
                <Button variant="outline" className="gap-2 text-muted-foreground hover:text-primary">
                    <History className="h-4 w-4" /> Historial
                </Button>
             </Link>
             <Button variant="outline" onClick={handleSave} className="gap-2 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100">
               <Save className="h-4 w-4" /> Guardar Todo
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <Label className="text-xs text-muted-foreground whitespace-nowrap">Croquis del Establecimiento (Anexo 1)</Label>
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
                    <div className="flex gap-2">
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
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-2" onClick={() => setSketchEditorOpen(true)}>
                            <PenTool className="h-3 w-3" /> Dibujar
                        </Button>
                        <SketchEditor
                          open={sketchEditorOpen}
                          onOpenChange={setSketchEditorOpen}
                          onSave={(imageData) => {
                            updateEstablishment({ sketchImage: imageData });
                            toast({ title: "Croquis guardado correctamente" });
                          }}
                          initialImage={establishment.sketchImage}
                        />
                    </div>
                )}
            </div>
            {establishment.sketchImage && (
                <div className="mt-2 border rounded-md p-2 bg-white w-fit max-w-xs relative group">
                    <img src={establishment.sketchImage} alt="Croquis" className="max-h-32 object-contain" />
                    <Button 
                        size="icon" 
                        variant="secondary" 
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => toast({ title: "Editar dibujo", description: "Función de anotación próximamente" })}
                    >
                        <PenTool className="h-3 w-3" />
                    </Button>
                </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(MEASUREMENT_LABELS).map(([key, label]) => {
           const type = key as MeasurementType;
           const stats = getMeasurementStats(type);
           const isActive = stats.count > 0;
           
           return (
             <Card 
               key={key} 
               className={cn(
                 "group cursor-pointer transition-all relative overflow-hidden",
                 isActive ? "border-green-500 shadow-md bg-green-50/10" : "hover:border-primary/50 hover:shadow-lg"
               )}
               onClick={() => {
                 const sheetRoutes: Record<string, string> = {
                   'lighting': '/lighting-sheet',
                   'grounding': '/grounding',
                   'noise': '/noise-sheet',
                   'thermal_load': '/thermal-sheet',
                   'cold_stress': '/cold-sheet',
                   'chemical_agents': '/chemical-sheet',
                   'particulate_matter': '/particulate-sheet',
                   'ventilation': '/ventilation-sheet'
                 };
                 const route = sheetRoutes[type];
                 if (route) {
                   setLocation(route);
                 } else {
                   setActiveMeasurementType(type);
                 }
               }}
             >
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 {getIcon(type)}
               </div>
               
               {isActive && (
                 <div className="absolute top-2 right-2 text-green-600 animate-in zoom-in duration-300">
                    <CheckCircle2 className="h-5 w-5 fill-green-100" />
                 </div>
               )}

               <CardHeader className="pb-2">
                 <div className="flex items-center gap-3">
                   <div className={cn(
                       "p-2 rounded-lg transition-colors", 
                       isActive ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                   )}>
                     {getIcon(type)}
                   </div>
                   <CardTitle className="text-lg leading-tight">{label}</CardTitle>
                 </div>
               </CardHeader>
               <CardContent>
                 <div className="text-2xl font-bold flex items-baseline gap-2">
                   {stats.count}
                   <span className="text-sm font-normal text-muted-foreground">sectores</span>
                 </div>
                 <div className="flex items-center gap-2 mt-1">
                    <div className="h-2 flex-1 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                            className={cn("h-full transition-all duration-500", isActive ? "bg-green-500" : "bg-primary")} 
                            style={{ width: stats.count > 0 ? `${(stats.completed / stats.count) * 100}%` : '0%' }}
                        />
                    </div>
                    <span className="text-xs text-muted-foreground">{stats.completed}/{stats.count} completos</span>
                 </div>
               </CardContent>
               <CardFooter className="pt-0">
                  <div className="flex gap-2 w-full">
                    <Button 
                        variant={isActive ? "secondary" : "ghost"} 
                        className={cn(
                            "flex-1 justify-between p-0 h-auto hover:bg-transparent",
                            isActive ? "text-green-700 hover:text-green-800 font-medium" : "group-hover:text-primary"
                        )}
                        onClick={(e) => {
                            e.stopPropagation();
                            const sheetRoutes: Record<string, string> = {
                              'lighting': '/lighting-sheet',
                              'grounding': '/grounding',
                              'noise': '/noise-sheet',
                              'thermal_load': '/thermal-sheet',
                              'cold_stress': '/cold-sheet',
                              'chemical_agents': '/chemical-sheet',
                              'particulate_matter': '/particulate-sheet',
                              'ventilation': '/ventilation-sheet'
                            };
                            const route = sheetRoutes[type];
                            if (route) {
                              setLocation(route);
                            }
                        }}
                    >
                        {isActive ? "Carga Rápida" : "Comenzar"} 
                        <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                    <Link href={(() => {
                      const routes: Record<string, string> = {
                        'lighting': '/lighting-sheet',
                        'grounding': '/grounding',
                        'noise': '/noise-sheet',
                        'thermal_load': '/thermal-sheet',
                        'cold_stress': '/cold-sheet',
                        'chemical_agents': '/chemical-sheet',
                        'particulate_matter': '/particulate-sheet',
                        'ventilation': '/ventilation-sheet'
                      };
                      return routes[type] || `/campaign/${type}`;
                    })()}>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-muted-foreground hover:text-primary"
                            onClick={(e) => e.stopPropagation()} 
                            title="Ver Tablero Completo"
                        >
                            <Factory className="h-4 w-4" />
                        </Button>
                    </Link>
                  </div>
               </CardFooter>
             </Card>
           );
        })}
      </div>
    </div>
  );
}
