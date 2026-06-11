import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";
import { useStore } from "@/lib/store";
import type { VentilationRow } from "@/lib/store";

// ─── Dec. 351/79 Art. 64 — Tabla valores mínimos ─────────────────────────────
const VENT_LIMITS: Record<string, { cubaje: number; caudal: number }> = {
  Ligero: { cubaje: 10, caudal: 12 },
  Moderado: { cubaje: 15, caudal: 18 },
  Pesado: { cubaje: 20, caudal: 24 },
};

const TABS = ["Datos Generales", "Tabla de Mediciones", "Conclusiones"];

// ─── Auto-calc helper ─────────────────────────────────────────────────────────
function calcRow(row: VentilationRow): VentilationRow {
  const tipo = row.tipoTrabajo || "Ligero";
  const limits = VENT_LIMITS[tipo] ?? VENT_LIMITS.Ligero;

  const ancho = parseFloat(row.ancho) || 0;
  const largo = parseFloat(row.largo) || 0;
  const alto = parseFloat(row.alto) || 0;
  const personas = parseFloat(row.cantidadPersonas) || 0;
  const supRejilla = parseFloat(row.superficieRejilla) || 0;
  const vel = parseFloat(row.velocidadMedida) || 0;

  // Cubaje total: si hay dimensiones, recalcular; sino, respetar input directo
  let cubajLocal = parseFloat(row.cubajLocal) || 0;
  if (ancho > 0 && largo > 0 && alto > 0) {
    cubajLocal = ancho * largo * alto;
  }

  const cubajePorPersona = personas > 0 && cubajLocal > 0 ? cubajLocal / personas : parseFloat(row.cubajePorPersona) || 0;
  const caudalExtraccion = supRejilla > 0 && vel > 0 ? supRejilla * vel * 3600 : parseFloat(row.caudalExtraccion) || 0;
  const caudalPorPersona = personas > 0 && caudalExtraccion > 0 ? caudalExtraccion / personas : 0;

  const cumpleCubaje = cubajePorPersona > 0 ? (cubajePorPersona >= limits.cubaje ? "SI" : "NO") : "";
  const cumpleCaudal = caudalPorPersona > 0 ? (caudalPorPersona >= limits.caudal ? "SI" : "NO") : "";
  const cumple = cumpleCubaje && cumpleCaudal
    ? (cumpleCubaje === "SI" && cumpleCaudal === "SI" ? "SI" : "NO")
    : (cumpleCubaje || cumpleCaudal || "");

  return {
    ...row,
    cubajLocal: cubajLocal > 0 ? String(cubajLocal.toFixed(2)) : row.cubajLocal,
    cubajePorPersona: cubajePorPersona > 0 ? String(cubajePorPersona.toFixed(2)) : "",
    caudalExtraccion: caudalExtraccion > 0 ? String(caudalExtraccion.toFixed(1)) : "",
    cubajeMinimoRequerido: String(limits.cubaje),
    caudalMinimoRequerido: String(limits.caudal),
    cumpleCubaje,
    cumpleCaudal,
    cumple,
  };
}

export default function VentilationSheet() {
  const ventProtocol = useStore(s => s.ventilationProtocol);
  const updateRow = useStore(s => s.updateVentilationRow);
  const addRow = useStore(s => s.addVentilationRow);
  const deleteRow = useStore(s => s.deleteVentilationRow);
  const updateCompany = useStore(s => s.updateVentilationCompany);
  const updateText = useStore(s => s.updateVentilationText);
  const setRows = useStore(s => s.setVentilationRows);

  const [activeTab, setActiveTab] = useState(0);
  const [loadingField, setLoadingField] = useState<string | null>(null);

  const rows = ventProtocol.rows;
  const company = ventProtocol.company;

  // ─── Update row with auto-calc ───────────────────────────────────────────────
  const handleUpdateRow = (id: string, field: keyof VentilationRow, value: string) => {
    const row = rows.find(r => r.id === id);
    if (!row) return;
    const updated = calcRow({ ...row, [field]: value });
    updateRow(id, updated);
  };

  // ─── AI text generation ──────────────────────────────────────────────────────
  const generateAI = async (field: "conclusiones" | "recomendaciones") => {
    setLoadingField(field);
    try {
      const summary = rows.map((r, i) => {
        const cumple = r.cumple || "S/D";
        return `${i + 1}. Sector: ${r.sector} | Puesto: ${r.puestoTrabajo} | Tipo: ${r.tipoTrabajo} | Cubaje/persona: ${r.cubajePorPersona || "S/D"} m³ (mín: ${r.cubajeMinimoRequerido}) | Caudal extracción: ${r.caudalExtraccion || "S/D"} m³/h | Cumple: ${cumple}`;
      }).join("\n");
      const res = await fetch("/api/ventilation/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, summary, empresa: company.razonSocial || "la empresa" }),
      });
      const data = await res.json();
      updateText(field, data.text ?? "");
    } catch {
      updateText(field, "Error al generar texto. Intente nuevamente.");
    } finally {
      setLoadingField(null);
    }
  };

  const headerClass = "border border-blue-800 px-1 py-1 text-xs font-bold text-center whitespace-nowrap bg-blue-900 text-white";
  const cellClass = "border px-1 py-0.5 text-xs text-center";
  const inputCell = "w-full h-6 text-xs text-center border-0 bg-transparent focus:bg-yellow-50 focus:outline-none";
  const labelCls = "text-xs font-medium text-gray-600";
  const inputField = "h-7 text-xs border rounded px-2 bg-white focus:border-blue-400 focus:outline-none w-full";

  const cumpleClass = (v: string) =>
    v === "SI" ? "bg-green-200 text-green-800 font-bold" :
    v === "NO" ? "bg-red-200 text-red-700 font-bold" :
    "bg-gray-50";

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
          <h1 className="text-sm font-bold text-[#003366]" data-testid="heading-ventilation">
            PROTOCOLO DE EVALUACIÓN DE VENTILACIÓN — Ley 19.587/72 / Dec. 351/79 Cap. XI Art. 64
          </h1>
        </div>
        {activeTab === 1 && (
          <Button onClick={addRow} size="sm" className="bg-[#003366] hover:bg-[#004080]" data-testid="btn-add-row">
            <Plus className="h-4 w-4 mr-1" /> Agregar Fila
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b px-4 flex gap-0">
        {TABS.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            data-testid={`tab-${i}`}
            className={cn(
              "px-4 py-2 text-xs font-medium border-b-2 transition-colors",
              activeTab === i
                ? "border-[#003366] text-[#003366]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">

        {/* ── Tab 0: Datos Generales ── */}
        {activeTab === 0 && (
          <div className="space-y-4 max-w-4xl">
            {/* Datos del establecimiento */}
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-3 border-b pb-1">Datos del Establecimiento</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Razón Social", "razonSocial"], ["Dirección", "direccion"], ["Localidad", "localidad"],
                  ["Provincia", "provincia"], ["C.P.", "cp"], ["CUIT", "cuit"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputField} value={(company as any)[key]} onChange={e => updateCompany({ [key]: e.target.value } as any)} data-testid={`input-${key}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Datos de la medición */}
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-3 border-b pb-1">Datos de la Medición</h3>
              <div className="grid grid-cols-4 gap-3">
                {[
                  ["Fecha Medición", "fechaMedicion"], ["Hora Inicio", "horaInicio"], ["Hora Fin", "horaFin"], ["Turnos Habituales", "turnos"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputField} value={(company as any)[key]} onChange={e => updateCompany({ [key]: e.target.value } as any)} data-testid={`input-${key}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Instrumento 1 */}
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-3 border-b pb-1">Instrumento 1 — Termoanemómetro de Hilo Caliente</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Marca", "instrumento1Marca"], ["Modelo", "instrumento1Modelo"], ["N° Serie", "instrumento1Serie"],
                  ["N° Certificado", "instrumento1Cert"], ["Fecha Calibración", "instrumento1FechaCal"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputField} value={(company as any)[key]} onChange={e => updateCompany({ [key]: e.target.value } as any)} data-testid={`input-${key}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Instrumento 2 */}
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-3 border-b pb-1">Instrumento 2 — Termohigrobarómetro</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ["Marca", "instrumento2Marca"], ["Modelo", "instrumento2Modelo"], ["N° Serie", "instrumento2Serie"],
                  ["N° Certificado", "instrumento2Cert"], ["Fecha Calibración", "instrumento2FechaCal"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputField} value={(company as any)[key]} onChange={e => updateCompany({ [key]: e.target.value } as any)} data-testid={`input-${key}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Condiciones */}
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-3 border-b pb-1">Condiciones Atmosféricas</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  ["Temperatura Exterior (°C)", "tempExterior"], ["Humedad Relativa (%)", "humedad"], ["Presión Atmosférica (hPa)", "presionAtm"],
                ].map(([label, key]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputField} value={(company as any)[key]} onChange={e => updateCompany({ [key]: e.target.value } as any)} data-testid={`input-${key}`} />
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Condiciones Normales de Trabajo</label>
                  <textarea className="mt-1 w-full text-xs border rounded px-2 py-1 bg-white focus:border-blue-400 focus:outline-none resize-none" rows={2} value={company.condicionesNormales} onChange={e => updateCompany({ condicionesNormales: e.target.value })} data-testid="textarea-cond-normales" />
                </div>
                <div>
                  <label className={labelCls}>Condiciones al Momento de la Medición</label>
                  <textarea className="mt-1 w-full text-xs border rounded px-2 py-1 bg-white focus:border-blue-400 focus:outline-none resize-none" rows={2} value={company.condicionesMedicion} onChange={e => updateCompany({ condicionesMedicion: e.target.value })} data-testid="textarea-cond-medicion" />
                </div>
              </div>
            </div>

            {/* Tabla de referencia */}
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-2 border-b pb-1">Valores Mínimos Requeridos — Dec. 351/79 Art. 64</h3>
              <table className="text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="border border-blue-800 px-3 py-1">Tipo de Trabajo</th>
                    <th className="border border-blue-800 px-3 py-1">Cubaje Mínimo por Persona (m³)</th>
                    <th className="border border-blue-800 px-3 py-1">Caudal Mínimo por Persona (m³/h)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(VENT_LIMITS).map(([tipo, lim]) => (
                    <tr key={tipo} className="hover:bg-gray-50">
                      <td className="border px-3 py-1 font-medium">{tipo}</td>
                      <td className="border px-3 py-1 text-center font-mono">{lim.cubaje}</td>
                      <td className="border px-3 py-1 text-center font-mono">{lim.caudal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab 1: Tabla de Mediciones ── */}
        {activeTab === 1 && (
          <div className="bg-white rounded border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs" style={{ minWidth: "2200px" }}>
                <thead>
                  <tr>
                    <th className={headerClass} style={{ width: "30px" }}>#</th>
                    <th className={headerClass} style={{ width: "130px" }}>Sector</th>
                    <th className={headerClass} style={{ width: "130px" }}>Puesto de Trabajo</th>
                    <th className={headerClass} style={{ width: "75px" }}>T. Exposición (hs)</th>
                    <th className={headerClass} style={{ width: "75px" }}>T. Medición (min)</th>
                    <th className={headerClass} style={{ width: "85px" }}>Características</th>
                    <th className={headerClass} style={{ width: "85px" }}>Tipo Trabajo</th>
                    <th className={headerClass} style={{ width: "70px" }}>Cant. Personas</th>
                    <th className={cn(headerClass, "bg-blue-800")} style={{ width: "70px" }}>Ancho (m)</th>
                    <th className={cn(headerClass, "bg-blue-800")} style={{ width: "70px" }}>Largo (m)</th>
                    <th className={cn(headerClass, "bg-blue-800")} style={{ width: "70px" }}>Alto (m)</th>
                    <th className={cn(headerClass, "bg-blue-800")} style={{ width: "80px" }}>Cubaje Local (m³)</th>
                    <th className={cn(headerClass, "bg-indigo-800")} style={{ width: "80px" }}>Cubaje/Persona (m³) ↗</th>
                    <th className={cn(headerClass, "bg-teal-800")} style={{ width: "80px" }}>Sup. Rejilla (m²)</th>
                    <th className={cn(headerClass, "bg-teal-800")} style={{ width: "80px" }}>Vel. Medida (m/s)</th>
                    <th className={cn(headerClass, "bg-teal-800")} style={{ width: "90px" }}>Caudal Extracción (m³/h) ↗</th>
                    <th className={cn(headerClass, "bg-amber-800")} style={{ width: "70px" }}>Cubaje Mín. (m³/pers)</th>
                    <th className={cn(headerClass, "bg-amber-800")} style={{ width: "70px" }}>Caudal Mín. (m³/h·p)</th>
                    <th className={cn(headerClass, "bg-green-800")} style={{ width: "65px" }}>¿Cumple?</th>
                    <th className={headerClass} style={{ width: "150px" }}>Observaciones</th>
                    <th className={headerClass} style={{ width: "30px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "hover:bg-gray-50/60",
                        row.cumple === "SI" ? "bg-green-50/30" :
                        row.cumple === "NO" ? "bg-red-50/30" : ""
                      )}
                      data-testid={`row-${idx}`}
                    >
                      <td className={cn(cellClass, "bg-gray-50 font-bold")}>{idx + 1}</td>
                      <td className={cellClass}><input className={cn(inputCell, "text-left px-1")} value={row.sector} onChange={e => handleUpdateRow(row.id, "sector", e.target.value)} data-testid={`input-sector-${idx}`} /></td>
                      <td className={cellClass}><input className={cn(inputCell, "text-left px-1")} value={row.puestoTrabajo} onChange={e => handleUpdateRow(row.id, "puestoTrabajo", e.target.value)} data-testid={`input-puesto-${idx}`} /></td>
                      <td className={cellClass}><input className={cn(inputCell, "font-mono")} value={row.tiempoExposicion} onChange={e => handleUpdateRow(row.id, "tiempoExposicion", e.target.value)} placeholder="-" data-testid={`input-texp-${idx}`} /></td>
                      <td className={cellClass}><input className={cn(inputCell, "font-mono")} value={row.tiempoMedicion} onChange={e => handleUpdateRow(row.id, "tiempoMedicion", e.target.value)} placeholder="-" data-testid={`input-tmed-${idx}`} /></td>
                      <td className={cellClass}>
                        <select className={cn(inputCell, "cursor-pointer")} value={row.caracteristicasExposicion} onChange={e => handleUpdateRow(row.id, "caracteristicasExposicion", e.target.value)} data-testid={`sel-caract-${idx}`}>
                          <option>Continua</option><option>Intermitente</option>
                        </select>
                      </td>
                      <td className={cellClass}>
                        <select className={cn(inputCell, "cursor-pointer")} value={row.tipoTrabajo} onChange={e => handleUpdateRow(row.id, "tipoTrabajo", e.target.value)} data-testid={`sel-tipo-${idx}`}>
                          <option>Ligero</option><option>Moderado</option><option>Pesado</option>
                        </select>
                      </td>
                      <td className={cellClass}><input className={cn(inputCell, "font-mono")} value={row.cantidadPersonas} onChange={e => handleUpdateRow(row.id, "cantidadPersonas", e.target.value)} placeholder="0" data-testid={`input-personas-${idx}`} /></td>
                      <td className={cn(cellClass, "bg-blue-50")}><input className={cn(inputCell, "font-mono")} value={row.ancho} onChange={e => handleUpdateRow(row.id, "ancho", e.target.value)} placeholder="-" data-testid={`input-ancho-${idx}`} /></td>
                      <td className={cn(cellClass, "bg-blue-50")}><input className={cn(inputCell, "font-mono")} value={row.largo} onChange={e => handleUpdateRow(row.id, "largo", e.target.value)} placeholder="-" data-testid={`input-largo-${idx}`} /></td>
                      <td className={cn(cellClass, "bg-blue-50")}><input className={cn(inputCell, "font-mono")} value={row.alto} onChange={e => handleUpdateRow(row.id, "alto", e.target.value)} placeholder="-" data-testid={`input-alto-${idx}`} /></td>
                      <td className={cn(cellClass, "bg-blue-50")}><input className={cn(inputCell, "font-mono")} value={row.cubajLocal} onChange={e => handleUpdateRow(row.id, "cubajLocal", e.target.value)} placeholder="-" data-testid={`input-cubaj-${idx}`} /></td>
                      <td className={cn(cellClass, "bg-indigo-50 font-mono font-bold text-indigo-800")}>{row.cubajePorPersona || "-"}</td>
                      <td className={cn(cellClass, "bg-teal-50")}><input className={cn(inputCell, "font-mono")} value={row.superficieRejilla} onChange={e => handleUpdateRow(row.id, "superficieRejilla", e.target.value)} placeholder="-" data-testid={`input-sup-${idx}`} /></td>
                      <td className={cn(cellClass, "bg-teal-50")}><input className={cn(inputCell, "font-mono")} value={row.velocidadMedida} onChange={e => handleUpdateRow(row.id, "velocidadMedida", e.target.value)} placeholder="-" data-testid={`input-vel-${idx}`} /></td>
                      <td className={cn(cellClass, "bg-teal-50 font-mono font-bold text-teal-800")}>{row.caudalExtraccion || "-"}</td>
                      <td className={cn(cellClass, "bg-amber-50 font-mono text-amber-800")}>{row.cubajeMinimoRequerido}</td>
                      <td className={cn(cellClass, "bg-amber-50 font-mono text-amber-800")}>{row.caudalMinimoRequerido}</td>
                      <td className={cn(cellClass, cumpleClass(row.cumple))}>{row.cumple || "-"}</td>
                      <td className={cellClass}><input className={cn(inputCell, "text-left px-1")} value={row.observaciones} onChange={e => handleUpdateRow(row.id, "observaciones", e.target.value)} placeholder="-" data-testid={`input-obs-${idx}`} /></td>
                      <td className={cellClass}><button className="text-gray-400 hover:text-red-600 p-1" onClick={() => deleteRow(row.id)} data-testid={`btn-delete-${idx}`}><Trash2 className="h-3 w-3" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-2 border-t bg-gray-50 text-[10px] text-gray-500 flex gap-4 flex-wrap">
              <span>↗ = calculado automáticamente</span>
              <span><strong>Cubaje/persona</strong> = (Ancho × Largo × Alto) ÷ Cant. Personas</span>
              <span><strong>Caudal extracción</strong> = Sup. Rejilla × Vel. Medida × 3600</span>
            </div>
          </div>
        )}

        {/* ── Tab 2: Conclusiones ── */}
        {activeTab === 2 && (
          <div className="space-y-4 max-w-3xl">
            {/* Tabla resumen */}
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-3 border-b pb-1">Resumen de Cumplimiento por Sector</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="border border-blue-800 px-2 py-1">Sector</th>
                    <th className="border border-blue-800 px-2 py-1">Puesto</th>
                    <th className="border border-blue-800 px-2 py-1">Tipo Trabajo</th>
                    <th className="border border-blue-800 px-2 py-1">Cubaje/Persona (m³)</th>
                    <th className="border border-blue-800 px-2 py-1">Mín. Cubaje</th>
                    <th className="border border-blue-800 px-2 py-1">¿Cumple Cubaje?</th>
                    <th className="border border-blue-800 px-2 py-1">Caudal/Persona (m³/h)</th>
                    <th className="border border-blue-800 px-2 py-1">Mín. Caudal</th>
                    <th className="border border-blue-800 px-2 py-1">¿Cumple Caudal?</th>
                    <th className="border border-blue-800 px-2 py-1">RESULTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const caudalPP = r.caudalExtraccion && r.cantidadPersonas
                      ? (parseFloat(r.caudalExtraccion) / (parseFloat(r.cantidadPersonas) || 1)).toFixed(1)
                      : "-";
                    return (
                      <tr key={r.id} className={cn("hover:bg-gray-50", r.cumple === "SI" ? "bg-green-50/40" : r.cumple === "NO" ? "bg-red-50/40" : "")}>
                        <td className="border px-2 py-0.5 font-medium">{r.sector || `Fila ${i + 1}`}</td>
                        <td className="border px-2 py-0.5">{r.puestoTrabajo || "-"}</td>
                        <td className="border px-2 py-0.5 text-center">{r.tipoTrabajo}</td>
                        <td className="border px-2 py-0.5 text-center font-mono">{r.cubajePorPersona || "-"}</td>
                        <td className="border px-2 py-0.5 text-center font-mono text-amber-700">{r.cubajeMinimoRequerido}</td>
                        <td className={cn("border px-2 py-0.5 text-center font-bold", r.cumpleCubaje === "SI" ? "bg-green-100 text-green-700" : r.cumpleCubaje === "NO" ? "bg-red-100 text-red-700" : "")}>{r.cumpleCubaje || "-"}</td>
                        <td className="border px-2 py-0.5 text-center font-mono">{caudalPP}</td>
                        <td className="border px-2 py-0.5 text-center font-mono text-amber-700">{r.caudalMinimoRequerido}</td>
                        <td className={cn("border px-2 py-0.5 text-center font-bold", r.cumpleCaudal === "SI" ? "bg-green-100 text-green-700" : r.cumpleCaudal === "NO" ? "bg-red-100 text-red-700" : "")}>{r.cumpleCaudal || "-"}</td>
                        <td className={cn("border px-2 py-0.5 text-center font-bold", r.cumple === "SI" ? "bg-green-200 text-green-800" : r.cumple === "NO" ? "bg-red-200 text-red-700" : "")}>{r.cumple || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Conclusiones */}
            <div className="bg-white rounded border shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-[#003366]">Conclusiones</label>
                <Button size="sm" variant="outline" onClick={() => generateAI("conclusiones")} disabled={loadingField === "conclusiones"} className="text-xs" data-testid="btn-ai-conclusiones">
                  {loadingField === "conclusiones" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Generar con IA
                </Button>
              </div>
              <Textarea
                className="text-xs min-h-[130px] resize-y"
                placeholder="Las condiciones de ventilación relevadas indican que..."
                value={ventProtocol.conclusiones}
                onChange={e => updateText("conclusiones", e.target.value)}
                data-testid="textarea-conclusiones"
              />
            </div>

            {/* Recomendaciones */}
            <div className="bg-white rounded border shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-[#003366]">Recomendaciones</label>
                <Button size="sm" variant="outline" onClick={() => generateAI("recomendaciones")} disabled={loadingField === "recomendaciones"} className="text-xs" data-testid="btn-ai-recomendaciones">
                  {loadingField === "recomendaciones" ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                  Generar con IA
                </Button>
              </div>
              <Textarea
                className="text-xs min-h-[130px] resize-y"
                placeholder="Se recomienda..."
                value={ventProtocol.recomendaciones}
                onChange={e => updateText("recomendaciones", e.target.value)}
                data-testid="textarea-recomendaciones"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
