import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { MEASUREMENT_LABELS } from "@/lib/types";

export default function Report() {
  const establishment = useStore((state) => state.establishment);
  const sectors = useStore((state) => state.sectors);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white min-h-screen text-black p-8 max-w-4xl mx-auto">
      {/* No-print controls */}
      <div className="print:hidden flex justify-between items-center mb-8 border-b pb-4">
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Volver
          </Button>
        </Link>
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" /> Imprimir / Guardar PDF
        </Button>
      </div>

      {/* Report Header */}
      <header className="mb-8 border-b-2 border-black pb-4">
        <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">Informe de Relevamiento SyH</h1>
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div>
            <span className="font-bold">Establecimiento:</span> {establishment.name}
          </div>
          <div>
            <span className="font-bold">Fecha:</span> {establishment.date}
          </div>
          <div>
            <span className="font-bold">Razón Social:</span> {establishment.razonSocial}
          </div>
          <div>
            <span className="font-bold">Responsable:</span> {establishment.responsible || "-"}
          </div>
          <div className="col-span-2">
            <span className="font-bold">Dirección:</span> {establishment.address}
          </div>
          <div className="col-span-2">
            <span className="font-bold">CUIT:</span> {establishment.cuit}
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="space-y-8">
        {sectors.length === 0 ? (
          <p className="text-center italic text-gray-500">No hay datos registrados.</p>
        ) : (
          sectors.map((sector) => (
            <div key={sector.id} className="break-inside-avoid">
              <div className="bg-gray-100 p-2 font-bold text-lg border-l-4 border-black mb-4 flex justify-between">
                <span>SECTOR: {sector.name}</span>
                <span className="text-sm font-normal text-gray-600">
                  {sector.workersCount} operarios | {sector.dimensions}
                </span>
              </div>
              
              {sector.measurements.length === 0 ? (
                <p className="text-sm italic pl-4">Sin mediciones.</p>
              ) : (
                <div className="space-y-6 pl-2">
                  {sector.measurements.map((m) => (
                    <div key={m.id} className="border border-gray-300 rounded-sm overflow-hidden break-inside-avoid">
                      <div className="bg-gray-50 px-3 py-1 border-b border-gray-300 flex justify-between items-center">
                        <span className="font-bold text-sm uppercase">{MEASUREMENT_LABELS[m.type]}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded border ${
                          m.status === 'compliant' ? 'border-green-600 text-green-700 bg-green-50' : 
                          m.status === 'non_compliant' ? 'border-red-600 text-red-700 bg-red-50' : 
                          'border-gray-400 text-gray-600'
                        }`}>
                          {m.status === 'compliant' ? 'CUMPLE' : m.status === 'non_compliant' ? 'NO CUMPLE' : 'PENDIENTE'}
                        </span>
                      </div>
                      
                      <div className="p-3">
                        <table className="w-full text-sm mb-3">
                          <thead>
                            <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
                              <th className="pb-1 w-20">Punto</th>
                              <th className="pb-1">Valores</th>
                              <th className="pb-1">Notas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.points.map((p) => (
                              <tr key={p.id} className="border-b border-gray-100 last:border-0">
                                <td className="py-1 text-xs font-medium">{p.label}</td>
                                <td className="py-1">
                                  {Object.entries(p.values).map(([k, v]) => (
                                    <span key={k} className="mr-3 font-mono text-xs">
                                      <span className="text-gray-400 mr-1">{k}:</span>
                                      {v}
                                    </span>
                                  ))}
                                </td>
                                <td className="py-1 text-xs text-gray-600 italic">{p.notes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {m.observations && (
                          <div className="bg-yellow-50 p-2 text-xs border border-yellow-100 text-yellow-900 rounded">
                            <span className="font-bold">Obs:</span> {m.observations}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <footer className="mt-12 pt-4 border-t text-xs text-center text-gray-400 print:fixed print:bottom-0 print:left-0 print:w-full">
        Generado el {new Date().toLocaleDateString()} - Relevamiento SyH
      </footer>
    </div>
  );
}
