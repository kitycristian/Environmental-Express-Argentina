import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

interface ElectricalRow {
  id: string;
  sector: string;
  tcEnsayados: string;
  tcConContinuidad: string;
  tcSinContinuidad: string;
  tcInvertidos: string;
  observaciones: string;
}

const initialRow = (): ElectricalRow => ({
  id: uuidv4(),
  sector: '',
  tcEnsayados: '',
  tcConContinuidad: '',
  tcSinContinuidad: '0',
  tcInvertidos: '0',
  observaciones: ''
});

export default function GroundingElectrical() {
  const [rows, setRows] = useState<ElectricalRow[]>([
    { ...initialRow(), sector: 'Oficina Propietario', tcEnsayados: '14', tcConContinuidad: '14', tcSinContinuidad: '0', tcInvertidos: '0', observaciones: '-' },
    { ...initialRow(), sector: 'Oficina de Administración', tcEnsayados: '12', tcConContinuidad: '12', tcSinContinuidad: '0', tcInvertidos: '0', observaciones: '-' },
    { ...initialRow(), sector: 'Cocina', tcEnsayados: '2', tcConContinuidad: '2', tcSinContinuidad: '0', tcInvertidos: '2', observaciones: 'Corregir F-N invertidos' },
    { ...initialRow(), sector: 'Baño', tcEnsayados: '1', tcConContinuidad: '1', tcSinContinuidad: '0', tcInvertidos: '1', observaciones: 'Corregir F-N invertidos' },
    { ...initialRow(), sector: 'Portería', tcEnsayados: '10', tcConContinuidad: '10', tcSinContinuidad: '0', tcInvertidos: '0', observaciones: '-' },
    { ...initialRow(), sector: 'Oficina Jefe de Planta', tcEnsayados: '6', tcConContinuidad: '6', tcSinContinuidad: '0', tcInvertidos: '2', observaciones: 'Corregir F-N invertidos' },
    { ...initialRow(), sector: 'Comedor', tcEnsayados: '8', tcConContinuidad: '8', tcSinContinuidad: '0', tcInvertidos: '0', observaciones: '-' },
    { ...initialRow(), sector: 'Preparación de Salmuera', tcEnsayados: '1', tcConContinuidad: '1', tcSinContinuidad: '0', tcInvertidos: '0', observaciones: 'Corregir F-N invertidos' },
    { ...initialRow(), sector: 'Taller-Depósito', tcEnsayados: '4', tcConContinuidad: '4', tcSinContinuidad: '0', tcInvertidos: '0', observaciones: '-' },
    { ...initialRow(), sector: 'Secado y Evaporador', tcEnsayados: '10', tcConContinuidad: '10', tcSinContinuidad: '0', tcInvertidos: '0', observaciones: '-' },
    { ...initialRow(), sector: 'Galpón de Envasado', tcEnsayados: '6', tcConContinuidad: '6', tcSinContinuidad: '0', tcInvertidos: '0', observaciones: '-' },
    { ...initialRow(), sector: 'Tanque de Melaza', tcEnsayados: '2', tcConContinuidad: '2', tcSinContinuidad: '0', tcInvertidos: '0', observaciones: '-' },
    { ...initialRow(), sector: 'Taller de Automotor', tcEnsayados: '10', tcConContinuidad: '10', tcSinContinuidad: '0', tcInvertidos: '0', observaciones: '-' },
    { ...initialRow(), sector: 'Tablero lavadero', tcEnsayados: '3', tcConContinuidad: '3', tcSinContinuidad: '0', tcInvertidos: '0', observaciones: '-' },
    { ...initialRow(), sector: 'Planta de Bloques', tcEnsayados: '6', tcConContinuidad: '6', tcSinContinuidad: '0', tcInvertidos: '0', observaciones: 'Falta contratapa tablero' },
  ]);

  const addRow = () => setRows([...rows, initialRow()]);
  
  const updateRow = (id: string, field: keyof ElectricalRow, value: string) => {
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
          <h1 className="text-sm font-bold text-gray-800" data-testid="heading-electrical">DETALLE DE RESULTADOS - Ensayos de Continuidad Eléctrica del Conductor de PAT</h1>
        </div>
        <Button onClick={addRow} size="sm" data-testid="btn-add-row">
          <Plus className="h-4 w-4 mr-1" /> Agregar Fila
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs" style={{ minWidth: '1000px' }}>
          <thead>
            <tr>
              <th className={headerClass} style={{ width: '200px' }}>Sector</th>
              <th className={headerClass} style={{ width: '120px' }}>Tomacorrientes Ensayados (TC)</th>
              <th className={headerClass} style={{ width: '100px' }}>TC Con Continuidad</th>
              <th className={headerClass} style={{ width: '100px' }}>TC Sin Continuidad</th>
              <th className={headerClass} style={{ width: '80px' }}>TC Invertidos</th>
              <th className={headerClass} style={{ width: '250px' }}>Observaciones</th>
              <th className={headerClass} style={{ width: '30px' }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const tcSinCont = parseInt(row.tcSinContinuidad) || 0;
              const tcInv = parseInt(row.tcInvertidos) || 0;
              const hasIssues = tcSinCont > 0 || tcInv > 0;
              
              return (
                <tr key={row.id} className={cn("hover:bg-gray-50", hasIssues && "bg-red-50/30")} data-testid={`row-${idx}`}>
                  <td className={cellClass}>
                    <input className={cn(inputClass, "text-left px-2")} value={row.sector} onChange={(e) => updateRow(row.id, 'sector', e.target.value)} data-testid={`input-sector-${idx}`} />
                  </td>
                  <td className={cellClass}>
                    <input type="text" className={cn(inputClass, "font-mono font-bold")} value={row.tcEnsayados} onChange={(e) => updateRow(row.id, 'tcEnsayados', e.target.value)} placeholder="-" data-testid={`input-ensayados-${idx}`} />
                  </td>
                  <td className={cellClass}>
                    <input type="text" className={cn(inputClass, "font-mono")} value={row.tcConContinuidad} onChange={(e) => updateRow(row.id, 'tcConContinuidad', e.target.value)} placeholder="-" data-testid={`input-con-${idx}`} />
                  </td>
                  <td className={cn(cellClass, tcSinCont > 0 ? "bg-red-100 text-red-700 font-bold" : "bg-green-100 text-green-700")}>
                    <input type="text" className={cn(inputClass, "font-mono")} value={row.tcSinContinuidad} onChange={(e) => updateRow(row.id, 'tcSinContinuidad', e.target.value)} placeholder="0" data-testid={`input-sin-${idx}`} />
                  </td>
                  <td className={cn(cellClass, tcInv > 0 ? "bg-orange-100 text-orange-700 font-bold" : "bg-green-100 text-green-700")}>
                    <input type="text" className={cn(inputClass, "font-mono")} value={row.tcInvertidos} onChange={(e) => updateRow(row.id, 'tcInvertidos', e.target.value)} placeholder="0" data-testid={`input-invertidos-${idx}`} />
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
