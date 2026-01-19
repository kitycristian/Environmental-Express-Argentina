import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Save, FileDown } from "lucide-react";

interface VentilationRow {
  id: string;
  sector: string;
  puntoMedicion: string;
  tipoVentilacion: string;
  velocidadAire: string;
  caudal: string;
  renovacionesHora: string;
  renovacionesRequeridas: string;
  cumple: string;
  observaciones: string;
}

export default function VentilationSheet() {
  const [, setLocation] = useLocation();
  const [rows, setRows] = useState<VentilationRow[]>([
    { id: "1", sector: "", puntoMedicion: "", tipoVentilacion: "", velocidadAire: "", caudal: "", renovacionesHora: "", renovacionesRequeridas: "", cumple: "", observaciones: "" }
  ]);
  const [observacionesGenerales, setObservacionesGenerales] = useState("");

  const addRow = () => {
    setRows([...rows, {
      id: String(rows.length + 1),
      sector: "",
      puntoMedicion: "",
      tipoVentilacion: "",
      velocidadAire: "",
      caudal: "",
      renovacionesHora: "",
      renovacionesRequeridas: "",
      cumple: "",
      observaciones: ""
    }]);
  };

  const updateRow = (id: string, field: keyof VentilationRow, value: string) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updated = { ...row, [field]: value };
        if (field === 'renovacionesHora' || field === 'renovacionesRequeridas') {
          const actual = parseFloat(updated.renovacionesHora);
          const requeridas = parseFloat(updated.renovacionesRequeridas);
          if (!isNaN(actual) && !isNaN(requeridas)) {
            updated.cumple = actual >= requeridas ? "SI" : "NO";
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
          <h1 className="text-sm font-bold text-gray-800" data-testid="heading-ventilation">PROTOCOLO DE EVALUACIÓN DE VENTILACIÓN</h1>
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
          <Button size="sm" variant="outline" data-testid="button-export">
            <FileDown className="h-4 w-4 mr-1" /> Exportar
          </Button>
          <Button size="sm" data-testid="button-save">
            <Save className="h-4 w-4 mr-1" /> Guardar
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="border border-blue-800 px-2 py-1 w-8">#</th>
                  <th className="border border-blue-800 px-2 py-1 min-w-[140px]">Sector/Área</th>
                  <th className="border border-blue-800 px-2 py-1 min-w-[140px]">Punto de Medición</th>
                  <th className="border border-blue-800 px-2 py-1 w-28">Tipo Ventilación</th>
                  <th className="border border-blue-800 px-2 py-1 w-24">Vel. Aire (m/s)</th>
                  <th className="border border-blue-800 px-2 py-1 w-24">Caudal (m³/h)</th>
                  <th className="border border-blue-800 px-2 py-1 w-24">Renov./Hora</th>
                  <th className="border border-blue-800 px-2 py-1 w-24">Renov. Req.</th>
                  <th className="border border-blue-800 px-2 py-1 w-16">Cumple</th>
                  <th className="border border-blue-800 px-2 py-1 min-w-[120px]">Observaciones</th>
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
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50" value={row.puntoMedicion} onChange={(e) => updateRow(row.id, 'puntoMedicion', e.target.value)} data-testid={`input-punto-${index}`} />
                    </td>
                    <td className="border p-0">
                      <Select value={row.tipoVentilacion} onValueChange={(v) => updateRow(row.id, 'tipoVentilacion', v)}>
                        <SelectTrigger className="h-6 text-xs border-0 rounded-none" data-testid={`select-tipo-${index}`}>
                          <SelectValue placeholder="-" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="natural">Natural</SelectItem>
                          <SelectItem value="forzada">Forzada</SelectItem>
                          <SelectItem value="mixta">Mixta</SelectItem>
                          <SelectItem value="localizada">Localizada</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="border p-0">
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50 text-center" type="number" value={row.velocidadAire} onChange={(e) => updateRow(row.id, 'velocidadAire', e.target.value)} data-testid={`input-velocidad-${index}`} />
                    </td>
                    <td className="border p-0">
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50 text-center" type="number" value={row.caudal} onChange={(e) => updateRow(row.id, 'caudal', e.target.value)} data-testid={`input-caudal-${index}`} />
                    </td>
                    <td className="border p-0">
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50 text-center" type="number" value={row.renovacionesHora} onChange={(e) => updateRow(row.id, 'renovacionesHora', e.target.value)} data-testid={`input-renov-${index}`} />
                    </td>
                    <td className="border p-0">
                      <Input className="h-6 text-xs border-0 rounded-none focus:bg-yellow-50 text-center" type="number" value={row.renovacionesRequeridas} onChange={(e) => updateRow(row.id, 'renovacionesRequeridas', e.target.value)} data-testid={`input-renov-req-${index}`} />
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
