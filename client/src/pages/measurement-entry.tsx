import { useState } from "react";
import { useStore } from "@/lib/store";
import { useRoute, Link } from "wouter";
import { MeasurementType, MEASUREMENT_LABELS } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ChevronLeft, ChevronRight, Check, AlertTriangle, Clock } from "lucide-react";
import { LightingGridEditor, MeasurementEditor } from "@/components/measurement-editor";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function MeasurementEntry() {
  const [, params] = useRoute("/campaign/:type/entry");
  const type = params?.type as MeasurementType;
  
  const sectors = useStore((state) => state.sectors);
  const updateSector = useStore((state) => state.updateSector);
  
  const [currentSectorIndex, setCurrentSectorIndex] = useState(0);

  if (!type || !MEASUREMENT_LABELS[type]) {
    return <div>Tipo de medición no válido</div>;
  }

  const activeSectors = sectors.filter(s => s.measurements.some(m => m.type === type));
  const currentSector = activeSectors[currentSectorIndex];
  const currentMeasurement = currentSector?.measurements.find(m => m.type === type);

  const goToPrevSector = () => {
    if (currentSectorIndex > 0) {
      setCurrentSectorIndex(currentSectorIndex - 1);
    }
  };

  const goToNextSector = () => {
    if (currentSectorIndex < activeSectors.length - 1) {
      setCurrentSectorIndex(currentSectorIndex + 1);
    }
  };

  const goToSector = (index: number) => {
    setCurrentSectorIndex(index);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-600 text-white text-lg px-4 py-1"><Check className="h-5 w-5 mr-2" /> CUMPLE</Badge>;
      case 'non_compliant':
        return <Badge className="bg-red-600 text-white text-lg px-4 py-1"><AlertTriangle className="h-5 w-5 mr-2" /> NO CUMPLE</Badge>;
      default:
        return <Badge variant="secondary" className="text-lg px-4 py-1"><Clock className="h-5 w-5 mr-2" /> PENDIENTE</Badge>;
    }
  };

  if (activeSectors.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-gray-700">No hay sectores para medir</h2>
          <p className="text-gray-500">Primero debe agregar sectores a la campaña de {MEASUREMENT_LABELS[type]}</p>
          <Link href={`/campaign/${type}`}>
            <Button size="lg" className="h-14 text-lg px-8" data-testid="btn-back-empty">
              <ArrowLeft className="mr-2 h-5 w-5" /> Volver a la Campaña
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Back Button */}
          <Link href={`/campaign/${type}`}>
            <Button variant="outline" size="lg" className="h-12 gap-2" data-testid="btn-back-campaign">
              <ArrowLeft className="h-5 w-5" /> Volver
            </Button>
          </Link>

          {/* Center: Sector Navigation */}
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              size="lg" 
              className="h-14 w-14"
              onClick={goToPrevSector}
              disabled={currentSectorIndex === 0}
              data-testid="btn-prev-sector"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
            
            <div className="text-center min-w-[300px]">
              <div className="text-sm text-gray-500 uppercase" data-testid="text-sector-counter">Sector {currentSectorIndex + 1} de {activeSectors.length}</div>
              <div className="text-2xl font-bold text-primary truncate" data-testid="text-sector-name">{currentSector?.name}</div>
            </div>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="h-14 w-14"
              onClick={goToNextSector}
              disabled={currentSectorIndex === activeSectors.length - 1}
              data-testid="btn-next-sector"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>

          {/* Right: Status */}
          <div className="flex items-center gap-4">
            {currentMeasurement && getStatusBadge(currentMeasurement.status)}
          </div>
        </div>

        {/* Sector Quick Navigation */}
        <div className="flex gap-1 px-4 py-2 overflow-x-auto bg-gray-50 border-t">
          {activeSectors.map((sector, index) => {
            const m = sector.measurements.find(m => m.type === type);
            return (
              <Button
                key={sector.id}
                variant={index === currentSectorIndex ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "h-10 px-4 whitespace-nowrap",
                  index === currentSectorIndex && "bg-primary text-white",
                  m?.status === 'compliant' && index !== currentSectorIndex && "text-green-600 border-green-200 bg-green-50",
                  m?.status === 'non_compliant' && index !== currentSectorIndex && "text-red-600 border-red-200 bg-red-50"
                )}
                onClick={() => goToSector(index)}
                data-testid={`btn-quicknav-${index}`}
              >
                {index + 1}. {sector.name.substring(0, 20)}{sector.name.length > 20 ? '...' : ''}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 overflow-y-auto">
        {currentSector && currentMeasurement && (
          <div className="space-y-4">
            {/* Sector Info Bar */}
            <Card className="border-2">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-bold text-gray-600">Actividad</Label>
                    <Input 
                      className="h-12 text-base" 
                      placeholder="Ej. Molienda, Oficinas..."
                      value={currentSector.activity || ''} 
                      onChange={(e) => updateSector(currentSector.id, { activity: e.target.value })}
                      data-testid="input-activity"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-bold text-gray-600">Dimensiones</Label>
                    <Input 
                      className="h-12 text-base" 
                      placeholder="Ej. 10x15m"
                      value={currentSector.dimensions || ''} 
                      onChange={(e) => updateSector(currentSector.id, { dimensions: e.target.value })}
                      data-testid="input-dimensions"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-bold text-gray-600">Operarios</Label>
                    <Input 
                      className="h-12 text-base" 
                      type="number"
                      placeholder="0"
                      value={currentSector.workersCount || ''} 
                      onChange={(e) => updateSector(currentSector.id, { workersCount: parseInt(e.target.value) || 0 })}
                      data-testid="input-workers"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-bold text-gray-600">Descripción</Label>
                    <Input 
                      className="h-12 text-base" 
                      placeholder="Descripción del sector..."
                      value={currentSector.description || ''} 
                      onChange={(e) => updateSector(currentSector.id, { description: e.target.value })}
                      data-testid="input-description"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Measurement Editor */}
            {currentMeasurement.type === 'lighting' ? (
              <LightingGridEditor measurement={currentMeasurement} />
            ) : (
              <MeasurementEditor measurement={currentMeasurement} />
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="bg-white border-t shadow-lg sticky bottom-0 z-50">
        <div className="flex items-center justify-between px-4 py-3">
          <Button 
            variant="outline" 
            size="lg" 
            className="h-14 text-lg px-6"
            onClick={goToPrevSector}
            disabled={currentSectorIndex === 0}
            data-testid="btn-prev-bottom"
          >
            <ChevronLeft className="h-5 w-5 mr-2" /> Anterior
          </Button>
          
          <div className="flex items-center gap-2">
            {activeSectors.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  index === currentSectorIndex ? "bg-primary w-8" : "bg-gray-300 hover:bg-gray-400"
                )}
                onClick={() => goToSector(index)}
                data-testid={`btn-dot-${index}`}
              />
            ))}
          </div>
          
          <Button 
            size="lg" 
            className="h-14 text-lg px-6 bg-primary"
            onClick={goToNextSector}
            disabled={currentSectorIndex === activeSectors.length - 1}
            data-testid="btn-next-bottom"
          >
            Siguiente <ChevronRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
