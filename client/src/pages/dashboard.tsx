import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, Calendar, ArrowRight, Lightbulb, Volume2, Thermometer, Wind, Beaker, Factory } from "lucide-react";
import { useLocation } from "wouter";
import { MEASUREMENT_LABELS, MeasurementType } from "@/lib/types";

export default function Dashboard() {
  const establishment = useStore((state) => state.establishment);
  const updateEstablishment = useStore((state) => state.updateEstablishment);
  const sectors = useStore((state) => state.sectors);
  const [, setLocation] = useLocation();

  const getMeasurementCount = (type: MeasurementType) => {
    return sectors.filter(s => s.measurements.some(m => m.type === type)).length;
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
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Tablero de Inspección</h1>
        <p className="text-muted-foreground">
          Seleccione el tipo de riesgo para comenzar a cargar mediciones por sector.
        </p>
      </div>

      {/* Establishment Info Card - Compact */}
      <Card className="bg-muted/10 border-none shadow-none">
        <CardContent className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
