import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

interface ProtocolRow {
  id: string;
  sector: string;
  condicionTerreno: string;
  usoPAT: string;
  esquemaConexion: string;
  valorOhm: string;
  cumple: string;
  circuitoContinuo: string;
  capacidadCarga: string;
  proteccion: string;
  dispositivoProteccion: string;
}

const condicionesTerreno = ['Lecho Húmedo', 'Lecho Seco', 'Arcilloso', 'Pantanoso', 'Arenoso Seco', 'Húmedo/Otros'];
const usosPAT = ['Toma de Tierra de Seguridad de las Masas', 'Toma de Tierra del Neutro de Transformador', 'De protección de equipos electrónicos', 'De informática', 'De iluminación', 'De pararrayos', 'Otros'];
const esquemas = ['TT', 'TN-S', 'TN-C', 'TN-C-S', 'IT'];
const protecciones = ['DD', 'IA', 'Fusible'];

const initialRow = (): ProtocolRow => ({
  id: uuidv4(),
  sector: '',
  condicionTerreno: 'Lecho Húmedo',
  usoPAT: 'Toma de Tierra de Seguridad de las Masas',
  esquemaConexion: 'TT',
  valorOhm: '',
  cumple: 'SI',
  circuitoContinuo: 'SI',
  capacidadCarga: 'SI',
  proteccion: 'DD',
  dispositivoProteccion: 'SI'
});

export default function GroundingProtocol() {
  const [rows, setRows] = useState<ProtocolRow[]>([
    { ...initialRow(), sector: 'Oficinas Administración' },
    { ...initialRow(), sector: 'Oficina Propietario' },
    { ...initialRow(), sector: 'Portería' },
    { ...initialRow(), sector: 'Comedor' },
  ]);

  const addRow = () => setRows([...rows, initialRow()]);
  
  const updateRow = (id: string, field: keyof ProtocolRow, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const deleteRow = (id: string) => {
    if (confirm('¿Eliminar esta fila?')) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const cellClass = "border px-1 py-0.5 text-xs text-center";
  const inputClass = "w-full h-6 text-xs text-center border-0 bg-transparent focus:bg-yellow-50 focus:outline-none";
  const selectClass = "w-full h-6 text-xs text-center border-0 bg-transparent focus:bg-yellow-50 focus:outline-none cursor-pointer";
  const headerClass = "border border-blue-800 px-1 py-1 text-xs font-bold text-center whitespace-nowrap bg-blue-900 text-white";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-xs">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/grounding">
            <Button variant="ghost" size="sm" data-testid="btn-back">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          </Link>
          <h1 className="text-sm font-bold text-gray-800" data-testid="heading-protocol">PROTOCOLO DE MEDICIÓN DE PUESTA A TIERRA Y CONDUCTIVIDAD DE LAS MASAS</h1>
        </div>
        <Button onClick={addRow} size="sm" data-testid="btn-add-row">
          <Plus className="h-4 w-4 mr-1" /> Agregar Fila
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth: '1600px' }}>
          <thead>
            <tr>
              <th className={headerClass} style={{ width: '30px' }}>N°</th>
              <th className={headerClass} style={{ width: '150px' }}>Sector</th>
              <th className={headerClass} style={{ width: '100px' }}>Condición del Terreno</th>
              <th className={headerClass} style={{ width: '180px' }}>Uso de la PAT</th>
              <th className={headerClass} style={{ width: '80px' }}>Esquema Conexión</th>
              <th className={cn(headerClass, "bg-blue-100")} style={{ width: '80px' }}>Valor (Ω)</th>
              <th className={cn(headerClass, "bg-green-100")} style={{ width: '60px' }}>Cumple</th>
              <th className={cn(headerClass, "bg-green-100")} style={{ width: '70px' }}>Circuito PAT Continuo</th>
              <th className={cn(headerClass, "bg-green-100")} style={{ width: '70px' }}>Capacidad de Carga</th>
              <th className={cn(headerClass, "bg-purple-100")} style={{ width: '70px' }}>Protección</th>
              <th className={cn(headerClass, "bg-orange-100")} style={{ width: '80px' }}>Dispositivo Protección</th>
              <th className={headerClass} style={{ width: '30px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const valorNum = parseFloat(row.valorOhm);
              const cumpleAuto = !isNaN(valorNum) && valorNum <= 40 ? 'SI' : (isNaN(valorNum) ? row.cumple : 'NO');
              
              return (
                <tr key={row.id} className="hover:bg-gray-50" data-testid={`row-${idx}`}>
                  <td className={cn(cellClass, "bg-gray-50 font-bold")}>{idx + 1}</td>
                  <td className={cellClass}>
                    <input className={inputClass} value={row.sector} onChange={(e) => updateRow(row.id, 'sector', e.target.value)} data-testid={`input-sector-${idx}`} />
                  </td>
                  <td className={cellClass}>
                    <select className={selectClass} value={row.condicionTerreno} onChange={(e) => updateRow(row.id, 'condicionTerreno', e.target.value)} data-testid={`select-terreno-${idx}`}>
                      {condicionesTerreno.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className={cellClass}>
                    <select className={selectClass} value={row.usoPAT} onChange={(e) => updateRow(row.id, 'usoPAT', e.target.value)} data-testid={`select-uso-${idx}`}>
                      {usosPAT.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td className={cellClass}>
                    <select className={selectClass} value={row.esquemaConexion} onChange={(e) => updateRow(row.id, 'esquemaConexion', e.target.value)} data-testid={`select-esquema-${idx}`}>
                      {esquemas.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </td>
                  <td className={cn(cellClass, "bg-blue-50")}>
                    <input type="text" className={cn(inputClass, "font-mono font-bold")} value={row.valorOhm} onChange={(e) => updateRow(row.id, 'valorOhm', e.target.value)} placeholder="-" data-testid={`input-valor-${idx}`} />
                  </td>
                  <td className={cn(cellClass, cumpleAuto === 'SI' ? "bg-green-200" : "bg-red-200", "font-bold")}>
                    <select className={selectClass} value={cumpleAuto} onChange={(e) => updateRow(row.id, 'cumple', e.target.value)} data-testid={`select-cumple-${idx}`}>
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td className={cn(cellClass, row.circuitoContinuo === 'SI' ? "bg-green-100" : "bg-red-100")}>
                    <select className={selectClass} value={row.circuitoContinuo} onChange={(e) => updateRow(row.id, 'circuitoContinuo', e.target.value)} data-testid={`select-continuo-${idx}`}>
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td className={cn(cellClass, row.capacidadCarga === 'SI' ? "bg-green-100" : "bg-red-100")}>
                    <select className={selectClass} value={row.capacidadCarga} onChange={(e) => updateRow(row.id, 'capacidadCarga', e.target.value)} data-testid={`select-capacidad-${idx}`}>
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td className={cn(cellClass, "bg-purple-50")}>
                    <select className={selectClass} value={row.proteccion} onChange={(e) => updateRow(row.id, 'proteccion', e.target.value)} data-testid={`select-proteccion-${idx}`}>
                      {protecciones.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className={cn(cellClass, row.dispositivoProteccion === 'SI' ? "bg-green-200" : "bg-red-200", "font-bold")}>
                    <select className={selectClass} value={row.dispositivoProteccion} onChange={(e) => updateRow(row.id, 'dispositivoProteccion', e.target.value)} data-testid={`select-dispositivo-${idx}`}>
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </td>
                  <td className={cellClass}>
                    <button className="text-gray-400 hover:text-red-600 p-1" onClick={() => deleteRow(row.id)} data-testid={`btn-delete-${idx}`}>
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
          </div>
        </div>
      </div>
    </div>
  );
}
