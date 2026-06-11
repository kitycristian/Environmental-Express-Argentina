import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

interface ElectricalRow {
  id: string;
  descripcion: string;
  ubicacionTablero: string;
  disyuntorNum: string;
  corrienteCC: string;   // A
  corrienteCorte: string; // mA
  tiempoRespuesta: string; // ms
  observaciones: string;
}

const initialRow = (): ElectricalRow => ({
  id: uuidv4(),
  descripcion: "",
  ubicacionTablero: "",
  disyuntorNum: "",
  corrienteCC: "",
  corrienteCorte: "",
  tiempoRespuesta: "",
  observaciones: "",
});

const QUICK_OBS = [
  "Disyuntor Eficiente",
  "Disyuntor Deficiente - Botón de corte no funciona (Debe ser reemplazado)",
  "Sin disyuntor diferencial",
];

export default function GroundingElectrical() {
  const [rows, setRows] = useState<ElectricalRow[]>([
    { ...initialRow(), descripcion: "Oficinas Administración", ubicacionTablero: "T1", disyuntorNum: "01", corrienteCC: "160", corrienteCorte: "20.2", tiempoRespuesta: "19", observaciones: "Disyuntor Eficiente" },
    { ...initialRow(), descripcion: "Portería", ubicacionTablero: "T2", disyuntorNum: "02", corrienteCC: "1.58", corrienteCorte: "30", tiempoRespuesta: "13", observaciones: "Disyuntor Eficiente" },
    { ...initialRow(), descripcion: "Laboratorio", ubicacionTablero: "T2", disyuntorNum: "03", corrienteCC: "1.60", corrienteCorte: "30", tiempoRespuesta: "12", observaciones: "Disyuntor Eficiente" },
    { ...initialRow(), descripcion: "Sala de Reuniones", ubicacionTablero: "T2", disyuntorNum: "04", corrienteCC: "1.60", corrienteCorte: "30", tiempoRespuesta: "12", observaciones: "Disyuntor Eficiente" },
    { ...initialRow(), descripcion: "Preparación de salmuera", ubicacionTablero: "T2", disyuntorNum: "05", corrienteCC: "15.5", corrienteCorte: "25.8", tiempoRespuesta: "7", observaciones: "Disyuntor Eficiente" },
    { ...initialRow(), descripcion: "Iluminación Caldera N° 1", ubicacionTablero: "T3", disyuntorNum: "06", corrienteCC: "145", corrienteCorte: "25.8", tiempoRespuesta: "7", observaciones: "Disyuntor Eficiente" },
    { ...initialRow(), descripcion: "Secado y Evaporador", ubicacionTablero: "T4", disyuntorNum: "07", corrienteCC: "217", corrienteCorte: "25.8", tiempoRespuesta: "18", observaciones: "Disyuntor Deficiente - Botón de corte no funciona (Debe ser reemplazado)" },
  ]);

  const addRow = () => setRows([...rows, initialRow()]);
  const updateRow = (id: string, field: keyof ElectricalRow, value: string) =>
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  const deleteRow = (id: string) => {
    if (rows.length > 1) setRows(rows.filter(r => r.id !== id));
  };
  const appendObs = (id: string, text: string) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    updateRow(id, "observaciones", text);
  };

  const cellClass = "border px-1 py-0.5 text-xs text-center";
  const inputClass = "w-full h-6 text-xs text-center border-0 bg-transparent focus:bg-yellow-50 focus:outline-none";
  const headerClass = "border border-blue-800 px-1 py-1 text-xs font-bold text-center whitespace-nowrap bg-blue-900 text-white";

  const isDeficiente = (obs: string) => obs.toLowerCase().includes("deficiente") || obs.toLowerCase().includes("sin disyuntor");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-xs">
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/grounding">
            <Button variant="ghost" size="sm" data-testid="btn-back">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          </Link>
          <h1 className="text-sm font-bold text-[#003366]" data-testid="heading-electrical">
            TESTEO DE DISPOSITIVOS DE CORTE AUTOMÁTICO (DD) — Res. SRT 900/2015
          </h1>
        </div>
        <Button onClick={addRow} size="sm" className="bg-[#003366] hover:bg-[#004080]" data-testid="btn-add-row">
          <Plus className="h-4 w-4 mr-1" /> Agregar Fila
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs" style={{ minWidth: "1100px" }}>
              <thead>
                <tr>
                  <th className={headerClass} style={{ width: "35px" }}>Med. N°</th>
                  <th className={headerClass} style={{ width: "200px" }}>Descripción / Referencia</th>
                  <th className={headerClass} style={{ width: "100px" }}>Ubicación Tablero</th>
                  <th className={headerClass} style={{ width: "80px" }}>Disyuntor N°</th>
                  <th className={cn(headerClass, "bg-blue-800")} style={{ width: "100px" }}>Corriente de CC (A)</th>
                  <th className={cn(headerClass, "bg-green-800")} style={{ width: "110px" }}>Corriente de Corte (mA)</th>
                  <th className={cn(headerClass, "bg-orange-800")} style={{ width: "110px" }}>Tiempo de Respuesta (ms)</th>
                  <th className={headerClass} style={{ width: "300px" }}>Observaciones</th>
                  <th className={headerClass} style={{ width: "30px" }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const bad = isDeficiente(row.observaciones);
                  return (
                    <tr key={row.id} className={cn("hover:bg-gray-50", bad && "bg-red-50/30")} data-testid={`row-${idx}`}>
                      <td className={cn(cellClass, "bg-gray-50 font-bold")}>{idx + 1}</td>
                      <td className={cellClass}>
                        <input className={cn(inputClass, "text-left px-2")} value={row.descripcion} onChange={e => updateRow(row.id, "descripcion", e.target.value)} data-testid={`input-desc-${idx}`} />
                      </td>
                      <td className={cellClass}>
                        <input className={cn(inputClass, "font-mono")} value={row.ubicacionTablero} onChange={e => updateRow(row.id, "ubicacionTablero", e.target.value)} data-testid={`input-tablero-${idx}`} />
                      </td>
                      <td className={cellClass}>
                        <input className={cn(inputClass, "font-mono")} value={row.disyuntorNum} onChange={e => updateRow(row.id, "disyuntorNum", e.target.value)} placeholder="-" data-testid={`input-disy-${idx}`} />
                      </td>
                      <td className={cn(cellClass, "bg-blue-50")}>
                        <input className={cn(inputClass, "font-mono font-bold")} value={row.corrienteCC} onChange={e => updateRow(row.id, "corrienteCC", e.target.value)} placeholder="-" data-testid={`input-cc-${idx}`} />
                      </td>
                      <td className={cn(cellClass, "bg-green-50")}>
                        <input className={cn(inputClass, "font-mono")} value={row.corrienteCorte} onChange={e => updateRow(row.id, "corrienteCorte", e.target.value)} placeholder="-" data-testid={`input-corte-${idx}`} />
                      </td>
                      <td className={cn(cellClass, "bg-orange-50")}>
                        <input className={cn(inputClass, "font-mono")} value={row.tiempoRespuesta} onChange={e => updateRow(row.id, "tiempoRespuesta", e.target.value)} placeholder="-" data-testid={`input-tiempo-${idx}`} />
                      </td>
                      <td className={cellClass}>
                        <div className="space-y-0.5">
                          <input className={cn(inputClass, "text-left px-1", bad ? "text-red-700 font-medium" : "")} value={row.observaciones} onChange={e => updateRow(row.id, "observaciones", e.target.value)} placeholder="Observaciones..." data-testid={`input-obs-${idx}`} />
                          <div className="flex gap-0.5 flex-wrap px-1">
                            {QUICK_OBS.map((q, qi) => (
                              <button key={qi} type="button" onClick={() => appendObs(row.id, q)} className={cn("text-[9px] px-1 py-0.5 rounded border truncate max-w-[100px]", qi === 0 ? "bg-green-50 hover:bg-green-100 border-green-200 text-green-700" : qi === 1 ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-700" : "bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-600")} title={q} data-testid={`quick-obs-${idx}-${qi}`}>
                                {q.substring(0, qi === 0 ? 20 : 15)}…
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
            </table>
          </div>
          <div className="p-3 border-t bg-gray-50 text-xs text-gray-500">
            <strong>Ref.:</strong> Dispositivos de corriente diferencial residual (DD) — IEC 61008 / IEC 61009. Umbral máximo de disparo: 30 mA. Tiempo máximo de respuesta: 300 ms (para protecciones ≤30 mA).
          </div>
        </div>
      </div>
    </div>
  );
}
