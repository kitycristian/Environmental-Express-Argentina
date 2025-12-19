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
        <Table className="min-w-[1600px] border-collapse"> {/* Increased min-width to accommodate fixed cols */}
          <TableHeader className="bg-gray-50 border-b-2 border-gray-200">
            <TableRow className="h-20"> 
              {/* Index */}
              <TableHead className="w-[50px] text-center font-bold border-r bg-gray-100 text-gray-700">#</TableHead>
              
              {/* Sector Name */}
              <TableHead className="w-[250px] font-bold border-r bg-gray-50 text-gray-700 px-4 text-left">Sector / Subsector</TableHead>
              
              {/* Dimensiones - 3 cols of 60px = 180px */}
              <TableHead className="p-0 border-r text-center bg-blue-50/50 w-[180px]">
                  <div className="border-b py-2 text-xs font-bold text-blue-800 uppercase tracking-wider bg-blue-100/50">Dimensiones</div>
                  <div className="flex h-10 w-full">
                      <div className="flex-1 flex items-center justify-center text-[10px] font-semibold text-blue-700 border-r border-blue-100">ANCHO</div>
                      <div className="flex-1 flex items-center justify-center text-[10px] font-semibold text-blue-700 border-r border-blue-100">LARGO</div>
                      <div className="flex-1 flex items-center justify-center text-[10px] font-semibold text-blue-700">ALTO</div>
                  </div>
              </TableHead>
              
              {/* Cálculos - 3 cols of 60px = 180px */}
              <TableHead className="p-0 border-r text-center bg-orange-50/50 w-[180px]">
                  <div className="border-b py-2 text-xs font-bold text-orange-800 uppercase tracking-wider bg-orange-100/50">Cálculos</div>
                  <div className="flex h-10 w-full">
                      <div className="flex-1 flex items-center justify-center text-[10px] font-semibold text-orange-700 border-r border-orange-100 leading-3">INDICE<br/>K</div>
                      <div className="flex-1 flex items-center justify-center text-[10px] font-semibold text-orange-700 border-r border-orange-100 leading-3">PTOS<br/>MIN</div>
                      <div className="flex-1 flex items-center justify-center text-[10px] font-semibold text-orange-700 leading-3">PTOS<br/>ACT</div>
                  </div>
              </TableHead>

              {/* Puntos de Medición - 15 cols of 40px = 600px */}
              <TableHead className="p-0 border-r text-center bg-yellow-50/50 w-[600px]">
                  <div className="border-b py-2 text-xs font-bold text-yellow-800 uppercase tracking-wider bg-yellow-100/50">Iluminancia por Punto (LUX)</div>
                  <div className="flex h-10 w-full">
                      {Array.from({ length: 15 }).map((_, i) => (
                          <div key={i} className="flex-1 border-r border-yellow-100 last:border-r-0 flex items-center justify-center text-[10px] text-yellow-700 font-mono font-bold">
                              {i + 1}
                          </div>
                      ))}
                  </div>
              </TableHead>

              {/* Resultados - 5 cols of 80px = 400px */}
              <TableHead className="p-0 text-center bg-green-50/50 w-[400px]">
                  <div className="border-b py-2 text-xs font-bold text-green-800 uppercase tracking-wider bg-green-100/50">Resultados</div>
                  <div className="flex h-10 w-full">
                       <div className="flex-1 border-r border-green-100 flex items-center justify-center text-[10px] font-semibold text-green-700 leading-3 px-1">E min<br/>≥ Em/2</div>
                       <div className="flex-1 border-r border-green-100 flex items-center justify-center text-[10px] font-semibold text-green-700 leading-3">E<br/>MEDIA</div>
                       <div className="flex-1 border-r border-green-100 flex items-center justify-center text-[10px] font-semibold text-green-700 leading-3">LIMITE<br/>LEGAL</div>
                       <div className="flex-1 border-r border-green-100 flex items-center justify-center text-[10px] font-semibold text-green-700 leading-3">CUMPLE<br/>UNIF.</div>
                       <div className="flex-1 flex items-center justify-center text-[10px] font-semibold text-green-700 leading-3">CUMPLE<br/>LIMITE</div>
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
                <TableRow key={sector.id} className="hover:bg-blue-50/30 transition-colors border-b border-gray-100">
                  {/* Index */}
                  <TableCell className="text-center font-bold text-xs border-r bg-gray-50/50 text-gray-500 w-[50px]">
                    {rowIndex + 1}
                  </TableCell>
                  
                  {/* Sector Name */}
                  <TableCell className="border-r p-1 align-top w-[250px]">
                     <DebouncedInput
                        id={`input-${rowIndex}-0-name`}
                        className="h-10 min-h-[40px] text-sm font-medium border-transparent hover:border-input focus:border-primary px-3 bg-transparent w-full" 
                        value={sector.name}
                        placeholder="Nombre del sector..."
                        onDebouncedChange={(val) => updateSector(sector.id, { name: val as string })}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, 0, 'name')}
                     />
                  </TableCell>

                  {/* Dimensions - 3 cols */}
                  <TableCell className="p-0 border-r align-top w-[180px]">
                     <div className="flex h-full w-full">
                        <div className="border-r h-full flex-1">
                            <DebouncedInput
                                type="number"
                                className="h-full w-full text-center text-xs border-transparent hover:border-input p-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-inset focus:ring-blue-500"
                                value={width || ''}
                                placeholder="-"
                                onDebouncedChange={(v) => updateConfig('width', parseFloat(v as string))}
                            />
                        </div>
                        <div className="border-r h-full flex-1">
                            <DebouncedInput
                                type="number"
                                className="h-full w-full text-center text-xs border-transparent hover:border-input p-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-inset focus:ring-blue-500"
                                value={length || ''}
                                placeholder="-"
                                onDebouncedChange={(v) => updateConfig('length', parseFloat(v as string))}
                            />
                        </div>
                        <div className="h-full flex-1">
                            <DebouncedInput
                                type="number"
                                className="h-full w-full text-center text-xs border-transparent hover:border-input p-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-inset focus:ring-blue-500"
                                value={height || ''}
                                placeholder="-"
                                onDebouncedChange={(v) => updateConfig('height', parseFloat(v as string))}
                            />
                        </div>
                     </div>
                  </TableCell>

                  {/* Calculations - 3 cols */}
                  <TableCell className="p-0 border-r align-top bg-orange-50/5 w-[180px]">
                     <div className="flex h-full w-full">
                        <div className="border-r flex-1 flex items-center justify-center text-xs font-mono text-muted-foreground bg-gray-50/50">
                            {roomIndex}
                        </div>
                        <div className="border-r flex-1 flex items-center justify-center text-xs font-mono text-muted-foreground bg-gray-50/50">
                            {minPoints}
                        </div>
                        <div className="flex-1 flex items-center justify-center text-xs font-bold text-orange-700">
                            {points.length}
                        </div>
                     </div>
                  </TableCell>

                  {/* Points Grid - 15 cols */}
                  <TableCell className="p-0 border-r align-top bg-yellow-50/5 w-[600px]">
                      <div className="flex h-full w-full">
                          {Array.from({ length: 15 }).map((_, colIndex) => {
                              const point = points[colIndex];
                              
                              const isEditable = colIndex < points.length;
                              const isNext = colIndex === points.length;
                              
                              return (
                                  <div key={colIndex} className="flex-1 h-full border-r border-gray-100 last:border-r-0 flex items-center justify-center p-0">
                                      {isEditable ? (
                                          <DebouncedInput 
                                              id={`input-${rowIndex}-${colIndex}-${colIndex}`}
                                              type="number"
                                              className="h-full w-full text-center text-xs font-mono p-0 border-transparent hover:border-blue-300 focus:border-blue-500 focus:bg-white bg-transparent rounded-none transition-colors"
                                              value={point.values.lux || ''}
                                              onDebouncedChange={(val) => updatePoint(sector.id, measurement.id, point.id, { values: { ...point.values, lux: val } })}
                                              onKeyDown={(e) => {
                                                  if (e.key === 'Backspace' && (!point.values.lux || point.values.lux === '')) {
                                                      // Optional: behavior on delete
                                                  }
                                              }}
                                          />
                                      ) : isNext ? (
                                          <Input 
                                              className="h-full w-full text-center text-xs p-0 border-none bg-transparent hover:bg-gray-100 cursor-pointer text-gray-300 hover:text-gray-500 transition-colors rounded-none"
                                              placeholder="+"
                                              onFocus={() => {
                                                  addPoint(sector.id, measurement.id, { values: { lux: '' } });
                                              }}
                                          />
                                      ) : (
                                          <div className="w-full h-full bg-gray-50/30"></div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </TableCell>

                  {/* Resultados - 5 cols */}
                  <TableCell className="p-0 align-top bg-green-50/5 w-[400px]">
                       <div className="flex h-full w-full">
                           {/* E min >= Emed/2 */}
                           <div className="flex-1 border-r flex items-center justify-center text-xs bg-white px-1">
                               <div className="flex flex-col items-center w-full">
                                   <span className="font-mono text-xs">{eMin}</span>
                                   <div className="h-px w-full bg-gray-200 my-0.5"></div>
                                   <span className="font-mono text-[10px] text-gray-400">{Math.round(eAvg/2)}</span>
                               </div>
                           </div>
                           
                           {/* E Media */}
                           <div className="flex-1 border-r flex items-center justify-center font-bold text-xs bg-white">
                               {eAvg}
                           </div>

                           {/* Limit */}
                           <div className="flex-1 border-r p-0 bg-white">
                               <DebouncedInput
                                   type="number"
                                   className="h-full w-full text-center text-xs font-bold text-blue-700 border-transparent hover:border-input p-0 bg-transparent focus:bg-white"
                                   value={limit || ''}
                                   placeholder="-"
                                   onDebouncedChange={(v) => updateConfig('limit', parseFloat(v as string))}
                               />
                           </div>

                           {/* Compliance Uniformity */}
                           <div className={cn(
                               "flex-1 border-r flex items-center justify-center font-bold text-xs",
                               uniformityCheck ? "bg-green-100 text-green-700" : "bg-red-50 text-red-700"
                           )}>
                               {uniformityCheck ? "SI" : "NO"}
                           </div>

                           {/* Compliance Limit */}
                           <div className={cn(
                               "flex-1 flex items-center justify-center font-bold text-xs",
                               limitCheck ? "bg-green-100 text-green-700" : "bg-red-50 text-red-700"
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
