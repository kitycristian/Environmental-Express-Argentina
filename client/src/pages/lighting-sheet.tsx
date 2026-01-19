import { useState, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { Link } from "wouter";
import { MeasurementType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Trash2, Minus } from "lucide-react";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { cn } from "@/lib/utils";

const type: MeasurementType = 'lighting';

export default function LightingSheet() {
  const sectors = useStore((state) => state.sectors);
  const updateSector = useStore((state) => state.updateSector);
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const addPoint = useStore((state) => state.addPoint);
  const updatePoint = useStore((state) => state.updatePoint);
  const deleteMeasurement = useStore((state) => state.deleteMeasurement);
  const addSectorWithMeasurement = useStore((state) => state.addSectorWithMeasurement);

  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);
  const [visiblePoints, setVisiblePoints] = useState(12);

  const activeSectors = sectors.filter(s => s.measurements.some(m => m.type === type));

  const toggleSelectAll = () => {
    if (selectedSectorIds.length === activeSectors.length) {
      setSelectedSectorIds([]);
    } else {
      setSelectedSectorIds(activeSectors.map(s => s.id));
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
    if (confirm(`¿Eliminar ${selectedSectorIds.length} sectores?`)) {
      selectedSectorIds.forEach(sectorId => {
        const sector = activeSectors.find(s => s.id === sectorId);
        if (sector) {
          const measurement = sector.measurements.find(m => m.type === type);
          if (measurement) deleteMeasurement(sectorId, measurement.id);
        }
      });
      setSelectedSectorIds([]);
    }
  };

  const handleAddRow = () => {
    addSectorWithMeasurement({
      name: `Sector ${activeSectors.length + 1}`,
      description: "",
      dimensions: "",
      activity: "",
      workersCount: 0
    }, type);
  };

  const calculateRoomIndex = (l: number, w: number, h: number, hm: number) => {
    if (!l || !w || !h) return 0;
    const h_mount = hm ? (h - hm) : h;
    if (h_mount <= 0) return 0;
    const k = (l * w) / (h_mount * (l + w));
    return parseFloat(k.toFixed(2));
  };

  useEffect(() => {
    activeSectors.forEach(sector => {
      const measurement = sector.measurements.find(m => m.type === type);
      if (measurement && measurement.points.length < 9) {
        const needed = 9 - measurement.points.length;
        for (let i = 0; i < needed; i++) {
          addPoint(sector.id, measurement.id, { values: { lux: '' } });
        }
      }
    });
  }, [activeSectors.length]);

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (field.startsWith('point-')) {
        const pointIndex = parseInt(field.split('-')[1]);
        const nextInput = document.getElementById(`input-${rowIndex}-point-${pointIndex + 1}`);
        if (nextInput) nextInput.focus();
        else {
          const nextRowInput = document.getElementById(`input-${rowIndex + 1}-name`);
          if (nextRowInput) nextRowInput.focus();
        }
      } else {
        const nextRowInput = document.getElementById(`input-${rowIndex + 1}-${field}`);
        if (nextRowInput) nextRowInput.focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextInput = document.getElementById(`input-${rowIndex + 1}-${field}`);
      if (nextInput) nextInput.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevInput = document.getElementById(`input-${rowIndex - 1}-${field}`);
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Compact Header */}
      <div className="bg-white border-b-2 shadow-sm px-4 py-3 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline" size="lg" className="h-12 gap-2" data-testid="btn-back">
              <ArrowLeft className="h-5 w-5" /> Volver al Inicio
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-primary">Planilla de Iluminación</h1>
          {selectedSectorIds.length > 0 && (
            <div className="flex items-center gap-3 ml-4">
              <span className="text-base font-medium text-gray-600">{selectedSectorIds.length} seleccionados</span>
              <Button variant="destructive" size="lg" className="h-12" onClick={handleBulkDelete} data-testid="btn-bulk-delete">
                <Trash2 className="h-5 w-5 mr-2" /> Eliminar
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-2">
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setVisiblePoints(Math.max(6, visiblePoints - 3))} disabled={visiblePoints <= 6} data-testid="btn-less-points">
              <Minus className="h-5 w-5" />
            </Button>
            <span className="text-lg font-bold font-mono w-16 text-center">{visiblePoints}</span>
            <Button variant="ghost" size="icon" className="h-10 w-10" onClick={() => setVisiblePoints(visiblePoints + 3)} data-testid="btn-more-points">
              <Plus className="h-5 w-5" />
            </Button>
          </div>
          <Button onClick={handleAddRow} size="lg" className="h-12 text-base px-6" data-testid="btn-add-row">
            <Plus className="h-5 w-5 mr-2" /> Agregar Fila
          </Button>
        </div>
      </div>

      {/* Full Screen Table */}
      <div className="flex-1 overflow-auto">
        <Table className="w-full border-collapse">
          <TableHeader className="bg-white sticky top-0 z-40">
            <TableRow className="h-12 border-b-2">
              <TableHead className="w-10 text-center border-r bg-gray-100 sticky left-0 z-30">
                <Checkbox checked={selectedSectorIds.length === activeSectors.length && activeSectors.length > 0} onCheckedChange={toggleSelectAll} className="h-5 w-5" data-testid="checkbox-all" />
              </TableHead>
              <TableHead className="min-w-[180px] font-bold text-sm border-r bg-gray-50 sticky left-10 z-30 px-2">Sector / Subsector</TableHead>
              <TableHead className="min-w-[80px] text-center font-bold text-sm border-r bg-blue-50 text-blue-800">Ancho</TableHead>
              <TableHead className="min-w-[80px] text-center font-bold text-sm border-r bg-blue-50 text-blue-800">Largo</TableHead>
              <TableHead className="min-w-[80px] text-center font-bold text-sm border-r bg-blue-50 text-blue-800">Alto</TableHead>
              <TableHead className="min-w-[60px] text-center font-bold text-sm border-r bg-orange-50 text-orange-800">K</TableHead>
              <TableHead className="min-w-[50px] text-center font-bold text-sm border-r bg-orange-50 text-orange-800">Min</TableHead>
              <TableHead className="min-w-[50px] text-center font-bold text-sm border-r bg-orange-50 text-orange-800">Ptos</TableHead>
              <TableHead className="min-w-[80px] text-center font-bold text-sm border-r bg-purple-50 text-purple-800">Tipo</TableHead>
              {Array.from({ length: visiblePoints }).map((_, i) => (
                <TableHead key={i} className="min-w-[70px] text-center font-bold text-sm border-r bg-yellow-50 text-yellow-800 font-mono">{i + 1}</TableHead>
              ))}
              <TableHead className="min-w-[70px] text-center font-bold text-sm border-r bg-green-50 text-green-800">E min</TableHead>
              <TableHead className="min-w-[60px] text-center font-bold text-sm border-r bg-green-50 text-green-800">E med</TableHead>
              <TableHead className="min-w-[70px] text-center font-bold text-sm border-r bg-green-50 text-green-800">Límite</TableHead>
              <TableHead className="min-w-[50px] text-center font-bold text-sm border-r bg-green-50 text-green-800">Unif.</TableHead>
              <TableHead className="min-w-[50px] text-center font-bold text-sm bg-green-50 text-green-800">OK</TableHead>
              <TableHead className="w-14 bg-gray-50"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeSectors.map((sector, rowIndex) => {
              const measurement = sector.measurements.find(m => m.type === type);
              if (!measurement) return null;

              const updateConfig = (key: string, value: any) => {
                updateMeasurement(sector.id, measurement.id, { config: { ...measurement.config, [key]: value } });
              };

              const width = measurement.config?.width || 0;
              const length = measurement.config?.length || 0;
              const height = measurement.config?.height || 0;
              const workPlane = measurement.config?.workPlaneHeight || 0.85;
              const roomIndex = calculateRoomIndex(length, width, height, workPlane);
              const minPoints = roomIndex < 1 ? 4 : roomIndex < 2 ? 9 : roomIndex < 3 ? 16 : 25;
              const points = measurement.points;
              const values = points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
              const eAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
              const eMin = values.length > 0 ? Math.min(...values) : 0;
              const limit = measurement.config?.limit || 0;
              const uniformityCheck = eMin >= (eAvg / 2);
              const limitCheck = limit > 0 ? eAvg >= limit : true;

              return (
                <TableRow key={sector.id} className={cn("border-b hover:bg-blue-50/30", selectedSectorIds.includes(sector.id) && "bg-blue-50/50")} data-testid={`row-sector-${rowIndex}`}>
                  <TableCell className="text-center border-r bg-gray-50 sticky left-0 z-20 p-1">
                    <Checkbox checked={selectedSectorIds.includes(sector.id)} onCheckedChange={() => toggleSelectSector(sector.id)} className="h-5 w-5" data-testid={`checkbox-${rowIndex}`} />
                  </TableCell>
                  <TableCell className="border-r sticky left-10 z-20 bg-white p-1">
                    <DebouncedInput id={`input-${rowIndex}-name`} className="h-10 text-sm font-semibold border border-transparent hover:border-gray-300 focus:border-primary px-2 w-full rounded" value={sector.name} placeholder="Nombre..." onDebouncedChange={(val) => updateSector(sector.id, { name: val as string })} onKeyDown={(e) => handleKeyDown(e, rowIndex, 'name')} data-testid={`input-name-${rowIndex}`} />
                  </TableCell>
                  <TableCell className="border-r p-1 bg-blue-50/30">
                    <DebouncedInput id={`input-${rowIndex}-width`} type="number" className="h-10 w-full text-center text-base font-mono border border-transparent hover:border-blue-300 focus:border-blue-500 rounded bg-white" value={width || ''} placeholder="-" onDebouncedChange={(v) => updateConfig('width', parseFloat(v as string))} onKeyDown={(e) => handleKeyDown(e, rowIndex, 'width')} data-testid={`input-width-${rowIndex}`} />
                  </TableCell>
                  <TableCell className="border-r p-1 bg-blue-50/30">
                    <DebouncedInput id={`input-${rowIndex}-length`} type="number" className="h-10 w-full text-center text-base font-mono border border-transparent hover:border-blue-300 focus:border-blue-500 rounded bg-white" value={length || ''} placeholder="-" onDebouncedChange={(v) => updateConfig('length', parseFloat(v as string))} onKeyDown={(e) => handleKeyDown(e, rowIndex, 'length')} data-testid={`input-length-${rowIndex}`} />
                  </TableCell>
                  <TableCell className="border-r p-1 bg-blue-50/30">
                    <DebouncedInput id={`input-${rowIndex}-height`} type="number" className="h-10 w-full text-center text-base font-mono border border-transparent hover:border-blue-300 focus:border-blue-500 rounded bg-white" value={height || ''} placeholder="-" onDebouncedChange={(v) => updateConfig('height', parseFloat(v as string))} onKeyDown={(e) => handleKeyDown(e, rowIndex, 'height')} data-testid={`input-height-${rowIndex}`} />
                  </TableCell>
                  <TableCell className="border-r text-center text-sm font-mono text-gray-600 bg-orange-50/30">{roomIndex}</TableCell>
                  <TableCell className="border-r text-center text-sm font-mono text-gray-600 bg-orange-50/30">{minPoints}</TableCell>
                  <TableCell className="border-r text-center text-base font-bold text-orange-600 bg-orange-50/30">{points.length}</TableCell>
                  <TableCell className="border-r p-1 bg-purple-50/30">
                    <select className="h-10 w-full text-sm text-center bg-white border border-transparent hover:border-purple-300 focus:border-purple-500 rounded cursor-pointer" value={measurement.config?.lightingType || 'artificial'} onChange={(e) => updateConfig('lightingType', e.target.value)} data-testid={`select-type-${rowIndex}`}>
                      <option value="artificial">Artif.</option>
                      <option value="natural">Natural</option>
                      <option value="mixed">Mixta</option>
                    </select>
                  </TableCell>
                  {Array.from({ length: visiblePoints }).map((_, colIndex) => {
                    const point = points[colIndex];
                    const isEditable = point !== undefined;
                    const isNext = colIndex === points.length;
                    return (
                      <TableCell key={colIndex} className="border-r p-0.5 bg-yellow-50/20">
                        {isEditable ? (
                          <DebouncedInput id={`input-${rowIndex}-point-${colIndex}`} type="number" className="h-10 w-full text-center text-base font-mono font-bold border border-transparent hover:border-yellow-400 focus:border-yellow-500 focus:bg-yellow-50 rounded bg-white" value={point.values.lux || ''} onDebouncedChange={(val) => updatePoint(sector.id, measurement.id, point.id, { values: { ...point.values, lux: val } })} onKeyDown={(e) => handleKeyDown(e, rowIndex, `point-${colIndex}`)} data-testid={`input-point-${rowIndex}-${colIndex}`} />
                        ) : isNext ? (
                          <Input className="h-10 w-full text-center text-base font-bold border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer text-gray-400 rounded" placeholder="+" onFocus={() => addPoint(sector.id, measurement.id, { values: { lux: '' } })} data-testid={`input-add-point-${rowIndex}-${colIndex}`} />
                        ) : (
                          <div className="h-10 w-full bg-gray-100 rounded"></div>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="border-r text-center bg-green-50/30">
                    <div className="flex flex-col items-center">
                      <span className="text-sm font-bold">{eMin}</span>
                      <span className="text-xs text-gray-500">/{Math.round(eAvg / 2)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="border-r text-center text-base font-bold text-blue-600 bg-green-50/30">{eAvg}</TableCell>
                  <TableCell className="border-r p-0.5 bg-green-50/30">
                    <DebouncedInput id={`input-${rowIndex}-limit`} type="number" className="h-10 w-full text-center text-sm font-bold text-blue-700 border border-transparent hover:border-green-300 focus:border-green-500 rounded bg-white" value={limit || ''} placeholder="-" onDebouncedChange={(v) => updateConfig('limit', parseFloat(v as string))} data-testid={`input-limit-${rowIndex}`} />
                  </TableCell>
                  <TableCell className={cn("border-r text-center text-sm font-bold", uniformityCheck ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{uniformityCheck ? "SI" : "NO"}</TableCell>
                  <TableCell className={cn("text-center text-sm font-bold", limitCheck ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700")}>{limitCheck ? "SI" : "NO"}</TableCell>
                  <TableCell className="bg-gray-50 p-0.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50" onClick={() => { if (confirm(`¿Eliminar "${sector.name}"?`)) deleteMeasurement(sector.id, measurement.id); }} data-testid={`btn-delete-${rowIndex}`}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {activeSectors.length === 0 && (
              <TableRow>
                <TableCell colSpan={20} className="h-32 text-center text-xl text-gray-500">
                  No hay sectores. Haga click en "Agregar Fila" para comenzar.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Reference */}
      <div className="bg-white border-t px-4 py-2 text-base text-gray-600">
        <strong>Ref:</strong> K = (L×A)/(h×(L+A)) | Uniformidad = E_min ≥ E_media/2
      </div>
    </div>
  );
}
