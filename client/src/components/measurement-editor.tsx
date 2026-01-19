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
import { Checkbox } from "@/components/ui/checkbox";
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
    { key: 'puesto', label: 'Puesto', type: 'text' },
    { key: 'tbs', label: 'TBS (°C)', type: 'number' },
    { key: 'tbh', label: 'TBH (°C)', type: 'number' },
    { key: 'tg', label: 'TG (°C)', type: 'number' },
    { key: 'tgbh', label: 'TGBH (°C)', type: 'number' },
    { key: 'mb', label: 'MB (W)', type: 'number' },
    { key: 'mi', label: 'MI (W)', type: 'number' },
    { key: 'mii', label: 'MII (W)', type: 'number' },
    { key: 'temp_ext', label: 'Temp Ext (°C)', type: 'number' }
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
  ],
  ventilation: [
    { key: 'identification', label: 'Identificación', type: 'text' },
    { key: 'type', label: 'Tipo', type: 'select', options: ['Inyección', 'Extracción'] },
    { key: 'velocity', label: 'Velocidad (m/s)', type: 'number' },
    { key: 'area', label: 'Área (m²)', type: 'number' },
    { key: 'flow', label: 'Caudal (m³/h)', type: 'number' },
    { key: 'renovations', label: 'Renov/h', type: 'number' }
  ],
  grounding: [
    { key: 'grounding_number', label: 'N° Toma', type: 'text' },
    { key: 'sector_name', label: 'Ubicación/Sector', type: 'text' },
    { key: 'terrain_condition', label: 'Cond. Terreno', type: 'select', options: ['Lecho seco', 'Arcilloso', 'Pantanoso', 'Lluvias recientes', 'Arenoso seco', 'Arenoso húmedo', 'Otro'] },
    { key: 'usage', label: 'Uso PAT', type: 'select', options: ['Seguridad Masas', 'Neutro Trafo', 'Electrónica', 'Informática', 'Iluminación', 'Pararrayos', 'Otros'] },
    { key: 'scheme', label: 'Esquema', type: 'select', options: ['TT', 'TN-S', 'TN-C', 'TN-C-S', 'IT'] },
    { key: 'resistance', label: 'Valor (Ω)', type: 'text' },
    { key: 'complies_resistance', label: 'Cumple (Ω)', type: 'select', options: ['SI', 'NO'] },
    { key: 'continuity_permanent', label: 'Continuidad', type: 'select', options: ['SI', 'NO'] },
    { key: 'capacity_charge', label: 'Cap. Carga', type: 'select', options: ['SI', 'NO'] },
    { key: 'protection_type', label: 'Tipo Prot.', type: 'select', options: ['DD', 'IA', 'Fusible'] },
    { key: 'automatic_disconnection', label: 'Desc. Auto', type: 'select', options: ['SI', 'NO'] }
  ]
};

import { DebouncedInput } from "@/components/ui/debounced-input";

export function LightingGridEditor({ measurement }: { measurement: Measurement }) {
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
    <Card className="border-2 shadow-lg overflow-hidden bg-white">
      <CardHeader className="py-4 px-6 bg-primary/5 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
            <Grid3X3 className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl uppercase text-primary">Datos de Iluminación</span>
        </div>
        <div className="flex items-center gap-3">
            <Button 
              size="lg" 
              className="h-12 gap-2 bg-green-600 hover:bg-green-700 text-white text-base px-6"
              onClick={() => {
                toast({
                  title: "Medición guardada",
                  description: "Los datos de iluminación han sido actualizados correctamente.",
                });
              }}
            >
              <Save className="h-5 w-5" /> Guardar Datos
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-12 w-12 text-muted-foreground hover:text-destructive"
              onClick={() => {
                if(confirm('¿Eliminar esta medición?')) deleteMeasurement(measurement.sectorId, measurement.id);
              }}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
            {/* LEFT COLUMN: Dimensions & Config - LARGE for field use */}
            <div className="w-full md:w-80 bg-gray-50/50 border-r p-5 space-y-5 overflow-y-auto">
                <div className="space-y-2">
                    <Label className="text-base font-bold text-gray-700">Puesto / Sección</Label>
                    <DebouncedInput 
                       className="h-12 bg-white text-base" 
                       placeholder="Ej. Línea de Cajas"
                       value={measurement.name || ''}
                       onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { name: val as string })}
                    />
                </div>

                <div className="space-y-2">
                    <Label className="text-base font-bold text-gray-700">Hora Medición</Label>
                    <DebouncedInput 
                       type="time"
                       className="h-12 bg-white text-lg" 
                       value={measurement.details?.startTime || ''}
                       onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { details: { ...measurement.details, startTime: val as string } })}
                    />
                </div>

                <div className="space-y-3">
                    <Label className="text-base font-bold text-gray-700">Dimensiones (metros)</Label>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                             <Label className="text-sm text-gray-500">Ancho</Label>
                             <DebouncedInput 
                               type="number" 
                               className="h-12 bg-white text-lg text-center" 
                               value={measurement.config?.width || ''}
                               onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, width: parseFloat(val as string) } })}
                             />
                        </div>
                        <div className="space-y-1">
                             <Label className="text-sm text-gray-500">Largo</Label>
                             <DebouncedInput 
                               type="number" 
                               className="h-12 bg-white text-lg text-center" 
                               value={measurement.config?.length || ''}
                               onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, length: parseFloat(val as string) } })}
                             />
                        </div>
                        <div className="space-y-1">
                             <Label className="text-sm text-gray-500">Alto</Label>
                             <DebouncedInput 
                               type="number" 
                               className="h-12 bg-white text-lg text-center" 
                               value={measurement.config?.height || ''}
                               onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, height: parseFloat(val as string) } })}
                             />
                        </div>
                         <div className="space-y-1">
                             <Label className="text-sm text-gray-500">Plano Trabajo</Label>
                             <DebouncedInput 
                               type="number" 
                               className="h-12 bg-white text-lg text-center" 
                               value={measurement.config?.workPlaneHeight || ''}
                               onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, workPlaneHeight: parseFloat(val as string) } })}
                             />
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                     <Label className="text-base font-bold text-gray-700">Tipo de Iluminación</Label>
                     <div className="grid grid-cols-2 gap-2">
                        <div 
                            className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border-2 transition-all ${
                                measurement.config?.lightingType === 'mixed' ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200'
                            }`}
                            onClick={() => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, lightingType: 'mixed' } })}
                        >
                            <Checkbox 
                                id="type-mixed" 
                                checked={measurement.config?.lightingType === 'mixed'}
                                className="h-5 w-5"
                            />
                            <label htmlFor="type-mixed" className="text-base font-medium cursor-pointer">Mixta</label>
                        </div>
                        <div 
                            className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border-2 transition-all ${
                                measurement.config?.lightingType === 'artificial' ? 'bg-primary/10 border-primary' : 'bg-white border-gray-200'
                            }`}
                            onClick={() => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, lightingType: 'artificial' } })}
                        >
                            <Checkbox 
                                id="type-artificial" 
                                checked={measurement.config?.lightingType === 'artificial'}
                                className="h-5 w-5"
                            />
                            <label htmlFor="type-artificial" className="text-base font-medium cursor-pointer">Artificial</label>
                        </div>
                     </div>
                </div>
                     
                <div className="space-y-2">
                     <Label className="text-base font-bold text-gray-700">Sistema Iluminación</Label>
                     <Select 
                        value={measurement.config?.lightingSystemType || 'general'} 
                        onValueChange={(val: any) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, lightingSystemType: val } })}
                     >
                        <SelectTrigger className="h-12 text-base bg-white w-full">
                            <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="general" className="text-base py-3">General</SelectItem>
                            <SelectItem value="localized" className="text-base py-3">Localizada</SelectItem>
                            <SelectItem value="mixed" className="text-base py-3">Mixta</SelectItem>
                        </SelectContent>
                     </Select>
                </div>

                <div className="pt-4 border-t space-y-3">
                     <div className="space-y-2">
                        <Label className="text-base font-bold text-gray-700">Tipo Artefacto</Label>
                        <Select 
                            value={measurement.config?.artifactType || ''} 
                            onValueChange={(val: any) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, artifactType: val } })}
                        >
                        <SelectTrigger className="h-12 text-base bg-white">
                            <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LED" className="text-base py-3">LED</SelectItem>
                            <SelectItem value="Descarga" className="text-base py-3">Descarga</SelectItem>
                            <SelectItem value="Incandescente" className="text-base py-3">Incandescente</SelectItem>
                            <SelectItem value="Fluorescente" className="text-base py-3">Fluorescente</SelectItem>
                            <SelectItem value="Halógena" className="text-base py-3">Halógena</SelectItem>
                        </SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-2">
                        <Label className="text-base font-bold text-gray-700">Medición OFF (Lux)</Label>
                        <DebouncedInput 
                            type="number"
                            className="h-12 bg-white text-lg text-center border-2"
                            placeholder="0"
                            value={measurement.config?.luxOff || ''}
                            onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, luxOff: parseFloat(val as string) } })}
                        />
                     </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Grid & Results */}
            <div className="flex-1 p-4 flex flex-col gap-4">
                 {/* Top Stats Bar - LARGE for field use */}
                <div className="grid grid-cols-4 gap-4 text-center bg-gradient-to-r from-blue-50 to-primary/5 p-4 rounded-xl border-2">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="text-sm uppercase text-gray-500 font-bold">Puntos</div>
                        <div className="text-3xl font-bold text-gray-800">{points.length}</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="text-sm uppercase text-gray-500 font-bold">Promedio</div>
                        <div className="text-3xl font-bold text-blue-600">{eAvg} <span className="text-base text-gray-400">Lux</span></div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="text-sm uppercase text-gray-500 font-bold">Mínimo</div>
                        <div className="text-3xl font-bold text-gray-800">{eMin} <span className="text-base text-gray-400">Lux</span></div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                         <div className="text-sm uppercase text-gray-500 font-bold">Uniformidad</div>
                         <div className={`text-3xl font-bold ${compliesUniformity ? 'text-green-600' : 'text-orange-500'}`}>{uniformity}</div>
                    </div>
                </div>

                {/* Grid Controls - LARGE */}
                <div className="flex items-center justify-between bg-white p-3 rounded-lg border">
                    <Label className="text-lg font-bold text-gray-700">
                        Valores de Medición (Lux)
                    </Label>
                    <div className="flex items-center gap-3">
                        <Label className="text-base text-gray-500">Cantidad de Puntos:</Label>
                        <Input 
                           type="number" 
                           className="h-12 w-24 text-xl text-center font-bold" 
                           value={gridSize}
                           onChange={(e) => handleGridResize(parseInt(e.target.value) || 0)}
                        />
                    </div>
                </div>

                {/* The Grid - LARGE INPUTS for field use */}
                <div className="flex-1 bg-gray-100/50 rounded-xl border-2 p-6 overflow-y-auto">
                  <div className="space-y-6">
                     {/* Rows Container - 3 columns for larger inputs */}
                     <div className="space-y-4">
                        {Array.from({ length: Math.ceil(points.length / 3) }).map((_, rowIndex) => (
                           <div key={rowIndex} className="flex gap-4 items-center">
                              {/* Row Index Indicator */}
                              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold">
                                 {rowIndex + 1}
                              </div>
                              
                              {/* Points in this row (Chunk of 3 for larger inputs) */}
                              {points.slice(rowIndex * 3, (rowIndex + 1) * 3).map((point, colIndex) => {
                                 const absoluteIndex = rowIndex * 3 + colIndex;
                                 return (
                                    <div key={point.id} className="relative flex-1">
                                      <DebouncedInput 
                                         id={`lux-input-${absoluteIndex}`}
                                         type="number"
                                         className="h-16 text-center font-mono text-2xl bg-white border-2 border-gray-300 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-xl w-full"
                                         placeholder="—"
                                         value={point.values.lux || ''}
                                         onDebouncedChange={(val) => updatePoint(measurement.sectorId, measurement.id, point.id, { values: { ...point.values, lux: val } })}
                                         onKeyDown={(e) => {
                                             if (e.key === 'Enter') {
                                                 e.preventDefault();
                                                 const nextInput = document.getElementById(`lux-input-${absoluteIndex + 1}`);
                                                 if (nextInput) {
                                                     nextInput.focus();
                                                 }
                                             }
                                         }}
                                      />
                                      <span className="absolute -top-3 left-3 text-sm font-bold text-white bg-primary px-2 py-0.5 rounded-full z-10 pointer-events-none">
                                         P{absoluteIndex + 1}
                                      </span>
                                    </div>
                                 );
                              })}
                              {/* Fill empty slots in last row */}
                              {rowIndex === Math.ceil(points.length / 3) - 1 && 
                                Array.from({ length: 3 - (points.length % 3 || 3) }).map((_, i) => (
                                  <div key={`empty-${i}`} className="flex-1" />
                                ))
                              }
                           </div>
                        ))}
                     </div>
                     
                     {/* Quick Actions - LARGE */}
                     <div className="flex gap-3 justify-center pt-4">
                         <Button variant="outline" size="lg" className="h-14 text-lg px-8" onClick={() => handleGridResize(gridSize + 3)}>
                            <Plus className="h-5 w-5 mr-2" /> Agregar Fila (+3 puntos)
                         </Button>
                     </div>
                  </div>
                </div>

                {/* Footer: Observations - LARGE */}
                <div className="pt-4">
                    <Label className="text-base font-bold text-gray-700 mb-2 block">Observaciones</Label>
                    <Textarea 
                         className="h-20 text-base resize-none bg-white border-2" 
                         placeholder="Ej. Artefacto sucio, afectado por calor, faltante..."
                         value={measurement.observations || ''}
                         onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { observations: e.target.value })}
                    />
                </div>
            </div>
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
                <TableHead>Comentario</TableHead>
                {measurement.type === 'thermal_load' && <TableHead>Conclusión</TableHead>}
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
                        <DebouncedInput 
                          type={f.type} 
                          className="h-8 min-w-[80px]" 
                          placeholder="-"
                          value={point.values[f.key] || ''}
                          onDebouncedChange={(val) => updatePoint(measurement.sectorId, measurement.id, point.id, { values: { ...point.values, [f.key]: val as string } })}
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <DebouncedInput 
                       className="h-8 min-w-[150px]" 
                       placeholder="Comentario..." 
                       value={point.notes || ''}
                       onDebouncedChange={(val) => updatePoint(measurement.sectorId, measurement.id, point.id, { notes: val as string })}
                    />
                  </TableCell>
                  {measurement.type === 'thermal_load' && (
                    <TableCell>
                      <DebouncedInput 
                         className="h-8 min-w-[150px]" 
                         placeholder="Conclusión..." 
                         value={point.conclusion || ''}
                         onDebouncedChange={(val) => updatePoint(measurement.sectorId, measurement.id, point.id, { conclusion: val as string })}
                      />
                    </TableCell>
                  )}
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
          
          <div className="w-full md:w-1/2 space-y-4">
             {/* Configuration Fields for specific types */}
             {(measurement.type === 'particulate_matter' || measurement.type === 'chemical_agents' || measurement.type === 'thermal_load') && (
               <div className="grid grid-cols-2 gap-4 border-b pb-4">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground block">Límite Legal / CMP</Label>
                    <DebouncedInput 
                      className="h-8 text-sm bg-white" 
                      placeholder={measurement.type === 'thermal_load' ? "Ej. 29.5" : "Ej. 10"}
                      value={measurement.config?.limit || ''}
                      onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, limit: val as number } })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground block">Metodología / Ref</Label>
                    <DebouncedInput 
                      className="h-8 text-sm bg-white" 
                      placeholder="Ej. NIOSH 0500 / Res. 295/03"
                      value={measurement.config?.method || ''}
                      onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, method: val as string } })}
                    />
                  </div>
               </div>
             )}

             <div className="space-y-1">
               <Label className="text-xs text-muted-foreground block">Observaciones Generales</Label>
               <Textarea 
                 className="h-16 text-sm resize-none" 
                 placeholder="Comentarios generales sobre esta medición..."
                 value={measurement.observations || ''}
                 onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { observations: e.target.value })}
               />
             </div>
             {measurement.type === 'thermal_load' && (
               <div className="space-y-1">
                 <Label className="text-xs text-muted-foreground block">Información Adicional (Global)</Label>
                 <Textarea 
                   className="h-16 text-sm resize-none" 
                   placeholder="Información adicional que englobe todos los puntos..."
                   value={measurement.additionalInformation || ''}
                   onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { additionalInformation: e.target.value })}
                 />
               </div>
             )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// Grounding Editor with Sub-types
function GroundingMeasurementEditor({ measurement }: { measurement: Measurement }) {
  const addPoint = useStore((state) => state.addPoint);
  const updatePoint = useStore((state) => state.updatePoint);
  const deletePoint = useStore((state) => state.deletePoint);
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const deleteMeasurement = useStore((state) => state.deleteMeasurement);
  const { toast } = useToast();

  const subtype = measurement.config?.groundingType || 'pat';

  const GROUNDING_SUBTYPES = [
    { value: 'pat', label: 'Medición de PAT y Continuidad de las Masas' },
    { value: 'continuity', label: 'Ensayos de Continuidad y Dispositivo de Corte' },
    { value: 'sockets', label: 'Continuidad en Tomacorrientes' },
  ];

  const FIELD_CONFIGS: Record<string, { key: string; label: string; type: string; options?: string[]; width?: string }[]> = {
    pat: [
        { key: 'grounding_number', label: 'N° Toma', type: 'text', width: '60px' },
        { key: 'sector_name', label: 'Sector', type: 'text', width: '150px' },
        { key: 'terrain_condition', label: 'Cond. Terreno', type: 'select', options: ['Lecho seco', 'Arcilloso', 'Pantanoso', 'Lluvias recientes', 'Arenoso seco', 'Arenoso húmedo', 'Otro'], width: '120px' },
        { key: 'usage', label: 'Uso PAT', type: 'select', options: ['Seguridad Masas', 'Neutro Trafo', 'Electrónica', 'Informática', 'Iluminación', 'Pararrayos', 'Otros'], width: '140px' },
        { key: 'scheme', label: 'Esquema', type: 'select', options: ['TT', 'TN-S', 'TN-C', 'TN-C-S', 'IT'], width: '80px' },
        { key: 'resistance', label: 'Valor (Ω)', type: 'text', width: '80px' },
        { key: 'complies_resistance', label: 'Cumple', type: 'select', options: ['SI', 'NO'], width: '70px' },
        { key: 'continuity_masas', label: 'Cont. Masas', type: 'select', options: ['SI', 'NO'], width: '70px' },
        { key: 'capacity_charge', label: 'Cap. Carga', type: 'select', options: ['SI', 'NO'], width: '70px' },
        { key: 'protection_type', label: 'Tipo Prot.', type: 'select', options: ['DD', 'IA', 'Fusible'], width: '90px' },
        { key: 'automatic_disconnection', label: 'Desc. Auto', type: 'select', options: ['SI', 'NO'], width: '70px' }
    ],
    continuity: [
        { key: 'med_number', label: 'Med. N°', type: 'text', width: '60px' },
        { key: 'board_description', label: 'Descripción Tablero', type: 'text', width: '200px' },
        { key: 'disyuntor_number', label: 'Disyuntor N°', type: 'text', width: '100px' },
        { key: 'rpat', label: 'RPAT [Ω]', type: 'text', width: '80px' },
        { key: 'cut_current', label: 'I. Corte (mA)', type: 'text', width: '100px' },
        { key: 'cc_current', label: 'I. CC (A)', type: 'text', width: '100px' },
        { key: 'response_time', label: 'Tiempo (ms)', type: 'text', width: '100px' },
        { key: 'observations', label: 'Observaciones', type: 'text', width: '200px' }
    ],
    sockets: [
        { key: 'sector_name', label: 'Sector', type: 'text', width: '200px' },
        { key: 'tested_count', label: 'Ensayados (Cant)', type: 'number', width: '100px' },
        { key: 'with_continuity_count', label: 'Con Cont. (Cant)', type: 'number', width: '100px' },
        { key: 'without_continuity_count', label: 'Sin Cont. (Cant)', type: 'number', width: '100px' },
        { key: 'inverted_count', label: 'Invertidos (Cant)', type: 'number', width: '100px' },
        { key: 'observations', label: 'Observaciones', type: 'text', width: '200px' }
    ]
  };

  const currentFields = FIELD_CONFIGS[subtype] || FIELD_CONFIGS['pat'];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
           <CardTitle className="text-base font-semibold text-primary/80">
             PUESTA A TIERRA
           </CardTitle>
           <Select 
                value={subtype} 
                onValueChange={(val: any) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, groundingType: val } })}
           >
                <SelectTrigger className="h-8 w-[280px] text-xs bg-white">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {GROUNDING_SUBTYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                </SelectContent>
           </Select>
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
                description: `Los datos de puesta a tierra han sido guardados.`,
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
                {currentFields.map(f => (
                  <TableHead key={f.key} style={{ width: f.width }}>{f.label}</TableHead>
                ))}
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurement.points.map((point) => (
                <TableRow key={point.id}>
                  {currentFields.map(f => (
                    <TableCell key={f.key} className="p-2">
                      {f.type === 'select' ? (
                        <Select 
                          value={String(point.values[f.key] || '')} 
                          onValueChange={(val) => updatePoint(measurement.sectorId, measurement.id, point.id, { values: { ...point.values, [f.key]: val } })}
                        >
                          <SelectTrigger className="h-8 w-full min-w-[80px] text-xs">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            {f.options?.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <DebouncedInput 
                          type={f.type === 'number' ? 'number' : 'text'} 
                          className="h-8 w-full min-w-[60px] text-xs" 
                          placeholder="-"
                          value={point.values[f.key] || ''}
                          onDebouncedChange={(val) => updatePoint(measurement.sectorId, measurement.id, point.id, { values: { ...point.values, [f.key]: val as string } })}
                        />
                      )}
                    </TableCell>
                  ))}
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
            <Plus className="mr-2 h-4 w-4" /> Agregar Fila
          </Button>
          
          <div className="w-full md:w-1/2 space-y-4">
             <div className="space-y-1">
               <Label className="text-xs text-muted-foreground block">Observaciones Generales</Label>
               <Textarea 
                 className="h-16 text-sm resize-none" 
                 placeholder="Comentarios generales sobre esta medición..."
                 value={measurement.observations || ''}
                 onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { observations: e.target.value })}
               />
             </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { MeasurementDetails } from "./measurement-details";

export function MeasurementEditor({ measurement }: { measurement: Measurement }) {
  let content;
  
  if (measurement.type === 'lighting') {
      content = <LightingGridEditor measurement={measurement} />;
  } else if (measurement.type === 'grounding') {
      content = <GroundingMeasurementEditor measurement={measurement} />;
  } else {
      content = <GenericMeasurementEditor measurement={measurement} />;
  }

  return (
    <div className="space-y-4">
      <MeasurementDetails measurement={measurement} sectorId={measurement.sectorId} />
      {content}
    </div>
  );
}
