import { useState, useEffect } from "react";
import { useStore } from "@/lib/store";
import { Link } from "wouter";
import { MeasurementType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2, FileUp, Sheet, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClients } from "@/lib/hooks";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

const type: MeasurementType = 'lighting';

export default function LightingSheet() {
  const sectors = useStore((state) => state.sectors);
  const updateSector = useStore((state) => state.updateSector);
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const addPoint = useStore((state) => state.addPoint);
  const updatePoint = useStore((state) => state.updatePoint);
  const deleteMeasurement = useStore((state) => state.deleteMeasurement);
  const addSectorWithMeasurement = useStore((state) => state.addSectorWithMeasurement);

  const { toast } = useToast();
  const [visiblePoints, setVisiblePoints] = useState(15);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const { data: clients = [] } = useClients();

  const [gsDialogOpen, setGsDialogOpen] = useState(false);
  const [gsStep, setGsStep] = useState<'spreadsheets' | 'sheets' | 'preview'>('spreadsheets');
  const [gsLoading, setGsLoading] = useState(false);
  const [spreadsheets, setSpreadsheets] = useState<any[]>([]);
  const [selectedSpreadsheet, setSelectedSpreadsheet] = useState<string>("");
  const [sheetsList, setSheetsList] = useState<any[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [gsPreviewData, setGsPreviewData] = useState<string[][]>([]);
  const [gsColumnMap, setGsColumnMap] = useState<Record<string, number>>({
    sector: 0, subsector: 1, ancho: 2, largo: 3, alto: 4, limite: 5
  });

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

  const handleOpenGoogleSheets = async () => {
    setGsDialogOpen(true);
    setGsStep('spreadsheets');
    setGsLoading(true);
    setSelectedSpreadsheet("");
    setSelectedSheet("");
    setGsPreviewData([]);
    try {
      const res = await fetch('/api/google-sheets/spreadsheets');
      if (!res.ok) throw new Error('Error al conectar con Google Sheets');
      const data = await res.json();
      setSpreadsheets(data);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGsLoading(false);
    }
  };

  const handleSelectSpreadsheet = async (id: string) => {
    setSelectedSpreadsheet(id);
    setGsLoading(true);
    try {
      const res = await fetch(`/api/google-sheets/${id}/sheets`);
      if (!res.ok) throw new Error('Error al obtener hojas');
      const data = await res.json();
      setSheetsList(data);
      setGsStep('sheets');
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGsLoading(false);
    }
  };

  const handleSelectSheet = async (sheetTitle: string) => {
    setSelectedSheet(sheetTitle);
    setGsLoading(true);
    try {
      const range = encodeURIComponent(`${sheetTitle}!A1:Z200`);
      const res = await fetch(`/api/google-sheets/${selectedSpreadsheet}/data?range=${range}`);
      if (!res.ok) throw new Error('Error al leer datos');
      const data = await res.json();
      setGsPreviewData(data);
      if (data.length > 0) {
        const headers = data[0].map((h: string) => h?.toLowerCase().trim() || '');
        const autoMap: Record<string, number> = { sector: -1, subsector: -1, ancho: -1, largo: -1, alto: -1, limite: -1 };
        headers.forEach((h: string, i: number) => {
          if (h.includes('sector') && !h.includes('sub')) autoMap.sector = i;
          if (h.includes('subsector') || h.includes('puesto') || h.includes('descripcion')) autoMap.subsector = i;
          if (h.includes('ancho') || h === 'w') autoMap.ancho = i;
          if (h.includes('largo') || h === 'l') autoMap.largo = i;
          if (h.includes('alto') || h === 'h' || h.includes('altura')) autoMap.alto = i;
          if (h.includes('limite') || h.includes('límite') || h.includes('legal') || h.includes('lux min')) autoMap.limite = i;
        });
        setGsColumnMap(autoMap);
      }
      setGsStep('preview');
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGsLoading(false);
    }
  };

  const handleImportFromGoogleSheets = () => {
    if (gsPreviewData.length < 2) {
      toast({ title: "Sin datos", description: "La hoja no tiene filas de datos para importar", variant: "destructive" });
      return;
    }
    const dataRows = gsPreviewData.slice(1);
    let imported = 0;
    dataRows.forEach((row) => {
      const sectorName = gsColumnMap.sector >= 0 ? row[gsColumnMap.sector] : '';
      if (!sectorName || !sectorName.trim()) return;

      addSectorWithMeasurement({
        name: sectorName.trim(),
        description: gsColumnMap.subsector >= 0 ? (row[gsColumnMap.subsector] || '').trim() : '',
        dimensions: '',
        activity: '',
        workersCount: 0
      }, type);

      const newSectors = useStore.getState().sectors;
      const lastSector = newSectors[newSectors.length - 1];
      const measurement = lastSector?.measurements.find(m => m.type === type);
      if (measurement) {
        const config: Record<string, any> = {};
        if (gsColumnMap.ancho >= 0 && row[gsColumnMap.ancho]) config.width = parseFloat(row[gsColumnMap.ancho]) || 0;
        if (gsColumnMap.largo >= 0 && row[gsColumnMap.largo]) config.length = parseFloat(row[gsColumnMap.largo]) || 0;
        if (gsColumnMap.alto >= 0 && row[gsColumnMap.alto]) config.height = parseFloat(row[gsColumnMap.alto]) || 0;
        if (gsColumnMap.limite >= 0 && row[gsColumnMap.limite]) config.limit = parseFloat(row[gsColumnMap.limite]) || 0;
        if (Object.keys(config).length > 0) {
          updateMeasurement(lastSector.id, measurement.id, { config: { ...measurement.config, ...config } });
        }

        const luxStartCol = Math.max(
          gsColumnMap.sector, gsColumnMap.subsector, gsColumnMap.ancho, 
          gsColumnMap.largo, gsColumnMap.alto, gsColumnMap.limite
        ) + 1;
        for (let c = luxStartCol; c < row.length; c++) {
          const val = row[c];
          if (val && !isNaN(parseFloat(val)) && parseFloat(val) > 0) {
            const existingPoints = useStore.getState().sectors.find(s => s.id === lastSector.id)?.measurements.find(m => m.id === measurement.id)?.points || [];
            const emptyPoint = existingPoints.find(p => !p.values.lux || p.values.lux === '');
            if (emptyPoint) {
              updatePoint(lastSector.id, measurement.id, emptyPoint.id, { values: { lux: val } });
            } else {
              addPoint(lastSector.id, measurement.id, { values: { lux: val } });
            }
          }
        }
      }
      imported++;
    });
    setGsDialogOpen(false);
    toast({ title: `${imported} sectores importados desde Google Sheets` });
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
          <Button size="sm" variant="outline" onClick={handleOpenGoogleSheets} data-testid="btn-google-sheets">
            <Sheet className="h-4 w-4 mr-1" /> Google Sheets
          </Button>
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

      <Dialog open={gsDialogOpen} onOpenChange={setGsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sheet className="h-5 w-5 text-green-600" />
              Importar desde Google Sheets
            </DialogTitle>
          </DialogHeader>

          {gsLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Cargando...</span>
            </div>
          )}

          {!gsLoading && gsStep === 'spreadsheets' && (
            <div className="space-y-2 py-2">
              <Label>Seleccioná una hoja de cálculo:</Label>
              {spreadsheets.length === 0 ? (
                <p className="text-sm text-muted-foreground p-4 text-center">No se encontraron hojas de cálculo en tu Google Drive</p>
              ) : (
                <div className="space-y-1 max-h-60 overflow-auto">
                  {spreadsheets.map((file: any) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-2 rounded border hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => handleSelectSpreadsheet(file.id)}
                      data-testid={`gs-file-${file.id}`}
                    >
                      <Sheet className="h-4 w-4 text-green-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        {file.modifiedTime && (
                          <p className="text-xs text-muted-foreground">
                            Modificado: {new Date(file.modifiedTime).toLocaleDateString('es-AR')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!gsLoading && gsStep === 'sheets' && (
            <div className="space-y-2 py-2">
              <Button variant="ghost" size="sm" onClick={() => setGsStep('spreadsheets')} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver a lista
              </Button>
              <Label>Seleccioná la hoja/pestaña:</Label>
              <div className="space-y-1">
                {sheetsList.map((sheet: any) => (
                  <div
                    key={sheet.sheetId}
                    className="flex items-center gap-3 p-2 rounded border hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleSelectSheet(sheet.title)}
                    data-testid={`gs-sheet-${sheet.sheetId}`}
                  >
                    <span className="text-sm">{sheet.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!gsLoading && gsStep === 'preview' && (
            <div className="space-y-4 py-2">
              <Button variant="ghost" size="sm" onClick={() => setGsStep('sheets')} className="mb-2">
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                {(['sector', 'subsector', 'ancho', 'largo', 'alto', 'limite'] as const).map(field => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs capitalize">{field === 'limite' ? 'Límite Legal' : field}</Label>
                    <Select
                      value={gsColumnMap[field] >= 0 ? String(gsColumnMap[field]) : "none"}
                      onValueChange={(v) => setGsColumnMap(prev => ({ ...prev, [field]: v === 'none' ? -1 : parseInt(v) }))}
                    >
                      <SelectTrigger className="h-8 text-xs" data-testid={`gs-map-${field}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- No mapear --</SelectItem>
                        {gsPreviewData[0]?.map((header, i) => (
                          <SelectItem key={i} value={String(i)}>{header || `Columna ${i + 1}`}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <div className="text-xs text-muted-foreground">
                Las columnas numéricas después de la última columna mapeada se importarán como puntos de medición LUX.
              </div>

              {gsPreviewData.length > 0 && (
                <div className="border rounded overflow-auto max-h-48">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-blue-900 text-white">
                        {gsPreviewData[0].map((h, i) => (
                          <th key={i} className="border border-blue-800 px-2 py-1 whitespace-nowrap">{h || `Col ${i + 1}`}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {gsPreviewData.slice(1, 6).map((row, ri) => (
                        <tr key={ri} className="hover:bg-gray-50">
                          {row.map((cell, ci) => (
                            <td key={ci} className="border px-2 py-0.5 whitespace-nowrap">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {gsPreviewData.length > 6 && (
                    <p className="text-xs text-center py-1 text-muted-foreground">
                      ... y {gsPreviewData.length - 6} filas más
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {!gsLoading && gsStep === 'preview' && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setGsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleImportFromGoogleSheets} disabled={gsColumnMap.sector < 0} data-testid="btn-gs-import">
                Importar {gsPreviewData.length > 1 ? `${gsPreviewData.length - 1} filas` : ''}
              </Button>
            </DialogFooter>
          )}
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
