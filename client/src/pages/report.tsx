import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Download, FileJson, Sparkles, Pencil, FileText } from "lucide-react";
import { Link } from "wouter";
import { MEASUREMENT_LABELS, Measurement, MeasurementType } from "@/lib/types";
import logoUrl from "@assets/image_1765761040646.png";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ReportConfigDialog } from "@/components/report-config-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Report() {
  const establishment = useStore((state) => state.establishment);
  const updateEstablishment = useStore((state) => state.updateEstablishment);
  const sectors = useStore((state) => state.sectors);
  const { toast } = useToast();

  const handlePrint = () => {
    window.print();
  };

  const generateAIContent = () => {
    let conclusions = [];
    let recommendations = [];
    let compliantCount = 0;
    let nonCompliantCount = 0;

    // Introduction
    conclusions.push(`Se ha realizado el relevamiento de agentes de riesgo en el establecimiento ${establishment.name || 'declarado'}, con el objetivo de verificar el cumplimiento de la normativa vigente (Ley 19.587, Dec. 351/79 y Res. SRT 84/12).`);

    sectors.forEach(sector => {
      sector.measurements.forEach(m => {
        const typeLabel = MEASUREMENT_LABELS[m.type];
        
        if (m.status === 'non_compliant') {
            nonCompliantCount++;
            conclusions.push(`- En el sector "${sector.name}", la medición de ${typeLabel} arrojó valores que NO CUMPLEN con los límites establecidos.`);
            
            // Specific recommendations based on type
            if (m.type === 'lighting') {
                recommendations.push(`- Sector "${sector.name}" (${typeLabel}): Se recomienda revisar el sistema de iluminación, realizar limpieza de luminarias o adicionar fuentes de luz para alcanzar los niveles requeridos de ${m.config?.limit || '?'} Lux.`);
            } else if (m.type === 'noise') {
                recommendations.push(`- Sector "${sector.name}" (${typeLabel}): Se sugiere implementar medidas de ingeniería para reducción de ruido o verificar el uso correcto de EPP auditivos.`);
            } else {
                recommendations.push(`- Sector "${sector.name}" (${typeLabel}): Se recomienda evaluar medidas correctivas para adecuar los niveles a la normativa.`);
            }

        } else if (m.status === 'compliant') {
            compliantCount++;
            conclusions.push(`- En el sector "${sector.name}", los valores de ${typeLabel} se encuentran DENTRO de los parámetros legales permitidos.`);
        }
      });
    });

    // General Summary
    if (nonCompliantCount === 0 && compliantCount > 0) {
        conclusions.push("En conclusión, todos los sectores relevados CUMPLEN con los requerimientos legales vigentes al momento de la medición.");
        recommendations.push("Se recomienda mantener las condiciones actuales y realizar mediciones periódicas según lo estipulado por ley (anual).");
    } else if (nonCompliantCount > 0) {
        conclusions.push(`Se detectaron ${nonCompliantCount} desviaciones normativas que requieren atención inmediata.`);
        recommendations.push("Se sugiere realizar un plan de adecuación para los sectores afectados y repetir las mediciones una vez implementadas las mejoras.");
    } else {
        conclusions.push("No hay suficientes datos procesados para emitir una conclusión definitiva.");
    }

    updateEstablishment({
        conclusions: conclusions.join("\n"),
        recommendations: recommendations.join("\n")
    });

    toast({
        title: "Análisis Completado",
        description: "Se han generado conclusiones y recomendaciones basadas en los datos.",
    });
  };

  // Group measurements by type for the report
  const measurementsByType: Partial<Record<MeasurementType, { sectorName: string; measurement: Measurement }[]>> = {};

  sectors.forEach(sector => {
    sector.measurements.forEach(m => {
      if (!measurementsByType[m.type]) {
        measurementsByType[m.type] = [];
      }
      measurementsByType[m.type]?.push({
        sectorName: sector.name,
        measurement: m
      });
    });
  });

  const renderLightingProtocol = (items: { sectorName: string; measurement: Measurement }[]) => (
    <div className="space-y-6">
       <div className="bg-gray-100 p-2 border-y-2 border-primary/20 font-bold text-center text-sm uppercase tracking-wider mb-4">
          Protocolo de Iluminación (Res. 84/12)
       </div>
       <table className="w-full text-xs border-collapse border border-gray-300">
         <thead>
           <tr className="bg-gray-50 text-gray-700">
             <th className="border border-gray-300 p-2 text-left">Sector / Puesto</th>
             <th className="border border-gray-300 p-2 text-left w-20">Hora</th>
             <th className="border border-gray-300 p-2 text-left">Tipo</th>
             <th className="border border-gray-300 p-2 text-left">Fuente</th>
             <th className="border border-gray-300 p-2 text-center w-16">Alt. Mont.</th>
             <th className="border border-gray-300 p-2 text-center w-16">Alt. Trab.</th>
             <th className="border border-gray-300 p-2 text-center w-20 font-bold bg-gray-100">E. Media (Lux)</th>
             <th className="border border-gray-300 p-2 text-center w-20 bg-gray-100">E. Min (Lux)</th>
             <th className="border border-gray-300 p-2 text-center w-20">Valor Legal</th>
             <th className="border border-gray-300 p-2 text-center w-24">Cumple</th>
           </tr>
         </thead>
         <tbody>
           {items.map(({ sectorName, measurement }) => {
             const points = measurement.points;
             const values = points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
             const eAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
             const eMin = values.length > 0 ? Math.min(...values) : 0;
             const limit = measurement.config?.limit || 0;
             const complies = measurement.status === 'compliant';

             return (
               <tr key={measurement.id} className="break-inside-avoid hover:bg-gray-50/50">
                 <td className="border border-gray-300 p-2 font-medium">
                    {sectorName}
                    {measurement.observations && <div className="text-[10px] text-gray-500 italic mt-1">{measurement.observations}</div>}
                 </td>
                 <td className="border border-gray-300 p-2 text-gray-500">-</td>
                 <td className="border border-gray-300 p-2 capitalize">{measurement.config?.lightingType || 'Artificial'}</td>
                 <td className="border border-gray-300 p-2">{measurement.config?.lightSource || '-'}</td>
                 <td className="border border-gray-300 p-2 text-center">{measurement.config?.height || '-'} m</td>
                 <td className="border border-gray-300 p-2 text-center">{measurement.config?.workPlaneHeight || '-'} m</td>
                 <td className="border border-gray-300 p-2 text-center font-bold text-sm">{eAvg}</td>
                 <td className="border border-gray-300 p-2 text-center text-gray-600">{eMin}</td>
                 <td className="border border-gray-300 p-2 text-center">{limit > 0 ? limit : '-'}</td>
                 <td className={`border border-gray-300 p-2 text-center font-bold ${complies ? 'text-green-700 bg-green-50' : 'text-red-700 bg-red-50'}`}>
                   {complies ? 'SI' : 'NO'}
                 </td>
               </tr>
             );
           })}
         </tbody>
       </table>
    </div>
  );

  const renderGenericProtocol = (type: MeasurementType, items: { sectorName: string; measurement: Measurement }[]) => (
     <div className="space-y-6">
       <div className="bg-gray-100 p-2 border-y-2 border-primary/20 font-bold text-center text-sm uppercase tracking-wider mb-4">
          Protocolo de {MEASUREMENT_LABELS[type]}
       </div>
       {items.map(({ sectorName, measurement }) => (
         <div key={measurement.id} className="mb-6 break-inside-avoid border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
              <span className="font-bold text-sm">{sectorName}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded border ${
                 measurement.status === 'compliant' ? 'border-green-600 text-green-700 bg-green-50' : 
                 measurement.status === 'non_compliant' ? 'border-red-600 text-red-700 bg-red-50' : 
                 'border-gray-400 text-gray-600 bg-white'
               }`}>
                 {measurement.status === 'compliant' ? 'CUMPLE' : measurement.status === 'non_compliant' ? 'NO CUMPLE' : 'PENDIENTE'}
               </span>
            </div>
            <div className="p-4">
               <table className="w-full text-xs">
                 <thead>
                   <tr className="border-b border-gray-100 text-left text-gray-500 uppercase">
                     <th className="pb-2 w-24">Punto</th>
                     <th className="pb-2">Valores</th>
                     <th className="pb-2">Notas</th>
                   </tr>
                 </thead>
                 <tbody>
                   {measurement.points.map(p => (
                     <tr key={p.id} className="border-b border-gray-50 last:border-0">
                       <td className="py-2 font-medium">{p.label}</td>
                       <td className="py-2">
                         {Object.entries(p.values).map(([k, v]) => (
                           <span key={k} className="mr-3 font-mono bg-gray-100 px-2 py-1 rounded">
                             <span className="text-gray-500 mr-1 uppercase">{k}:</span>
                             <span className="font-bold text-gray-800">{v}</span>
                           </span>
                         ))}
                       </td>
                       <td className="py-2 italic text-gray-500">{p.notes}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               {measurement.observations && (
                  <div className="mt-3 text-xs bg-yellow-50 p-2 rounded border border-yellow-100 text-yellow-800">
                    <span className="font-bold mr-1">Obs:</span> {measurement.observations}
                  </div>
               )}
            </div>
         </div>
       ))}
     </div>
  );

  return (
    <div className="bg-white min-h-screen text-black p-8 max-w-5xl mx-auto">
      {/* No-print controls */}
      <div className="print:hidden flex flex-col md:flex-row justify-between items-center mb-8 border-b pb-4 gap-4">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Tablero
            </Button>
          </Link>
          <ReportConfigDialog />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={generateAIContent} className="text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200">
            <Sparkles className="mr-2 h-4 w-4" /> Analizar y Generar Conclusiones
          </Button>
          <Button variant="outline" onClick={() => {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ establishment, sectors }, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href",     dataStr);
            downloadAnchorNode.setAttribute("download", `informe_${establishment.name || 'sin_nombre'}_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
          }}>
            <FileJson className="mr-2 h-4 w-4" /> Exportar JSON
          </Button>
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Download className="mr-2 h-4 w-4" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Report Container for Print */}
      <div className="print:w-full">
        {/* Header */}
        <header className="mb-8 border-b-4 border-primary pb-4">
          <div className="flex justify-between items-start mb-6">
            <div className="flex flex-col gap-2">
               <img src={logoUrl} alt="Environmental Express Argentina" className="h-24 w-auto object-contain" />
               <p className="text-sm font-bold text-primary mt-2">Environmental Express Argentina</p>
               <p className="text-xs text-gray-500 font-medium tracking-wider">HIGIENE OCUPACIONAL Y MEDIO AMBIENTE</p>
            </div>
            <div className="text-right">
               <h1 className="text-3xl font-bold uppercase tracking-wide text-primary">Informe Técnico</h1>
               <p className="text-lg text-gray-600">Relevamiento de Agentes de Riesgo</p>
               <p className="text-sm font-medium text-gray-400 mt-1 uppercase">Ley 19.587 / Dec. 351/79</p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex flex-col">
                <span className="font-bold text-gray-500 text-xs uppercase">Establecimiento</span>
                <span className="font-semibold text-lg">{establishment.name}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="font-bold text-gray-500 text-xs uppercase">Fecha de Medición</span>
                <span className="font-semibold">{establishment.date ? format(new Date(establishment.date), "d 'de' MMMM, yyyy", { locale: es }) : '-'}</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-500 text-xs uppercase">Razón Social</span>
                <span>{establishment.razonSocial || '-'}</span>
              </div>
              <div className="flex flex-col text-right">
                <span className="font-bold text-gray-500 text-xs uppercase">CUIT</span>
                <span>{establishment.cuit || '-'}</span>
              </div>
              <div className="flex flex-col col-span-2">
                <span className="font-bold text-gray-500 text-xs uppercase">Dirección del Establecimiento</span>
                <span>{establishment.address || '-'}</span>
                <span className="text-gray-500 font-normal ml-2">
                  {establishment.city && `${establishment.city}, `}
                  {establishment.province && `${establishment.province}`}
                  {establishment.postalCode && ` (CP: ${establishment.postalCode})`}
                </span>
              </div>
            </div>
          </div>

          {/* Environmental Conditions & Instruments */}
          {(establishment.conditions || (establishment.instruments && establishment.instruments.length > 0)) && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {establishment.conditions && (
                <div className="border border-gray-200 rounded p-3 text-xs">
                   <h3 className="font-bold text-gray-700 uppercase mb-2 border-b pb-1">Condiciones Ambientales</h3>
                   <div className="grid grid-cols-2 gap-2">
                     <div><span className="font-semibold text-gray-500">Hora Inicio:</span> {establishment.startTime || '-'}</div>
                     <div><span className="font-semibold text-gray-500">Hora Fin:</span> {establishment.endTime || '-'}</div>
                     <div><span className="font-semibold text-gray-500">Temperatura:</span> {establishment.conditions.temperature ? `${establishment.conditions.temperature}°C` : '-'}</div>
                     <div><span className="font-semibold text-gray-500">Humedad:</span> {establishment.conditions.humidity ? `${establishment.conditions.humidity}%` : '-'}</div>
                     <div><span className="font-semibold text-gray-500">Presión:</span> {establishment.conditions.pressure ? `${establishment.conditions.pressure} mmHg` : '-'}</div>
                     <div><span className="font-semibold text-gray-500">Viento:</span> {establishment.conditions.windSpeed ? `${establishment.conditions.windSpeed} km/h` : '-'}</div>
                   </div>
                </div>
              )}
              
              {establishment.instruments && establishment.instruments.length > 0 && (
                <div className="border border-gray-200 rounded p-3 text-xs">
                   <h3 className="font-bold text-gray-700 uppercase mb-2 border-b pb-1">Instrumental Utilizado</h3>
                   <div className="space-y-2">
                     {establishment.instruments.map(inst => (
                       <div key={inst.id} className="grid grid-cols-2 gap-x-2 border-b border-gray-100 last:border-0 pb-1 last:pb-0">
                         <div className="font-semibold text-primary">{inst.brand} {inst.model}</div>
                         <div className="text-right text-gray-500">S/N: {inst.serialNumber}</div>
                         <div className="col-span-2 text-[10px] text-gray-400">
                           Calibración: {inst.calibrationDate || '-'} ({inst.calibrationCertificate || 'S/D'})
                         </div>
                       </div>
                     ))}
                   </div>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Content by Protocol */}
        <div className="space-y-12 mb-12">
          {Object.keys(measurementsByType).length === 0 ? (
            <p className="text-center italic text-gray-500 py-12">No hay datos registrados para generar el informe.</p>
          ) : (
            Object.entries(measurementsByType).map(([type, items]) => (
              <section key={type} className="break-before-page">
                 {type === 'lighting' ? renderLightingProtocol(items!) : renderGenericProtocol(type as MeasurementType, items!)}
              </section>
            ))
          )}
        </div>

        {/* Conclusions and Recommendations Section */}
        <div className="break-inside-avoid mt-8 border-t-2 border-primary/20 pt-6">
            <h2 className="text-xl font-bold text-primary mb-4 uppercase tracking-wide flex items-center gap-2">
                <FileText className="h-5 w-5" /> Conclusiones y Recomendaciones
            </h2>
            
            <div className="grid grid-cols-1 gap-8">
                <div className="space-y-2">
                    <Label htmlFor="conclusions" className="text-sm font-bold text-gray-700 uppercase">Conclusiones Técnicas</Label>
                    <Textarea 
                        id="conclusions"
                        value={establishment.conclusions || ""} 
                        onChange={(e) => updateEstablishment({ conclusions: e.target.value })}
                        placeholder="Generar automáticamente o escribir conclusiones..."
                        className="min-h-[150px] font-sans text-sm resize-none print:border-none print:p-0 print:resize-none print:bg-transparent"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="recommendations" className="text-sm font-bold text-gray-700 uppercase">Recomendaciones de Adecuación</Label>
                    <Textarea 
                        id="recommendations"
                        value={establishment.recommendations || ""} 
                        onChange={(e) => updateEstablishment({ recommendations: e.target.value })}
                        placeholder="Generar automáticamente o escribir recomendaciones..."
                        className="min-h-[150px] font-sans text-sm resize-none print:border-none print:p-0 print:resize-none print:bg-transparent"
                    />
                </div>
            </div>
        </div>

        <footer className="mt-16 pt-6 border-t border-gray-200 flex flex-col items-center text-xs text-gray-400 print:fixed print:bottom-0 print:left-0 print:w-full print:bg-white print:px-8 print:pb-4">
          <div className="flex justify-between w-full mb-8">
             <div className="text-left">
               <span>Generado el {new Date().toLocaleDateString()}</span>
               <div className="mt-1 font-bold text-primary">Environmental Express Argentina</div>
             </div>
             {establishment.responsible && (
               <div className="text-center border-t border-gray-400 pt-1 px-8">
                 <div className="font-bold text-black">{establishment.responsible}</div>
                 <div className="text-[10px]">Responsable Técnico</div>
               </div>
             )}
          </div>
          <p className="text-[10px] text-center max-w-2xl">
            Este informe es un documento técnico generado digitalmente. Los valores consignados corresponden a las mediciones realizadas in situ según los protocolos vigentes de la SRT.
          </p>
        </footer>
      </div>
    </div>
  );
}
