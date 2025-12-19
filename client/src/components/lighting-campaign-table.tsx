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
      const nextInput = document.getElementById(`input-${rowIndex + 1}-${field}`);
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`input-${rowIndex - 1}-${field}`);
      if (prevInput) prevInput.focus();
    } else if (e.key === 'ArrowRight' && field.startsWith('point-')) {
       // Navigate points horizontally
       const pointIndex = parseInt(field.split('-')[1]);
       const nextInput = document.getElementById(`input-${rowIndex}-point-${pointIndex + 1}`);
       // If next point doesn't exist but we are within 15 limit, maybe focus "add point"? 
       // For now, standard navigation
       if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowLeft' && field.startsWith('point-')) {
       const pointIndex = parseInt(field.split('-')[1]);
       const prevInput = document.getElementById(`input-${rowIndex}-point-${pointIndex - 1}`);
       if (prevInput) prevInput.focus();
    } else if (e.key === 'Enter') {
       e.preventDefault();
       
       if (field === 'name') {
           // Sector/Subsector: Move down
           const nextInput = document.getElementById(`input-${rowIndex + 1}-${field}`);
           if (nextInput) nextInput.focus();
       } else {
           // Other items: Move right (next cell)
           let nextInputId = '';
           
           if (field === 'width') nextInputId = `input-${rowIndex}-length`;
           else if (field === 'length') nextInputId = `input-${rowIndex}-height`;
           else if (field === 'height') nextInputId = `input-${rowIndex}-point-0`;
           else if (field.startsWith('point-')) {
               const pointIndex = parseInt(field.split('-')[1]);
               // If next point is within visible limit
               if (pointIndex < visiblePoints - 1) {
                   nextInputId = `input-${rowIndex}-point-${pointIndex + 1}`;
               } else {
                   // Last point -> Go to limit
                   nextInputId = `input-${rowIndex}-limit`;
               }
           }
           else if (field === 'limit') {
               // From limit -> Maybe next row Name? Or stay.
               // User said "celda de al lado siguiente". After limit there is nothing sideways.
               // Let's go to next row name for continuous entry.
               nextInputId = `input-${rowIndex + 1}-name`;
           }
           
           const nextInput = document.getElementById(nextInputId);
           if (nextInput) nextInput.focus();
       }
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

  const [visiblePoints, setVisiblePoints] = useState(15);

  const handleAddRow = () => {
    addSectorWithMeasurement({
        name: `Nuevo Sector ${sectors.length + 1}`,
        description: "",
        dimensions: "",
        activity: "",
        workersCount: 0
    }, type);
  };
  
  // Ensure measurements have at least 9 points on load
  useEffect(() => {
    sectors.forEach(sector => {
      const measurement = sector.measurements.find(m => m.type === type);
      if (measurement && measurement.points.length < 9) {
          // We can't batch updates easily here without loop, but we can check individually
          // Actually, best to do this lazily or let the render handle adding them?
          // Store doesn't support batch addPoint.
          // Let's do a quick loop if needed.
          const needed = 9 - measurement.points.length;
          for(let i=0; i<needed; i++) {
              addPoint(sector.id, measurement.id, { values: { lux: '' } });
          }
      }
    });
  }, [sectors, type, addPoint]);

  const tableContainerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const topScroll = topScrollRef.current;

    if (!tableContainer || !topScroll) return;

    const handleTableScroll = () => {
        if (topScroll && tableContainer) {
            topScroll.scrollLeft = tableContainer.scrollLeft;
        }
    };

    const handleTopScroll = () => {
        if (tableContainer && topScroll) {
            tableContainer.scrollLeft = topScroll.scrollLeft;
        }
    };

    tableContainer.addEventListener('scroll', handleTableScroll);
    topScroll.addEventListener('scroll', handleTopScroll);

    return () => {
        tableContainer.removeEventListener('scroll', handleTableScroll);
        topScroll.removeEventListener('scroll', handleTopScroll);
    };
  }, []);

  const totalTableWidth = 50 + 250 + 180 + 180 + (visiblePoints * 40) + 400 + 50;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-2 rounded-lg border shadow-sm">
        <h3 className="font-semibold text-lg px-2">Planilla de Campo - Iluminación</h3>
        <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1 mr-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => setVisiblePoints(Math.max(9, visiblePoints - 3))}
                    disabled={visiblePoints <= 9}
                >
                    <span className="text-xs">-</span>
                </Button>
                <span className="text-xs font-mono w-12 text-center">{visiblePoints} Ptos</span>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => setVisiblePoints(visiblePoints + 3)}
                >
                    <span className="text-xs">+</span>
                </Button>
            </div>
            <Button onClick={handleAddRow} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Sector (Fila)
            </Button>
        </div>
      </div>

      <div className="space-y-0">
        {/* Top Scrollbar */}
        <div 
            ref={topScrollRef}
            className="overflow-x-auto border-x border-t rounded-t-lg bg-gray-50 h-4"
        >
            <div style={{ width: `${totalTableWidth}px`, height: '1px' }}></div>
        </div>

        <div ref={tableContainerRef} className="border rounded-b-lg shadow-sm bg-white overflow-x-auto rounded-t-none">
            <Table className="border-collapse" style={{ minWidth: `${totalTableWidth}px` }}>
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

              {/* Puntos de Medición - Dynamic cols */}
              <TableHead className="p-0 border-r text-center bg-yellow-50/50" style={{ width: `${visiblePoints * 40}px` }}>
                  <div className="border-b py-2 text-xs font-bold text-yellow-800 uppercase tracking-wider bg-yellow-100/50">Iluminancia por Punto (LUX)</div>
                  <div className="flex h-10 w-full">
                      {Array.from({ length: visiblePoints }).map((_, i) => (
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
              
              {/* Actions */}
              <TableHead className="w-[50px] text-center font-bold border-r bg-gray-50 text-gray-700"></TableHead>
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
                        id={`input-${rowIndex}-name`}
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
                                id={`input-${rowIndex}-width`}
                                type="number"
                                className="h-full w-full text-center text-xs border-transparent hover:border-input p-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-inset focus:ring-blue-500"
                                value={width || ''}
                                placeholder="-"
                                onDebouncedChange={(v) => updateConfig('width', parseFloat(v as string))}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, 0, 'width')}
                            />
                        </div>
                        <div className="border-r h-full flex-1">
                            <DebouncedInput
                                id={`input-${rowIndex}-length`}
                                type="number"
                                className="h-full w-full text-center text-xs border-transparent hover:border-input p-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-inset focus:ring-blue-500"
                                value={length || ''}
                                placeholder="-"
                                onDebouncedChange={(v) => updateConfig('length', parseFloat(v as string))}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, 0, 'length')}
                            />
                        </div>
                        <div className="h-full flex-1">
                            <DebouncedInput
                                id={`input-${rowIndex}-height`}
                                type="number"
                                className="h-full w-full text-center text-xs border-transparent hover:border-input p-0 bg-transparent focus:bg-white focus:ring-1 focus:ring-inset focus:ring-blue-500"
                                value={height || ''}
                                placeholder="-"
                                onDebouncedChange={(v) => updateConfig('height', parseFloat(v as string))}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, 0, 'height')}
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

                  {/* Points Grid - Dynamic cols */}
                  <TableCell className="p-0 border-r align-top bg-yellow-50/5" style={{ width: `${visiblePoints * 40}px` }}>
                      <div className="flex h-full w-full">
                          {Array.from({ length: visiblePoints }).map((_, colIndex) => {
                              const point = points[colIndex];
                              
                              const isEditable = point !== undefined; // If point exists, it's editable
                              const isNext = colIndex === points.length; // Next available slot to add
                              
                              return (
                                  <div key={colIndex} className="flex-1 h-full border-r border-gray-100 last:border-r-0 flex items-center justify-center p-0">
                                      {isEditable ? (
                                          <DebouncedInput 
                                              id={`input-${rowIndex}-point-${colIndex}`}
                                              type="number"
                                              className="h-full w-full text-center text-xs font-mono p-0 border-transparent hover:border-blue-300 focus:border-blue-500 focus:bg-white bg-transparent rounded-none transition-colors"
                                              value={point.values.lux || ''}
                                              onDebouncedChange={(val) => updatePoint(sector.id, measurement.id, point.id, { values: { ...point.values, lux: val } })}
                                              onKeyDown={(e) => {
                                                  handleKeyDown(e, rowIndex, colIndex, `point-${colIndex}`);
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
                                   id={`input-${rowIndex}-limit`}
                                   type="number"
                                   className="h-full w-full text-center text-xs font-bold text-blue-700 border-transparent hover:border-input p-0 bg-transparent focus:bg-white"
                                   value={limit || ''}
                                   placeholder="-"
                                   onDebouncedChange={(v) => updateConfig('limit', parseFloat(v as string))}
                                   onKeyDown={(e) => handleKeyDown(e, rowIndex, 0, 'limit')}
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

                  {/* Actions */}
                  <TableCell className="text-center border-r bg-gray-50/30 p-0 align-middle">
                      <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => {
                              if (confirm(`¿Está seguro de eliminar el sector "${sector.name}" de esta planilla?`)) {
                                  deleteMeasurement(sector.id, measurement.id);
                              }
                          }}
                          title="Eliminar Sector"
                      >
                          <Trash2 className="h-4 w-4" />
                      </Button>
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
      </div>
      
      {/* Help / Legend */}
      <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded border">
          <p><strong>Referencia:</strong> Indice K = (L*A)/(h*(L+A)). Puntos Mínimos sugeridos según Resolución 84/12. Uniformidad = E_min ≥ (E_media / 2).</p>
      </div>
    </div>
  );
}
