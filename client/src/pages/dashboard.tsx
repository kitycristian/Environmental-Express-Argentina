import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, ChevronRight, Building2, MapPin, Users, Calendar } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";

export default function Dashboard() {
  const establishment = useStore((state) => state.establishment);
  const updateEstablishment = useStore((state) => state.updateEstablishment);
  const sectors = useStore((state) => state.sectors);
  const addSector = useStore((state) => state.addSector);
  const [, setLocation] = useLocation();

  const [isNewSectorOpen, setIsNewSectorOpen] = useState(false);
  const [newSectorName, setNewSectorName] = useState("");

  const handleAddSector = () => {
    if (!newSectorName.trim()) return;
    addSector({ 
      name: newSectorName, 
      description: "", 
      dimensions: "", 
      activity: "", 
      workersCount: 0 
    });
    setNewSectorName("");
    setIsNewSectorOpen(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Establecimiento</h1>
        <p className="text-muted-foreground">
          Complete los datos generales y agregue sectores para comenzar a medir.
        </p>
      </div>

      <Card className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-5 w-5 text-primary" />
            Datos Generales
          </CardTitle>
          <CardDescription>Información legal y administrativa del sitio.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre Fantasía</Label>
            <Input 
              id="name" 
              value={establishment.name} 
              onChange={(e) => updateEstablishment({ name: e.target.value })} 
              placeholder="Ej. Planta Industrial Norte"
              className="bg-muted/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="razonSocial">Razón Social</Label>
            <Input 
              id="razonSocial" 
              value={establishment.razonSocial} 
              onChange={(e) => updateEstablishment({ razonSocial: e.target.value })}
              placeholder="Ej. Industria S.A."
              className="bg-muted/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cuit">CUIT</Label>
            <Input 
              id="cuit" 
              value={establishment.cuit} 
              onChange={(e) => updateEstablishment({ cuit: e.target.value })}
              placeholder="20-12345678-9"
              className="bg-muted/30"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Dirección</Label>
            <div className="relative">
              <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="address" 
                value={establishment.address} 
                onChange={(e) => updateEstablishment({ address: e.target.value })}
                placeholder="Calle Falsa 123, Ciudad"
                className="pl-9 bg-muted/30"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <div className="relative">
              <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                id="date" 
                type="date"
                value={establishment.date} 
                onChange={(e) => updateEstablishment({ date: e.target.value })}
                className="pl-9 bg-muted/30"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight">Sectores</h2>
            <p className="text-sm text-muted-foreground">Áreas de trabajo identificadas.</p>
          </div>
          <Dialog open={isNewSectorOpen} onOpenChange={setIsNewSectorOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo Sector
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Sector</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="sectorName">Nombre del Sector</Label>
                  <Input 
                    id="sectorName" 
                    value={newSectorName} 
                    onChange={(e) => setNewSectorName(e.target.value)} 
                    placeholder="Ej. Taller de Soldadura"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewSectorOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddSector}>Crear Sector</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {sectors.map((sector) => (
            <Card 
              key={sector.id} 
              className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-md"
              onClick={() => setLocation(`/sector/${sector.id}`)}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-lg flex items-center gap-2 group-hover:text-primary transition-colors">
                    {sector.name}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {sector.workersCount || 0} trabajadores
                    </span>
                    <span>
                      {sector.measurements.length} mediciones
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CardContent>
            </Card>
          ))}
          {sectors.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-muted/20">
              <p className="text-muted-foreground mb-2">No hay sectores registrados aún.</p>
              <Button variant="outline" onClick={() => setIsNewSectorOpen(true)}>Comenzar Agregando uno</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
