import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

interface ContinuityRow {
  id: string;
  sector: string;
  referenciaTablero: string;
  tcEnsayados: string;
  tcConContinuidad: string;
  tcSinContinuidad: string;
  tcInvertidos: string;
  observaciones: string;
}

const initialRow = (): ContinuityRow => ({
  id: uuidv4(),
  sector: "",
  referenciaTablero: "",
  tcEnsayados: "",
  tcConContinuidad: "",
  tcSinContinuidad: "0",
  tcInvertidos: "0",
  observaciones: "",
});

const QUICK_OBS = [
  "Revisar Continuidad del conductor de PAT en TC",
  "Rectificar F-N invertidos",
  "Cumple Resol. SRT N° 900/2015",
];

export default function GroundingContinuity() {
  const [rows, setRows] = useState<ContinuityRow[]>([
    { ...initialRow(), sector: "Oficina Propietario", referenciaTablero: "T1", tcEnsayados: "14", tcConContinuidad: "14", tcSinContinuidad: "0", tcInvertidos: "0", observaciones: "Cumple Resol. SRT N° 900/2015" },
    { ...initialRow(), sector: "Oficina de Administración", referenciaTablero: "T1", tcEnsayados: "12", tcConContinuidad: "12", tcSinContinuidad: "0", tcInvertidos: "0", observaciones: "Cumple Resol. SRT N° 900/2015" },
    { ...initialRow(), sector: "Cocina", referenciaTablero: "T2", tcEnsayados: "2", tcConContinuidad: "2", tcSinContinuidad: "0", tcInvertidos: "2", observaciones: "Rectificar F-N invertidos" },
    { ...initialRow(), sector: "Baño", referenciaTablero: "T2", tcEnsayados: "1", tcConContinuidad: "1", tcSinContinuidad: "0", tcInvertidos: "1", observaciones: "Rectificar F-N invertidos" },
    { ...initialRow(), sector: "Portería", referenciaTablero: "T2", tcEnsayados: "10", tcConContinuidad: "10", tcSinContinuidad: "0", tcInvertidos: "0", observaciones: "Cumple Resol. SRT N° 900/2015" },
    { ...initialRow(), sector: "Taller-Depósito", referenciaTablero: "T3", tcEnsayados: "4", tcConContinuidad: "3", tcSinContinuidad: "1", tcInvertidos: "0", observaciones: "Revisar Continuidad del conductor de PAT en TC" },
  ]);

  const addRow = () => setRows([...rows, initialRow()]);
  const updateRow = (id: string, field: keyof ContinuityRow, value: string) =>
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  const deleteRow = (id: string) => {
    if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
  };
  const appendObs = (id: string, text: string) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    const current = row.observaciones.trim();
    updateRow(id, "observaciones", current ? current + ". " + text : text);
  };

  const cellClass = "border px-1 py-0.5 text-xs text-center";
  const inputClass = "w-full h-6 text-xs text-center border-0 bg-transparent focus:bg-yellow-50 focus:outline-none";
  const headerClass = "border border-blue-800 px-1 py-1 text-xs font-bold text-center whitespace-nowrap bg-blue-900 text-white";

  const totals = rows.reduce((acc, r) => ({
    ensayados: acc.ensayados + (parseInt(r.tcEnsayados) || 0),
    con: acc.con + (parseInt(r.tcConContinuidad) || 0),
    sin: acc.sin + (parseInt(r.tcSinContinuidad) || 0),
    inv: acc.inv + (parseInt(r.tcInvertidos) || 0),
  }), { ensayados: 0, con: 0, sin: 0, inv: 0 });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-xs">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/grounding">
            <Button variant="ghost" size="sm" data-testid="btn-back">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          </Link>
          <h1 className="text-sm font-bold text-[#003366]" data-testid="heading-continuity">
            ENSAYOS DE CONTINUIDAD ELÉCTRICA DEL CONDUCTOR DE PAT — Res. SRT 900/2015
          </h1>
        </div>
        <Button onClick={addRow} size="sm" className="bg-[#003366] hover:bg-[#004080]" data-testid="btn-add-row">
          <Plus className="h-4 w-4 mr-1" /> Agregar Fila
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs" style={{ minWidth: "1000px" }}>
              <thead>
                <tr>
                  <th className={headerClass} style={{ width: "30px" }}>#</th>
                  <th className={headerClass} style={{ width: "180px" }}>Sector</th>
                  <th className={headerClass} style={{ width: "100px" }}>Ref. Tablero</th>
                  <th className={headerClass} style={{ width: "90px" }}>TC Ensayados</th>
                  <th className={cn(headerClass, "bg-green-800")} style={{ width: "90px" }}>TC Con Continuidad</th>
                  <th className={cn(headerClass, "bg-red-800")} style={{ width: "90px" }}>TC Sin Continuidad</th>
                  <th className={cn(headerClass, "bg-orange-800")} style={{ width: "90px" }}>TC Invertidos F-N</th>
                  <th className={headerClass} style={{ width: "280px" }}>Observaciones</th>
                  <th className={headerClass} style={{ width: "30px" }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const sin = parseInt(row.tcSinContinuidad) || 0;
                  const inv = parseInt(row.tcInvertidos) || 0;
                  const hasIssues = sin > 0 || inv > 0;
                  return (
                    <tr key={row.id} className={cn("hover:bg-gray-50", hasIssues && "bg-red-50/30")} data-testid={`row-${idx}`}>
                      <td className={cn(cellClass, "bg-gray-50 font-bold")}>{idx + 1}</td>
                      <td className={cellClass}>
                        <input className={cn(inputClass, "text-left px-2")} value={row.sector} onChange={e => updateRow(row.id, "sector", e.target.value)} data-testid={`input-sector-${idx}`} />
                      </td>
                      <td className={cellClass}>
                        <input className={cn(inputClass, "font-mono")} value={row.referenciaTablero} onChange={e => updateRow(row.id, "referenciaTablero", e.target.value)} data-testid={`input-ref-${idx}`} />
                      </td>
                      <td className={cn(cellClass, "bg-blue-50")}>
                        <input className={cn(inputClass, "font-mono font-bold")} value={row.tcEnsayados} onChange={e => updateRow(row.id, "tcEnsayados", e.target.value)} placeholder="0" data-testid={`input-ensayados-${idx}`} />
                      </td>
                      <td className={cn(cellClass, "bg-green-50 text-green-700")}>
                        <input className={cn(inputClass, "font-mono")} value={row.tcConContinuidad} onChange={e => updateRow(row.id, "tcConContinuidad", e.target.value)} placeholder="0" data-testid={`input-con-${idx}`} />
                      </td>
                      <td className={cn(cellClass, sin > 0 ? "bg-red-100 text-red-700 font-bold" : "bg-green-50 text-green-700")}>
                        <input className={cn(inputClass, "font-mono")} value={row.tcSinContinuidad} onChange={e => updateRow(row.id, "tcSinContinuidad", e.target.value)} placeholder="0" data-testid={`input-sin-${idx}`} />
                      </td>
                      <td className={cn(cellClass, inv > 0 ? "bg-orange-100 text-orange-700 font-bold" : "bg-green-50 text-green-700")}>
                        <input className={cn(inputClass, "font-mono")} value={row.tcInvertidos} onChange={e => updateRow(row.id, "tcInvertidos", e.target.value)} placeholder="0" data-testid={`input-inv-${idx}`} />
                      </td>
                      <td className={cellClass}>
                        <div className="space-y-0.5">
                          <input className={cn(inputClass, "text-left px-1")} value={row.observaciones} onChange={e => updateRow(row.id, "observaciones", e.target.value)} placeholder="Observaciones..." data-testid={`input-obs-${idx}`} />
                          <div className="flex gap-0.5 flex-wrap justify-start px-1">
                            {QUICK_OBS.map((q, qi) => (
                              <button key={qi} type="button" onClick={() => appendObs(row.id, q)} className="text-[9px] px-1 py-0.5 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 rounded border border-gray-200 truncate max-w-[90px]" title={q} data-testid={`quick-obs-${idx}-${qi}`}>
                                {q.substring(0, 18)}…
                              </button>
                            ))}
                          </div>
                        </div>
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
              <tfoot>
                <tr className="bg-gray-100 font-bold border-t-2">
                  <td colSpan={3} className={cn(cellClass, "text-right font-bold")}>TOTALES</td>
                  <td className={cn(cellClass, "bg-blue-100 font-bold")}>{totals.ensayados}</td>
                  <td className={cn(cellClass, "bg-green-100 text-green-700 font-bold")}>{totals.con}</td>
                  <td className={cn(cellClass, totals.sin > 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700", "font-bold")}>{totals.sin}</td>
                  <td className={cn(cellClass, totals.inv > 0 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700", "font-bold")}>{totals.inv}</td>
                  <td colSpan={2} className={cellClass}></td>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
            <strong>Ref.:</strong> Resolución SRT N° 900/2015 — Protocolo para la Medición del Valor de Puesta a Tierra y Verificación de la Continuidad de las Masas en el Ambiente Laboral.
          </div>
        </div>
      </div>
    </div>
  );
}
