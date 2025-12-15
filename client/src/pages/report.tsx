import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { MEASUREMENT_LABELS } from "@/lib/types";
import logoUrl from "@assets/image_1765761040646.png";

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
      <header className="mb-8 border-b-4 border-primary pb-4">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col gap-2">
             <img src={logoUrl} alt="Environmental Express" className="h-24 w-auto object-contain" />
             <p className="text-xs text-gray-500 font-medium tracking-wider mt-2">HIGIENE OCUPACIONAL Y MEDIO AMBIENTE</p>
          </div>
          <div className="text-right">
             <h1 className="text-3xl font-bold uppercase tracking-wide text-primary">Informe Técnico</h1>
             <p className="text-lg text-gray-600">Relevamiento de Agentes de Riesgo</p>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            <div className="flex flex-col">
              <span className="font-bold text-gray-500 text-xs uppercase">Establecimiento</span>
              <span className="font-semibold text-lg">{establishment.name}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-bold text-gray-500 text-xs uppercase">Fecha</span>
              <span className="font-semibold">{establishment.date}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-gray-500 text-xs uppercase">Razón Social</span>
              <span>{establishment.razonSocial}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="font-bold text-gray-500 text-xs uppercase">CUIT</span>
              <span>{establishment.cuit}</span>
            </div>
            <div className="flex flex-col col-span-2">
              <span className="font-bold text-gray-500 text-xs uppercase">Dirección</span>
              <span>{establishment.address}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="space-y-8">
        {sectors.length === 0 ? (
          <p className="text-center italic text-gray-500 py-12">No hay datos registrados para generar el informe.</p>
        ) : (
          sectors.map((sector) => (
            <div key={sector.id} className="break-inside-avoid mb-8">
              <div className="flex items-center gap-3 mb-4 border-b-2 border-primary/20 pb-2">
                <div className="bg-primary text-white font-bold px-3 py-1 rounded text-sm">SECTOR</div>
                <span className="font-bold text-xl text-primary">{sector.name}</span>
                <span className="text-sm text-gray-500 ml-auto border-l pl-3">
                  {sector.workersCount} operarios | {sector.dimensions}
                </span>
              </div>
              
              {sector.measurements.length === 0 ? (
                <p className="text-sm italic pl-4 text-gray-400">Sin mediciones registradas.</p>
              ) : (
                <div className="space-y-6 pl-2">
                  {sector.measurements.map((m) => (
                    <div key={m.id} className="border border-gray-200 rounded-lg overflow-hidden break-inside-avoid shadow-sm">
                      <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                        <span className="font-bold text-sm uppercase text-gray-700 tracking-wide">{MEASUREMENT_LABELS[m.type]}</span>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                          m.status === 'compliant' ? 'border-green-600 text-green-700 bg-green-50' : 
                          m.status === 'non_compliant' ? 'border-red-600 text-red-700 bg-red-50' : 
                          'border-gray-400 text-gray-600 bg-white'
                        }`}>
                          {m.status === 'compliant' ? 'CUMPLE NORMA' : m.status === 'non_compliant' ? 'NO CUMPLE' : 'PENDIENTE'}
                        </span>
                      </div>
                      
                      <div className="p-4">
                        <table className="w-full text-sm mb-3">
                          <thead>
                            <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase">
                              <th className="pb-2 w-24 font-semibold">Punto</th>
                              <th className="pb-2 font-semibold">Valores Registrados</th>
                              <th className="pb-2 font-semibold">Notas</th>
                            </tr>
                          </thead>
                          <tbody>
                            {m.points.map((p) => (
                              <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                                <td className="py-2 text-xs font-medium text-gray-500">{p.label}</td>
                                <td className="py-2">
                                  {Object.entries(p.values).map(([k, v]) => (
                                    <span key={k} className="mr-4 font-mono text-xs inline-block bg-gray-100 px-2 py-0.5 rounded">
                                      <span className="text-gray-500 mr-1 uppercase">{k}:</span>
                                      <span className="font-bold text-gray-800">{v}</span>
                                    </span>
                                  ))}
                                </td>
                                <td className="py-2 text-xs text-gray-600 italic">{p.notes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        
                        {m.observations && (
                          <div className="bg-yellow-50 p-3 text-xs border border-yellow-100 text-yellow-800 rounded mt-3 flex items-start gap-2">
                            <span className="font-bold uppercase text-[10px] mt-0.5">Observaciones:</span> 
                            <span>{m.observations}</span>
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

      <footer className="mt-16 pt-6 border-t border-gray-200 flex justify-between items-center text-xs text-gray-400 print:fixed print:bottom-0 print:left-0 print:w-full print:bg-white print:px-8 print:pb-4">
        <span>Generado el {new Date().toLocaleDateString()}</span>
        <span className="font-bold text-primary">Environmental Express Argentina</span>
      </footer>
    </div>
  );
}
