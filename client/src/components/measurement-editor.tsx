import { useState, useEffect } from "react";
import { Measurement, MeasurementType, MeasurementPoint } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Calculator, CheckCircle2, AlertCircle, Grid3X3, ArrowRight, Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// Configuration for fields per measurement type (Non-lighting)
const FIELD_CONFIG: Record<string, { key: string; label: string; type: string; options?: string[] }[]> = {
  noise: [
    { key: 'puesto', label: 'Puesto / Tipo', type: 'text' },
    { key: 'tiempo_exposicion', label: 'T. Expo (Te)', type: 'text' },
    { key: 'tiempo_integracion', label: 'T. Integ', type: 'text' },
    { key: 'caracteristicas', label: 'Tipo Ruido', type: 'select', options: ['Continuo', 'Intermitente', 'Impulso', 'Impacto'] },
    { key: 'nivel_pico_c', label: 'Pico C (dBC)', type: 'text' },
    { key: 'nivel_continuo_eq', label: 'LAeq,Te (dBA)', type: 'text' },
    { key: 'suma_fracciones', label: 'Suma Fracc.', type: 'text' },
    { key: 'dosis', label: 'Dosis %', type: 'text' },
    { key: 'cumple', label: 'Cumple?', type: 'select', options: ['SI', 'NO'] }
  ],
  thermal_load: [
    { key: 'tbs', label: 'TBS (°C)', type: 'number' },
    { key: 'tbh', label: 'TBH (°C)', type: 'number' },
    { key: 'tg', label: 'TG (°C)', type: 'number' }
  ],
  cold_stress: [
    { key: 'temp', label: 'Temp (°C)', type: 'number' },
    { key: 'wind', label: 'Viento (km/h)', type: 'number' }
  ],
  particulate_matter: [
    { key: 'concentration', label: 'mg/m3', type: 'number' },
    { key: 'type', label: 'Tipo', type: 'select', options: ['PM10', 'PM2.5', 'Total'] }
  ],
  chemical_agents: [
    { key: 'substance', label: 'Sustancia', type: 'text' },
    { key: 'concentration', label: 'ppm / mg/m3', type: 'number' }
  ]
};

function LightingGridEditor({ measurement }: { measurement: Measurement }) {
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const updatePoint = useStore((state) => state.updatePoint);
  const addPoint = useStore((state) => state.addPoint);
  const deletePoint = useStore((state) => state.deletePoint);
  const deleteMeasurement = useStore((state) => state.deleteMeasurement);
  const { toast } = useToast();

  // Local state for grid generation to avoid spamming the store
  const [gridSize, setGridSize] = useState(measurement.points.length || 9);

  // Initialize points on mount if empty
  useEffect(() => {
    if (measurement.points.length === 0) {
       // Create initial points (9 by default)
       for (let i = 0; i < 9; i++) {
         addPoint(measurement.sectorId, measurement.id, { values: { lux: '' } });
       }
    }
  }, []);

  // Calculations
  const points = measurement.points;
  const values = points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
  
  const eAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
  const eMin = values.length > 0 ? Math.min(...values) : 0;
  const uniformity = eAvg > 0 ? (eMin / eAvg).toFixed(2) : "0.00";
  
  const limit = measurement.config?.limit || 0;
  const halfAvg = eAvg / 2;
  
  const compliesMin = eMin >= halfAvg;
  const compliesLimit = limit > 0 ? eAvg >= limit : true; // If no limit set, technically N/A but strictly green for UI
  const compliesUniformity = Number(uniformity) >= 0.5; // Example standard, usually 0.5 or 0.7 depending on task

  // Determine overall status based on these
  useEffect(() => {
    if (limit > 0 && points.length > 0) {
      const newStatus = (compliesLimit && compliesMin) ? 'compliant' : 'non_compliant';
      if (measurement.status !== newStatus) {
        updateMeasurement(measurement.sectorId, measurement.id, { status: newStatus });
      }
    }
  }, [eAvg, eMin, limit, points.length]);

  const handleGridResize = (size: number) => {
    setGridSize(size);
    // Adjust points in store
    const currentLength = points.length;
    if (size > currentLength) {
      // Add points
      for (let i = 0; i < size - currentLength; i++) {
        addPoint(measurement.sectorId, measurement.id, { values: { lux: '' } });
      }
    } else if (size < currentLength) {
      // Remove points from the end
      for (let i = currentLength - 1; i >= size; i--) {
        deletePoint(measurement.sectorId, measurement.id, points[i].id);
      }
    }
  };

  return (
    <Card className="border shadow-sm overflow-hidden">
      <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-col gap-4">
        <div className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-primary/80 flex items-center gap-2">
              <Grid3X3 className="h-4 w-4" />
              ILUMINACIÓN
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              className="h-8 gap-2 bg-primary/90 hover:bg-primary text-white"
              onClick={() => {
                toast({
                  title: "Medición guardada",
                  description: "Los datos de iluminación han sido actualizados correctamente.",
                });
              }}
            >
              <Save className="h-4 w-4" />
              Guardar
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => {
                if(confirm('¿Eliminar esta medición?')) deleteMeasurement(measurement.sectorId, measurement.id);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Configuration Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm p-4 bg-background border-b">
           <div className="space-y-1">
             <Label className="text-xs text-muted-foreground">Tipo de Iluminación</Label>
             <Select 
                value={measurement.config?.lightingType || 'artificial'} 
                onValueChange={(val: any) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, lightingType: val } })}
             >
               <SelectTrigger className="h-8">
                 <SelectValue />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="artificial">Artificial</SelectItem>
                 <SelectItem value="natural">Natural</SelectItem>
                 <SelectItem value="mixed">Mixta</SelectItem>
               </SelectContent>
             </Select>
          </div>
          <div className="space-y-1">
             <Label className="text-xs text-muted-foreground">Fuente Luminosa</Label>
             <Input 
               className="h-8 bg-background" 
               placeholder="Ej. LED, Fluorescente..."
               value={measurement.config?.lightSource || ''}
               onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, lightSource: e.target.value } })}
             />
          </div>
          <div className="space-y-1">
             <Label className="text-xs text-muted-foreground">Altura Montaje (m)</Label>
             <Input 
               type="number" 
               className="h-8 bg-background" 
               value={measurement.config?.height || ''}
               onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, height: parseFloat(e.target.value) } })}
             />
          </div>
          <div className="space-y-1">
             <Label className="text-xs text-muted-foreground">Altura Plano Trabajo (m)</Label>
             <Input 
               type="number" 
               className="h-8 bg-background" 
               value={measurement.config?.workPlaneHeight || ''}
               onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, workPlaneHeight: parseFloat(e.target.value) } })}
             />
          </div>
        </div>

        {/* Grid Dimensions & Limit */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm px-4 pb-2">
          <div className="space-y-1">
             <Label className="text-xs text-muted-foreground">Ancho Local (m)</Label>
             <Input 
               type="number" 
               className="h-8 bg-background" 
               value={measurement.config?.width || ''}
               onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, width: parseFloat(e.target.value) } })}
             />
          </div>
          <div className="space-y-1">
             <Label className="text-xs text-muted-foreground">Largo Local (m)</Label>
             <Input 
               type="number" 
               className="h-8 bg-background" 
               value={measurement.config?.length || ''}
               onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, length: parseFloat(e.target.value) } })}
             />
          </div>
           <div className="space-y-1">
             <Label className="text-xs text-muted-foreground font-bold text-primary">Nivel Mínimo (Lux)</Label>
             <Input 
               type="number" 
               className="h-8 bg-background border-primary/30" 
               value={measurement.config?.limit || ''}
               onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, limit: parseFloat(e.target.value) } })}
             />
          </div>
           <div className="space-y-1">
             <Label className="text-xs text-muted-foreground">Puntos de Medición</Label>
             <div className="flex gap-1">
               <Input 
                 type="number" 
                 className="h-8 bg-background" 
                 value={gridSize}
                 onChange={(e) => handleGridResize(parseInt(e.target.value) || 0)}
               />
             </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Results Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-6 divide-x divide-y md:divide-y-0 bg-muted/5 border-b text-center">
            <div className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">E. Media</div>
              <div className="text-xl font-bold">{eAvg} <span className="text-xs font-normal text-muted-foreground">Lux</span></div>
            </div>
            <div className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">E. Mínima</div>
              <div className="text-xl font-bold">{eMin} <span className="text-xs font-normal text-muted-foreground">Lux</span></div>
            </div>
            <div className={`p-3 ${compliesMin ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Emin ≥ Emed/2</div>
              <div className={`font-bold flex items-center justify-center gap-1 ${compliesMin ? 'text-green-700' : 'text-red-700'}`}>
                {compliesMin ? <CheckCircle2 className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>}
                {compliesMin ? 'SI' : 'NO'}
              </div>
            </div>
            <div className={`p-3 ${compliesLimit ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cumple Límite</div>
              <div className={`font-bold flex items-center justify-center gap-1 ${compliesLimit ? 'text-green-700' : 'text-red-700'}`}>
                {compliesLimit ? <CheckCircle2 className="h-4 w-4"/> : <AlertCircle className="h-4 w-4"/>}
                {compliesLimit ? 'SI' : 'NO'}
              </div>
            </div>
             <div className="p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Uniformidad</div>
              <div className="text-xl font-bold">{uniformity}</div>
            </div>
             <div className="p-3">
               <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Obs.</div>
               <div className="text-xs text-left truncate px-2">{measurement.observations || "-"}</div>
            </div>
        </div>

        {/* Input Grid */}
        <div className="p-6">
           <Label className="text-xs text-muted-foreground mb-4 block">Ingreso de Valores (Lux)</Label>
           <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-9 gap-2">
             {points.map((point, index) => (
               <div key={point.id} className="relative">
                 <Input 
                    type="number"
                    className="h-10 text-center font-mono"
                    placeholder="-"
                    value={point.values.lux || ''}
                    onChange={(e) => updatePoint(measurement.sectorId, measurement.id, point.id, { values: { ...point.values, lux: e.target.value } })}
                 />
                 <span className="absolute -top-2 -left-1 text-[9px] text-muted-foreground bg-background px-1 border rounded">{index + 1}</span>
               </div>
             ))}
           </div>
        </div>

        <div className="p-4 bg-muted/10 border-t">
           <Label className="text-xs text-muted-foreground mb-1 block">Observaciones Generales</Label>
           <Textarea 
             className="h-16 text-sm resize-none bg-background" 
             placeholder="Comentarios sobre la uniformidad, estado de luminarias, etc..."
             value={measurement.observations || ''}
             onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { observations: e.target.value })}
           />
        </div>
      </CardContent>
    </Card>
  );
}

// Default Generic Editor for other types
function GenericMeasurementEditor({ measurement }: { measurement: Measurement }) {
  const addPoint = useStore((state) => state.addPoint);
  const updatePoint = useStore((state) => state.updatePoint);
  const deletePoint = useStore((state) => state.deletePoint);
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const deleteMeasurement = useStore((state) => state.deleteMeasurement);
  const { toast } = useToast();

  const fields = FIELD_CONFIG[measurement.type] || [];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
           <CardTitle className="text-base font-semibold text-primary/80">
             {measurement.type.replace('_', ' ').toUpperCase()}
           </CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={measurement.status} 
            onValueChange={(val: any) => updateMeasurement(measurement.sectorId, measurement.id, { status: val })}
          >
            <SelectTrigger className={`h-8 w-[140px] ${measurement.status === 'compliant' ? 'text-green-600 border-green-200 bg-green-50' : measurement.status === 'non_compliant' ? 'text-red-600 border-red-200 bg-red-50' : ''}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="compliant">Cumple Norma</SelectItem>
              <SelectItem value="non_compliant">No Cumple</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            className="h-8 gap-2 bg-primary/90 hover:bg-primary text-white"
            onClick={() => {
              toast({
                title: "Medición guardada",
                description: `Los datos de ${measurement.type.replace('_', ' ')} han sido guardados.`,
              });
            }}
          >
            <Save className="h-4 w-4" />
            Guardar
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => {
              if(confirm('¿Eliminar esta medición?')) deleteMeasurement(measurement.sectorId, measurement.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px]">Punto</TableHead>
                {fields.map(f => (
                  <TableHead key={f.key}>{f.label}</TableHead>
                ))}
                <TableHead>Observación</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurement.points.map((point) => (
                <TableRow key={point.id}>
                  <TableCell className="font-medium text-xs text-muted-foreground">
                    {point.label}
                  </TableCell>
                  {fields.map(f => (
                    <TableCell key={f.key}>
                      {f.type === 'select' ? (
                        <Select 
                          value={String(point.values[f.key] || '')} 
                          onValueChange={(val) => updatePoint(measurement.sectorId, measurement.id, point.id, { values: { ...point.values, [f.key]: val } })}
                        >
                          <SelectTrigger className="h-8 w-full min-w-[100px]">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            {f.options?.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input 
                          type={f.type} 
                          className="h-8 min-w-[80px]" 
                          placeholder="-"
                          value={point.values[f.key] || ''}
                          onChange={(e) => updatePoint(measurement.sectorId, measurement.id, point.id, { values: { ...point.values, [f.key]: e.target.value } })}
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Input 
                       className="h-8 min-w-[150px]" 
                       placeholder="Notas..." 
                       value={point.notes || ''}
                       onChange={(e) => updatePoint(measurement.sectorId, measurement.id, point.id, { notes: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground/50 hover:text-destructive"
                      onClick={() => deletePoint(measurement.sectorId, measurement.id, point.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="p-4 bg-muted/10 border-t flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => addPoint(measurement.sectorId, measurement.id)}>
            <Plus className="mr-2 h-4 w-4" /> Agregar Punto
          </Button>
          
          <div className="w-full md:w-1/2">
             <Label className="text-xs text-muted-foreground mb-1 block">Observaciones Generales</Label>
             <Textarea 
               className="h-20 text-sm resize-none" 
               placeholder="Comentarios generales sobre esta medición..."
               value={measurement.observations || ''}
               onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { observations: e.target.value })}
             />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { MeasurementDetails } from "./measurement-details";

export function MeasurementEditor({ measurement }: { measurement: Measurement }) {
  const content = measurement.type === 'lighting' 
    ? <LightingGridEditor measurement={measurement} />
    : <GenericMeasurementEditor measurement={measurement} />;

  return (
    <div className="space-y-4">
      <MeasurementDetails measurement={measurement} sectorId={measurement.sectorId} />
      {content}
    </div>
  );
}
