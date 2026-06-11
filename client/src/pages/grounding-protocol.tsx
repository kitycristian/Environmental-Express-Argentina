import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { v4 as uuidv4 } from "uuid";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ProtocolRow {
  id: string;
  sector: string;
  condicionTerreno: string;
  usoPAT: string;
  esquemaConexion: string;
  valorOhm: string;
  circuitoContinuo: string;
  capacidadCarga: string;
  proteccion: string;
  dispositivoProteccion: string;
  observaciones: string;
}

interface TableroRow {
  id: string;
  ubicacion: string;
  numTablero: string;
  ipApto: string;
  aptoBA1: string;
  simboloRiesgo: string;
  contratapaNC: string;
  diferencial30ma: string;
  conductorPEBicolor: string;
  masasConectadas: string;
  seccionMinimaPE: string;
  tomacorrientesIRAM: string;
  poseeElectrodo: string;
  patConectadaPE: string;
  rpatMenor40: string;
}

interface DatosGenerales {
  inst1Marca: string; inst1Modelo: string; inst1Serie: string;
  inst1FechaCal: string; inst1Cert: string; inst1Lab: string;
  inst2Marca: string; inst2Modelo: string; inst2Serie: string;
  inst2FechaCal: string; inst2Cert: string;
  fechaMedicion: string; horaInicio: string; horaFin: string;
  metodologia: string;
  potencia380: boolean; potencia220: boolean;
  temperatura: string; humedad: string; presion: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = ["Datos Generales", "Medición PAT", "Inspección Tableros", "Conclusiones"];
const condicionesTerreno = ["Lecho Húmedo", "Lecho Seco", "Arcilloso", "Pantanoso", "Arenoso Seco", "Húmedo/Otros"];
const usosPAT = ["Toma de Tierra de Seguridad de las Masas", "Toma de Tierra del Neutro de Transformador", "De protección de equipos electrónicos", "De informática", "De iluminación", "De pararrayos", "Otros"];
const esquemas = ["TT", "TN-S", "TN-C", "TN-C-S", "IT"];
const protecciones = ["DD", "IA", "Fusible"];
const TABLERO_COLS: [string, string, string][] = [
  ["ipApto", "1-Grado IP apto", ""],
  ["aptoBA1", "1-Apto personal BA1", ""],
  ["simboloRiesgo", "1-Símbolo Riesgo Eléctrico", ""],
  ["contratapaNC", "1-Contratapa no combustible", ""],
  ["diferencial30ma", "2-Diferencial ≤30mA IEC 61008", ""],
  ["conductorPEBicolor", "3-Conductor PE bicolor", ""],
  ["masasConectadas", "3-Masas conectadas PE", ""],
  ["seccionMinimaPE", "3-Sección mínima PE", ""],
  ["tomacorrientesIRAM", "4-Tomacorrientes IRAM 2071", ""],
  ["poseeElectrodo", "5-Posee electrodo+caja+conductor PAT", ""],
  ["patConectadaPE", "5-PAT conectada a PE", ""],
  ["rpatMenor40", "5-RPAT ≤ 40Ω", ""],
];
const RECOM_DEFAULT = `Se recomienda mantener la instalación de puesta a tierra en correcto estado, realizando un control periódico anual de todos sus componentes según lo establecido por el Reglamento AEA 90364.

Está prohibido intercalar en el conductor de protección PAT cualquier tipo de elemento de corte, seccionamiento o fusibles que puedan interrumpir la continuidad de la puesta a tierra.

Se recomienda efectuar comprobaciones periódicas de la continuidad del conductor de puesta a tierra y verificar el apriete de todas las conexiones y bornes.

Se recomienda mantener limpias todas las conexiones de la instalación de puesta a tierra, revisando la ausencia de corrosión o deterioro en electrodos, conductores y terminales.`;

// ─── Initializers ────────────────────────────────────────────────────────────
const initialPATRow = (): ProtocolRow => ({
  id: uuidv4(), sector: "", condicionTerreno: "Lecho Húmedo",
  usoPAT: "Toma de Tierra de Seguridad de las Masas", esquemaConexion: "TT",
  valorOhm: "", circuitoContinuo: "SI", capacidadCarga: "SI",
  proteccion: "DD", dispositivoProteccion: "SI", observaciones: "",
});
const initialTableroRow = (): TableroRow => ({
  id: uuidv4(), ubicacion: "", numTablero: "",
  ipApto: "SI", aptoBA1: "SI", simboloRiesgo: "SI", contratapaNC: "SI",
  diferencial30ma: "SI", conductorPEBicolor: "SI", masasConectadas: "SI",
  seccionMinimaPE: "SI", tomacorrientesIRAM: "SI", poseeElectrodo: "SI",
  patConectadaPE: "SI", rpatMenor40: "SI",
});
const initialDatos = (): DatosGenerales => ({
  inst1Marca: "SONEL", inst1Modelo: "", inst1Serie: "", inst1FechaCal: "", inst1Cert: "", inst1Lab: "",
  inst2Marca: "", inst2Modelo: "", inst2Serie: "", inst2FechaCal: "", inst2Cert: "",
  fechaMedicion: "", horaInicio: "", horaFin: "",
  metodologia: "1. IRAM 2281-2da edición 2002 (caída de tensión) / 2. Impedancia del Bucle con inyección de corriente para corte de DD",
  potencia380: false, potencia220: true,
  temperatura: "", humedad: "", presion: "",
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const siNoColor = (v: string) =>
  v === "SI" ? "bg-green-100 text-green-700" :
  v === "NO" ? "bg-red-100 text-red-700" :
  "bg-gray-100 text-gray-500";

export default function GroundingProtocol() {
  const [activeTab, setActiveTab] = useState(0);
  const [datos, setDatos] = useState<DatosGenerales>(initialDatos());
  const [rows, setRows] = useState<ProtocolRow[]>([
    { ...initialPATRow(), sector: "Oficinas Administración", valorOhm: "3.2" },
    { ...initialPATRow(), sector: "Oficina Propietario", valorOhm: "5.1" },
    { ...initialPATRow(), sector: "Portería", valorOhm: "12.4" },
    { ...initialPATRow(), sector: "Comedor", valorOhm: "8.7" },
  ]);
  const [tableros, setTableros] = useState<TableroRow[]>([
    { ...initialTableroRow(), ubicacion: "Tablero General", numTablero: "TG" },
    { ...initialTableroRow(), ubicacion: "Planta Baja", numTablero: "T1" },
    { ...initialTableroRow(), ubicacion: "Primer Piso", numTablero: "T2" },
  ]);
  const [conclusiones, setConclusiones] = useState("");
  const [recomendaciones, setRecomendaciones] = useState(RECOM_DEFAULT);
  const [loadingField, setLoadingField] = useState<string | null>(null);

  // ─── PAT Row actions ────────────────────────────────────────────────────────
  const addPATRow = () => setRows([...rows, initialPATRow()]);
  const updatePATRow = (id: string, field: keyof ProtocolRow, value: string) =>
    setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
  const deletePATRow = (id: string) => {
    if (confirm("¿Eliminar esta fila?")) setRows(rows.filter(r => r.id !== id));
  };

  // ─── Tablero Row actions ────────────────────────────────────────────────────
  const addTableroRow = () => setTableros([...tableros, initialTableroRow()]);
  const updateTableroRow = (id: string, field: keyof TableroRow, value: string) =>
    setTableros(tableros.map(r => r.id === id ? { ...r, [field]: value } : r));
  const deleteTableroRow = (id: string) => {
    if (confirm("¿Eliminar este tablero?")) setTableros(tableros.filter(r => r.id !== id));
  };

  // ─── AI generation ──────────────────────────────────────────────────────────
  const generateAI = async (field: "conclusiones" | "recomendaciones") => {
    setLoadingField(field);
    try {
      const summary = rows.map((r, i) => {
        const val = parseFloat(r.valorOhm);
        const cumple = !isNaN(val) ? (val <= 40 ? "CUMPLE" : "NO CUMPLE") : "S/D";
        return `${i + 1}. Sector: ${r.sector} | Valor: ${r.valorOhm || "S/D"} Ω | ${cumple} | Protección: ${r.proteccion} | Dispositivo: ${r.dispositivoProteccion}`;
      }).join("\n");
      const res = await fetch("/api/grounding/generate-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ field, summary, empresa: "la empresa" }),
      });
      const data = await res.json();
      if (field === "conclusiones") setConclusiones(data.text ?? "");
      else setRecomendaciones(data.text ?? "");
    } catch {
      if (field === "conclusiones") setConclusiones("Error al generar texto.");
      else setRecomendaciones("Error al generar texto.");
    } finally {
      setLoadingField(null);
    }
  };

  // ─── Styles ──────────────────────────────────────────────────────────────────
  const headerClass = "border border-blue-800 px-1 py-1 text-xs font-bold text-center whitespace-nowrap bg-blue-900 text-white";
  const cellClass = "border px-1 py-0.5 text-xs text-center";
  const inputCell = "w-full h-6 text-xs text-center border-0 bg-transparent focus:bg-yellow-50 focus:outline-none";
  const selectCell = "w-full h-6 text-xs text-center border-0 bg-transparent focus:bg-yellow-50 focus:outline-none cursor-pointer";
  const labelCls = "text-xs font-medium text-gray-600";
  const inputField = "h-7 text-xs border rounded px-2 bg-white focus:border-blue-400 focus:outline-none w-full";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col text-xs">
      {/* ── Header ── */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/grounding">
            <Button variant="ghost" size="sm" data-testid="btn-back">
              <ArrowLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
          </Link>
          <h1 className="text-sm font-bold text-[#003366]" data-testid="heading-protocol">
            PROTOCOLO DE MEDICIÓN DE PUESTA A TIERRA — Res. SRT 900/2015 / AEA 90364
          </h1>
        </div>
        {activeTab === 1 && (
          <Button onClick={addPATRow} size="sm" className="bg-[#003366] hover:bg-[#004080]" data-testid="btn-add-row">
            <Plus className="h-4 w-4 mr-1" /> Agregar Fila
          </Button>
        )}
        {activeTab === 2 && (
          <Button onClick={addTableroRow} size="sm" className="bg-[#003366] hover:bg-[#004080]" data-testid="btn-add-tablero">
            <Plus className="h-4 w-4 mr-1" /> Agregar Tablero
          </Button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="bg-white border-b px-4 flex">
        {TABS.map((tab, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            data-testid={`tab-${i}`}
            className={cn(
              "px-4 py-2 text-xs font-medium border-b-2 transition-colors",
              activeTab === i ? "border-[#003366] text-[#003366]" : "border-transparent text-gray-500 hover:text-gray-700"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4">

        {/* ══ Tab 0: Datos Generales ══ */}
        {activeTab === 0 && (
          <div className="space-y-4 max-w-4xl">
            {/* Instrumento 1 */}
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-3 border-b pb-1">
                Instrumento 1 — Telurómetro / Medidor PAT
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {([
                  ["Marca", "inst1Marca"], ["Modelo", "inst1Modelo"], ["N° Serie", "inst1Serie"],
                  ["Fecha Calibración", "inst1FechaCal"], ["N° Certificado", "inst1Cert"], ["Laboratorio de Calibración", "inst1Lab"],
                ] as [string, keyof DatosGenerales][]).map(([label, key]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputField} value={datos[key] as string} onChange={e => setDatos(d => ({ ...d, [key]: e.target.value }))} data-testid={`input-${key}`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Instrumento 2 */}
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-3 border-b pb-1">
                Instrumento 2 — Comprobador de Instalaciones
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-2">
                {([
                  ["Marca", "inst2Marca"], ["Modelo", "inst2Modelo"], ["N° Serie", "inst2Serie"],
                  ["Fecha Calibración", "inst2FechaCal"], ["N° Certificado", "inst2Cert"],
                ] as [string, keyof DatosGenerales][]).map(([label, key]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputField} value={datos[key] as string} onChange={e => setDatos(d => ({ ...d, [key]: e.target.value }))} data-testid={`input-${key}`} />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-blue-700 bg-blue-50 px-2 py-1 rounded border border-blue-100 mt-1">
                ✓ Cumple requerimientos IEC 61557, VDE 0100, BS7671
              </p>
            </div>

            {/* Datos medición */}
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-3 border-b pb-1">Datos de la Medición</h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                {([
                  ["Fecha de Medición", "fechaMedicion"], ["Hora Inicio", "horaInicio"], ["Hora Fin", "horaFin"],
                ] as [string, keyof DatosGenerales][]).map(([label, key]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputField} value={datos[key] as string} onChange={e => setDatos(d => ({ ...d, [key]: e.target.value }))} data-testid={`input-${key}`} />
                  </div>
                ))}
              </div>
              <div className="mb-3">
                <label className={labelCls}>Metodología</label>
                <textarea
                  className="mt-1 w-full text-xs border rounded px-2 py-1 bg-white focus:border-blue-400 focus:outline-none resize-none"
                  rows={2}
                  value={datos.metodologia}
                  onChange={e => setDatos(d => ({ ...d, metodologia: e.target.value }))}
                  data-testid="textarea-metodologia"
                />
              </div>
              <div className="flex items-center gap-6 mb-3">
                <span className={labelCls}>Potencia del Servicio Eléctrico:</span>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={datos.potencia380} onChange={e => setDatos(d => ({ ...d, potencia380: e.target.checked }))} className="accent-blue-700" data-testid="check-380" />
                  <span>380V</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={datos.potencia220} onChange={e => setDatos(d => ({ ...d, potencia220: e.target.checked }))} className="accent-blue-700" data-testid="check-220" />
                  <span>220V</span>
                </label>
              </div>
              <h4 className={cn(labelCls, "mb-2 font-semibold")}>Condiciones Atmosféricas</h4>
              <div className="grid grid-cols-3 gap-3">
                {([
                  ["Temperatura (°C)", "temperatura"], ["Humedad Relativa (%)", "humedad"], ["Presión Atm. (hPa)", "presion"],
                ] as [string, keyof DatosGenerales][]).map(([label, key]) => (
                  <div key={key}>
                    <label className={labelCls}>{label}</label>
                    <input className={inputField} value={datos[key] as string} onChange={e => setDatos(d => ({ ...d, [key]: e.target.value }))} data-testid={`input-${key}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ Tab 1: Medición PAT ══ */}
        {activeTab === 1 && (
          <div className="bg-white rounded border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs" style={{ minWidth: "1700px" }}>
                <thead>
                  <tr>
                    <th className={headerClass} style={{ width: "30px" }}>N°</th>
                    <th className={headerClass} style={{ width: "150px" }}>Sector / Toma</th>
                    <th className={headerClass} style={{ width: "105px" }}>Condición del Terreno</th>
                    <th className={headerClass} style={{ width: "180px" }}>Uso de la PAT</th>
                    <th className={headerClass} style={{ width: "80px" }}>Esquema Conexión</th>
                    <th className={cn(headerClass, "bg-blue-800")} style={{ width: "80px" }}>Valor (Ω)</th>
                    <th className={cn(headerClass, "bg-green-800")} style={{ width: "65px" }}>Cumple ≤40Ω</th>
                    <th className={cn(headerClass, "bg-green-800")} style={{ width: "70px" }}>Circuito PAT Continuo</th>
                    <th className={cn(headerClass, "bg-green-800")} style={{ width: "70px" }}>Capacidad de Carga</th>
                    <th className={cn(headerClass, "bg-purple-800")} style={{ width: "70px" }}>Protección</th>
                    <th className={cn(headerClass, "bg-orange-800")} style={{ width: "80px" }}>Dispositivo Desconecta</th>
                    <th className={headerClass} style={{ width: "180px" }}>Observaciones</th>
                    <th className={headerClass} style={{ width: "30px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => {
                    const valorNum = parseFloat(row.valorOhm);
                    const cumpleAuto = !isNaN(valorNum)
                      ? (valorNum <= 40 ? "SI" : "NO")
                      : "";
                    return (
                      <tr key={row.id} className={cn("hover:bg-gray-50/60", cumpleAuto === "NO" && "bg-red-50/30")} data-testid={`row-${idx}`}>
                        <td className={cn(cellClass, "bg-gray-50 font-bold")}>{idx + 1}</td>
                        <td className={cellClass}><input className={cn(inputCell, "text-left px-1")} value={row.sector} onChange={e => updatePATRow(row.id, "sector", e.target.value)} data-testid={`input-sector-${idx}`} /></td>
                        <td className={cellClass}>
                          <select className={selectCell} value={row.condicionTerreno} onChange={e => updatePATRow(row.id, "condicionTerreno", e.target.value)} data-testid={`sel-terreno-${idx}`}>
                            {condicionesTerreno.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className={cellClass}>
                          <select className={selectCell} value={row.usoPAT} onChange={e => updatePATRow(row.id, "usoPAT", e.target.value)} data-testid={`sel-uso-${idx}`}>
                            {usosPAT.map(u => <option key={u}>{u}</option>)}
                          </select>
                        </td>
                        <td className={cellClass}>
                          <select className={selectCell} value={row.esquemaConexion} onChange={e => updatePATRow(row.id, "esquemaConexion", e.target.value)} data-testid={`sel-esquema-${idx}`}>
                            {esquemas.map(e => <option key={e}>{e}</option>)}
                          </select>
                        </td>
                        <td className={cn(cellClass, "bg-blue-50")}>
                          <input className={cn(inputCell, "font-mono font-bold")} value={row.valorOhm} onChange={e => updatePATRow(row.id, "valorOhm", e.target.value)} placeholder="-" data-testid={`input-valor-${idx}`} />
                        </td>
                        <td className={cn(cellClass, cumpleAuto === "SI" ? "bg-green-200 text-green-800 font-bold" : cumpleAuto === "NO" ? "bg-red-200 text-red-700 font-bold" : "bg-gray-50")}>
                          {cumpleAuto || "-"}
                        </td>
                        <td className={cn(cellClass, row.circuitoContinuo === "SI" ? "bg-green-100" : "bg-red-100")}>
                          <select className={selectCell} value={row.circuitoContinuo} onChange={e => updatePATRow(row.id, "circuitoContinuo", e.target.value)} data-testid={`sel-continuo-${idx}`}>
                            <option>SI</option><option>NO</option>
                          </select>
                        </td>
                        <td className={cn(cellClass, row.capacidadCarga === "SI" ? "bg-green-100" : "bg-red-100")}>
                          <select className={selectCell} value={row.capacidadCarga} onChange={e => updatePATRow(row.id, "capacidadCarga", e.target.value)} data-testid={`sel-carga-${idx}`}>
                            <option>SI</option><option>NO</option>
                          </select>
                        </td>
                        <td className={cn(cellClass, "bg-purple-50")}>
                          <select className={selectCell} value={row.proteccion} onChange={e => updatePATRow(row.id, "proteccion", e.target.value)} data-testid={`sel-prot-${idx}`}>
                            {protecciones.map(p => <option key={p}>{p}</option>)}
                          </select>
                        </td>
                        <td className={cn(cellClass, row.dispositivoProteccion === "SI" ? "bg-green-200 text-green-800 font-bold" : "bg-red-200 text-red-700 font-bold")}>
                          <select className={selectCell} value={row.dispositivoProteccion} onChange={e => updatePATRow(row.id, "dispositivoProteccion", e.target.value)} data-testid={`sel-disp-${idx}`}>
                            <option>SI</option><option>NO</option>
                          </select>
                        </td>
                        <td className={cellClass}><input className={cn(inputCell, "text-left px-1")} value={row.observaciones} onChange={e => updatePATRow(row.id, "observaciones", e.target.value)} placeholder="-" data-testid={`input-obs-${idx}`} /></td>
                        <td className={cellClass}><button className="text-gray-400 hover:text-red-600 p-1" onClick={() => deletePATRow(row.id)} data-testid={`btn-delete-${idx}`}><Trash2 className="h-3 w-3" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-blue-50 border-t text-[10px] text-blue-800">
              <strong>Nota reglamentaria:</strong> Reglamento AEA 90364 (versión 2006), sub cláusula 771.3.3.1: valor máximo de resistencia de PAT = <strong>40Ω</strong> para protecciones diferenciales de hasta 30 mA.
            </div>
          </div>
        )}

        {/* ══ Tab 2: Inspección Tableros ══ */}
        {activeTab === 2 && (
          <div className="bg-white rounded border shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs" style={{ minWidth: "1600px" }}>
                <thead>
                  <tr>
                    <th className={cn(headerClass, "bg-gray-800")} style={{ width: "160px" }}>Ubicación Tablero</th>
                    <th className={cn(headerClass, "bg-gray-800")} style={{ width: "70px" }}>N° Tablero</th>
                    {TABLERO_COLS.map(([, label]) => (
                      <th key={label} className={headerClass} style={{ width: "80px" }} title={label}>
                        {label.substring(0, 18)}{label.length > 18 ? "…" : ""}
                      </th>
                    ))}
                    <th className={headerClass} style={{ width: "30px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {tableros.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-gray-50" data-testid={`tablero-row-${idx}`}>
                      <td className={cellClass}><input className={cn(inputCell, "text-left px-1")} value={t.ubicacion} onChange={e => updateTableroRow(t.id, "ubicacion", e.target.value)} data-testid={`input-ubic-${idx}`} /></td>
                      <td className={cellClass}><input className={cn(inputCell, "font-mono")} value={t.numTablero} onChange={e => updateTableroRow(t.id, "numTablero", e.target.value)} data-testid={`input-num-${idx}`} /></td>
                      {TABLERO_COLS.map(([field]) => {
                        const val = t[field as keyof TableroRow] as string;
                        return (
                          <td key={field} className={cn(cellClass, siNoColor(val))}>
                            <select
                              className={cn(inputCell, siNoColor(val), "cursor-pointer")}
                              value={val}
                              onChange={e => updateTableroRow(t.id, field as keyof TableroRow, e.target.value)}
                              data-testid={`sel-${field}-${idx}`}
                            >
                              <option value="SI">SI</option>
                              <option value="NO">NO</option>
                              <option value="N.A.">N.A.</option>
                            </select>
                          </td>
                        );
                      })}
                      <td className={cellClass}><button className="text-gray-400 hover:text-red-600 p-1" onClick={() => deleteTableroRow(t.id)} data-testid={`btn-del-tablero-${idx}`}><Trash2 className="h-3 w-3" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 bg-gray-50 border-t text-[10px] text-gray-600">
              <strong>Referencias:</strong> &nbsp;
              1- Condiciones generales del tablero &nbsp;|&nbsp;
              2- Dispositivos de protección diferencial &nbsp;|&nbsp;
              3- Conductor de protección PE &nbsp;|&nbsp;
              4- Tomacorrientes &nbsp;|&nbsp;
              5- Electrodo / PAT
              &nbsp;&nbsp;<span className="bg-green-100 text-green-700 px-1 rounded">SI = Conforme</span>
              &nbsp;<span className="bg-red-100 text-red-700 px-1 rounded">NO = No conforme</span>
              &nbsp;<span className="bg-gray-100 text-gray-600 px-1 rounded">N.A. = No aplica</span>
            </div>
          </div>
        )}

        {/* ══ Tab 3: Conclusiones ══ */}
        {activeTab === 3 && (
          <div className="space-y-4 max-w-3xl">
            {/* Resumen rápido */}
            <div className="bg-white rounded border shadow-sm p-4">
              <h3 className="text-sm font-bold text-[#003366] mb-3 border-b pb-1">Resumen de Mediciones PAT</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-blue-900 text-white">
                    <th className="border border-blue-800 px-2 py-1">Sector</th>
                    <th className="border border-blue-800 px-2 py-1">Valor (Ω)</th>
                    <th className="border border-blue-800 px-2 py-1">Límite</th>
                    <th className="border border-blue-800 px-2 py-1">Resultado</th>
                    <th className="border border-blue-800 px-2 py-1">Protección</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const v = parseFloat(r.valorOhm);
                    const ok = !isNaN(v) ? v <= 40 : null;
                    return (
                      <tr key={r.id} className={cn("hover:bg-gray-50", ok === false && "bg-red-50/40")}>
                        <td className="border px-2 py-0.5 font-medium">{r.sector || `Toma ${i + 1}`}</td>
                        <td className="border px-2 py-0.5 text-center font-mono font-bold">{r.valorOhm || "-"}</td>
                        <td className="border px-2 py-0.5 text-center text-amber-700">40 Ω</td>
                        <td className={cn("border px-2 py-0.5 text-center font-bold", ok === true ? "bg-green-100 text-green-700" : ok === false ? "bg-red-100 text-red-700" : "")}>
                          {ok === true ? "CUMPLE" : ok === false ? "NO CUMPLE" : "-"}
                        </td>
                        <td className="border px-2 py-0.5 text-center">{r.proteccion} — {r.dispositivoProteccion}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Conclusiones textarea */}
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
                placeholder="De las mediciones efectuadas surge que..."
                value={conclusiones}
                onChange={e => setConclusiones(e.target.value)}
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
                className="text-xs min-h-[160px] resize-y"
                value={recomendaciones}
                onChange={e => setRecomendaciones(e.target.value)}
                data-testid="textarea-recomendaciones"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
