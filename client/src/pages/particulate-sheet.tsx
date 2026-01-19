import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Save, FileDown, FileUp } from "lucide-react";
import { useClients } from "@/lib/hooks";

interface ParticulateRow {
  id: string;
  sector: string;
  puestoTrabajo: string;
  tipoMaterial: string;
  fraccion: string;
  tiempoMuestreo: string;
  caudal: string;
  valorMedido: string;
  limitePermisible: string;
  cumple: string;
  observaciones: string;
}

export default function ParticulateSheet() {
  const [, setLocation] = useLocation();
  const [rows, setRows] = useState<ParticulateRow[]>([
    { id: "1", sector: "", puestoTrabajo: "", tipoMaterial: "", fraccion: "", tiempoMuestreo: "", caudal: "", valorMedido: "", limitePermisible: "", cumple: "", observaciones: "" }
  ]);
  const [observacionesGenerales, setObservacionesGenerales] = useState("");
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const { data: clients = [] } = useClients();

  const handleImportSectors = () => {
    const client = clients.find(c => c.id === selectedClientId);
    if (client && Array.isArray(client.sectors)) {
      const newRows = (client.sectors as string[]).map((sectorName, index) => ({
        id: String(rows.length + index + 1),
        sector: sectorName,
        puestoTrabajo: "", tipoMaterial: "", fraccion: "", tiempoMuestreo: "", caudal: "", valorMedido: "", limitePermisible: "", cumple: "", observaciones: ""
      }));
      setRows([...rows, ...newRows]);
      setImportDialogOpen(false);
      setSelectedClientId("");
    }
  };

  const addRow = () => {
    setRows([...rows, {
      id: String(rows.length + 1),
      sector: "",
      puestoTrabajo: "",
      tipoMaterial: "",
      fraccion: "",
      tiempoMuestreo: "",
      caudal: "",
      valorMedido: "",
      limitePermisible: "",
      cumple: "",
      observaciones: ""
    }]);
  };

  const updateRow = (id: string, field: keyof ParticulateRow, value: string) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        if (field === 'valorMedido' || field === 'limitePermisible') {
          const medido = parseFloat(updated.valorMedido);
          const limite = parseFloat(updated.limitePermisible);
          if (!isNaN(medido) && !isNaN(limite)) {
            updated.cumple = medido <= limite ? "SI" : "NO";
          }
        }
        return updated;
      }
      return row;
    }));
  };

  const deleteRow = (id: string) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <h1 className="text-sm font-bold text-gray-800" data-testid="heading-particulate">PROTOCOLO DE MEDICIÓN DE MATERIAL PARTICULADO</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="pendiente">
            <SelectTrigger className="w-32 h-8 text-xs" data-testid="select-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="completo">Completo</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={() => setImportDialogOpen(true)} data-testid="button-import">
            <FileUp className="h-4 w-4 mr-1" /> Importar
          </Button>
          <Button size="sm" variant="outline" data-testid="button-export">
            <FileDown className="h-4 w-4 mr-1" /> Exportar
          </Button>
          <Button size="sm" data-testid="button-save">
            <Save className="h-4 w-4 mr-1" /> Guardar
          </Button>
        </div>
      </div>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Importar Sectores del Cliente</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger><SelectValue placeholder="Seleccione un cliente..." /></SelectTrigger>
              <SelectContent>
                {clients.filter(c => c.sectors && (c.sectors as string[]).length > 0).map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name} ({(client.sectors as string[]).length} sectores)</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedClientId && (
              <div className="p-3 bg-muted rounded text-sm">
                <p className="font-medium mb-2">Sectores:</p>
                <div className="flex flex-wrap gap-1">{(clients.find(c => c.id === selectedClientId)?.sectors as string[] || []).map((s, i) => (<span key={i} className="px-2 py-0.5 bg-white border rounded text-xs">{s}</span>))}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleImportSectors} disabled={!selectedClientId}>Importar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-blue-800 px-2 py-1 w-8">#</th>
                  <th className="border border-blue-800 px-2 py-1 min-w-[120px]">Sector/Área</th>
                  <th className="border border-blue-800 px-2 py-1 min-w-[120px]">Puesto de Trabajo</th>
                  <th className="border border-blue-800 px-2 py-1 min-w-[120px]">Tipo Material</th>
                  <th className="border border-blue-800 px-2 py-1 w-28">Fracción</th>
                  <th className="border border-blue-800 px-2 py-1 w-24">T. Muestreo (min)</th>
                  <th className="border border-blue-800 px-2 py-1 w-24">Caudal (L/min)</th>
                  <th className="border border-blue-800 px-2 py-1 w-24">Valor (mg/m³)</th>
                  <th className="border border-blue-800 px-2 py-1 w-24">Límite (mg/m³)</th>
                  <th className="border border-blue-800 px-2 py-1 w-16">Cumple</th>
                  <th className="border border-blue-800 px-2 py-1 min-w-[100px]">Observaciones</th>
                  <th className="border border-blue-800 px-2 py-1 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="border px-2 py-0.5 text-center bg-gray-50 font-medium" data-testid={`cell-row-${index}`}>{index + 1}</td>
                    <td className="border p-0">
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50" value={row.sector} onChange={(e) => updateRow(row.id, 'sector', e.target.value)} data-testid={`input-sector-${index}`} />
                    </td>
                    <td className="border p-0">
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50" value={row.puestoTrabajo} onChange={(e) => updateRow(row.id, 'puestoTrabajo', e.target.value)} data-testid={`input-puesto-${index}`} />
                    </td>
                    <td className="border p-0">
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50" value={row.tipoMaterial} onChange={(e) => updateRow(row.id, 'tipoMaterial', e.target.value)} data-testid={`input-material-${index}`} />
                    </td>
                    <td className="border p-0">
                      <Select value={row.fraccion} onValueChange={(v) => updateRow(row.id, 'fraccion', v)}>
                        <SelectTrigger className="h-6 text-xs border-0 rounded-none" data-testid={`select-fraccion-${index}`}>
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="inhalable">Inhalable</SelectItem>
                          <SelectItem value="toracica">Torácica</SelectItem>
                          <SelectItem value="respirable">Respirable</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border p-0">
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50 text-center" value={row.tiempoMuestreo} onChange={(e) => updateRow(row.id, 'tiempoMuestreo', e.target.value)} data-testid={`input-tiempo-${index}`} />
                    </td>
                    <td className="border p-0">
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50 text-center" value={row.caudal} onChange={(e) => updateRow(row.id, 'caudal', e.target.value)} data-testid={`input-caudal-${index}`} />
                    </td>
                    <td className="border p-0">
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50 text-center" type="number" value={row.valorMedido} onChange={(e) => updateRow(row.id, 'valorMedido', e.target.value)} data-testid={`input-valor-${index}`} />
                    </td>
                    <td className="border p-0">
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50 text-center" type="number" value={row.limitePermisible} onChange={(e) => updateRow(row.id, 'limitePermisible', e.target.value)} data-testid={`input-limite-${index}`} />
                    </td>
                    <td className={`border px-2 py-0.5 text-center font-bold ${row.cumple === 'SI' ? 'bg-green-100 text-green-700' : row.cumple === 'NO' ? 'bg-red-100 text-red-700' : ''}`} data-testid={`cell-cumple-${index}`}>
                      {row.cumple}
                    </td>
                    <td className="border p-0">
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50" value={row.observaciones} onChange={(e) => updateRow(row.id, 'observaciones', e.target.value)} data-testid={`input-obs-${index}`} />
                    </td>
                    <td className="border px-1 py-0.5">
                      <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-500 hover:text-red-700" onClick={() => deleteRow(row.id)} data-testid={`button-delete-${index}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-2 border-t flex justify-between items-start">
            <Button variant="outline" size="sm" onClick={addRow} data-testid="button-add-row">
              <Plus className="h-4 w-4 mr-1" /> Agregar Fila
            </Button>
            
            <div className="w-96">
              <label className="text-xs font-medium text-gray-600">Observaciones Generales</label>
              <Textarea className="mt-1 text-xs h-16" placeholder="Comentarios generales..." value={observacionesGenerales} onChange={(e) => setObservacionesGenerales(e.target.value)} data-testid="textarea-obs-generales" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
