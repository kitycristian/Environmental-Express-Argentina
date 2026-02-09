import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

interface ContinuityRow {
  id: string;
  descripcionTablero: string;
  disyuntorNum: string;
  rpat: string;
  corrienteCorte: string;
  corrienteCC: string;
  tiempoRespuesta: string;
  observaciones: string;
}

const initialRow = (): ContinuityRow => ({
  id: uuidv4(),
  descripcionTablero: '',
  disyuntorNum: '',
  rpat: '',
  corrienteCorte: '',
  corrienteCC: '',
  tiempoRespuesta: '',
  observaciones: ''
});

export default function GroundingContinuity() {
  const [rows, setRows] = useState<ContinuityRow[]>([
    { ...initialRow(), descripcionTablero: 'Oficinas administración T1', disyuntorNum: '01', rpat: '1.43', corrienteCorte: '20.2', corrienteCC: '160', tiempoRespuesta: '19' },
    { ...initialRow(), descripcionTablero: 'Portería T2', disyuntorNum: '02', rpat: '144', corrienteCorte: '30', corrienteCC: '1.58', tiempoRespuesta: '13' },
    { ...initialRow(), descripcionTablero: 'Laboratorio T2', rpat: '143', corrienteCorte: '30', corrienteCC: '1.60', tiempoRespuesta: '12' },
    { ...initialRow(), descripcionTablero: 'Sala de Reuniones T2', rpat: '143', corrienteCorte: '30', corrienteCC: '1.60', tiempoRespuesta: '12' },
    { ...initialRow(), descripcionTablero: 'Preparación de salmuera T2', rpat: '14.75', corrienteCorte: '25.8', corrienteCC: '15.5', tiempoRespuesta: '7' },
    { ...initialRow(), descripcionTablero: 'Iluminación Caldera N° 1 T3', disyuntorNum: '03', rpat: '1.58', corrienteCorte: '25.8', corrienteCC: '145', tiempoRespuesta: '7' },
    { ...initialRow(), descripcionTablero: 'Secado y Evaporador T4-2QD', disyuntorNum: '05', rpat: '1.06', corrienteCorte: '25.8', corrienteCC: '217', tiempoRespuesta: '18' },
  ]);

  const addRow = () => setRows([...rows, initialRow()]);
  
  const updateRow = (id: string, field: keyof ContinuityRow, value: string) => {
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const deleteRow = (id: string) => {
    if (confirm('¿Eliminar esta fila?')) {
      setRows(rows.filter(r => r.id !== id));
    }
  };

  const cellClass = "border px-1 py-0.5 text-xs text-center";
  const inputClass = "w-full h-6 text-xs text-center border-0 bg-transparent focus:bg-yellow-50 focus:outline-none";
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
          <h1 className="text-sm font-bold text-gray-800" data-testid="heading-continuity">DETALLE DE RESULTADOS - Ensayos de Continuidad y Corte Automático</h1>
        </div>
        <Button onClick={addRow} size="sm" data-testid="btn-add-row">
          <Plus className="h-4 w-4 mr-1" /> Agregar Fila
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth: '1200px' }}>
          <thead>
            <tr>
              <th className={headerClass} style={{ width: '40px' }}>Med. N°</th>
              <th className={headerClass} style={{ width: '250px' }}>Descripción Tablero</th>
              <th className={headerClass} style={{ width: '80px' }}>Disyuntor N°</th>
              <th className={headerClass} style={{ width: '80px' }}>RPAT [Ω]</th>
              <th className={headerClass} style={{ width: '100px' }}>Corriente de Corte (mA)</th>
              <th className={headerClass} style={{ width: '100px' }}>Corriente de CC (A)</th>
              <th className={headerClass} style={{ width: '100px' }}>Tiempo de Respuesta(ms)</th>
              <th className={headerClass} style={{ width: '200px' }}>Observaciones</th>
              <th className={headerClass} style={{ width: '30px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id} className="hover:bg-gray-50" data-testid={`row-${idx}`}>
                <td className={cn(cellClass, "bg-gray-50 font-bold")}>{idx + 1}</td>
                <td className={cellClass}>
                  <input className={cn(inputClass, "text-left px-2")} value={row.descripcionTablero} onChange={(e) => updateRow(row.id, 'descripcionTablero', e.target.value)} data-testid={`input-descripcion-${idx}`} />
                </td>
                <td className={cellClass}>
                  <input className={inputClass} value={row.disyuntorNum} onChange={(e) => updateRow(row.id, 'disyuntorNum', e.target.value)} placeholder="-" data-testid={`input-disyuntor-${idx}`} />
                </td>
                <td className={cn(cellClass, "bg-blue-50")}>
                  <input type="text" className={cn(inputClass, "font-mono font-bold")} value={row.rpat} onChange={(e) => updateRow(row.id, 'rpat', e.target.value)} placeholder="-" data-testid={`input-rpat-${idx}`} />
                </td>
                <td className={cn(cellClass, "bg-green-50")}>
                  <input type="text" className={cn(inputClass, "font-mono")} value={row.corrienteCorte} onChange={(e) => updateRow(row.id, 'corrienteCorte', e.target.value)} placeholder="-" data-testid={`input-corte-${idx}`} />
                </td>
                <td className={cn(cellClass, "bg-green-50")}>
                  <input type="text" className={cn(inputClass, "font-mono")} value={row.corrienteCC} onChange={(e) => updateRow(row.id, 'corrienteCC', e.target.value)} placeholder="-" data-testid={`input-cc-${idx}`} />
                </td>
                <td className={cn(cellClass, "bg-orange-50")}>
                  <input type="text" className={cn(inputClass, "font-mono")} value={row.tiempoRespuesta} onChange={(e) => updateRow(row.id, 'tiempoRespuesta', e.target.value)} placeholder="-" data-testid={`input-tiempo-${idx}`} />
                </td>
                <td className={cellClass}>
                  <input className={cn(inputClass, "text-left px-2")} value={row.observaciones} onChange={(e) => updateRow(row.id, 'observaciones', e.target.value)} placeholder="-" data-testid={`input-obs-${idx}`} />
                </td>
                <td className={cellClass}>
                  <button className="text-gray-400 hover:text-red-600 p-1" onClick={() => deleteRow(row.id)} data-testid={`btn-delete-${idx}`}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
          </div>
        </div>
      </div>
    </div>
  );
}
