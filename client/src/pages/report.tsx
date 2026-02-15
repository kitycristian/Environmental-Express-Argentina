import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Download, FileJson, Sparkles, Pencil, FileText, ImageIcon, Check, Trash2, Plus } from "lucide-react";
import { Link } from "wouter";
import { MEASUREMENT_LABELS, Measurement, MeasurementType, MeasurementPoint, Sector, Instrument } from "@/lib/types";
import logoUrl from "@assets/image_1765761040646.png";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ReportConfigDialog } from "@/components/report-config-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useInstruments } from "@/lib/hooks";

import { generateDocxReport } from "@/lib/docx-generator";

const safeFormatDate = (dateStr: string | undefined, fmt: string, options?: { locale?: any }): string => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      const parts = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
      if (parts) {
        const parsed = new Date(Number(parts[3]), Number(parts[2]) - 1, Number(parts[1]));
        if (!isNaN(parsed.getTime())) return format(parsed, fmt, options);
      }
      return dateStr;
    }
    return format(d, fmt, options);
  } catch { return dateStr || '-'; }
};
import { generatePDFReport } from "@/lib/pdf-generator";

export default function Report() {
  const establishment = useStore((state) => state.establishment);
  const updateEstablishment = useStore((state) => state.updateEstablishment);

  const sectors = useStore((state) => state.sectors);
  const { data: availableInstruments = [] } = useInstruments();
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const { toast } = useToast();
  
  // State for filtering
  const [selectedType, setSelectedType] = useState<MeasurementType | 'all'>('all');
  const [isInstrumentDialogOpen, setIsInstrumentDialogOpen] = useState(false);

  const buildSessionMeasurement = (type: MeasurementType, sName: string, sRows: any[], comp: any, obsKey: string, concKey: string, recKey: string): Measurement => {
    const mapNoise = (r: any, idx: number): MeasurementPoint => ({ id: `np-${idx}`, label: `Punto ${idx + 1}`, values: { puesto: r.puestoTrabajo || '', tiempo_exposicion: r.tiempoExposicion || '', tiempo_integracion: r.tiempoIntegracion || '', caracteristicas: r.tipoRuido || '', nivel_pico_c: '', nivel_continuo_eq: r.valorMedido || '', suma_fracciones: r.fraccion || '', dosis: r.dosisRuido || '', cumple: r.cumple || '' }, notes: r.observaciones || '' });
    const mapThermal = (r: any, idx: number): MeasurementPoint => ({ id: `tp-${idx}`, label: `Punto ${idx + 1}`, values: { tbs: r.tbs || '', tbh: r.tbh || '', tg: r.tg || '', tgbh: r.tgbh || '', tgbhPonderado: r.tgbhPonderado || '', mi: '42', mii: '105' }, notes: r.puestoTrabajo || '' });
    const mapCold = (r: any, idx: number): MeasurementPoint => ({ id: `cp-${idx}`, label: `Punto ${idx + 1}`, values: { temp: r.tbs || '', wind: r.velocidadViento || '', tee: r.tee || '' }, notes: r.puestoTrabajo || '' });

    const mapFn = type === 'noise' ? mapNoise : type === 'thermal_load' ? mapThermal : mapCold;

    let status: 'pending' | 'compliant' | 'non_compliant' = 'pending';
    if (type === 'noise') {
      const hasCumple = sRows.some((r: any) => r.cumple);
      if (hasCumple) status = sRows.every((r: any) => r.cumple === 'SI') ? 'compliant' : 'non_compliant';
    } else if (type === 'thermal_load') {
      const hasCumple = sRows.some((r: any) => r.cumpleVla);
      if (hasCumple) status = sRows.every((r: any) => r.cumpleVla === 'SI') ? 'compliant' : 'non_compliant';
    }

    return {
      id: `${type}-session-${sName}`,
      type,
      sectorId: `${type}-session-${sName}`,
      status,
      points: sRows.map(mapFn),
      observations: sessionStorage.getItem(obsKey) || undefined,
      specificConclusions: sessionStorage.getItem(concKey) || undefined,
      analysisAndImprovements: sessionStorage.getItem(recKey) || undefined,
      config: type === 'thermal_load' ? { limit: Number(sRows[0]?.vla) || 29.5 } : undefined,
      details: {
        brand: comp.instrumento1 || '',
        model: '',
        serialNumber: comp.instrumento1Serie || '',
        calibrationDate: comp.instrumento1FechaCal || '',
        measurementDate: comp.fechaMedicion || '',
        startTime: comp.horaInicio || '',
        endTime: comp.horaFin || '',
        workShifts: comp.turnos || comp.jornadaLaboral || '',
        normalConditions: comp.condicionesNormales || '',
        currentConditions: comp.condicionesMedicion || comp.condicionesAtm || '',
      },
    };
  };

  const getSessionSheetData = (storageKey: string, companyKey: string, type: MeasurementType, obsKey: string, concKey: string, recKey: string, filterFn: (r: any) => boolean): { sectorName: string; measurement: Measurement }[] => {
    try {
      const rowsStr = sessionStorage.getItem(storageKey);
      const compStr = sessionStorage.getItem(companyKey);
      if (!rowsStr) return [];
      const rows = JSON.parse(rowsStr);
      const comp = compStr ? JSON.parse(compStr) : {};
      const filled = rows.filter(filterFn);
      if (filled.length === 0) return [];
      const groups: Record<string, any[]> = {};
      filled.forEach((r: any) => {
        const s = r.sector || 'Sin Sector';
        if (!groups[s]) groups[s] = [];
        groups[s].push(r);
      });
      return Object.entries(groups).map(([sName, sRows]) => ({
        sectorName: sName,
        measurement: buildSessionMeasurement(type, sName, sRows, comp, obsKey, concKey, recKey),
      }));
    } catch { return []; }
  };

  const getMergedSectors = (): Sector[] => {
    const merged = [...sectors.map(s => ({ ...s, measurements: [...s.measurements] }))];

    const addToMerged = (items: { sectorName: string; measurement: Measurement }[], type: MeasurementType) => {
      items.forEach(({ sectorName, measurement }) => {
        const existingSector = merged.find(s => s.name === sectorName);
        if (existingSector) {
          if (!existingSector.measurements.some(m => m.type === type)) {
            existingSector.measurements.push(measurement);
          }
        } else {
          merged.push({
            id: `${type}-session-${sectorName}`,
            name: sectorName,
            measurements: [measurement],
          });
        }
      });
    };

    addToMerged(getSessionSheetData('noise-rows', 'noise-company', 'noise', 'noise-obs', 'noise-conc', 'noise-rec', (r: any) => r.sector || r.puestoTrabajo || r.valorMedido), 'noise');
    addToMerged(getSessionSheetData('thermal-rows', 'thermal-company', 'thermal_load', 'thermal-obs', 'thermal-conc', 'thermal-rec', (r: any) => r.sector || r.puestoTrabajo || r.tbs || r.tgbh), 'thermal_load');
    addToMerged(getSessionSheetData('cold-rows', 'cold-company', 'cold_stress', 'cold-obs', 'cold-conc', 'cold-rec', (r: any) => r.sector || r.puestoTrabajo || r.tbs), 'cold_stress');

    return merged;
  };

  const handleDocxExport = () => {
      toast({ title: "Generando documento DOCX..." });
      generateDocxReport(establishment, getMergedSectors());
  };

  const handlePrint = () => {
    toast({ title: "Generando PDF...", description: "Espere un momento mientras se procesa el documento." });
    generatePDFReport(establishment, getMergedSectors(), undefined, 'download');
  };

  const handlePreview = () => {
    toast({ title: "Generando Vista Previa...", description: "Se abrirá en una nueva pestaña." });
    generatePDFReport(establishment, getMergedSectors(), undefined, 'preview');
  };

  // Add print styles dynamically
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        @page {
          margin: 10mm;
          size: A4 portrait;
        }
        
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          background-color: white !important;
        }

        /* Hide UI elements */
        .no-print, button, nav, header, footer:not(.report-footer), .fixed, .toast-viewport {
          display: none !important;
        }

        /* Report Footer should show */
        .report-footer {
            display: block !important;
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background: white;
            padding: 10px 30px;
            z-index: 9999;
        }

        /* Force table widths and fonts */
        table {
          width: 100% !important;
          font-size: 9px !important;
          border-collapse: collapse !important;
        }
        
        th, td {
          padding: 2px 4px !important;
          border: 1px solid black !important;
        }

        /* Adjust main container */
        .container, .max-w-4xl {
          max-width: none !important;
          width: 100% !important;
          padding: 0 !important;
          margin: 0 !important;
          box-shadow: none !important;
          border: none !important;
        }

        /* Page breaks */
        .break-before-page {
          break-before: page;
          page-break-before: always;
        }
        
        .break-inside-avoid {
          break-inside: avoid;
          page-break-inside: avoid;
        }
        
        /* Headers styling adjustment for print */
        h2, h3, h4 {
            color: black !important; /* Force black headers for formal look if needed, or keep colors */
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const handleSketchUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      updateEstablishment({ sketchImage: reader.result as string });
      toast({ title: "Croquis cargado correctamente" });
    };
    reader.readAsDataURL(file);
  };

  const handleMeasurementImageUpload = (sectorId: string, measurementId: string, file: File) => {
      const reader = new FileReader();
      reader.onloadend = () => {
          const imageBase64 = reader.result as string;
          
          // Find the measurement to update
          const sector = sectors.find(s => s.id === sectorId);
          const measurement = sector?.measurements.find(m => m.id === measurementId);
          
          if (measurement) {
              const currentOtherImages = measurement.attachedDocuments?.otherImages || [];
              const updatedDocuments = {
                  ...measurement.attachedDocuments,
                  otherImages: [...currentOtherImages, imageBase64]
              };
              
              updateMeasurement(sectorId, measurementId, { attachedDocuments: updatedDocuments });
              toast({ title: "Imagen agregada a la medición" });
          }
      };
      reader.readAsDataURL(file);
  };

  const handleMeasurementImageDelete = (sectorId: string, measurementId: string, type: 'measurementProofImage' | 'otherImages', index?: number) => {
        const sector = sectors.find(s => s.id === sectorId);
        const measurement = sector?.measurements.find(m => m.id === measurementId);
        
        if (measurement && measurement.attachedDocuments) {
            let updatedDocuments = { ...measurement.attachedDocuments };
            
            if (type === 'measurementProofImage') {
                updatedDocuments.measurementProofImage = undefined;
            } else if (type === 'otherImages' && typeof index === 'number') {
                updatedDocuments.otherImages = updatedDocuments.otherImages?.filter((_, i) => i !== index);
            }
            
            updateMeasurement(sectorId, measurementId, { attachedDocuments: updatedDocuments });
            toast({ title: "Imagen eliminada" });
        }
  };

  const handleImageUpload = (file: File, type: 'measurementProof' | 'calibrationCertificate' | 'other', measurementId?: string) => {
      // Logic for measurement images would go here, but for now we are dealing with global annexes mostly
      toast({ title: "Función de imágenes detalladas próximamente" });
  };

  const addInstrumentToReport = (instrument: Instrument) => {
      const currentInstruments = establishment.instruments || [];
      if (!currentInstruments.some(i => i.id === instrument.id)) {
          updateEstablishment({
              instruments: [...currentInstruments, instrument]
          });
          toast({ title: "Instrumento agregado al anexo" });
      }
      setIsInstrumentDialogOpen(false);
  };

  const removeInstrumentFromReport = (instrumentId: string) => {
      const currentInstruments = establishment.instruments || [];
      updateEstablishment({
          instruments: currentInstruments.filter(i => i.id !== instrumentId)
      });
  };

  const generateAIContent = () => {
    let conclusions: string[] = [];
    let recommendations: string[] = [];
    let compliantCount = 0;
    let nonCompliantCount = 0;
    let totalMeasurements = 0;

    // Introduction
    conclusions.push(`Se ha realizado el relevamiento de agentes de riesgo en el establecimiento ${establishment.name || 'declarado'}, con el objetivo de verificar el cumplimiento de la normativa vigente (Ley 19.587, Dec. 351/79 y Res. SRT 84/12).`);

    sectors.forEach(sector => {
      sector.measurements.forEach(m => {
        totalMeasurements++;
        const typeLabel = MEASUREMENT_LABELS[m.type];
        
        // Calculate status on the fly if pending for lighting to ensure we have data
        let currentStatus = m.status;
        if (m.type === 'lighting' && m.points.length > 0) {
             const values = m.points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
             if (values.length > 0) {
                 const avg = values.reduce((a, b) => a + b, 0) / values.length;
                 const limit = m.config?.limit || 0;
                 if (limit > 0) {
                     currentStatus = avg >= limit ? 'compliant' : 'non_compliant';
                 }
             }
        }
        
        if (currentStatus === 'non_compliant') {
            nonCompliantCount++;
            conclusions.push(`- En el sector "${sector.name}", la medición de ${typeLabel} arrojó valores que NO CUMPLEN con los límites establecidos.`);
            
            // Specific recommendations based on type
            if (m.type === 'lighting') {
                recommendations.push(`- Sector "${sector.name}" (${typeLabel}): Se recomienda revisar el sistema de iluminación, realizar limpieza de luminarias, verificar el estado de las lámparas o adicionar fuentes de luz para alcanzar los niveles requeridos de ${m.config?.limit || '?'} Lux.`);
            } else if (m.type === 'noise') {
                recommendations.push(`- Sector "${sector.name}" (${typeLabel}): Se sugiere implementar medidas de ingeniería para reducción de ruido o verificar el uso correcto de EPP auditivos.`);
            } else {
                recommendations.push(`- Sector "${sector.name}" (${typeLabel}): Se recomienda evaluar medidas correctivas para adecuar los niveles a la normativa.`);
            }

        } else if (currentStatus === 'compliant') {
            compliantCount++;
            conclusions.push(`- En el sector "${sector.name}", los valores de ${typeLabel} se encuentran DENTRO de los parámetros legales permitidos.`);
        } else if (m.points.length > 0) {
             // Has points but status not explicitly set or limit missing
             conclusions.push(`- En el sector "${sector.name}" se han registrado mediciones de ${typeLabel}, pendientes de validación final contra normativa.`);
        }
      });
    });

    // General Summary Logic
    if (totalMeasurements === 0) {
         conclusions.push("No se han registrado mediciones en los sectores declarados.");
         recommendations.push("Se sugiere realizar un relevamiento general de iluminación y condiciones ambientales para asegurar el cumplimiento normativo.");
    } else if (nonCompliantCount === 0 && compliantCount > 0) {
        conclusions.push("En conclusión, todos los sectores evaluados con referencia normativa CUMPLEN con los requerimientos legales vigentes.");
        recommendations.push("Se recomienda mantener las condiciones actuales y realizar mediciones periódicas según lo estipulado por ley (anual) para asegurar la continuidad del cumplimiento.");
    } else if (nonCompliantCount > 0) {
        conclusions.push(`Se detectaron ${nonCompliantCount} desviaciones normativas que requieren atención para garantizar la seguridad y salud ocupacional.`);
        recommendations.push("Se sugiere implementar un plan de mejoras enfocado en los sectores críticos mencionados y volver a verificar los niveles una vez realizadas las adecuaciones.");
    } else {
        // Fallback for partial data
        conclusions.push("Se han relevado los datos de campo correctamente. Se sugiere verificar los límites normativos aplicables para emitir un dictamen final de cumplimiento.");
        recommendations.push("Completar la configuración de límites legales en los sectores relevados para obtener un diagnóstico preciso.");
    }

    updateEstablishment({
        conclusions: conclusions.join("\n"),
        recommendations: recommendations.join("\n")
    });

    toast({
        title: "Análisis Completado",
        description: "Se han generado conclusiones y recomendaciones basadas en los datos disponibles.",
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

  // Merge sessionStorage data from standalone sheets (noise, thermal, cold)
  const mergeSessionData = (type: MeasurementType, storageKey: string, companyKey: string, obsKey: string, concKey: string, recKey: string, filterFn: (r: any) => boolean) => {
    const items = getSessionSheetData(storageKey, companyKey, type, obsKey, concKey, recKey, filterFn);
    items.forEach(({ sectorName, measurement }) => {
      if (!measurementsByType[type]) measurementsByType[type] = [];
      const alreadyExists = measurementsByType[type]!.some(m => m.measurement.id === measurement.id);
      if (!alreadyExists) {
        measurementsByType[type]!.push({ sectorName, measurement });
      }
    });
  };

  mergeSessionData('noise', 'noise-rows', 'noise-company', 'noise-obs', 'noise-conc', 'noise-rec', (r: any) => r.sector || r.puestoTrabajo || r.valorMedido);
  mergeSessionData('thermal_load', 'thermal-rows', 'thermal-company', 'thermal-obs', 'thermal-conc', 'thermal-rec', (r: any) => r.sector || r.puestoTrabajo || r.tbs || r.tgbh);
  mergeSessionData('cold_stress', 'cold-rows', 'cold-company', 'cold-obs', 'cold-conc', 'cold-rec', (r: any) => r.sector || r.puestoTrabajo || r.tbs);

  // Helper Components for Report Structure matching the official forms
  const ProtocolHeader = ({ title }: { title: string }) => (
    <div className="mb-6">
       <h2 className="text-xl font-bold text-center border-y-2 border-black py-2 mb-6 uppercase tracking-wider bg-gray-50">
          {title}
       </h2>
       
       <h3 className="font-bold text-sm uppercase mb-2 bg-gray-200 p-1 pl-2 border-l-4 border-black">Datos del establecimiento</h3>
       <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs mb-6 px-2">
          <div className="flex gap-2">
            <span className="font-bold w-32">Razón Social:</span>
            <span className="border-b border-dotted border-gray-400 flex-1">{establishment.razonSocial || establishment.name}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-32">C.U.I.T.:</span>
            <span className="border-b border-dotted border-gray-400 flex-1">{establishment.cuit || '-'}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-32">Dirección:</span>
            <span className="border-b border-dotted border-gray-400 flex-1">{establishment.address || '-'}</span>
          </div>
           <div className="flex gap-2">
            <span className="font-bold w-32">Localidad:</span>
            <span className="border-b border-dotted border-gray-400 flex-1">{establishment.city || '-'}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-32">C.P.:</span>
            <span className="border-b border-dotted border-gray-400 flex-1">{establishment.postalCode || '-'}</span>
          </div>
           <div className="flex gap-2">
            <span className="font-bold w-32">Provincia:</span>
            <span className="border-b border-dotted border-gray-400 flex-1">{establishment.province || '-'}</span>
          </div>
       </div>
    </div>
  );

  const MeasurementDataBlock = ({ measurement }: { measurement: Measurement }) => (
    <div className="mb-6 text-xs break-inside-avoid">
       <h3 className="font-bold text-sm uppercase mb-2 bg-gray-200 p-1 pl-2 border-l-4 border-black">Datos para la medición</h3>
       
       <div className="grid grid-cols-1 gap-2 mb-4 px-2">
          <div className="flex gap-2">
            <span className="font-bold w-48">Marca, modelo y número de serie del instrumento utilizado:</span>
            <span className="border-b border-dotted border-gray-400 flex-1">
                {measurement.details?.brand} {measurement.details?.model} - Serie: {measurement.details?.serialNumber}
            </span>
          </div>
          <div className="flex gap-2">
            <span className="font-bold w-48">Fecha del certificado de calibración:</span>
            <span className="border-b border-dotted border-gray-400 flex-1">{measurement.details?.calibrationDate || '-'}</span>
          </div>
          <div className="grid grid-cols-3 gap-4">
              <div className="flex gap-2">
                <span className="font-bold">Fecha de medición:</span>
                <span className="border-b border-dotted border-gray-400 flex-1">{safeFormatDate(measurement.details?.measurementDate, "dd/MM/yyyy")}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold">Hora inicio:</span>
                <span className="border-b border-dotted border-gray-400 flex-1">{measurement.details?.startTime || '-'}</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold">Hora fin:</span>
                <span className="border-b border-dotted border-gray-400 flex-1">{measurement.details?.endTime || '-'}</span>
              </div>
          </div>
       </div>

       <div className="space-y-4 px-2">
           <div>
               <span className="font-bold block mb-1">Horarios/turnos habituales de trabajo:</span>
               <div className="border border-gray-300 p-2 min-h-[40px] bg-gray-50/50">{measurement.details?.workShifts || '-'}</div>
           </div>
           
           <div>
               <span className="font-bold block mb-1">Describa las condiciones normales y/o habituales de trabajo:</span>
               <div className="border border-gray-300 p-2 min-h-[60px] bg-gray-50/50">{measurement.details?.normalConditions || '-'}</div>
           </div>

           <div>
               <span className="font-bold block mb-1">Describa las condiciones de trabajo al momento de la medición:</span>
               <div className="border border-gray-300 p-2 min-h-[60px] bg-gray-50/50">{measurement.details?.currentConditions || '-'}</div>
           </div>

           <div>
               <span className="font-bold block mb-1">Condiciones atmosféricas durante la medición:</span>
               <div className="grid grid-cols-3 gap-4 border border-gray-300 p-2 bg-gray-50/50">
                  <div>T: {establishment.conditions?.temperature || '-'} °C</div>
                  <div>H: {establishment.conditions?.humidity || '-'} %</div>
                  <div>P: {establishment.conditions?.pressure || '-'} mmHg</div>
               </div>
           </div>
           
           <div>
               <span className="font-bold block mb-1">Documentación que se adjuntará a la medición:</span>
               <ul className="list-disc list-inside pl-2">
                   {measurement.attachedDocuments?.calibrationCertificate && <li>Certificado de calibración</li>}
                   {measurement.attachedDocuments?.sketch && <li>Croquis</li>}
                   {measurement.attachedDocuments?.measurementProof && <li>Prueba de Medición (Foto)</li>}
                   {!measurement.attachedDocuments?.calibrationCertificate && !measurement.attachedDocuments?.sketch && !measurement.attachedDocuments?.measurementProof && <li>-</li>}
               </ul>
           </div>
       </div>
    </div>
  );

  const renderLightingProtocol = (items: { sectorName: string; measurement: Measurement }[]) => {
    // Flatten items to get a list of all lighting measurements
    const lightingMeasurements = items.map(item => ({
        ...item.measurement,
        sectorName: item.sectorName
    }));

    return (
    <div className="space-y-8 break-inside-avoid">
       <ProtocolHeader title="PROTOCOLO DE MEDICIÓN DE ILUMINACIÓN EN EL AMBIENTE LABORAL" />
       
       <div className="mb-6">
            <h3 className="font-bold text-sm uppercase mb-2 bg-gray-200 p-1 pl-2 border-l-4 border-black">Tabla de Valores de Iluminación</h3>
            <table className="w-full text-[10px] border-collapse border border-black table-fixed">
                <thead>
                <tr className="bg-gray-100 text-black font-bold uppercase text-center h-12 align-middle">
                    <th className="border border-black p-1 w-12">Punto</th>
                    <th className="border border-black p-1 w-12">(24) Hora</th>
                    <th className="border border-black p-1 w-24">(25) Sector</th>
                    <th className="border border-black p-1 w-32">(26) Sección / Puesto</th>
                    <th className="border border-black p-1 w-20">(27) Tipo Ilum.</th>
                    <th className="border border-black p-1 w-20">(28) Fuente Lumínica</th>
                    <th className="border border-black p-1 w-20">(29) Iluminación</th>
                    <th className="border border-black p-1 w-24">(30) Uniformidad<br/>E min ≥ E med/2</th>
                    <th className="border border-black p-1 w-16">(31) Valor Medido (Lux)</th>
                    <th className="border border-black p-1 w-16">(32) Valor Legal</th>
                </tr>
                </thead>
                <tbody>
                    {lightingMeasurements.map((m, index) => {
                         const values = m.points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
                         const eAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
                         const eMin = values.length > 0 ? Math.min(...values) : 0;
                         const halfAvg = eAvg / 2;
                         const compliesUniformity = eAvg > 0 ? eMin >= halfAvg : false;
                         const uniformityText = `${eMin} ${compliesUniformity ? '≥' : '<'} ${Math.round(halfAvg)}`;

                         return (
                            <tr key={m.id} className="bg-white hover:bg-gray-50 text-center border-b border-black">
                                <td className="border border-black p-1 font-bold">{String(index + 1).padStart(2, '0')}</td>
                                <td className="border border-black p-1">{m.details?.startTime || '-'}</td>
                                <td className="border border-black p-1 font-medium">{m.sectorName}</td>
                                <td className="border border-black p-1 text-left pl-2">{m.name || m.sectorName}</td>
                                <td className="border border-black p-1 capitalize">{m.config?.lightingType === 'mixed' ? 'Mixta' : 'Artificial'}</td>
                                <td className="border border-black p-1">{m.config?.artifactType || 'LED'}</td>
                                <td className="border border-black p-1 capitalize">{m.config?.lightingSystemType === 'localized' ? 'Localizada' : m.config?.lightingSystemType === 'mixed' ? 'Mixta' : 'General'}</td>
                                <td className={`border border-black p-1 ${!compliesUniformity ? 'text-red-600 font-bold' : ''}`}>
                                    {eAvg > 0 ? uniformityText : 'NA'}
                                </td>
                                <td className={`border border-black p-1 font-bold ${m.status === 'non_compliant' ? 'text-red-600' : ''}`}>
                                    {eAvg || 'NA'}
                                </td>
                                <td className="border border-black p-1">{m.config?.limit || '-'}</td>
                            </tr>
                         );
                    })}
                </tbody>
            </table>
       </div>

       {/* Conclusions Block */}
       <div className="border border-black p-4 bg-gray-50 break-inside-avoid">
            <h4 className="font-bold text-sm uppercase mb-2 underline">Conclusión General de Iluminación:</h4>
            <p className="text-xs text-justify leading-relaxed">
                {establishment.conclusions || "Se han realizado las mediciones de iluminación en los puestos indicados. Los valores en rojo indican incumplimiento con la normativa vigente (Res. SRT 84/12)."}
            </p>
       </div>

       {/* Memoria de Calculos Table */}
       <div className="mt-8 break-inside-avoid w-full">
           <h3 className="font-bold text-sm uppercase mb-2 bg-gray-200 p-1 pl-2 border-l-4 border-black">Memoria de Calculos</h3>
           <div className="w-full">
               <table className="w-full text-[9px] border-collapse border border-black table-fixed">
                  <thead>
                    <tr className="bg-white text-center font-bold text-[8px] h-8">
                       <th className="border border-black p-1 w-[3%]" rowSpan={2}>#</th>
                       <th className="border border-black p-1 w-[12%]" rowSpan={2}>Sector</th>
                       <th className="border border-black p-1 w-[12%]" colSpan={3}>Dimensiones</th>
                       <th className="border border-black p-1 w-[8%]" colSpan={2}>Índices</th>
                       <th className="border border-black p-1 w-[3%]" rowSpan={2}>Ptos</th>
                       <th className="border border-black p-1" colSpan={9}>Iluminancia por Punto Monitoreado (LUX)</th>
                       <th className="border border-black p-1 w-[4%]" rowSpan={2}>Max</th>
                       <th className="border border-black p-1 w-[4%]" rowSpan={2}>Min</th>
                       <th className="border border-black p-1 w-[8%]" rowSpan={2}>Uniformidad</th>
                       <th className="border border-black p-1 w-[4%] bg-blue-100" rowSpan={2}>Med</th>
                       <th className="border border-black p-1 w-[4%]" rowSpan={2}>Lim</th>
                       <th className="border border-black p-1 w-[3%]" rowSpan={2}>Uni</th>
                       <th className="border border-black p-1 w-[3%]" rowSpan={2}>Lim</th>
                    </tr>
                    <tr className="bg-white text-center font-bold text-[8px] h-6">
                       <th className="border border-black p-0.5">An</th>
                       <th className="border border-black p-0.5">Lg</th>
                       <th className="border border-black p-0.5">Al</th>
                       <th className="border border-black p-0.5">K</th>
                       <th className="border border-black p-0.5">Min</th>
                       {[1,2,3,4,5,6,7,8,9].map(i => <th key={i} className="border border-black p-0.5 w-[3%]">{i}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                     {lightingMeasurements.map((m, index) => {
                         const values = m.points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
                         const eAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
                         const eMin = values.length > 0 ? Math.min(...values) : 0;
                         const eMax = values.length > 0 ? Math.max(...values) : 0;
                         const halfAvg = eAvg / 2;
                         const compliesUniformity = eAvg > 0 ? eMin >= halfAvg : false;
                         const compliesLimit = (m.config?.limit || 0) > 0 ? eAvg >= (m.config?.limit || 0) : true;
                         
                         // Determine number of rows needed for points (9 cols)
                         const pointRows = Math.ceil(Math.max(values.length, 1) / 9);
                         
                         // Calculate K Index for display
                         const l = m.config?.length || 0;
                         const w = m.config?.width || 0;
                         const h = m.config?.height || 0;
                         const hm = m.config?.workPlaneHeight || 0.85;
                         const h_mount = hm ? (h - hm) : h;
                         const kIndex = (l && w && h_mount > 0) ? ((l * w) / (h_mount * (l + w))).toFixed(2) : '-';

                         return (
                            <tr key={m.id} className="text-center bg-white text-[9px] border-b border-black break-inside-avoid">
                                <td className="border border-black p-1">{index + 1}</td>
                                <td className="border border-black p-1 text-left px-1 break-words leading-tight" title={m.name || m.sectorName}>
                                    {m.name || m.sectorName}
                                </td>
                                <td className="border border-black p-1">{m.config?.width || '-'}</td>
                                <td className="border border-black p-1">{m.config?.length || '-'}</td>
                                <td className="border border-black p-1">{m.config?.height || '-'}</td>
                                <td className="border border-black p-1">{kIndex}</td>
                                <td className="border border-black p-1">-</td>
                                <td className="border border-black p-1">{values.length}</td>
                                
                                {/* Render 9 columns for points */}
                                {Array.from({ length: 9 }).map((_, colIdx) => (
                                    <td key={colIdx} className="border border-black p-0 align-top bg-yellow-50/30">
                                        <div className="flex flex-col">
                                            {Array.from({ length: pointRows }).map((_, rowIdx) => {
                                                const valIndex = rowIdx * 9 + colIdx;
                                                const val = values[valIndex];
                                                return (
                                                    <div key={rowIdx} className={`h-4 flex items-center justify-center border-b border-gray-100 last:border-0 text-[8px] ${valIndex >= values.length ? 'invisible' : ''}`}>
                                                        {val !== undefined ? val : ''}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </td>
                                ))}

                                <td className="border border-black p-1">{eMax}</td>
                                <td className="border border-black p-1">{eMin}</td>
                                <td className="border border-black p-1 whitespace-nowrap text-[8px]">
                                    {eMin} {compliesUniformity ? '≥' : '<'} {Math.round(halfAvg)}
                                </td>
                                <td className="border border-black p-1 bg-blue-50 font-bold">{eAvg}</td>
                                <td className="border border-black p-1">{m.config?.limit || '-'}</td>
                                <td className={`border border-black p-1 font-bold ${compliesUniformity ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {compliesUniformity ? 'SI' : 'NO'}
                                </td>
                                <td className={`border border-black p-1 font-bold ${compliesLimit ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {compliesLimit ? 'SI' : 'NO'}
                                </td>
                            </tr>
                         );
                     })}
                  </tbody>
               </table>
           </div>
       </div>
    </div>
  );
  };

  const COLD_STRESS_RECOMMENDATIONS = (
    <div className="mt-8 p-6 bg-blue-50/50 border border-blue-100 rounded-lg text-xs leading-relaxed text-gray-700 break-inside-avoid">
        <h3 className="font-bold text-blue-800 text-sm uppercase mb-3 border-b border-blue-200 pb-2">Recomendaciones Para Prevenir el Estrés por Frío</h3>
        <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>Hay que proveer a los trabajadores de ropa aislante seca adecuada para mantener la temperatura del cuerpo por encima de los 36º C.</li>
            <li>A temperaturas del aire de 2°C o menos es imperativo que si el trabajador tiene vestimenta húmeda o mojada en zona fría, deberá cambiarse y ponerse ropa seca.</li>
            <li>Usar manoplas aislantes del frío y evitar que la piel al descubierto entre en contacto con el ambiente frío.</li>
            <li>Los trabajadores de más edad o aquellos que tiene problemas circulatorios, requieren especial protección preventiva contra las lesiones por el frío.</li>
            <li>Si hay que realizar trabajos de precisión con las manos al descubierto durante más de 20 minutos en un ambiente por debajo de los 16º C, se deben tomar medidas adecuadas para mantener las manos calientes (aire caliente, aparatos de calefacción, placas calientes, etc.).</li>
            <li>Para trabajos sedentarios para temperaturas menores de 16°C, trabajos ligeros con temperaturas menores de 4°C, los trabajadores deben usar guantes.</li>
            <li>En las cámaras frigoríficas, la velocidad del aire se debe minimizar cuando sea posible, no sobrepasando el valor de 1m/seg en el lugar de trabajo, lo cual se puede conseguir mediante sistemas de distribución de aire diseñados de manera apropiada.</li>
            <li>En todo lugar de trabajo en que la temperatura esté por debajo de los 16°C se debe disponer de termometría adecuada, para cumplir con los requisitos de los valores limites por temperatura.</li>
            <li>Siempre que la temperatura del aire en un lugar de trabajo descienda por debajo de –1º C, cada 4 horas, por lo menos, se deberá medir y registrar la temperatura del bulbo seco.</li>
            <li>Si el trabajo se realiza en un medio ambiente a o por debajo de 4º C, hay que proveer protección corporal adicional. Los trabajadores llevarán ropa protectora adecuada para el nivel de frío y la actividad física cuando:
                <ol className="list-decimal pl-5 mt-2 space-y-1 text-gray-600">
                    <li>La velocidad del aire en el lugar de trabajo aumenta con el viento, corrientes de aire o equipos de ventilación artificial, el efecto del enfriamiento por el viento se reducirá protegiendo (apantallando) la zona de trabajo o bien usando una prenda exterior de capas cortaviento fácil de quitar.</li>
                    <li>Los trabajadores se cambiarán a intervalos diarios regulares de medias y de todas las plantillas de fieltro que se puedan quitar, o bien se usarán botas impermeables que eviten la absorción de la humedad.</li>
                    <li>La frecuencia óptima del cambio de ropa se determinar de manera empírica, variando con el individuo y según el tipo de calzado que se use y la cantidad de sudoración de los pies del individuo.</li>
                </ol>
            </li>
            <li>Para los trabajos a una temperatura equivalente de enfriamiento (TEE) de o por debajo de -12°C (10,4°F) se aplicará lo siguiente:
                <ol start={4} className="list-decimal pl-5 mt-2 space-y-1 text-gray-600">
                    <li>El trabajador estará constantemente en observación a efectos de protección (sistema de parejas o supervisión).</li>
                    <li>El ritmo de trabajo no debe ser tan elevado que haga sudar fuertemente, lo que daría lugar a que la ropa se humedeciera. Si hay que hacer un trabajo pesado, deben establecerse períodos de descanso, dando a los trabajadores oportunidad para que se cambien y pongan ropa seca.</li>
                    <li>A los empleados de nuevo ingreso no se les exigirá, en los primeros días, que trabajen la jornada completa expuesta al frío hasta que se acostumbren a las condiciones de trabajo y la vestimenta protectora que se requiera.</li>
                    <li>Al calcular el rendimiento laboral exigido y los pesos que deberá levantar el trabajador, se incluirán el peso y el volumen de la ropa.</li>
                    <li>El trabajo se dispondrá de tal manera que la permanencia de pie o sentando completamente quieto se reduzca al mínimo. Al trabajador se le debe proteger de las corrientes cuanto sea posible.</li>
                    <li>A los trabajadores se les instruirá en los procedimientos de seguridad y sanidad. El programa de formación incluirá, como mínimo, instrucción en:
                        <ul className="list-[lower-alpha] pl-5 mt-1 space-y-0.5">
                            <li>Procedimientos apropiados de entrada en calor de nuevo y tratamiento adecuado de primeros auxilios.</li>
                            <li>Uso de ropa adecuada.</li>
                            <li>Hábitos apropiados de comidas y bebidas.</li>
                            <li>Reconocimiento de la congelación, inminente.</li>
                            <li>Reconocimiento de las señales y los síntomas de hipotermia inminente o enfriamiento excesivo del cuerpo, aun cuando no se llegue a tiritar.</li>
                            <li>Prácticas de trabajo seguro.</li>
                            <li>Prohibir el ingreso a la Cámara sin los Elementos Adecuados de Protección contra el Frío: Campera, Ropa de Trabajo (de algodón), Medias adecuadas, Calzado de Seguridad, Guantes adecuados.</li>
                        </ul>
                    </li>
                </ol>
            </li>
        </ul>
    </div>
  );

  const NOISE_INSTRUCTIONS = (
    <div className="mt-8 p-6 bg-gray-50 border border-gray-200 rounded-lg text-xs leading-relaxed text-gray-700 break-inside-avoid">
        <h3 className="font-bold text-gray-800 text-sm uppercase mb-3 border-b border-gray-300 pb-2">Instructivo para completar el protocolo de medición de ruido</h3>
        <div className="columns-2 gap-8">
            <ol className="list-decimal pl-5 space-y-1 text-[10px] text-gray-600">
                <li>Identificación del establecimiento, explotación o centro de trabajo donde se realiza la medición de ruido (razón social completa).</li>
                <li>Domicilio real del establecimiento, explotación o centro de trabajo donde se realiza la medición.</li>
                <li>Localidad del establecimiento, explotación o centro de trabajo donde se realiza la medición.</li>
                <li>Provincia en la cual se encuentra radicado el establecimiento, explotación o centro de trabajo donde se realiza la medición.</li>
                <li>Código Postal del establecimiento, explotación o centro de trabajo donde se realiza la medición.</li>
                <li>C.U.I.T. de la empresa o institución.</li>
                <li>Marca, modelo y número de serie del instrumento utilizado en la medición. Las mediciones de nivel sonoro continuo equivalente se efectuarán con un medidor de nivel sonoro integrador (decibelímetro), o con un dosímetro, que cumplan como mínimo con las exigencias señaladas para un instrumento Clase o Tipo 2, establecidas en las normas IRAM 4074 e IEC 804. Las mediciones de nivel sonoro pico se realizarán con un medidor de nivel sonoro con detector de pico.</li>
                <li>Fecha de la última calibración realizada en laboratorio al instrumento empleado en la medición.</li>
                <li>Fecha de la medición, o indicar en el caso de que el estudio lleve más de un día la fecha de la primera y de la última medición.</li>
                <li>Hora de inicio de la primera medición.</li>
                <li>Hora de finalización de la última medición.</li>
                <li>Indicar la duración de la jornada laboral en el establecimiento (en horas), la que deberá tenerse en cuenta para que la medición de ruido sea representativa de una jornada habitual.</li>
                <li>Detallar las condiciones normales y/o habituales de los puestos de trabajo a evaluar: enumeración y descripción de las fuentes de ruido presentes, condición de funcionamiento de las mismas.</li>
                <li>Detallar las condiciones de trabajo al momento de efectuar la medición de los puestos de trabajo a evaluar (si son diferentes a las condiciones normales descritas en el punto 13).</li>
                <li>Adjuntar copia del certificado de calibración del equipo, expedido por un laboratorio.</li>
                <li>Adjuntar plano o croquis del establecimiento, indicando los puntos en los que se realizaron las mediciones. El croquis deberá contar, como mínimo, con dimensiones, sectores, puestos.</li>
                <li>Identificación del establecimiento, explotación o centro de trabajo donde se realiza la medición de ruido (razón social completa).</li>
                <li>C.U.I.T. de la empresa o institución.</li>
                <li>Domicilio real del establecimiento, explotación o centro de trabajo donde se realiza la medición.</li>
                <li>Localidad del establecimiento, explotación o centro de trabajo donde se realiza la medición.</li>
                <li>Código Postal del establecimiento, explotación o centro de trabajo donde se realiza la medición.</li>
                <li>Provincia en la cual se encuentra radicada el establecimiento, explotación o centro de trabajo donde se realiza la medición.</li>
                <li>Punto de medición: Indicar mediante un número el puesto o puesto tipo donde realiza la medición, el cual deberá coincidir con el del plano o croquis que se adjunta al Protocolo.</li>
                <li>Sector de la empresa donde se realiza la medición.</li>
                <li>Puesto de trabajo, se debe indicar el lugar físico dentro del sector de la empresa donde se realiza la medición. Si existen varios puestos que son similares, se podrá tomarlos en conjunto como puesto tipo y en el caso de que se deba analizar un puesto móvil se deberá realizar la medición al trabajador mediante una dosimetría.</li>
                <li>Indicar el tiempo que los trabajadores se exponen al ruido en el puesto de trabajo. Cuando la exposición diaria se componga de dos o más períodos a distintos niveles de ruido, indicar la duración de cada uno de esos períodos.</li>
                <li>Tiempo de integración o de medición, este debe representar como mínimo un ciclo típico de trabajo, teniendo en cuenta los horarios y turnos de trabajo y debe ser expresado en horas o minutos.</li>
                <li>Indicar el tipo de ruido a medir, continuo o intermitente / ruido de impulso o de impacto.</li>
                <li>Indicar el nivel pico ponderado C de presión acústica obtenido para el ruido de impulso o impacto, LCpico en dBC, obtenido con un medidor de nivel sonoro con detector de pico (Ver Anexo V, de la Resolución MTEySS 295/03).</li>
                <li>Indicar el nivel de presión acústica correspondiente a la jornada laboral completa, midiendo el nivel sonoro continuo equivalente (LAeq,Te, en dBA). Cuando la exposición diaria se componga de dos o más períodos a distintos niveles de ruido, indicar el nivel sonoro continuo equivalente de cada uno de esos períodos. (NOTA: Completar este campo solo cuando no se cumpla con la condición del punto 31).</li>
                <li>Cuando la exposición diaria se componga de dos o más períodos a distintos niveles de ruido, y luego de haber completado las correspondientes celdas para cada uno de esos períodos (ver referencias 27 y 30), en esta columna se deberá indicar el resultado de la suma de las siguientes fracciones: C1 / T1 + C2 / T2 +...+ Cn / Tn. (Ver Anexo V, de la Resolución MTEySS 295/03). Adjuntar los calculos. (NOTA: Completar este campo solo para sonidos con niveles estables de por lo menos 3 segundos).</li>
                <li>Indicar la dosis de ruido (en porcentaje), obtenida mediante un dosímetro fijado para un índice de conversión de 3dB y un nivel sonoro equivalente de 85 dBA como criterio para las 8 horas de jornada laboral. (Ver Anexo V, de la Resolución MTEySS 295/03). (NOTA: Completar este campo solo cuando la medición se realice con un dosímetro).</li>
                <li>Indicar si se cumple con el nivel de ruido máximo permitido para el tiempo de exposición. Responder: SI o NO.</li>
                <li>Espacio para agregar información adicional de importancia.</li>
                <li>Identificación del establecimiento, explotación o centro de trabajo donde se realiza la medición de ruido (razón social completa).</li>
                <li>C.U.I.T. de la empresa o institución.</li>
                <li>Domicilio real del establecimiento, explotación o centro de trabajo donde se realiza la medición.</li>
                <li>Localidad del establecimiento, explotación o centro de trabajo donde se realiza la medición.</li>
                <li>Código Postal del establecimiento, explotación o centro de trabajo donde se realiza la medición.</li>
                <li>Provincia en la cual se encuentra radicada el establecimiento, explotación o centro de trabajo donde se realiza la medición.</li>
                <li>Indicar las conclusiones a las que se arribó, una vez analizados los resultados obtenidos en las mediciones.</li>
                <li>Indicar las recomendaciones, después de analizar las conclusiones, para adecuar el nivel de ruido a la legislación vigente.</li>
            </ol>
        </div>
    </div>
  );

  const NOISE_REFERENCE_VALUES = (
    <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg text-xs leading-relaxed text-gray-700 break-inside-avoid">
        <h3 className="font-bold text-gray-800 text-sm uppercase mb-3 border-b border-gray-300 pb-2 text-center bg-gray-100 p-2">Valores de Referencia</h3>
        <p className="mb-4 italic">El criterio de evaluación a seguir luego de las mediciones es el indicado en el Anexo V de la Resolución 295/2003 del MTEySS.</p>
        
        <div className="overflow-x-auto mb-4">
            <table className="w-full text-center border-collapse border border-gray-400">
                <thead>
                    <tr className="bg-gray-100 text-gray-800 font-bold">
                        <th className="border border-gray-400 p-2">Duración por Día</th>
                        <th className="border border-gray-400 p-2">Nivel de Presión Acústica dBA*</th>
                        <th className="border border-gray-400 p-2 w-1/3">Observaciones</th>
                    </tr>
                </thead>
                <tbody>
                    {/* Horas */}
                    <tr>
                        <td className="border border-gray-400 p-2 font-bold text-left bg-gray-50" colSpan={3}>Horas</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 p-1">24</td>
                        <td className="border border-gray-400 p-1">80</td>
                        <td className="border border-gray-400 p-2 text-left text-[10px]" rowSpan={6}>
                            º No ha de haber exposiciones al ruido continuo o intermitente o de impacto por encima de un nivel pico C ponderado de 140 dBA
                        </td>
                    </tr>
                    <tr><td className="border border-gray-400 p-1">16</td><td className="border border-gray-400 p-1">82</td></tr>
                    <tr><td className="border border-gray-400 p-1">8</td><td className="border border-gray-400 p-1">85</td></tr>
                    <tr><td className="border border-gray-400 p-1">4</td><td className="border border-gray-400 p-1">88</td></tr>
                    <tr><td className="border border-gray-400 p-1">2</td><td className="border border-gray-400 p-1">91</td></tr>
                    <tr><td className="border border-gray-400 p-1">1</td><td className="border border-gray-400 p-1">94</td></tr>

                    {/* Minutos */}
                    <tr>
                        <td className="border border-gray-400 p-2 font-bold text-left bg-gray-50" colSpan={3}>Minutos</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 p-1">30</td>
                        <td className="border border-gray-400 p-1">97</td>
                        <td className="border border-gray-400 p-2 text-left text-[10px]" rowSpan={6}>
                           *El nivel de presión acústica en decibeles se mide con un sonómetro, usando el filtro de ponderación frecuencial A y respuesta lenta
                        </td>
                    </tr>
                    <tr><td className="border border-gray-400 p-1">15</td><td className="border border-gray-400 p-1">100</td></tr>
                    <tr><td className="border border-gray-400 p-1">7,5**</td><td className="border border-gray-400 p-1">103</td></tr>
                    <tr><td className="border border-gray-400 p-1">3,75**</td><td className="border border-gray-400 p-1">106</td></tr>
                    <tr><td className="border border-gray-400 p-1">1,88**</td><td className="border border-gray-400 p-1">109</td></tr>
                    <tr><td className="border border-gray-400 p-1">0,94**</td><td className="border border-gray-400 p-1">112</td></tr>

                    {/* Segundos */}
                    <tr>
                        <td className="border border-gray-400 p-2 font-bold text-left bg-gray-50" colSpan={3}>Segundos**</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 p-1">28,12</td>
                        <td className="border border-gray-400 p-1">115</td>
                        <td className="border border-gray-400 p-2 text-left text-[10px]" rowSpan={9}>
                            **Limitado por la fuente de ruido y no por control administrativo. También se recomienda utilizar un dosímetro o un medidor de integración de nivel sonoro para sonidos por encima de los 120 decibeles
                        </td>
                    </tr>
                    <tr><td className="border border-gray-400 p-1">14,06</td><td className="border border-gray-400 p-1">118</td></tr>
                    <tr><td className="border border-gray-400 p-1">7,03</td><td className="border border-gray-400 p-1">121</td></tr>
                    <tr><td className="border border-gray-400 p-1">3,52</td><td className="border border-gray-400 p-1">124</td></tr>
                    <tr><td className="border border-gray-400 p-1">1,76</td><td className="border border-gray-400 p-1">127</td></tr>
                    <tr><td className="border border-gray-400 p-1">0,88</td><td className="border border-gray-400 p-1">130</td></tr>
                    <tr><td className="border border-gray-400 p-1">0,44</td><td className="border border-gray-400 p-1">133</td></tr>
                    <tr><td className="border border-gray-400 p-1">0,22</td><td className="border border-gray-400 p-1">136</td></tr>
                    <tr><td className="border border-gray-400 p-1">0,11</td><td className="border border-gray-400 p-1">139</td></tr>
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderNoiseProtocol = (items: { sectorName: string; measurement: Measurement }[]) => (
    <div className="space-y-8">
       {items.map(({ sectorName, measurement }, index) => (
         <div key={measurement.id} className={`break-inside-avoid mb-12 ${index > 0 ? 'break-before-page' : ''}`}>
            <ProtocolHeader title="PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL (Res. 295/03)" />
            
            <div className="mb-2 font-bold text-lg text-primary uppercase border-b border-primary pb-1">
                Sector: {sectorName}
            </div>

            <MeasurementDataBlock measurement={measurement} />

            <div className="mt-6">
                <h3 className="font-bold text-sm uppercase mb-2 bg-gray-200 p-1 pl-2 border-l-4 border-black">Datos de la Medición</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse border border-black">
                        <thead>
                        <tr className="bg-gray-100 text-black font-bold uppercase text-center align-middle">
                            <th className="border border-black p-1 w-8">Pto</th>
                            <th className="border border-black p-1 w-24">Sector</th>
                            <th className="border border-black p-1">Puesto / Tipo</th>
                            <th className="border border-black p-1 w-12">T. Expo (Te)</th>
                            <th className="border border-black p-1 w-12">T. Integ</th>
                            <th className="border border-black p-1 w-16">Caract. Ruido</th>
                            <th className="border border-black p-1 w-16 bg-gray-50">
                                RUIDO IMPULSO<br/>LC pico (dBC)
                            </th>
                            <th className="border border-black p-1 w-16 bg-gray-100">
                                SONIDO CONT.<br/>LAeq,Te (dBA)
                            </th>
                            <th className="border border-black p-1 w-12">Suma Fracc</th>
                            <th className="border border-black p-1 w-12">Dosis %</th>
                            <th className="border border-black p-1 w-12">Cumple?</th>
                        </tr>
                        </thead>
                        <tbody>
                            {measurement.points.map((point, idx) => {
                                const values = point.values;
                                const isCompliant = values.cumple === 'SI';
                                return (
                                <tr key={point.id} className="bg-white hover:bg-gray-50 text-center">
                                    <td className="border border-black p-1 font-bold">{point.label.replace('Punto ', '')}</td>
                                    <td className="border border-black p-1">{sectorName}</td>
                                    <td className="border border-black p-1 text-left pl-2">{values.puesto || point.notes || '-'}</td>
                                    <td className="border border-black p-1">{values.tiempo_exposicion || '-'}</td>
                                    <td className="border border-black p-1">{values.tiempo_integracion || '-'}</td>
                                    <td className="border border-black p-1 capitalize">{values.caracteristicas || '-'}</td>
                                    <td className="border border-black p-1">{values.nivel_pico_c || '-'}</td>
                                    <td className="border border-black p-1 font-bold bg-gray-50">{values.nivel_continuo_eq || '-'}</td>
                                    <td className="border border-black p-1">{values.suma_fracciones || '-'}</td>
                                    <td className="border border-black p-1">{values.dosis || '-'}</td>
                                    <td className={`border border-black p-1 font-bold ${isCompliant ? 'text-black' : 'text-red-600'}`}>
                                        {values.cumple || '-'}
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Conclusions specific to this measurement */}
            <div className="mt-6 border border-black p-4 bg-gray-50 break-inside-avoid">
                <h4 className="font-bold text-sm uppercase mb-2 underline">Conclusión:</h4>
                <p className="text-xs text-justify leading-relaxed">
                    {measurement.specificConclusions || "Sin conclusión específica registrada."}
                </p>
                {measurement.analysisAndImprovements && (
                    <>
                        <h4 className="font-bold text-sm uppercase mt-4 mb-2 underline">Recomendaciones:</h4>
                        <p className="text-xs text-justify leading-relaxed">
                            {measurement.analysisAndImprovements}
                        </p>
                    </>
                )}
            </div>
            
            {/* Attached Noise Reference Values / Instructions if needed per measurement? No, usually at end. */}
         </div>
       ))}
       {/* Global References for Noise */}
       <div className="break-inside-avoid">
           {NOISE_REFERENCE_VALUES}
       </div>
    </div>
  );

  const THERMAL_LOAD_REFERENCE_VALUES = (
    <div className="mt-8 p-6 bg-white border border-gray-200 rounded-lg text-xs leading-relaxed text-gray-700 break-inside-avoid">
        <h3 className="font-bold text-gray-800 text-sm uppercase mb-3 border-b border-gray-300 pb-2 text-center bg-gray-100 p-2">Valores de Referencia</h3>
        <p className="mb-4 italic">El consumo metabólico se ha estimado mediante la clasificación expuesta en la Tabla 1 del Anexo III de la Res. 295/2003 y resume a continuación:</p>
        
        <div className="overflow-x-auto mb-4">
            <table className="w-full text-center border-collapse border border-gray-400">
                <thead>
                    <tr className="bg-gray-100 text-gray-800 font-bold">
                        <th className="border border-gray-400 p-2" colSpan={2}>Referencia para la determinación de MI</th>
                        <th className="border border-gray-400 p-2" colSpan={2}>Referencia para la determinación de MII</th>
                        <th className="border border-gray-400 p-2 w-1/4">Factores de Exposición</th>
                    </tr>
                    <tr className="bg-gray-50 text-gray-800 font-bold text-[10px]">
                        <th className="border border-gray-400 p-1">Posición del cuerpo</th>
                        <th className="border border-gray-400 p-1 w-12">MI [W]</th>
                        <th className="border border-gray-400 p-1">Tipo de trabajo</th>
                        <th className="border border-gray-400 p-1 w-12">MII [W]</th>
                        <th className="border border-gray-400 p-1 bg-white border-b-0"></th>
                    </tr>
                </thead>
                <tbody className="text-[10px]">
                    <tr>
                        <td className="border border-gray-400 p-1 text-left">Acostado o sentado</td>
                        <td className="border border-gray-400 p-1">21</td>
                        <td className="border border-gray-400 p-1 text-left">Trabajo manual ligero</td>
                        <td className="border border-gray-400 p-1">28</td>
                        <td className="border border-gray-400 p-1 text-left">Gasto Energético del Trabajo</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 p-1 text-left text-red-600 font-bold">De pie</td>
                        <td className="border border-gray-400 p-1 text-red-600 font-bold">42</td>
                        <td className="border border-gray-400 p-1 text-left">Trabajo manual pesado</td>
                        <td className="border border-gray-400 p-1">63</td>
                        <td className="border border-gray-400 p-1 text-left">Temperatura de Aire</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 p-1 text-left">Caminando</td>
                        <td className="border border-gray-400 p-1">140</td>
                        <td className="border border-gray-400 p-1 text-left">Trabajo con un brazo ligero</td>
                        <td className="border border-gray-400 p-1">70</td>
                        <td className="border border-gray-400 p-1 text-left">Humedad del Aire</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 p-1 text-left">Subiendo pendiente</td>
                        <td className="border border-gray-400 p-1">210</td>
                        <td className="border border-gray-400 p-1 text-left">Trabajo con un brazo pesado</td>
                        <td className="border border-gray-400 p-1">126</td>
                        <td className="border border-gray-400 p-1 text-left">Movimiento del Aire</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 p-1 bg-gray-50" colSpan={2}></td>
                        <td className="border border-gray-400 p-1 text-left text-red-600 font-bold">Trabajo con ambos brazos ligero</td>
                        <td className="border border-gray-400 p-1 text-red-600 font-bold">105</td>
                        <td className="border border-gray-400 p-1 text-left">Intercambio de calor radiante</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 p-1 bg-gray-50" colSpan={2}></td>
                        <td className="border border-gray-400 p-1 text-left">Trabajo con ambos brazos pesado</td>
                        <td className="border border-gray-400 p-1">175</td>
                        <td className="border border-gray-400 p-1 text-left">Requisitos de la Ropa</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 p-1 bg-gray-50" colSpan={2}></td>
                        <td className="border border-gray-400 p-1 text-left">Trabajo con el cuerpo ligero</td>
                        <td className="border border-gray-400 p-1">210</td>
                        <td className="border border-gray-400 p-1 text-left">Operación de Horno eléctrico</td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 p-1 bg-gray-50" colSpan={2}></td>
                        <td className="border border-gray-400 p-1 text-left">Trabajo con el cuerpo moderado</td>
                        <td className="border border-gray-400 p-1">350</td>
                        <td className="border border-gray-400 p-1 bg-gray-50"></td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 p-1 bg-gray-50" colSpan={2}></td>
                        <td className="border border-gray-400 p-1 text-left">Trabajo con el cuerpo pesado</td>
                        <td className="border border-gray-400 p-1">490</td>
                        <td className="border border-gray-400 p-1 bg-gray-50"></td>
                    </tr>
                    <tr>
                        <td className="border border-gray-400 p-1 bg-gray-50" colSpan={2}></td>
                        <td className="border border-gray-400 p-1 text-left">Trabajo con el cuerpo muy pesado</td>
                        <td className="border border-gray-400 p-1">630</td>
                        <td className="border border-gray-400 p-1 bg-gray-50"></td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderThermalLoadProtocol = (items: { sectorName: string; measurement: Measurement }[]) => (
    <div className="space-y-8">
       {items.map(({ sectorName, measurement }, index) => (
         <div key={measurement.id} className={`break-inside-avoid mb-12 ${index > 0 ? 'break-before-page' : ''}`}>
            <ProtocolHeader title="PROTOCOLO DE MEDICIÓN DE CARGA TÉRMICA EN EL AMBIENTE LABORAL" />
            
            <div className="mb-2 font-bold text-lg text-primary uppercase border-b border-primary pb-1">
                Sector: {sectorName}
            </div>

            <MeasurementDataBlock measurement={measurement} />

            <div className="mt-6">
                <h3 className="font-bold text-sm uppercase mb-2 bg-gray-200 p-1 pl-2 border-l-4 border-black">Datos de la Medición</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse border border-black">
                        <thead>
                        <tr className="bg-gray-100 text-black font-bold uppercase text-center align-middle">
                            <th className="border border-black p-1 w-12" rowSpan={2}>Punto</th>
                            <th className="border border-black p-1" rowSpan={2}>Sector</th>
                            <th className="border border-black p-1" rowSpan={2}>Puesto / Puesto Tipo</th>
                            <th className="border border-black p-1 w-16" rowSpan={2}>Tiempo Expo (Hs)</th>
                            <th className="border border-black p-1 w-16" rowSpan={2}>Tiempo Int.</th>
                            <th className="border border-black p-1 w-20" rowSpan={2}>Carac. Expo</th>
                            <th className="border border-black p-1" colSpan={4}>Variables Termohigrométricas</th>
                            <th className="border border-black p-1 w-12" rowSpan={2}>Adicional Ropa</th>
                            <th className="border border-black p-1 w-16" rowSpan={2}>Estado</th>
                            <th className="border border-black p-1 w-20" rowSpan={2}>Exigencia</th>
                            <th className="border border-black p-1 w-12" rowSpan={2}>Límite Legal</th>
                            <th className="border border-black p-1 w-12" rowSpan={2}>Cumple</th>
                        </tr>
                        <tr className="bg-gray-100 text-black font-bold uppercase text-center">
                             <th className="border border-black p-1 w-10">TBS (°C)</th>
                             <th className="border border-black p-1 w-10">TBH (°C)</th>
                             <th className="border border-black p-1 w-10">TG (°C)</th>
                             <th className="border border-black p-1 w-10 bg-gray-200">TGBH (°C)</th>
                        </tr>
                        </thead>
                        <tbody>
                            {measurement.points.map(p => (
                                <tr key={p.id} className="bg-white hover:bg-gray-50 text-center">
                                    <td className="border border-black p-1 font-bold">{p.label.replace('Punto ', '')}</td>
                                    <td className="border border-black p-1">{sectorName}</td>
                                    <td className="border border-black p-1">{p.notes || '-'}</td>
                                    <td className="border border-black p-1">{measurement.details?.duration ? measurement.details.duration.replace(' min', '') : '-'}</td>
                                    <td className="border border-black p-1">20 min</td>
                                    <td className="border border-black p-1">Intermitente</td>
                                    
                                    <td className="border border-black p-1">{p.values.tbs || '-'}</td>
                                    <td className="border border-black p-1">{p.values.tbh || '-'}</td>
                                    <td className="border border-black p-1">{p.values.tg || '-'}</td>
                                    <td className="border border-black p-1 font-bold bg-gray-100">{p.values.tgbh || '-'}</td>
                                    
                                    <td className="border border-black p-1">0</td>
                                    <td className="border border-black p-1">Aclimatado</td>
                                    <td className="border border-black p-1">Ligero</td>
                                    <td className="border border-black p-1">{measurement.config?.limit || '29.5'}</td>
                                    <td className="border border-black p-1 font-bold">
                                        {measurement.status === 'compliant' ? 'SI' : 'NO'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {/* Detailed Calculations per Point */}
             <div className="mt-8">
               <h3 className="font-bold text-sm uppercase mb-4 text-center border-b-2 border-black pb-1">Cálculo de Carga Térmica por Punto</h3>
               {measurement.points.map(point => {
                 // Try to parse values safely
                 const tgbh = Number(point.values.tgbh) || 0;
                 const mb = 70; // Metabolic Basal (approx standard)
                 const mi = Number(point.values.mi) || 0;
                 const mii = Number(point.values.mii) || 0;
                 const mTotal = mb + mi + mii;

                 return (
                   <div key={point.id} className="mb-8 border-2 border-black p-1 break-inside-avoid">
                     <div className="bg-gray-200 p-1 font-bold text-center text-xs border-b border-black">
                        Punto {point.label.replace('Punto ', '')}: {sectorName} - {point.notes || 'Sin descripción'}
                     </div>
                     
                     <div className="grid grid-cols-10 border-b border-black text-[10px]">
                        {/* Header Row */}
                        <div className="col-span-1 border-r border-black text-center font-bold bg-gray-100 p-1">1</div>
                        <div className="col-span-1 border-r border-black text-center font-bold bg-gray-100 p-1">2</div>
                        <div className="col-span-1 border-r border-black text-center font-bold bg-gray-100 p-1">3</div>
                        <div className="col-span-1 border-r border-black text-center font-bold bg-gray-100 p-1">4</div>
                        <div className="col-span-1 border-r border-black text-center font-bold bg-gray-100 p-1">5</div>
                        <div className="col-span-1 border-r border-black text-center font-bold bg-gray-100 p-1">6</div>
                        <div className="col-span-4 text-center font-bold bg-gray-100 p-1">7</div>
                     </div>

                     <div className="grid grid-cols-10 text-[10px]">
                        {/* Headers */}
                        <div className="col-span-1 border-r border-black text-center p-1 font-bold flex items-center justify-center">Magnitudes Evaluadas</div>
                        <div className="col-span-1 border-r border-black text-center p-1 font-bold flex items-center justify-center">TGBH</div>
                        <div className="col-span-1 border-r border-black text-center p-1 font-bold flex items-center justify-center">= 0.7TBH + 0.3TG</div>
                        <div className="col-span-1 border-r border-black text-center p-1 font-bold flex items-center justify-center">MB [W] = 70</div>
                        <div className="col-span-1 border-r border-black text-center p-1 font-bold flex items-center justify-center">MI [W]</div>
                        <div className="col-span-1 border-r border-black text-center p-1 font-bold flex items-center justify-center">MII [W]</div>
                        <div className="col-span-4 text-center p-1 font-bold flex items-center justify-center">Comentarios y Conclusiones</div>
                        
                        {/* Values Row */}
                        <div className="col-span-1 border-r border-black border-t border-black text-center p-2 font-bold bg-gray-50 flex items-center justify-center">Resultados</div>
                        <div className="col-span-1 border-r border-black border-t border-black text-center p-2 font-bold bg-white flex items-center justify-center">{tgbh}</div>
                        <div className="col-span-1 border-r border-black border-t border-black text-center p-2 font-bold bg-gray-100 flex items-center justify-center">-</div>
                        <div className="col-span-1 border-r border-black border-t border-black text-center p-2 font-bold bg-white flex items-center justify-center">{mb}</div>
                        <div className="col-span-1 border-r border-black border-t border-black text-center p-2 font-bold bg-white flex items-center justify-center">{mi}</div>
                        <div className="col-span-1 border-r border-black border-t border-black text-center p-2 font-bold bg-white flex items-center justify-center">{mii}</div>
                        
                        <div className="col-span-4 border-t border-black p-2 text-justify bg-white">
                            <div className="mb-2">
                                <span className="font-bold underline">Comentario:</span> {measurement.observations || 'Determinación de carga térmica.'}
                            </div>
                            <div>
                                <span className="font-bold underline">Conclusión:</span> {measurement.specificConclusions || 'Sin conclusión específica.'}
                            </div>
                        </div>
                     </div>
                     
                     <div className="border-t border-black bg-gray-100 p-1 text-center font-bold text-xs">
                        M [W] (Gasto Metabólico Total) = {mTotal} W
                     </div>
                   </div>
                 );
               })}
             </div>

            {/* Reference Tables Image/Block */}
            <div className="mt-8 break-inside-avoid">
                 {THERMAL_LOAD_REFERENCE_VALUES}
            </div>
         </div>
       ))}
    </div>
  );

  const renderGroundingProtocol = (items: { sectorName: string; measurement: Measurement }[]) => (
    <div className="space-y-8">
       {items.map(({ sectorName, measurement }, index) => (
         <div key={measurement.id} className={`break-inside-avoid mb-12 ${index > 0 ? 'break-before-page' : ''}`}>
            <ProtocolHeader title="PROTOCOLO DE MEDICIÓN DE PUESTA A TIERRA Y CONTINUIDAD DE MASAS (Res. 900/2015)" />
            
            <div className="mb-2 font-bold text-lg text-primary uppercase border-b border-primary pb-1">
                Sector: {sectorName}
            </div>

            <MeasurementDataBlock measurement={measurement} />

            <div className="mt-6">
                <h3 className="font-bold text-sm uppercase mb-2 bg-gray-200 p-1 pl-2 border-l-4 border-black">Datos de la Medición</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse border border-black">
                        <thead>
                            <tr className="bg-gray-100 text-black font-bold uppercase text-center align-middle">
                                <th className="border border-black p-1">N° Toma</th>
                                <th className="border border-black p-1">Ubicación</th>
                                <th className="border border-black p-1">Cond. Terreno</th>
                                <th className="border border-black p-1">Uso</th>
                                <th className="border border-black p-1">Esquema</th>
                                <th className="border border-black p-1">Resistencia (Ω)</th>
                                <th className="border border-black p-1">Continuidad</th>
                                <th className="border border-black p-1">Cap. Carga</th>
                                <th className="border border-black p-1">Protección</th>
                                <th className="border border-black p-1">Desc. Auto.</th>
                                <th className="border border-black p-1">Cumple</th>
                            </tr>
                        </thead>
                        <tbody>
                            {measurement.points.map((point) => {
                                const v = point.values;
                                const isCompliant = v.complies_resistance === 'SI';
                                return (
                                    <tr key={point.id} className="bg-white hover:bg-gray-50 text-center">
                                        <td className="border border-black p-1 font-bold">{v.grounding_number || point.label}</td>
                                        <td className="border border-black p-1 text-left">{v.sector_name || sectorName}</td>
                                        <td className="border border-black p-1">{v.terrain_condition || '-'}</td>
                                        <td className="border border-black p-1">{v.usage || '-'}</td>
                                        <td className="border border-black p-1">{v.scheme || '-'}</td>
                                        <td className="border border-black p-1 font-bold">{v.resistance || '-'}</td>
                                        <td className="border border-black p-1">{v.continuity_permanent || '-'}</td>
                                        <td className="border border-black p-1">{v.capacity_charge || '-'}</td>
                                        <td className="border border-black p-1">{v.protection_type || '-'}</td>
                                        <td className="border border-black p-1">{v.automatic_disconnection || '-'}</td>
                                        <td className={`border border-black p-1 font-bold ${isCompliant ? 'text-black' : 'text-red-600'}`}>
                                            {v.complies_resistance || '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-6 border border-black p-4 bg-gray-50 break-inside-avoid">
                <h4 className="font-bold text-sm uppercase mb-2 underline">Conclusión:</h4>
                <p className="text-xs text-justify leading-relaxed">
                    {measurement.specificConclusions || "Sin conclusión específica registrada."}
                </p>
                {measurement.analysisAndImprovements && (
                    <>
                        <h4 className="font-bold text-sm uppercase mt-4 mb-2 underline">Recomendaciones:</h4>
                        <p className="text-xs text-justify leading-relaxed">
                            {measurement.analysisAndImprovements}
                        </p>
                    </>
                )}
            </div>
         </div>
       ))}
    </div>
  );

  const renderVentilationProtocol = (items: { sectorName: string; measurement: Measurement }[]) => (
    <div className="space-y-8">
       {items.map(({ sectorName, measurement }, index) => (
         <div key={measurement.id} className={`break-inside-avoid mb-12 ${index > 0 ? 'break-before-page' : ''}`}>
            <ProtocolHeader title="PROTOCOLO DE MEDICIÓN DE VENTILACIÓN (Res. 295/03)" />
            
            <div className="mb-2 font-bold text-lg text-primary uppercase border-b border-primary pb-1">
                Sector: {sectorName}
            </div>

            <MeasurementDataBlock measurement={measurement} />

            <div className="mt-6">
                <h3 className="font-bold text-sm uppercase mb-2 bg-gray-200 p-1 pl-2 border-l-4 border-black">Datos de la Medición</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse border border-black">
                        <thead>
                            <tr className="bg-gray-100 text-black font-bold uppercase text-center align-middle">
                                <th className="border border-black p-1">Punto / Identificación</th>
                                <th className="border border-black p-1">Tipo</th>
                                <th className="border border-black p-1">Velocidad (m/s)</th>
                                <th className="border border-black p-1">Área (m²)</th>
                                <th className="border border-black p-1">Caudal (m³/h)</th>
                                <th className="border border-black p-1">Renovaciones/h</th>
                                <th className="border border-black p-1">Notas</th>
                            </tr>
                        </thead>
                        <tbody>
                            {measurement.points.map((point) => {
                                const v = point.values;
                                return (
                                    <tr key={point.id} className="bg-white hover:bg-gray-50 text-center">
                                        <td className="border border-black p-1 font-bold">{v.identification || point.label}</td>
                                        <td className="border border-black p-1">{v.type || '-'}</td>
                                        <td className="border border-black p-1">{v.velocity || '-'}</td>
                                        <td className="border border-black p-1">{v.area || '-'}</td>
                                        <td className="border border-black p-1 font-bold bg-gray-50">{v.flow || '-'}</td>
                                        <td className="border border-black p-1 font-bold">{v.renovations || '-'}</td>
                                        <td className="border border-black p-1 text-left italic">{point.notes || '-'}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-6 border border-black p-4 bg-gray-50 break-inside-avoid">
                <h4 className="font-bold text-sm uppercase mb-2 underline">Conclusión:</h4>
                <p className="text-xs text-justify leading-relaxed">
                    {measurement.specificConclusions || "Sin conclusión específica registrada."}
                </p>
                {measurement.analysisAndImprovements && (
                    <>
                        <h4 className="font-bold text-sm uppercase mt-4 mb-2 underline">Recomendaciones:</h4>
                        <p className="text-xs text-justify leading-relaxed">
                            {measurement.analysisAndImprovements}
                        </p>
                    </>
                )}
            </div>
         </div>
       ))}
    </div>
  );

  const renderColdStressProtocol = (items: { sectorName: string; measurement: Measurement }[]) => (
    <div className="space-y-8">
       {items.map(({ sectorName, measurement }, index) => (
         <div key={measurement.id} className={`break-inside-avoid mb-12 ${index > 0 ? 'break-before-page' : ''}`}>
            <ProtocolHeader title="PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO" />
            
            <div className="mb-2 font-bold text-lg text-primary uppercase border-b border-primary pb-1">
                Sector: {sectorName}
            </div>

            <MeasurementDataBlock measurement={measurement} />

            <div className="mt-6">
                <h3 className="font-bold text-sm uppercase mb-2 bg-gray-200 p-1 pl-2 border-l-4 border-black">Datos de la Medición</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse border border-black">
                        <thead>
                            <tr className="bg-gray-100 text-black font-bold uppercase text-center align-middle">
                                <th className="border border-black p-1">Punto</th>
                                <th className="border border-black p-1">Temperatura (°C)</th>
                                <th className="border border-black p-1">Viento (km/h)</th>
                                <th className="border border-black p-1">Cumple</th>
                            </tr>
                        </thead>
                        <tbody>
                            {measurement.points.map((point) => {
                                const v = point.values;
                                const isCompliant = measurement.status === 'compliant';
                                return (
                                    <tr key={point.id} className="bg-white hover:bg-gray-50 text-center">
                                        <td className="border border-black p-1 font-bold">{point.label}</td>
                                        <td className="border border-black p-1">{v.temp || '-'}</td>
                                        <td className="border border-black p-1">{v.wind || '-'}</td>
                                        <td className={`border border-black p-1 font-bold ${isCompliant ? 'text-black' : 'text-red-600'}`}>
                                            {isCompliant ? 'SI' : 'NO'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-6 border border-black p-4 bg-gray-50 break-inside-avoid">
                <h4 className="font-bold text-sm uppercase mb-2 underline">Conclusión:</h4>
                <p className="text-xs text-justify leading-relaxed">
                    {measurement.specificConclusions || "Sin conclusión específica registrada."}
                </p>
                {measurement.analysisAndImprovements && (
                    <>
                        <h4 className="font-bold text-sm uppercase mt-4 mb-2 underline">Recomendaciones:</h4>
                        <p className="text-xs text-justify leading-relaxed">
                            {measurement.analysisAndImprovements}
                        </p>
                    </>
                )}
            </div>
         </div>
       ))}
    </div>
  );

  const renderParticulateMatterProtocol = (items: { sectorName: string; measurement: Measurement }[]) => (
    <div className="space-y-8">
       {items.map(({ sectorName, measurement }, index) => (
         <div key={measurement.id} className={`break-inside-avoid mb-12 ${index > 0 ? 'break-before-page' : ''}`}>
            <ProtocolHeader title="PROTOCOLO DE MEDICIÓN DE MATERIAL PARTICULADO (Res. 295/03)" />
            
            <div className="mb-2 font-bold text-lg text-primary uppercase border-b border-primary pb-1">
                Sector: {sectorName}
            </div>

            <MeasurementDataBlock measurement={measurement} />

            <div className="mt-6">
                <h3 className="font-bold text-sm uppercase mb-2 bg-gray-200 p-1 pl-2 border-l-4 border-black">Datos de la Medición</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse border border-black">
                        <thead>
                            <tr className="bg-gray-100 text-black font-bold uppercase text-center align-middle">
                                <th className="border border-black p-1">Punto</th>
                                <th className="border border-black p-1">Tipo</th>
                                <th className="border border-black p-1">Concentración (mg/m³)</th>
                                <th className="border border-black p-1">Límite</th>
                                <th className="border border-black p-1">Cumple</th>
                            </tr>
                        </thead>
                        <tbody>
                            {measurement.points.map((point) => {
                                const v = point.values;
                                const isCompliant = measurement.status === 'compliant';
                                return (
                                    <tr key={point.id} className="bg-white hover:bg-gray-50 text-center">
                                        <td className="border border-black p-1 font-bold">{point.label}</td>
                                        <td className="border border-black p-1">{v.type || '-'}</td>
                                        <td className="border border-black p-1 font-bold">{v.concentration || '-'}</td>
                                        <td className="border border-black p-1">{measurement.config?.limit || '-'}</td>
                                        <td className={`border border-black p-1 font-bold ${isCompliant ? 'text-black' : 'text-red-600'}`}>
                                            {isCompliant ? 'SI' : 'NO'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-6 border border-black p-4 bg-gray-50 break-inside-avoid">
                <h4 className="font-bold text-sm uppercase mb-2 underline">Conclusión:</h4>
                <p className="text-xs text-justify leading-relaxed">
                    {measurement.specificConclusions || "Sin conclusión específica registrada."}
                </p>
                {measurement.analysisAndImprovements && (
                    <>
                        <h4 className="font-bold text-sm uppercase mt-4 mb-2 underline">Recomendaciones:</h4>
                        <p className="text-xs text-justify leading-relaxed">
                            {measurement.analysisAndImprovements}
                        </p>
                    </>
                )}
            </div>
         </div>
       ))}
    </div>
  );

  const renderChemicalAgentsProtocol = (items: { sectorName: string; measurement: Measurement }[]) => (
    <div className="space-y-8">
       {items.map(({ sectorName, measurement }, index) => (
         <div key={measurement.id} className={`break-inside-avoid mb-12 ${index > 0 ? 'break-before-page' : ''}`}>
            <ProtocolHeader title="PROTOCOLO DE MEDICIÓN DE CONTAMINANTES QUÍMICOS (Res. 295/03)" />
            
            <div className="mb-2 font-bold text-lg text-primary uppercase border-b border-primary pb-1">
                Sector: {sectorName}
            </div>

            <MeasurementDataBlock measurement={measurement} />

            <div className="mt-6">
                <h3 className="font-bold text-sm uppercase mb-2 bg-gray-200 p-1 pl-2 border-l-4 border-black">Datos de la Medición</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] border-collapse border border-black">
                        <thead>
                            <tr className="bg-gray-100 text-black font-bold uppercase text-center align-middle">
                                <th className="border border-black p-1">Punto</th>
                                <th className="border border-black p-1">Sustancia</th>
                                <th className="border border-black p-1">Concentración</th>
                                <th className="border border-black p-1">Límite (CMP)</th>
                                <th className="border border-black p-1">Cumple</th>
                            </tr>
                        </thead>
                        <tbody>
                            {measurement.points.map((point) => {
                                const v = point.values;
                                const isCompliant = measurement.status === 'compliant';
                                return (
                                    <tr key={point.id} className="bg-white hover:bg-gray-50 text-center">
                                        <td className="border border-black p-1 font-bold">{point.label}</td>
                                        <td className="border border-black p-1">{v.substance || '-'}</td>
                                        <td className="border border-black p-1 font-bold">{v.concentration || '-'}</td>
                                        <td className="border border-black p-1">{measurement.config?.limit || '-'}</td>
                                        <td className={`border border-black p-1 font-bold ${isCompliant ? 'text-black' : 'text-red-600'}`}>
                                            {isCompliant ? 'SI' : 'NO'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <div className="mt-6 border border-black p-4 bg-gray-50 break-inside-avoid">
                <h4 className="font-bold text-sm uppercase mb-2 underline">Conclusión:</h4>
                <p className="text-xs text-justify leading-relaxed">
                    {measurement.specificConclusions || "Sin conclusión específica registrada."}
                </p>
                {measurement.analysisAndImprovements && (
                    <>
                        <h4 className="font-bold text-sm uppercase mt-4 mb-2 underline">Recomendaciones:</h4>
                        <p className="text-xs text-justify leading-relaxed">
                            {measurement.analysisAndImprovements}
                        </p>
                    </>
                )}
            </div>
         </div>
       ))}
    </div>
  );

  const renderGenericProtocol = (type: MeasurementType, items: { sectorName: string; measurement: Measurement }[]) => (
     <div className="space-y-6">
       <div className="bg-gray-100 p-2 border-y-2 border-primary/20 font-bold text-center text-sm uppercase tracking-wider mb-4">
          Protocolo de {MEASUREMENT_LABELS[type]}
       </div>
       {items.map(({ sectorName, measurement }, index) => (
         <div key={measurement.id} className={`mb-6 break-inside-avoid border border-gray-200 rounded-lg overflow-hidden ${index > 0 ? 'break-before-page' : ''}`}>
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
                     {(measurement.type === 'noise' || measurement.type === 'thermal_load') && measurement.details?.duration && (
                         <th className="pb-2">Duración</th>
                     )}
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
                       {(measurement.type === 'noise' || measurement.type === 'thermal_load') && measurement.details?.duration && (
                         <td className="py-2 text-gray-600">{measurement.details.duration}</td>
                       )}
                       <td className="py-2 italic text-gray-500">{p.notes}</td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               {measurement.observations && (
                  <div className="mt-3 text-xs bg-yellow-50 p-2 rounded border border-yellow-100 text-yellow-800">
                    <span className="font-bold mr-1">Comentario:</span> {measurement.observations}
                  </div>
               )}
               {measurement.specificConclusions && (
                  <div className="mt-2 text-xs bg-blue-50 p-2 rounded border border-blue-100 text-blue-800">
                    <span className="font-bold mr-1">Conclusión:</span> {measurement.specificConclusions}
                  </div>
               )}
               {measurement.analysisAndImprovements && (
                  <div className="mt-2 text-xs bg-green-50 p-2 rounded border border-green-100 text-green-800">
                    <span className="font-bold mr-1">Análisis y Mejoras:</span> {measurement.analysisAndImprovements}
                  </div>
               )}
               
               {/* Attached Documents Badge */}
               {(measurement.attachedDocuments?.calibrationCertificate || measurement.attachedDocuments?.sketch || measurement.attachedDocuments?.other) && (
                 <div className="mt-2 pt-2 border-t border-gray-100 flex flex-col gap-2 text-xs text-gray-500">
                   <div className="flex items-center gap-2">
                       <span className="font-bold uppercase text-[10px]">Adjuntos:</span>
                       {measurement.attachedDocuments.calibrationCertificate && <span className="px-2 py-0.5 bg-gray-100 rounded border">Certificado Calibración</span>}
                       {measurement.attachedDocuments.sketch && <span className="px-2 py-0.5 bg-gray-100 rounded border">Croquis</span>}
                       {measurement.attachedDocuments.other && <span className="px-2 py-0.5 bg-gray-100 rounded border">{measurement.attachedDocuments.other}</span>}
                   </div>
                   
                   {/* Attached Images */}
                   <div className="grid grid-cols-4 gap-4 mt-2">
                        {measurement.attachedDocuments.calibrationCertificate && measurement.attachedDocuments.calibrationCertificateImage && (
                            <div className="flex flex-col gap-1 items-center">
                                <div className="border border-gray-200 p-1 bg-white shadow-sm rounded">
                                    <img src={measurement.attachedDocuments.calibrationCertificateImage} alt="Certificado" className="max-h-[150px] object-contain" />
                                </div>
                                <span className="text-[10px] text-gray-400">Certificado Calibración</span>
                            </div>
                        )}
                        {measurement.attachedDocuments.sketch && measurement.attachedDocuments.sketchImage && (
                            <div className="flex flex-col gap-1 items-center">
                                <div className="border border-gray-200 p-1 bg-white shadow-sm rounded">
                                    <img src={measurement.attachedDocuments.sketchImage} alt="Croquis" className="max-h-[150px] object-contain" />
                                </div>
                                <span className="text-[10px] text-gray-400">Croquis / Plano</span>
                            </div>
                        )}
                        {measurement.attachedDocuments.otherImages?.map((img, idx) => (
                             <div key={idx} className="flex flex-col gap-1 items-center">
                                <div className="border border-gray-200 p-1 bg-white shadow-sm rounded">
                                    <img src={img} alt={`Img ${idx}`} className="max-h-[150px] object-contain" />
                                </div>
                                <span className="text-[10px] text-gray-400">Imagen Adjunta {idx + 1}</span>
                            </div>
                        ))}
                   </div>
                 </div>
               )}
            </div>
         </div>
       ))}
       
       {/* Auto-injected Recommendations for Cold Stress */}
       {type === 'cold_stress' && COLD_STRESS_RECOMMENDATIONS}

       {/* Auto-injected Instructions for Noise */}
       {type === 'noise' && (
         <>
            {NOISE_REFERENCE_VALUES}
            {NOISE_INSTRUCTIONS}
         </>
       )}

       {/* Auto-injected Reference Values for Thermal Load */}
       {type === 'thermal_load' && THERMAL_LOAD_REFERENCE_VALUES}
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
          <Select 
            value={selectedType} 
            onValueChange={(val) => setSelectedType(val as MeasurementType | 'all')}
          >
            <SelectTrigger className="w-[200px] h-9">
               <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">Ver Todos</SelectItem>
                {Object.keys(measurementsByType).map((type) => (
                    <SelectItem key={type} value={type}>
                        {MEASUREMENT_LABELS[type as MeasurementType]}
                    </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Button variant="secondary" onClick={generateAIContent} className="text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200">
            <Sparkles className="mr-2 h-4 w-4" /> Analizar
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
          <Button 
             variant="outline" 
             onClick={handlePreview} 
             className="gap-2 border-blue-800 text-blue-800 hover:bg-blue-50 no-print"
          >
             <FileText className="h-4 w-4" />
             Vista Previa
          </Button>
          <Button 
             variant="outline" 
             onClick={handleDocxExport} 
             className="gap-2 border-blue-800 text-blue-800 hover:bg-blue-50 no-print"
          >
             <Download className="h-4 w-4" />
             Exportar DOCX
          </Button>
          <Button onClick={handlePrint} className="bg-primary text-primary-foreground hover:bg-primary/90 no-print">
            <Printer className="mr-2 h-4 w-4" />
            Descargar PDF
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
                <span className="font-semibold">{safeFormatDate(establishment.date, "d 'de' MMMM, yyyy", { locale: es })}</span>
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
            Object.entries(measurementsByType)
              .filter(([type]) => selectedType === 'all' || type === selectedType)
              .map(([type, items]) => (
              <section key={type} className="break-before-page">
                 {type === 'lighting' 
                   ? renderLightingProtocol(items!) 
                   : type === 'noise'
                     ? renderNoiseProtocol(items!)
                     : type === 'thermal_load'
                       ? renderThermalLoadProtocol(items!)
                       : type === 'grounding'
                         ? renderGroundingProtocol(items!)
                         : type === 'ventilation'
                           ? renderVentilationProtocol(items!)
                           : type === 'cold_stress'
                             ? renderColdStressProtocol(items!)
                             : type === 'particulate_matter'
                               ? renderParticulateMatterProtocol(items!)
                               : type === 'chemical_agents'
                                 ? renderChemicalAgentsProtocol(items!)
                                 : renderGenericProtocol(type as MeasurementType, items!)
                 }
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

        {/* Anexo 1: Croquis */}
        <div className="break-before-page mt-8">
            <h2 className="text-xl font-bold text-primary mb-6 uppercase tracking-wide border-b-2 border-primary pb-2">
                Anexo 1: Croquis del Establecimiento
            </h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center min-h-[300px] flex flex-col items-center justify-center bg-gray-50 relative group">
               {establishment.sketchImage ? (
                   <div className="relative w-full h-full flex items-center justify-center">
                       <img src={establishment.sketchImage} alt="Croquis del Establecimiento" className="max-h-[600px] max-w-full object-contain" />
                       <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity no-print">
                           <Button variant="secondary" size="sm" onClick={() => updateEstablishment({ sketchImage: undefined })}>
                               <Trash2 className="h-4 w-4" />
                           </Button>
                       </div>
                   </div>
               ) : (
                   <div className="flex flex-col items-center gap-4 no-print">
                       <p className="text-muted-foreground">No se ha adjuntado un croquis general del establecimiento.</p>
                       <div className="relative">
                            <Button variant="outline" className="gap-2">
                                <ImageIcon className="h-4 w-4" /> Subir Croquis
                            </Button>
                            <Input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={(e) => e.target.files?.[0] && handleSketchUpload(e.target.files[0])}
                            />
                       </div>
                   </div>
               )}
               {/* Print placeholder if empty */}
               {!establishment.sketchImage && (
                   <div className="hidden print:block text-gray-400 italic">
                       [Espacio reservado para el Croquis del Establecimiento]
                   </div>
               )}
           </div>
        </div>

        {/* Anexo 2: Instrumentos */}
        <div className="break-before-page mt-8">
            <div className="flex items-center justify-between mb-6 border-b-2 border-primary pb-2">
                 <h2 className="text-xl font-bold text-primary uppercase tracking-wide">
                     Anexo 2: Instrumental Utilizado y Certificados
                 </h2>
                 <Dialog open={isInstrumentDialogOpen} onOpenChange={setIsInstrumentDialogOpen}>
                     <DialogTrigger asChild>
                         <Button variant="outline" size="sm" className="gap-2 no-print">
                             <Plus className="h-4 w-4" /> Agregar Instrumento
                         </Button>
                     </DialogTrigger>
                     <DialogContent>
                         <DialogHeader>
                             <DialogTitle>Seleccionar Instrumento</DialogTitle>
                         </DialogHeader>
                         <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                             {availableInstruments.map(inst => (
                                 <div key={inst.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                     <div>
                                         <div className="font-bold">{inst.brand} {inst.model}</div>
                                         <div className="text-xs text-muted-foreground">Serie: {inst.serialNumber} | Calibración: {inst.calibrationCertificate || 'S/N'}</div>
                                     </div>
                                     <Button size="sm" onClick={() => addInstrumentToReport(inst)}>
                                         Seleccionar
                                     </Button>
                                 </div>
                             ))}
                             {availableInstruments.length === 0 && (
                                 <p className="text-center text-muted-foreground py-4">No hay instrumentos registrados en la base de datos.</p>
                             )}
                             <Link href="/instruments" className="w-full">
                                 <Button variant="secondary" className="w-full">Gestionar Instrumentos</Button>
                             </Link>
                         </div>
                     </DialogContent>
                 </Dialog>
            </div>
            
            {(!establishment.instruments || establishment.instruments.length === 0) ? (
                <div className="p-12 text-center text-gray-400 italic border-2 border-dashed rounded-lg bg-gray-50">
                    No hay instrumentos registrados en este reporte.
                </div>
            ) : (
                <div className="space-y-8">
                    {establishment.instruments.map((inst, index) => (
                        <div key={inst.id} className="break-inside-avoid border rounded-lg p-6 bg-white shadow-sm relative group">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 no-print text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeInstrumentFromReport(inst.id)}
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>

                            <h3 className="text-lg font-bold text-gray-800 mb-4 bg-gray-100 p-2 border-l-4 border-primary">
                                {index + 1}. {inst.brand} {inst.model} (S/N: {inst.serialNumber})
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm mb-6 px-4">
                                <div><span className="font-semibold">Tipo:</span> {inst.type === 'generic' ? 'Genérico' : MEASUREMENT_LABELS[inst.type as MeasurementType]}</div>
                                <div><span className="font-semibold">Certificado N°:</span> {inst.calibrationCertificate || '-'}</div>
                                <div><span className="font-semibold">Fecha Calibración:</span> {inst.calibrationDate || '-'}</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                                {/* Calibration Certificate Placeholder/Image */}
                                <div className="flex flex-col gap-2">
                                    <span className="font-bold text-xs uppercase text-gray-500 border-b pb-1">Certificado de Calibración</span>
                                    {inst.attachedDocuments?.calibrationCertificateImage ? (
                                        <div className="border rounded-lg overflow-hidden bg-white p-2 shadow-sm">
                                            <img src={inst.attachedDocuments.calibrationCertificateImage} alt="Certificado Calibración" className="w-full h-auto object-contain max-h-[300px]" />
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center text-center h-[200px] bg-gray-50/50">
                                            <FileText className="h-8 w-8 text-gray-300 mb-2" />
                                            <span className="text-xs text-gray-400 italic">Certificado digital no disponible</span>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Traceable Pattern Placeholder/Image */}
                                <div className="flex flex-col gap-2">
                                    <span className="font-bold text-xs uppercase text-gray-500 border-b pb-1">Patrón Trazable</span>
                                    {inst.attachedDocuments?.traceablePatternImage ? (
                                        <div className="border rounded-lg overflow-hidden bg-white p-2 shadow-sm">
                                            <img src={inst.attachedDocuments.traceablePatternImage} alt="Patrón Trazable" className="w-full h-auto object-contain max-h-[300px]" />
                                        </div>
                                    ) : (
                                        <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 flex flex-col items-center justify-center text-center h-[200px] bg-gray-50/50">
                                            <Sparkles className="h-8 w-8 text-gray-300 mb-2" />
                                            <span className="text-xs text-gray-400 italic">Patrón trazable no disponible</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Anexo 3: Evidencia Fotográfica de Mediciones */}
        <div className="break-before-page mt-8">
            <h2 className="text-xl font-bold text-primary mb-6 uppercase tracking-wide border-b-2 border-primary pb-2">
                Anexo 3: Evidencia Fotográfica de Mediciones
            </h2>

            {/* Global Evidence Upload Section */}
            <div className="mb-8 break-inside-avoid">
                 <h3 className="font-bold text-lg text-gray-800 mb-4 pl-2 border-l-4 border-primary">
                    Evidencia General del Establecimiento
                 </h3>
                 
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                     {establishment.evidenceImages && establishment.evidenceImages.map((img, idx) => (
                         <div key={idx} className="relative group border rounded-lg bg-white p-2 shadow-sm break-inside-avoid">
                             <img src={img} alt={`Evidencia General ${idx + 1}`} className="w-full h-auto object-contain max-h-[400px]" />
                             <Button 
                                variant="destructive" 
                                size="icon" 
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity no-print"
                                onClick={() => {
                                    const newImages = establishment.evidenceImages?.filter((_, i) => i !== idx);
                                    updateEstablishment({ evidenceImages: newImages });
                                }}
                             >
                                 <Trash2 className="h-4 w-4" />
                             </Button>
                         </div>
                     ))}
                     
                     {/* Upload Placeholder */}
                     <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-center bg-gray-50 min-h-[200px] no-print">
                         <div className="relative">
                             <Button variant="outline" className="gap-2">
                                 <ImageIcon className="h-4 w-4" /> Agregar Foto General
                             </Button>
                             <Input 
                                 type="file" 
                                 accept="image/*" 
                                 className="absolute inset-0 opacity-0 cursor-pointer"
                                 onChange={(e) => {
                                     if (e.target.files?.[0]) {
                                         const reader = new FileReader();
                                         reader.onloadend = () => {
                                             const currentImages = establishment.evidenceImages || [];
                                             updateEstablishment({ evidenceImages: [...currentImages, reader.result as string] });
                                             toast({ title: "Imagen agregada correctamente" });
                                         };
                                         reader.readAsDataURL(e.target.files[0]);
                                     }
                                 }}
                             />
                         </div>
                         <p className="text-xs text-muted-foreground mt-2">Formatos: JPG, PNG</p>
                     </div>
                 </div>
                 
                 {(!establishment.evidenceImages || establishment.evidenceImages.length === 0) && (
                     <div className="hidden print:block p-4 text-center text-gray-400 italic border border-dashed rounded-lg mb-6">
                         No se han adjuntado imágenes generales.
                     </div>
                 )}
            </div>
            
            <h3 className="font-bold text-lg text-gray-800 mb-4 pl-2 border-l-4 border-gray-400">
                Evidencia Específica por Mediciones
            </h3>

            {Object.keys(measurementsByType).length === 0 ? (
                <div className="p-12 text-center text-gray-400 italic border-2 border-dashed rounded-lg">
                    No hay mediciones registradas.
                </div>
            ) : (
                 <div className="space-y-8">
                    {sectors.map(sector => {
                        const measurementsWithImages = sector.measurements; 
                        
                        if (measurementsWithImages.length === 0) return null;

                        const hasAnyImage = measurementsWithImages.some(m => m.attachedDocuments?.measurementProofImage || (m.attachedDocuments?.otherImages && m.attachedDocuments.otherImages.length > 0));

                        return (
                            <div key={sector.id} className={`break-inside-avoid ${!hasAnyImage ? 'no-print' : ''}`}>
                                <h4 className="font-bold text-md text-gray-700 mb-2 bg-gray-50 p-2 border-b">
                                    Sector: {sector.name}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {measurementsWithImages.map(m => {
                                         const hasImages = m.attachedDocuments?.measurementProofImage || (m.attachedDocuments?.otherImages && m.attachedDocuments.otherImages.length > 0);
                                         
                                         return (
                                        <div key={m.id} className={`border rounded-lg p-4 bg-white shadow-sm break-inside-avoid relative group ${!hasImages ? 'no-print border-dashed' : ''}`}>
                                            <div className="mb-2 pb-2 border-b">
                                                <span className="font-bold text-sm text-primary uppercase block">
                                                    {MEASUREMENT_LABELS[m.type]}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {safeFormatDate(m.details?.measurementDate, "d/MM/yyyy")} 
                                                    {m.details?.startTime ? ` - ${m.details.startTime}` : ''}
                                                </span>
                                            </div>
                                            
                                            <div className="space-y-4">
                                                {m.attachedDocuments?.measurementProofImage && (
                                                    <div className="flex flex-col gap-2 relative group-image">
                                                        <span className="text-xs font-semibold bg-green-50 text-green-700 px-2 py-1 rounded w-fit">
                                                            Prueba de Medición
                                                        </span>
                                                        <div className="rounded border bg-gray-50 overflow-hidden relative">
                                                            <img 
                                                                src={m.attachedDocuments.measurementProofImage} 
                                                                alt={`Prueba ${sector.name} - ${MEASUREMENT_LABELS[m.type]}`}
                                                                className="w-full h-auto object-contain max-h-[300px]"
                                                            />
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity no-print"
                                                                onClick={() => {
                                                                    handleMeasurementImageDelete(sector.id, m.id, 'measurementProofImage');
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}

                                                {m.attachedDocuments?.otherImages?.map((img, idx) => (
                                                    <div key={idx} className="flex flex-col gap-2 relative group-image">
                                                        <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-1 rounded w-fit">
                                                            Imagen Adicional {idx + 1}
                                                        </span>
                                                        <div className="rounded border bg-gray-50 overflow-hidden relative">
                                                            <img 
                                                                src={img} 
                                                                alt={`Extra ${idx}`}
                                                                className="w-full h-auto object-contain max-h-[300px]"
                                                            />
                                                            <Button
                                                                variant="destructive"
                                                                size="icon"
                                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity no-print"
                                                                onClick={() => {
                                                                    handleMeasurementImageDelete(sector.id, m.id, 'otherImages', idx);
                                                                }}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                
                                                {!hasImages && (
                                                    <div className="text-center text-xs text-muted-foreground italic py-4">
                                                        Sin imágenes adjuntas
                                                    </div>
                                                )}

                                                <div className="no-print mt-4 pt-4 border-t border-dashed">
                                                     <div className="relative w-full">
                                                        <Button variant="outline" size="sm" className="w-full gap-2">
                                                            <ImageIcon className="h-4 w-4" /> Agregar Foto a Medición
                                                        </Button>
                                                        <Input 
                                                            type="file" 
                                                            accept="image/*" 
                                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                                            onChange={(e) => {
                                                                if (e.target.files?.[0]) {
                                                                    handleMeasurementImageUpload(sector.id, m.id, e.target.files[0]);
                                                                }
                                                            }}
                                                        />
                                                     </div>
                                                </div>
                                            </div>
                                        </div>
                                    )})}
                                </div>
                            </div>
                        );
                    })}
                 </div>
            )}
        </div>

        <footer className="report-footer mt-16 pt-6 border-t border-gray-200 flex flex-col items-center text-xs text-gray-400">
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
