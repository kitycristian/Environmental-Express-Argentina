import { useState, useEffect, useRef } from "react";
import { Measurement, Sector, MeasurementType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Save, Calculator, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { cn } from "@/lib/utils";

interface LightingCampaignTableProps {
  sectors: Sector[];
  type: MeasurementType;
}

export function LightingCampaignTable({ sectors, type }: LightingCampaignTableProps) {
  const updateSector = useStore((state) => state.updateSector);
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const addPoint = useStore((state) => state.addPoint);
  const updatePoint = useStore((state) => state.updatePoint);
  const deletePoint = useStore((state) => state.deletePoint);
  const deleteMeasurement = useStore((state) => state.deleteMeasurement);
  const addSectorWithMeasurement = useStore((state) => state.addSectorWithMeasurement);

  // Focus management for grid navigation
  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, colIndex: number, field: string) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.getElementById(`input-${rowIndex + 1}-${colIndex}-${field}`);
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`input-${rowIndex - 1}-${colIndex}-${field}`);
      if (prevInput) prevInput.focus();
    } else if (e.key === 'ArrowRight' && field.startsWith('point-')) {
       // Navigate points horizontally
       const pointIndex = parseInt(field.split('-')[1]);
       const nextInput = document.getElementById(`input-${rowIndex}-${colIndex}-${pointIndex + 1}`);
       // If next point doesn't exist but we are within 15 limit, maybe focus "add point"? 
       // For now, standard navigation
       if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowLeft' && field.startsWith('point-')) {
       const pointIndex = parseInt(field.split('-')[1]);
       const prevInput = document.getElementById(`input-${rowIndex}-${colIndex}-${pointIndex - 1}`);
       if (prevInput) prevInput.focus();
    }
  };

  const calculateRoomIndex = (l: number, w: number, h: number, hm: number) => {
      // Indice del Local K = (L * W) / (hm * (L + W))
      // hm = Altura de montaje (height - workPlaneHeight)
      if (!l || !w || !h) return 0;
      const h_mount = hm ? (h - hm) : h; // Default to full height if workPlane not set, but usually workPlane is 0.85
      if (h_mount <= 0) return 0;
      
      const k = (l * w) / (h_mount * (l + w));
      return parseFloat(k.toFixed(2));
  };

  const handleAddRow = () => {
    addSectorWithMeasurement({
        name: `Nuevo Sector ${sectors.length + 1}`,
        description: "",
        dimensions: "",
        activity: "",
        workersCount: 0
    }, type);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-2 rounded-lg border shadow-sm">
        <h3 className="font-semibold text-lg px-2">Planilla de Campo - Iluminación</h3>
        <Button onClick={handleAddRow} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Agregar Sector (Fila)
        </Button>
      </div>

      <div className="border rounded-lg shadow-sm bg-white overflow-x-auto">
        <Table className="min-w-[1500px]"> {/* Ensure generic width for horizontal scroll */}
          <TableHeader className="bg-gray-50">
            <TableRow className="h-20"> {/* Taller header for grouped columns */}
              <TableHead className="w-[50px] text-center font-bold border-r">#</TableHead>
              <TableHead className="w-[200px] font-bold border-r">Sector / Subsector</TableHead>
              
              {/* Dimensiones */}
              <TableHead className="p-0 border-r text-center bg-blue-50/50">
                  <div className="border-b py-1 text-xs font-semibold text-blue-700">Dimensiones</div>
                  <div className="grid grid-cols-3 h-full">
                      <div className="px-2 py-2 text-xs border-r flex items-center justify-center">Ancho</div>
                      <div className="px-2 py-2 text-xs border-r flex items-center justify-center">Largo</div>
                      <div className="px-2 py-2 text-xs flex items-center justify-center">Alto</div>
                  </div>
              </TableHead>
              
              {/* Cálculos */}
              <TableHead className="p-0 border-r text-center bg-orange-50/50">
                  <div className="border-b py-1 text-xs font-semibold text-orange-700">Cálculos</div>
                  <div className="grid grid-cols-3 h-full">
                      <div className="px-1 py-2 text-[10px] border-r flex items-center justify-center w-12">Indice K</div>
                      <div className="px-1 py-2 text-[10px] border-r flex items-center justify-center w-12">Ptos Min</div>
                      <div className="px-1 py-2 text-[10px] flex items-center justify-center w-12">Ptos</div>
                  </div>
              </TableHead>

              {/* Puntos de Medición - 1 to 15 */}
              <TableHead className="p-0 border-r text-center bg-yellow-50/50">
                  <div className="border-b py-1 text-xs font-semibold text-yellow-700">Iluminancia por Punto (LUX)</div>
                  <div className="flex h-full">
                      {Array.from({ length: 15 }).map((_, i) => (
                          <div key={i} className="w-12 border-r last:border-r-0 flex items-center justify-center text-[10px] text-gray-500 font-mono">
                              {i + 1}
                          </div>
                      ))}
                  </div>
              </TableHead>

              {/* Resultados */}
              <TableHead className="p-0 text-center bg-green-50/50">
                  <div className="border-b py-1 text-xs font-semibold text-green-700">Resultados</div>
                  <div className="flex h-full">
                       <div className="px-1 py-2 text-[10px] border-r flex items-center justify-center w-[80px]">E min ≥ Em/2</div>
                       <div className="px-1 py-2 text-[10px] border-r flex items-center justify-center w-[80px]">E media</div>
                       <div className="px-1 py-2 text-[10px] border-r flex items-center justify-center w-[80px]">Límite</div>
                       <div className="px-1 py-2 text-[10px] border-r flex items-center justify-center w-[100px]">Cumple Uniform.</div>
                       <div className="px-1 py-2 text-[10px] flex items-center justify-center w-[100px]">Cumple Límite</div>
                  </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sectors.map((sector, rowIndex) => {
              const measurement = sector.measurements.find(m => m.type === type);
              if (!measurement) return null;

              // Helper for updating config
              const updateConfig = (key: string, value: any) => {
                updateMeasurement(sector.id, measurement.id, {
                    config: { ...measurement.config, [key]: value }
                });
              };

              // Calculations
              const width = measurement.config?.width || 0;
              const length = measurement.config?.length || 0;
              const height = measurement.config?.height || 0;
              const workPlane = measurement.config?.workPlaneHeight || 0.85; // Default standard
              
              const roomIndex = calculateRoomIndex(length, width, height, workPlane);
              // Simplified Min Points Estimation based on Room Index (just a heuristic for display)
              const minPoints = roomIndex < 1 ? 4 : roomIndex < 2 ? 9 : roomIndex < 3 ? 16 : 25;

              // Points Logic
              const points = measurement.points;
              const values = points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
              const eAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
              const eMin = values.length > 0 ? Math.min(...values) : 0;
              const limit = measurement.config?.limit || 0;
              
              const uniformityCheck = eMin >= (eAvg / 2); // E min >= E med / 2
              const limitCheck = limit > 0 ? eAvg >= limit : true;

              return (
                <TableRow key={sector.id} className="hover:bg-muted/30">
                  {/* Index */}
                  <TableCell className="text-center font-medium text-xs border-r bg-gray-50/30">
                    {rowIndex + 1}
                  </TableCell>
                  
                  {/* Sector Name */}
                  <TableCell className="border-r p-1 align-top">
                     <DebouncedInput
                        id={`input-${rowIndex}-0-name`}
                        className="h-full min-h-[40px] text-xs border-transparent hover:border-input focus:border-primary px-2" 
                        value={sector.name}
                        onDebouncedChange={(val) => updateSector(sector.id, { name: val as string })}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, 0, 'name')}
                     />
                  </TableCell>

                  {/* Dimensions */}
                  <TableCell className="p-0 border-r align-top">
                     <div className="grid grid-cols-3 h-full">
                        <div className="border-r h-full p-1">
                            <DebouncedInput
                                type="number"
                                className="h-full w-full text-center text-xs border-transparent hover:border-input p-0"
                                value={width || ''}
                                placeholder="An"
                                onDebouncedChange={(v) => updateConfig('width', parseFloat(v as string))}
                            />
                        </div>
                        <div className="border-r h-full p-1">
                            <DebouncedInput
                                type="number"
                                className="h-full w-full text-center text-xs border-transparent hover:border-input p-0"
                                value={length || ''}
                                placeholder="L"
                                onDebouncedChange={(v) => updateConfig('length', parseFloat(v as string))}
                            />
                        </div>
                        <div className="h-full p-1">
                            <DebouncedInput
                                type="number"
                                className="h-full w-full text-center text-xs border-transparent hover:border-input p-0"
                                value={height || ''}
                                placeholder="Al"
                                onDebouncedChange={(v) => updateConfig('height', parseFloat(v as string))}
                            />
                        </div>
                     </div>
                  </TableCell>

                  {/* Calculations */}
                  <TableCell className="p-0 border-r align-top bg-orange-50/10">
                     <div className="grid grid-cols-3 h-full">
                        <div className="border-r flex items-center justify-center text-xs text-muted-foreground w-12">
                            {roomIndex}
                        </div>
                        <div className="border-r flex items-center justify-center text-xs text-muted-foreground w-12">
                            {minPoints}
                        </div>
                        <div className="flex items-center justify-center text-xs font-bold w-12">
                            {points.length}
                        </div>
                     </div>
                  </TableCell>

                  {/* Points Grid */}
                  <TableCell className="p-0 border-r align-top bg-yellow-50/10">
                      <div className="flex h-full">
                          {Array.from({ length: 15 }).map((_, colIndex) => {
                              const point = points[colIndex];
                              // If point exists, show input. If not, and previous exists (or is first), allow adding?
                              // To simplify: if point exists render input.
                              // If point doesn't exist but is next in line (index === points.length), render placeholder input that creates it.
                              
                              const isEditable = colIndex < points.length;
                              const isNext = colIndex === points.length;
                              
                              return (
                                  <div key={colIndex} className="w-12 h-full border-r last:border-r-0 flex items-center justify-center p-0.5">
                                      {isEditable ? (
                                          <DebouncedInput 
                                              id={`input-${rowIndex}-${colIndex}-${colIndex}`}
                                              type="number"
                                              className="h-8 w-full text-center text-xs p-0 border-transparent hover:border-input focus:bg-white bg-transparent"
                                              value={point.values.lux || ''}
                                              onDebouncedChange={(val) => updatePoint(sector.id, measurement.id, point.id, { values: { ...point.values, lux: val } })}
                                              onKeyDown={(e) => {
                                                  if (e.key === 'Backspace' && (!point.values.lux || point.values.lux === '')) {
                                                      // Optional: Delete point if empty and backspace hit? 
                                                      // deletePoint(sector.id, measurement.id, point.id);
                                                  }
                                              }}
                                          />
                                      ) : isNext ? (
                                          <Input 
                                              className="h-8 w-full text-center text-xs p-0 border-dashed border-gray-300 opacity-50 focus:opacity-100 hover:opacity-100 bg-transparent"
                                              placeholder="+"
                                              onFocus={() => {
                                                  // Automatically add point when focused
                                                  addPoint(sector.id, measurement.id, { values: { lux: '' } });
                                              }}
                                          />
                                      ) : (
                                          <div className="w-full h-full bg-gray-50/50"></div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </TableCell>

                  {/* Results */}
                  <TableCell className="p-0 align-top bg-green-50/10">
                       <div className="flex h-full">
                           {/* E min >= Emed/2 */}
                           <div className="border-r flex items-center justify-center text-xs w-[80px] px-1">
                               <div className="flex flex-col items-center">
                                   <span className="font-mono">{eMin}</span>
                                   <div className="h-px w-full bg-gray-300 my-0.5"></div>
                                   <span className="font-mono text-[10px] text-gray-500">{Math.round(eAvg/2)}</span>
                               </div>
                           </div>
                           
                           {/* E Media */}
                           <div className="border-r flex items-center justify-center font-bold text-xs w-[80px]">
                               {eAvg}
                           </div>

                           {/* Limit */}
                           <div className="border-r p-1 w-[80px]">
                               <DebouncedInput
                                   type="number"
                                   className="h-full w-full text-center text-xs border-transparent hover:border-input p-0"
                                   value={limit || ''}
                                   placeholder="Min"
                                   onDebouncedChange={(v) => updateConfig('limit', parseFloat(v as string))}
                               />
                           </div>

                           {/* Compliance Uniformity */}
                           <div className={cn(
                               "border-r flex items-center justify-center font-bold text-xs w-[100px]",
                               uniformityCheck ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                           )}>
                               {uniformityCheck ? "SI" : "NO"}
                           </div>

                           {/* Compliance Limit */}
                           <div className={cn(
                               "flex items-center justify-center font-bold text-xs w-[100px]",
                               limitCheck ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                           )}>
                               {limitCheck ? "SI" : "NO"}
                           </div>
                       </div>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {sectors.length === 0 && (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No hay sectores. Haga click en "Agregar Sector" para comenzar.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Help / Legend */}
      <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded border">
          <p><strong>Referencia:</strong> Indice K = (L*A)/(h*(L+A)). Puntos Mínimos sugeridos según Resolución 84/12. Uniformidad = E_min ≥ (E_media / 2).</p>
      </div>
    </div>
  );
}
