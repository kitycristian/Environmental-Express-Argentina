import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Link } from "wouter";
import { MeasurementType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, FileUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClients } from "@/lib/hooks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const type: MeasurementType = 'lighting';

export default function LightingSheet() {
  const sectors = useStore((state) => state.sectors);
  const updateSector = useStore((state) => state.updateSector);
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const addPoint = useStore((state) => state.addPoint);
  const updatePoint = useStore((state) => state.updatePoint);
  const deleteMeasurement = useStore((state) => state.deleteMeasurement);
  const addSectorWithMeasurement = useStore((state) => state.addSectorWithMeasurement);

  const [visiblePoints, setVisiblePoints] = useState(15);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const { data: clients = [] } = useClients();

  const activeSectors = sectors.filter(s => s.measurements.some(m => m.type === type));

  const handleAddRow = () => {
    addSectorWithMeasurement({
      name: `Sector ${activeSectors.length + 1}`,
      description: "",
      dimensions: "",
      activity: "",
      workersCount: 0
    }, type);
  };

  const handleImportSectors = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (client && Array.isArray(client.sectors)) {
      const clientSectors = client.sectors as string[];
      clientSectors.forEach((sectorName, index) => {
        addSectorWithMeasurement({
          name: sectorName,
          description: "",
          dimensions: "",
          activity: "",
          workersCount: 0
        }, type);
      });
      setImportDialogOpen(false);
      setSelectedClientId("");
    }
  };

  const calculateRoomIndex = (l: number, w: number, h: number) => {
    if (!l || !w || !h) return 0;
    const k = (l * w) / (h * (l + w));
    return parseFloat(k.toFixed(2));
  };

  const getMinPoints = (k: number) => {
    if (k < 1) return 4;
    if (k < 2) return 9;
    if (k < 3) return 16;
    return 25;
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

  const handleCellChange = (sectorId: string, measurementId: string, field: string, value: string) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector) return;
    const measurement = sector.measurements.find(m => m.id === measurementId);
    if (!measurement) return;
    
    updateMeasurement(sectorId, measurementId, { 
      config: { ...measurement.config, [field]: value === '' ? null : parseFloat(value) || value } 
    });
  };

  const handlePointChange = (sectorId: string, measurementId: string, pointId: string, value: string) => {
    const sector = sectors.find(s => s.id === sectorId);
    if (!sector) return;
    const measurement = sector.measurements.find(m => m.id === measurementId);
    if (!measurement) return;
    const point = measurement.points.find(p => p.id === pointId);
    if (!point) return;
    
    updatePoint(sectorId, measurementId, pointId, { values: { ...point.values, lux: value } });
  };

  const cellClass = "border px-1 py-0.5 text-xs text-center";
  const inputClass = "w-full h-6 text-xs text-center border-0 bg-transparent focus:bg-yellow-50 focus:outline-none";
  const headerClass = "border border-blue-800 px-1 py-1 text-xs font-bold text-center whitespace-nowrap bg-blue-900 text-white";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-xs">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="btn-back">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          </Link>
          <h1 className="text-sm font-bold text-gray-800" data-testid="heading-lighting">MEMORIA DE CALCULOS - ILUMINACIÓN</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="btn-import">
            <FileUp className="h-4 w-4 mr-1" /> Importar
          </Button>
          <Button onClick={handleAddRow} size="sm" data-testid="btn-add-row">
            <Plus className="h-4 w-4 mr-1" /> Agregar Fila
          </Button>
        </div>
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar Sectores del Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {clients.filter(c => c.sectors && (c.sectors as string[]).length > 0).length === 0 ? (
              <div className="p-4 text-center text-muted-foreground border rounded-md bg-muted/50">
                <p className="font-medium">No hay clientes con sectores definidos</p>
                <p className="text-sm mt-1">Primero agregue sectores a un cliente desde la página de Clientes</p>
              </div>
            ) : (
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger data-testid="select-client-import">
                  <SelectValue placeholder="Seleccione un cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.filter(c => c.sectors && (c.sectors as string[]).length > 0).map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} ({(client.sectors as string[]).length} sectores)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {selectedClientId && (
              <div className="p-3 bg-muted rounded text-sm">
                <p className="font-medium mb-2">Sectores a importar:</p>
                <div className="flex flex-wrap gap-1">
                  {(clients.find(c => c.id === selectedClientId)?.sectors as string[] || []).map((s, i) => (
                    <span key={i} className="px-2 py-0.5 bg-white border rounded text-xs">{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportSectors} disabled={!selectedClientId} data-testid="btn-confirm-import">
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spreadsheet Table */}
      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth: '1800px' }}>
          <thead>
            <tr>
              <th rowSpan={2} className={headerClass} style={{ width: '30px' }}>#</th>
              <th rowSpan={2} className={headerClass} style={{ width: '120px' }}>Sector</th>
              <th rowSpan={2} className={headerClass} style={{ width: '150px' }}>Subsector</th>
              <th colSpan={3} className={headerClass}>Dimensiones</th>
              <th rowSpan={2} className={headerClass} style={{ width: '40px' }}>K</th>
              <th rowSpan={2} className={headerClass} style={{ width: '40px' }}>Min</th>
              <th rowSpan={2} className={headerClass} style={{ width: '40px' }}>Ptos</th>
              <th colSpan={visiblePoints} className={headerClass}>Iluminancia por Punto Monitoreado (LUX)</th>
              <th rowSpan={2} className={headerClass} style={{ width: '50px' }}>E mínima</th>
              <th rowSpan={2} className={headerClass} style={{ width: '50px' }}>E media</th>
              <th rowSpan={2} className={headerClass} style={{ width: '60px' }}>Límite Legal</th>
              <th rowSpan={2} className={headerClass} style={{ width: '60px' }}>Cumple E mínima</th>
              <th rowSpan={2} className={headerClass} style={{ width: '60px' }}>Cumple Límite</th>
              <th rowSpan={2} className={headerClass} style={{ width: '30px' }}></th>
            </tr>
            <tr>
              <th className={headerClass} style={{ width: '50px' }}>Ancho</th>
              <th className={headerClass} style={{ width: '50px' }}>Largo</th>
              <th className={headerClass} style={{ width: '50px' }}>Alto</th>
              {Array.from({ length: visiblePoints }).map((_, i) => (
                <th key={i} className={headerClass} style={{ width: '45px' }}>{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activeSectors.map((sector, rowIndex) => {
              const measurement = sector.measurements.find(m => m.type === type);
              if (!measurement) return null;

              const width = measurement.config?.width || 0;
              const length = measurement.config?.length || 0;
              const height = measurement.config?.height || 0;
              const roomIndex = calculateRoomIndex(length, width, height);
              const minPoints = getMinPoints(roomIndex);
              const points = measurement.points;
              const values = points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
              const eAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
              const eMin = values.length > 0 ? Math.min(...values) : 0;
              const limit = measurement.config?.limit || 0;
              const uniformityCheck = eMin >= (eAvg / 2);
              const limitCheck = limit > 0 ? eAvg >= limit : true;

              return (
                <tr key={sector.id} className="hover:bg-gray-50" data-testid={`row-sector-${rowIndex}`}>
                  <td className={cn(cellClass, "bg-gray-50 font-bold")}>{rowIndex + 1}</td>
                  <td className={cellClass}>
                    <input
                      className={inputClass}
                      value={sector.name}
                      onChange={(e) => updateSector(sector.id, { name: e.target.value })}
                      data-testid={`input-name-${rowIndex}`}
                    />
                  </td>
                  <td className={cellClass}>
                    <input
                      className={inputClass}
                      value={sector.description || ''}
                      onChange={(e) => updateSector(sector.id, { description: e.target.value })}
                      placeholder="Subsector..."
                      data-testid={`input-subsector-${rowIndex}`}
                    />
                  </td>
                  <td className={cn(cellClass)}>
                    <input
                      type="number"
                      className={inputClass}
                      value={width || ''}
                      onChange={(e) => handleCellChange(sector.id, measurement.id, 'width', e.target.value)}
                      placeholder="-"
                      data-testid={`input-width-${rowIndex}`}
                    />
                  </td>
                  <td className={cn(cellClass)}>
                    <input
                      type="number"
                      className={inputClass}
                      value={length || ''}
                      onChange={(e) => handleCellChange(sector.id, measurement.id, 'length', e.target.value)}
                      placeholder="-"
                      data-testid={`input-length-${rowIndex}`}
                    />
                  </td>
                  <td className={cn(cellClass)}>
                    <input
                      type="number"
                      className={inputClass}
                      value={height || ''}
                      onChange={(e) => handleCellChange(sector.id, measurement.id, 'height', e.target.value)}
                      placeholder="-"
                      data-testid={`input-height-${rowIndex}`}
                    />
                  </td>
                  <td className={cn(cellClass, "bg-gray-50")}>{roomIndex || '-'}</td>
                  <td className={cn(cellClass, "bg-gray-50")}>{minPoints}</td>
                  <td className={cn(cellClass, "bg-gray-50 font-bold")}>{points.length}</td>
                  {Array.from({ length: visiblePoints }).map((_, colIndex) => {
                    const point = points[colIndex];
                    const isEditable = point !== undefined;
                    const isNext = colIndex === points.length;
                    return (
                      <td key={colIndex} className={cn(cellClass)}>
                        {isEditable ? (
                          <input
                            type="number"
                            className={cn(inputClass, "font-mono")}
                            value={point.values.lux || ''}
                            onChange={(e) => handlePointChange(sector.id, measurement.id, point.id, e.target.value)}
                            data-testid={`input-point-${rowIndex}-${colIndex}`}
                          />
                        ) : isNext ? (
                          <input
                            className={cn(inputClass, "text-gray-400 cursor-pointer")}
                            placeholder="+"
                            onFocus={() => addPoint(sector.id, measurement.id, { values: { lux: '' } })}
                            data-testid={`input-add-point-${rowIndex}-${colIndex}`}
                          />
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                    );
                  })}
                  <td className={cn(cellClass, "font-bold")}>{eMin || '-'}</td>
                  <td className={cn(cellClass, "font-bold")}>{eAvg || '-'}</td>
                  <td className={cn(cellClass)}>
                    <input
                      type="number"
                      className={cn(inputClass, "font-bold")}
                      value={limit || ''}
                      onChange={(e) => handleCellChange(sector.id, measurement.id, 'limit', e.target.value)}
                      placeholder="-"
                      data-testid={`input-limit-${rowIndex}`}
                    />
                  </td>
                  <td className={cn(cellClass, "font-bold", values.length > 0 ? (uniformityCheck ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700") : "")}>
                    {values.length > 0 ? (uniformityCheck ? "SI" : "NO") : "-"}
                  </td>
                  <td className={cn(cellClass, "font-bold", limit > 0 ? (limitCheck ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700") : "")}>
                    {limit > 0 ? (limitCheck ? "SI" : "NO") : "-"}
                  </td>
                  <td className={cellClass}>
                    <button
                      className="text-gray-400 hover:text-red-600 p-1"
                      onClick={() => { if (confirm(`¿Eliminar "${sector.name}"?`)) deleteMeasurement(sector.id, measurement.id); }}
                      data-testid={`btn-delete-${rowIndex}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
            {activeSectors.length === 0 && (
              <tr>
                <td colSpan={20 + visiblePoints} className="text-center py-8 text-gray-500">
                  No hay sectores. Haz clic en "Agregar Fila" para comenzar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
          </div>
        </div>
      </div>
    </div>
  );
}
