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
    <Card className="border shadow-sm overflow-hidden bg-white">
      <CardHeader className="py-3 px-4 bg-gray-50 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
            <Grid3X3 className="h-4 w-4 text-primary" />
            <span className="font-bold text-sm uppercase">Datos de Iluminación</span>
        </div>
        <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              className="h-7 gap-1 bg-primary text-white text-xs"
              onClick={() => {
                toast({
                  title: "Medición guardada",
                  description: "Los datos de iluminación han sido actualizados correctamente.",
                });
              }}
            >
              <Save className="h-3 w-3" /> Guardar
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => {
                if(confirm('¿Eliminar esta medición?')) deleteMeasurement(measurement.sectorId, measurement.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
            {/* LEFT COLUMN: Dimensions & Config */}
            <div className="w-full md:w-64 bg-gray-50/50 border-r p-4 space-y-4">
                <div>
                    <Label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Dimensiones (m)</Label>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                             <Label className="text-[10px] text-gray-400">Ancho</Label>
                             <DebouncedInput 
                               type="number" 
                               className="h-7 bg-white text-xs" 
                               value={measurement.config?.width || ''}
                               onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, width: parseFloat(val as string) } })}
                             />
                        </div>
                        <div className="space-y-1">
                             <Label className="text-[10px] text-gray-400">Largo</Label>
                             <DebouncedInput 
                               type="number" 
                               className="h-7 bg-white text-xs" 
                               value={measurement.config?.length || ''}
                               onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, length: parseFloat(val as string) } })}
                             />
                        </div>
                        <div className="space-y-1">
                             <Label className="text-[10px] text-gray-400">Alto</Label>
                             <DebouncedInput 
                               type="number" 
                               className="h-7 bg-white text-xs" 
                               value={measurement.config?.height || ''}
                               onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, height: parseFloat(val as string) } })}
                             />
                        </div>
                         <div className="space-y-1">
                             <Label className="text-[10px] text-gray-400">Plano Trab.</Label>
                             <DebouncedInput 
                               type="number" 
                               className="h-7 bg-white text-xs" 
                               value={measurement.config?.workPlaneHeight || ''}
                               onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, workPlaneHeight: parseFloat(val as string) } })}
                             />
                        </div>
                    </div>
                </div>

                <div className="pt-2 border-t">
                     <Label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Tipo de Ilum.</Label>
                     <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="type-mixed" 
                                checked={measurement.config?.lightingType === 'mixed'}
                                onCheckedChange={() => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, lightingType: 'mixed' } })}
                            />
                            <label htmlFor="type-mixed" className="text-xs font-medium leading-none cursor-pointer">Mixta</label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox 
                                id="type-artificial" 
                                checked={measurement.config?.lightingType === 'artificial'}
                                onCheckedChange={() => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, lightingType: 'artificial' } })}
                            />
                            <label htmlFor="type-artificial" className="text-xs font-medium leading-none cursor-pointer">Artificial</label>
                        </div>
                        {/* We could add Natural but the image only showed Mixed/Artificial */}
                     </div>
                </div>

                <div className="pt-2 border-t space-y-2">
                     <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase text-gray-500">Artefacto</Label>
                        <Select 
                            value={measurement.config?.artifactType || ''} 
                            onValueChange={(val: any) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, artifactType: val } })}
                        >
                        <SelectTrigger className="h-7 text-xs bg-white">
                            <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="LED">LED</SelectItem>
                            <SelectItem value="Descarga">Descarga</SelectItem>
                            <SelectItem value="Incandescente">Incandescente</SelectItem>
                            <SelectItem value="Fluorescente">Fluorescente</SelectItem>
                            <SelectItem value="Halógena">Halógena</SelectItem>
                        </SelectContent>
                        </Select>
                     </div>
                     <div className="space-y-1">
                        <Label className="text-xs font-bold uppercase text-gray-500">Medición OFF (Lux)</Label>
                        <DebouncedInput 
                            type="number"
                            className="h-7 bg-white text-xs border-gray-300"
                            placeholder="0"
                            value={measurement.config?.luxOff || ''}
                            onDebouncedChange={(val) => updateMeasurement(measurement.sectorId, measurement.id, { config: { ...measurement.config, luxOff: parseFloat(val as string) } })}
                        />
                     </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Grid & Results */}
            <div className="flex-1 p-4 flex flex-col gap-4">
                 {/* Top Stats Bar */}
                <div className="grid grid-cols-4 gap-2 text-center bg-gray-50 p-2 rounded border">
                    <div>
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Puntos</div>
                        <div className="text-lg font-bold">{points.length}</div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Promedio</div>
                        <div className="text-lg font-bold text-blue-600">{eAvg} <span className="text-xs text-gray-400">Lux</span></div>
                    </div>
                    <div>
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Mínimo</div>
                        <div className="text-lg font-bold">{eMin} <span className="text-xs text-gray-400">Lux</span></div>
                    </div>
                    <div>
                         <div className="text-[10px] uppercase text-gray-500 font-bold">Uniformidad</div>
                         <div className={`text-lg font-bold ${compliesUniformity ? 'text-green-600' : 'text-orange-500'}`}>{uniformity}</div>
                    </div>
                </div>

                {/* Grid Controls */}
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase text-gray-500">
                        Valores por Punto (Lux)
                    </Label>
                    <div className="flex items-center gap-2">
                        <Label className="text-xs text-gray-400">Cant. Puntos:</Label>
                        <Input 
                           type="number" 
                           className="h-6 w-16 text-xs text-center" 
                           value={gridSize}
                           onChange={(e) => handleGridResize(parseInt(e.target.value) || 0)}
                        />
                    </div>
                </div>

                {/* The Grid */}
                <div className="flex-1 bg-gray-100/50 rounded border p-4 overflow-y-auto max-h-[300px]">
                   <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-9 gap-2">
                     {points.map((point, index) => (
                       <div key={point.id} className="relative group">
                         <DebouncedInput 
                            id={`lux-input-${index}`}
                            type="number"
                            className="h-9 text-center font-mono text-sm bg-white border-gray-200 focus:border-blue-500 transition-colors px-1"
                            placeholder="-"
                            value={point.values.lux || ''}
                            onDebouncedChange={(val) => updatePoint(measurement.sectorId, measurement.id, point.id, { values: { ...point.values, lux: val } })}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const nextInput = document.getElementById(`lux-input-${index + 1}`);
                                    if (nextInput) {
                                        nextInput.focus();
                                        // Optional: Select content of next input if needed
                                        // (nextInput as HTMLInputElement).select(); 
                                    }
                                }
                            }}
                         />
                         <span className="absolute -top-2 -left-1 text-[9px] font-bold text-gray-400 bg-white px-1 border rounded shadow-sm z-10 pointer-events-none">
                            {index + 1}
                         </span>
                       </div>
                     ))}
                   </div>
                </div>

                {/* Footer: Observations */}
                <div className="pt-2">
                    <Label className="text-xs font-bold uppercase text-gray-500 mb-1 block">Observaciones</Label>
                    <Textarea 
                         className="h-12 text-xs resize-none bg-white" 
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
          
          <div className="w-full md:w-1/2 space-y-2">
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
