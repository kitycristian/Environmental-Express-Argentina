import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Calendar, ArrowRight, Lightbulb, Volume2, Thermometer, Wind, Beaker, Factory, Check, ChevronsUpDown, Plus, Save, FileText } from "lucide-react";
import { useLocation, Link } from "wouter";
import { MEASUREMENT_LABELS, MeasurementType } from "@/lib/types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const establishment = useStore((state) => state.establishment);
  const updateEstablishment = useStore((state) => state.updateEstablishment);
  const sectors = useStore((state) => state.sectors);
  const clients = useStore((state) => state.clients);
  const loadClientToEstablishment = useStore((state) => state.loadClientToEstablishment);
  const saveInspection = useStore((state) => state.saveInspection);
  const [, setLocation] = useLocation();
  const [openClientSelect, setOpenClientSelect] = useState(false);
  const { toast } = useToast();

  const getMeasurementCount = (type: MeasurementType) => {
    return sectors.filter(s => s.measurements.some(m => m.type === type)).length;
  };

  const handleSave = () => {
      saveInspection();
      toast({
        title: "Inspección Guardada",
        description: "Se ha guardado una copia en el historial local.",
      });
  };

  const getIcon = (type: MeasurementType) => {
    switch(type) {
      case 'lighting': return <Lightbulb className="h-6 w-6" />;
      case 'noise': return <Volume2 className="h-6 w-6" />;
      case 'thermal_load': return <Thermometer className="h-6 w-6" />;
      case 'cold_stress': return <Wind className="h-6 w-6" />;
      case 'chemical_agents': return <Beaker className="h-6 w-6" />;
      case 'particulate_matter': return <Factory className="h-6 w-6" />;
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
             <Button variant="outline" onClick={handleSave} className="gap-2">
               <Save className="h-4 w-4" /> Guardar
             </Button>
             <Link href="/report">
                <Button variant="default" className="gap-2">
                    <FileText className="h-4 w-4" /> Generar Informe
                </Button>
             </Link>
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
                  <CommandGroup heading="Acciones">
                      <Link href="/clients">
                        <CommandItem className="cursor-pointer text-primary font-medium">
                          <Plus className="mr-2 h-4 w-4" /> Crear Nuevo Cliente
                        </CommandItem>
                      </Link>
                  </CommandGroup>
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
                   <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
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
