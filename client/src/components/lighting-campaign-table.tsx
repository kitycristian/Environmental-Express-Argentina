import { useState, useEffect, useRef } from "react";
import { Measurement, Sector, MeasurementType } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Trash2, Save, Calculator, ArrowRight, Minus } from "lucide-react";
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

  // Selection state
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);
  const [visiblePoints, setVisiblePoints] = useState(15);
  
  // Selection handlers
  const toggleSelectAll = () => {
      if (selectedSectorIds.length === sectors.length) {
          setSelectedSectorIds([]);
      } else {
          setSelectedSectorIds(sectors.map(s => s.id));
      }
  };

  const toggleSelectSector = (id: string) => {
      if (selectedSectorIds.includes(id)) {
          setSelectedSectorIds(selectedSectorIds.filter(sid => sid !== id));
      } else {
          setSelectedSectorIds([...selectedSectorIds, id]);
      }
  };

  const handleBulkDelete = () => {
      if (confirm(`¿Está seguro de eliminar ${selectedSectorIds.length} sectores seleccionados?`)) {
          selectedSectorIds.forEach(sectorId => {
              const sector = sectors.find(s => s.id === sectorId);
              if (sector) {
                  const measurement = sector.measurements.find(m => m.type === type);
                  if (measurement) {
                      deleteMeasurement(sectorId, measurement.id);
                  }
              }
          });
          setSelectedSectorIds([]);
      }
  };

  const handleBulkAddPoint = () => {
      selectedSectorIds.forEach(sectorId => {
          const sector = sectors.find(s => s.id === sectorId);
          if (sector) {
              const measurement = sector.measurements.find(m => m.type === type);
              if (measurement) {
                  addPoint(sectorId, measurement.id, { values: { lux: '' } });
              }
          }
      });
  };

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
           else if (field === 'height') nextInputId = `input-${rowIndex}-lightingType`;
           else if (field === 'lightingType') nextInputId = `input-${rowIndex}-lightsOffCount`;
           else if (field === 'lightsOffCount') nextInputId = `input-${rowIndex}-point-0`;
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
               // From limit -> next row Name
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
  const topSpacerRef = useRef<HTMLDivElement>(null);

  // Sync scroll widths precisely
  useEffect(() => {
      const syncWidth = () => {
          if (tableContainerRef.current && topSpacerRef.current) {
              // Get the real scroll width from the table container
              const realScrollWidth = tableContainerRef.current.scrollWidth;
              // Force top spacer to match exactly
              topSpacerRef.current.style.width = `${realScrollWidth}px`;
          }
      };

      // Initial sync
      syncWidth();
      
      // Sync on resize
      window.addEventListener('resize', syncWidth);
      
      // Sync after a short delay to allow layout to settle
      const timer = setTimeout(syncWidth, 100);

      return () => {
          window.removeEventListener('resize', syncWidth);
          clearTimeout(timer);
      };
  }, [visiblePoints, sectors.length]); // Re-sync when structure changes

  const handleTableScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (topScrollRef.current) {
        // Only update if difference is significant to avoid loops/jitter
        if (Math.abs(topScrollRef.current.scrollLeft - e.currentTarget.scrollLeft) > 1) {
            topScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    }
  };

  const handleTopScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (tableContainerRef.current) {
         if (Math.abs(tableContainerRef.current.scrollLeft - e.currentTarget.scrollLeft) > 1) {
            tableContainerRef.current.scrollLeft = e.currentTarget.scrollLeft;
        }
    }
  };

  const totalTableWidth = 60 + 70 + 320 + 240 + 240 + 200 + (visiblePoints * 80) + 500 + 70;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border-2 shadow-md">
        <div className="flex items-center gap-4">
            <h3 className="font-bold text-2xl px-3 text-primary">Planilla de Campo - Iluminación</h3>
            {selectedSectorIds.length > 0 && (
                <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-4 duration-300">
                    <div className="h-8 w-px bg-gray-300 mx-2" />
                    <span className="text-base font-medium text-muted-foreground">{selectedSectorIds.length} seleccionados</span>
                    <Button 
                        variant="destructive" 
                        size="lg" 
                        className="h-12 px-4 text-base"
                        onClick={handleBulkDelete}
                    >
                        <Trash2 className="h-5 w-5 mr-2" />
                        Borrar
                    </Button>
                    <Button 
                        variant="outline" 
                        size="lg" 
                        className="h-12 px-4 text-base border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
                        onClick={handleBulkAddPoint}
                    >
                        <Plus className="h-5 w-5 mr-2" />
                        Agregar Punto
                    </Button>
                </div>
            )}
        </div>
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2 mr-2">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-xl" 
                    onClick={() => setVisiblePoints(Math.max(9, visiblePoints - 3))}
                    disabled={visiblePoints <= 9}
                >
                    <Minus className="h-5 w-5" />
                </Button>
                <span className="text-lg font-bold font-mono w-20 text-center">{visiblePoints} Ptos</span>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-xl" 
                    onClick={() => setVisiblePoints(visiblePoints + 3)}
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>
            <Button onClick={handleAddRow} size="lg" className="h-12 text-base px-6">
                <Plus className="h-5 w-5 mr-2" />
                Agregar Sector (Fila)
            </Button>
        </div>
      </div>

      <div className="space-y-0">
        {/* Top Scrollbar */}
        <div 
            ref={topScrollRef}
            onScroll={handleTopScroll}
            className="sticky top-0 z-20 overflow-x-auto border-x border-t rounded-t-lg bg-gray-100 h-6 custom-scrollbar shadow-sm"
        >
            <div ref={topSpacerRef} style={{ width: `${totalTableWidth}px`, height: '1px' }}></div>
        </div>

        <div 
            ref={tableContainerRef} 
            onScroll={handleTableScroll}
            className="border rounded-b-lg shadow-sm bg-white overflow-x-auto rounded-t-none pb-2"
        >
            <Table className="border-collapse" style={{ minWidth: `${totalTableWidth}px` }}>
            <TableHeader className="bg-gray-50 border-b-2 border-gray-200">
            <TableRow className="h-24"> 
              {/* Checkbox */}
              <TableHead className="w-[60px] text-center border-r bg-gray-100 p-0">
                  <div className="flex items-center justify-center w-full h-full">
                      <Checkbox 
                        checked={selectedSectorIds.length === sectors.length && sectors.length > 0}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                        className="h-6 w-6"
                      />
                  </div>
              </TableHead>

              {/* Index */}
              <TableHead className="w-[70px] text-center font-bold text-lg border-r bg-gray-100 text-gray-700">#</TableHead>
              
              {/* Sector Name */}
              <TableHead className="w-[320px] font-bold text-lg border-r bg-gray-50 text-gray-700 px-4 text-left">Sector / Subsector</TableHead>
              
              {/* Dimensiones - 3 cols */}
              <TableHead className="p-0 border-r text-center bg-blue-50/50 w-[240px]">
                  <div className="border-b py-3 text-base font-bold text-blue-800 uppercase tracking-wider bg-blue-100/50">Dimensiones</div>
                  <div className="flex h-12 w-full">
                      <div className="flex-1 flex items-center justify-center text-sm font-semibold text-blue-700 border-r border-blue-100">ANCHO</div>
                      <div className="flex-1 flex items-center justify-center text-sm font-semibold text-blue-700 border-r border-blue-100">LARGO</div>
                      <div className="flex-1 flex items-center justify-center text-sm font-semibold text-blue-700">ALTO</div>
                  </div>
              </TableHead>
              
              {/* Cálculos - 3 cols */}
              <TableHead className="p-0 border-r text-center bg-orange-50/50 w-[240px]">
                  <div className="border-b py-3 text-base font-bold text-orange-800 uppercase tracking-wider bg-orange-100/50">Cálculos</div>
                  <div className="flex h-12 w-full">
                      <div className="flex-1 flex items-center justify-center text-sm font-semibold text-orange-700 border-r border-orange-100 leading-4">INDICE<br/>K</div>
                      <div className="flex-1 flex items-center justify-center text-sm font-semibold text-orange-700 border-r border-orange-100 leading-4">PTOS<br/>MIN</div>
                      <div className="flex-1 flex items-center justify-center text-sm font-semibold text-orange-700 leading-4">PTOS<br/>ACT</div>
                  </div>
              </TableHead>

              {/* Detalles (Tipo / Off) - 2 cols */}
              <TableHead className="p-0 border-r text-center bg-purple-50/50 w-[200px]">
                  <div className="border-b py-3 text-base font-bold text-purple-800 uppercase tracking-wider bg-purple-100/50">Detalles</div>
                  <div className="flex h-12 w-full">
                      <div className="flex-1 flex items-center justify-center text-sm font-semibold text-purple-700 border-r border-purple-100 leading-4">TIPO<br/>ILUM</div>
                      <div className="flex-1 flex items-center justify-center text-sm font-semibold text-purple-700 leading-4">LUCES<br/>OFF</div>
                  </div>
              </TableHead>

              {/* Puntos de Medición - Dynamic cols */}
              <TableHead className="p-0 border-r text-center bg-yellow-50/50" style={{ width: `${visiblePoints * 80}px` }}>
                  <div className="border-b py-3 text-base font-bold text-yellow-800 uppercase tracking-wider bg-yellow-100/50">Iluminancia por Punto (LUX)</div>
                  <div className="flex h-12 w-full">
                      {Array.from({ length: visiblePoints }).map((_, i) => (
                          <div key={i} className="flex-1 border-r border-yellow-100 last:border-r-0 flex items-center justify-center text-base text-yellow-700 font-mono font-bold">
                              {i + 1}
                          </div>
                      ))}
                  </div>
              </TableHead>

              {/* Resultados - 5 cols */}
              <TableHead className="p-0 text-center bg-green-50/50 w-[500px]">
                  <div className="border-b py-3 text-base font-bold text-green-800 uppercase tracking-wider bg-green-100/50">Resultados</div>
                  <div className="flex h-12 w-full">
                       <div className="flex-1 border-r border-green-100 flex items-center justify-center text-sm font-semibold text-green-700 leading-4 px-1">E min<br/>≥ Em/2</div>
                       <div className="flex-1 border-r border-green-100 flex items-center justify-center text-sm font-semibold text-green-700 leading-4">E<br/>MEDIA</div>
                       <div className="flex-1 border-r border-green-100 flex items-center justify-center text-sm font-semibold text-green-700 leading-4">LIMITE<br/>LEGAL</div>
                       <div className="flex-1 border-r border-green-100 flex items-center justify-center text-sm font-semibold text-green-700 leading-4">CUMPLE<br/>UNIF.</div>
                       <div className="flex-1 flex items-center justify-center text-sm font-semibold text-green-700 leading-4">CUMPLE<br/>LIMITE</div>
                  </div>
              </TableHead>
              
              {/* Actions */}
              <TableHead className="w-[70px] text-center font-bold border-r bg-gray-50 text-gray-700"></TableHead>
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
                <TableRow key={sector.id} className={cn(
                    "hover:bg-blue-50/30 transition-colors border-b-2 border-gray-200 h-16",
                    selectedSectorIds.includes(sector.id) && "bg-blue-50/40"
                )}>
                  {/* Checkbox */}
                  <TableCell className="text-center border-r bg-gray-50/50 p-0 w-[60px]">
                      <div className="flex items-center justify-center w-full h-full">
                          <Checkbox 
                            checked={selectedSectorIds.includes(sector.id)}
                            onCheckedChange={() => toggleSelectSector(sector.id)}
                            aria-label={`Select sector ${sector.name}`}
                            className="h-6 w-6"
                          />
                      </div>
                  </TableCell>

                  {/* Index */}
                  <TableCell className="text-center font-bold text-xl border-r bg-gray-50/50 text-gray-600 w-[70px]">
                    {rowIndex + 1}
                  </TableCell>
                  
                  {/* Sector Name */}
                  <TableCell className="border-r p-2 align-middle w-[320px]">
                     <DebouncedInput
                        id={`input-${rowIndex}-name`}
                        className="h-14 text-lg font-semibold border-2 border-transparent hover:border-input focus:border-primary px-4 bg-transparent w-full rounded-lg" 
                        value={sector.name}
                        placeholder="Nombre del sector..."
                        onDebouncedChange={(val) => updateSector(sector.id, { name: val as string })}
                        onKeyDown={(e) => handleKeyDown(e, rowIndex, 0, 'name')}
                     />
                  </TableCell>

                  {/* Dimensions - 3 cols */}
                  <TableCell className="p-0 border-r align-middle w-[240px]">
                     <div className="flex h-16 w-full">
                        <div className="border-r h-full flex-1 flex items-center justify-center">
                            <DebouncedInput
                                id={`input-${rowIndex}-width`}
                                type="number"
                                className="h-12 w-full text-center text-lg font-mono border-2 border-transparent hover:border-input bg-transparent focus:bg-white focus:border-blue-500 rounded-lg mx-1"
                                value={width || ''}
                                placeholder="-"
                                onDebouncedChange={(v) => updateConfig('width', parseFloat(v as string))}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, 0, 'width')}
                            />
                        </div>
                        <div className="border-r h-full flex-1 flex items-center justify-center">
                            <DebouncedInput
                                id={`input-${rowIndex}-length`}
                                type="number"
                                className="h-12 w-full text-center text-lg font-mono border-2 border-transparent hover:border-input bg-transparent focus:bg-white focus:border-blue-500 rounded-lg mx-1"
                                value={length || ''}
                                placeholder="-"
                                onDebouncedChange={(v) => updateConfig('length', parseFloat(v as string))}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, 0, 'length')}
                            />
                        </div>
                        <div className="h-full flex-1 flex items-center justify-center">
                            <DebouncedInput
                                id={`input-${rowIndex}-height`}
                                type="number"
                                className="h-12 w-full text-center text-lg font-mono border-2 border-transparent hover:border-input bg-transparent focus:bg-white focus:border-blue-500 rounded-lg mx-1"
                                value={height || ''}
                                placeholder="-"
                                onDebouncedChange={(v) => updateConfig('height', parseFloat(v as string))}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, 0, 'height')}
                            />
                        </div>
                     </div>
                  </TableCell>

                  {/* Calculations - 3 cols */}
                  <TableCell className="p-0 border-r align-middle bg-orange-50/10 w-[240px]">
                     <div className="flex h-16 w-full">
                        <div className="border-r flex-1 flex items-center justify-center text-lg font-mono text-gray-600 bg-gray-50/50">
                            {roomIndex}
                        </div>
                        <div className="border-r flex-1 flex items-center justify-center text-lg font-mono text-gray-600 bg-gray-50/50">
                            {minPoints}
                        </div>
                        <div className="flex-1 flex items-center justify-center text-xl font-bold text-orange-600">
                            {points.length}
                        </div>
                     </div>
                  </TableCell>

                  {/* Detalles - 2 cols */}
                  <TableCell className="p-0 border-r align-middle w-[200px]">
                     <div className="flex h-16 w-full">
                        <div className="border-r h-full flex-1 flex items-center justify-center relative">
                            <select 
                                className="w-full h-12 bg-white text-base text-center appearance-none cursor-pointer focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none border-2 border-transparent hover:border-input rounded-lg mx-1"
                                value={measurement.config?.lightingType || 'artificial'}
                                onChange={(e) => updateConfig('lightingType', e.target.value)}
                                id={`input-${rowIndex}-lightingType`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault(); 
                                        document.getElementById(`input-${rowIndex}-lightsOffCount`)?.focus();
                                    }
                                }}
                            >
                                <option value="artificial">Artif.</option>
                                <option value="natural">Natural</option>
                                <option value="mixed">Mixta</option>
                            </select>
                        </div>
                        <div className="h-full flex-1 flex items-center justify-center">
                            <DebouncedInput
                                id={`input-${rowIndex}-lightsOffCount`}
                                type="number"
                                className="h-12 w-full text-center text-lg font-mono border-2 border-transparent hover:border-input bg-transparent focus:bg-white focus:border-purple-500 rounded-lg mx-1"
                                value={measurement.config?.lightsOffCount || ''}
                                placeholder="-"
                                onDebouncedChange={(v) => updateConfig('lightsOffCount', parseFloat(v as string))}
                                onKeyDown={(e) => handleKeyDown(e, rowIndex, 0, 'lightsOffCount')}
                            />
                        </div>
                     </div>
                  </TableCell>

                  {/* Points Grid - Dynamic cols - LARGE */}
                  <TableCell className="p-0 border-r align-middle bg-yellow-50/10" style={{ width: `${visiblePoints * 80}px` }}>
                      <div className="flex h-16 w-full">
                          {Array.from({ length: visiblePoints }).map((_, colIndex) => {
                              const point = points[colIndex];
                              
                              const isEditable = point !== undefined;
                              const isNext = colIndex === points.length;
                              
                              return (
                                  <div key={colIndex} className="flex-1 h-full border-r border-gray-200 last:border-r-0 flex items-center justify-center p-1">
                                      {isEditable ? (
                                          <DebouncedInput 
                                              id={`input-${rowIndex}-point-${colIndex}`}
                                              type="number"
                                              className="h-12 w-full text-center text-xl font-mono font-bold border-2 border-transparent hover:border-yellow-400 focus:border-yellow-500 focus:bg-yellow-50 bg-transparent rounded-lg transition-colors"
                                              value={point.values.lux || ''}
                                              onDebouncedChange={(val) => updatePoint(sector.id, measurement.id, point.id, { values: { ...point.values, lux: val } })}
                                              onKeyDown={(e) => {
                                                  handleKeyDown(e, rowIndex, colIndex, `point-${colIndex}`);
                                              }}
                                          />
                                      ) : isNext ? (
                                          <Input 
                                              className="h-12 w-full text-center text-xl font-bold border-2 border-dashed border-gray-300 bg-transparent hover:bg-gray-100 cursor-pointer text-gray-400 hover:text-gray-600 transition-colors rounded-lg"
                                              placeholder="+"
                                              onFocus={() => {
                                                  addPoint(sector.id, measurement.id, { values: { lux: '' } });
                                              }}
                                          />
                                      ) : (
                                          <div className="w-full h-12 bg-gray-100/50 rounded-lg"></div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  </TableCell>

                  {/* Resultados - 5 cols - LARGE */}
                  <TableCell className="p-0 align-middle bg-green-50/10 w-[500px]">
                       <div className="flex h-16 w-full">
                           {/* E min >= Emed/2 */}
                           <div className="flex-1 border-r flex items-center justify-center bg-white px-2">
                               <div className="flex flex-col items-center w-full">
                                   <span className="font-mono text-lg font-bold">{eMin}</span>
                                   <div className="h-px w-full bg-gray-300 my-1"></div>
                                   <span className="font-mono text-sm text-gray-500">{Math.round(eAvg/2)}</span>
                               </div>
                           </div>
                           
                           {/* E Media */}
                           <div className="flex-1 border-r flex items-center justify-center font-bold text-xl bg-white text-blue-600">
                               {eAvg}
                           </div>

                           {/* Limit */}
                           <div className="flex-1 border-r p-1 bg-white flex items-center justify-center">
                               <DebouncedInput
                                   id={`input-${rowIndex}-limit`}
                                   type="number"
                                   className="h-12 w-full text-center text-lg font-bold text-blue-700 border-2 border-transparent hover:border-input bg-transparent focus:bg-blue-50 focus:border-blue-500 rounded-lg"
                                   value={limit || ''}
                                   placeholder="-"
                                   onDebouncedChange={(v) => updateConfig('limit', parseFloat(v as string))}
                                   onKeyDown={(e) => handleKeyDown(e, rowIndex, 0, 'limit')}
                               />
                           </div>

                           {/* Compliance Uniformity */}
                           <div className={cn(
                               "flex-1 border-r flex items-center justify-center font-bold text-lg",
                               uniformityCheck ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                           )}>
                               {uniformityCheck ? "SI" : "NO"}
                           </div>

                           {/* Compliance Limit */}
                           <div className={cn(
                               "flex-1 flex items-center justify-center font-bold text-lg",
                               limitCheck ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                           )}>
                               {limitCheck ? "SI" : "NO"}
                           </div>
                       </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-center border-r bg-gray-50/30 p-0 align-middle w-[70px]">
                      <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-12 w-12 text-muted-foreground hover:text-destructive hover:bg-red-50"
                          onClick={() => {
                              if (confirm(`¿Está seguro de eliminar el sector "${sector.name}" de esta planilla?`)) {
                                  deleteMeasurement(sector.id, measurement.id);
                              }
                          }}
                          title="Eliminar Sector"
                      >
                          <Trash2 className="h-6 w-6" />
                      </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            
            {sectors.length === 0 && (
                <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-xl text-muted-foreground">
                        No hay sectores. Haga click en "Agregar Sector" para comenzar.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      </div>
      
      {/* Help / Legend */}
      <div className="text-base text-muted-foreground bg-gray-50 p-4 rounded-lg border-2">
          <p><strong>Referencia:</strong> Indice K = (L*A)/(h*(L+A)). Puntos Mínimos sugeridos según Resolución 84/12. Uniformidad = E_min ≥ (E_media / 2).</p>
      </div>
    </div>
  );
}
