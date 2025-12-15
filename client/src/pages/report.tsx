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
                    {measurement.observations && <div className="text-[10px] text-gray-500 italic mt-1">Obs: {measurement.observations}</div>}
                    {measurement.specificConclusions && <div className="text-[10px] text-blue-600 font-semibold mt-1">Concl: {measurement.specificConclusions}</div>}
                    {(measurement.attachedDocuments?.calibrationCertificate || measurement.attachedDocuments?.sketch) && (
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {measurement.attachedDocuments.calibrationCertificate && <span className="text-[9px] px-1 bg-gray-100 border rounded text-gray-600">Cert. Calib.</span>}
                        {measurement.attachedDocuments.sketch && <span className="text-[9px] px-1 bg-gray-100 border rounded text-gray-600">Croquis</span>}
                      </div>
                    )}
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
    <div className="space-y-6">
       <div className="bg-gray-100 p-2 border-y-2 border-primary/20 font-bold text-center text-sm uppercase tracking-wider mb-4">
          Protocolo de Medición de RUIDO en el Ambiente Laboral (Res. 295/03)
       </div>
       <div className="overflow-x-auto">
       <table className="w-full text-[10px] border-collapse border border-gray-300">
         <thead>
           <tr className="bg-gray-50 text-gray-700 text-center align-middle h-12">
             <th className="border border-gray-300 p-1 w-8">(23)<br/>Pto</th>
             <th className="border border-gray-300 p-1 w-24">(24)<br/>Sector</th>
             <th className="border border-gray-300 p-1">(25)<br/>Puesto / Tipo</th>
             <th className="border border-gray-300 p-1 w-12">(26)<br/>T. Expo<br/>(Te)</th>
             <th className="border border-gray-300 p-1 w-12">(27)<br/>T. Integ</th>
             <th className="border border-gray-300 p-1 w-16">(28)<br/>Caract.<br/>Ruido</th>
             <th className="border border-gray-300 p-1 w-16 bg-gray-50">
                (29)<br/>RUIDO IMPULSO<br/>LC pico (dBC)
             </th>
             <th className="border border-gray-300 p-1 w-16 bg-gray-100">
                (30)<br/>SONIDO CONT.<br/>LAeq,Te (dBA)
             </th>
             <th className="border border-gray-300 p-1 w-12">(31)<br/>Suma<br/>Fracc</th>
             <th className="border border-gray-300 p-1 w-12">(32)<br/>Dosis %</th>
             <th className="border border-gray-300 p-1 w-12">(33)<br/>Cumple?</th>
           </tr>
         </thead>
         <tbody>
           {items.flatMap(({ sectorName, measurement }) => {
             return measurement.points.map((point, idx) => {
               const values = point.values;
               const isCompliant = values.cumple === 'SI';
               return (
                 <tr key={point.id} className="break-inside-avoid hover:bg-gray-50/50">
                   <td className="border border-gray-300 p-1 text-center">{point.label || idx + 1}</td>
                   <td className="border border-gray-300 p-1 text-center">{sectorName}</td>
                   <td className="border border-gray-300 p-1">{values.puesto || '-'}</td>
                   <td className="border border-gray-300 p-1 text-center">{values.tiempo_exposicion || '-'}</td>
                   <td className="border border-gray-300 p-1 text-center">{values.tiempo_integracion || '-'}</td>
                   <td className="border border-gray-300 p-1 text-center capitalize">{values.caracteristicas || '-'}</td>
                   <td className="border border-gray-300 p-1 text-center">{values.nivel_pico_c || 'No Aplica'}</td>
                   <td className="border border-gray-300 p-1 text-center font-bold">{values.nivel_continuo_eq || 'No Aplica'}</td>
                   <td className="border border-gray-300 p-1 text-center">{values.suma_fracciones || 'No Aplica'}</td>
                   <td className="border border-gray-300 p-1 text-center">{values.dosis || 'No Aplica'}</td>
                   <td className={`border border-gray-300 p-1 text-center font-bold ${isCompliant ? 'text-green-700' : 'text-red-700'}`}>
                     {values.cumple || '-'}
                   </td>
                 </tr>
               );
             });
           })}
         </tbody>
       </table>
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
    <div className="space-y-6">
       {items.flatMap(({ sectorName, measurement }) => 
         measurement.points.map((point) => {
           const values = point.values;
           const tbs = parseFloat(String(values.tbs)) || 0;
           const tbh = parseFloat(String(values.tbh)) || 0;
           const tg = parseFloat(String(values.tg)) || 0;
           
           // Calculate TGBH (Indoor formula from image: 0.7TBH + 0.3TG)
           const tgbh = (0.7 * tbh + 0.3 * tg).toFixed(1);
           
           const mb = parseFloat(String(values.mb)) || 70;
           const mi = parseFloat(String(values.mi)) || 0;
           const mii = parseFloat(String(values.mii)) || 0;
           const mTotal = mb + mi + mii;
           
           return (
             <div key={point.id} className="break-inside-avoid border border-black mb-8">
               {/* Header */}
               <div className="bg-black text-white font-bold text-center text-sm py-1 border-b border-black uppercase">
                 PROTOCOLO DE MEDICION DE CARGA TERMICA
               </div>
               
               {/* Subheader Info Grid */}
               <div className="grid grid-cols-12 text-[10px] border-b border-black">
                  <div className="col-span-4 border-r border-black p-2 font-bold flex items-center">
                    {establishment.razonSocial || establishment.name} (Store {establishment.address})
                  </div>
                  <div className="col-span-3 border-r border-black p-1">
                    <div className="font-bold border-b border-gray-300 pb-1 mb-1">Puesto y/o sector de trabajo:</div>
                    <div>{values.puesto || sectorName}</div>
                  </div>
                  <div className="col-span-2 border-r border-black p-1 flex items-center">
                    <span className="font-bold mr-1">Fecha:</span> {establishment.date ? format(new Date(establishment.date), "dd/MM/yyyy") : '-'}
                  </div>
                  <div className="col-span-2 border-r border-black p-1">
                     <div><span className="font-bold">Hora Desde:</span> {establishment.startTime || '-'}</div>
                     <div><span className="font-bold">Hora Hasta:</span> {establishment.endTime || '-'}</div>
                  </div>
                  <div className="col-span-1 p-1 flex items-center justify-center">
                     <span className="font-bold mr-1">Temp. Ext.:</span> {values.temp_ext || '-'} °C
                  </div>
               </div>

               {/* Table Content */}
               <div className="grid grid-cols-12 text-[10px]">
                  {/* Column 1: Row Headers */}
                  <div className="col-span-2 border-r border-black">
                     <div className="h-8 border-b border-black bg-gray-100 flex items-center justify-center font-bold">1</div>
                     <div className="h-32 border-b border-black flex items-center px-2 font-bold bg-white">
                        Magnitudes evaluadas
                     </div>
                     <div className="h-12 flex items-center px-2 font-bold bg-white">
                        Resultados
                     </div>
                  </div>

                  {/* Column 2: TGBH */}
                  <div className="col-span-2 border-r border-black text-center">
                     <div className="h-8 border-b border-black bg-gray-100 flex items-center justify-center font-bold">2</div>
                     <div className="h-32 border-b border-black flex flex-col items-center justify-center bg-white relative">
                        <span className="transform -rotate-90 whitespace-nowrap font-bold">TGBH</span>
                        <span className="transform -rotate-90 whitespace-nowrap text-[9px] text-gray-500 mt-2">=0,7TBH + 0,3TG</span>
                     </div>
                     <div className="h-12 flex items-center justify-center font-bold text-red-600 text-lg bg-gray-200">
                        {tgbh}
                     </div>
                  </div>

                  {/* Column 3: MB */}
                  <div className="col-span-1 border-r border-black text-center">
                     <div className="h-8 border-b border-black bg-gray-100 flex items-center justify-center font-bold">3</div>
                     <div className="h-32 border-b border-black flex items-center justify-center bg-white">
                        <span className="transform -rotate-90 whitespace-nowrap font-bold">MB [W] = 70</span>
                     </div>
                     <div className="h-12 flex items-center justify-center font-bold bg-white">
                        {mb}
                     </div>
                  </div>

                  {/* Column 4: MI */}
                  <div className="col-span-1 border-r border-black text-center">
                     <div className="h-8 border-b border-black bg-gray-100 flex items-center justify-center font-bold">4</div>
                     <div className="h-32 border-b border-black flex items-center justify-center bg-white">
                        <span className="transform -rotate-90 whitespace-nowrap font-bold">MI [W]</span>
                     </div>
                     <div className="h-12 flex items-center justify-center font-bold bg-white">
                        {mi}
                     </div>
                  </div>

                  {/* Column 5: MII */}
                  <div className="col-span-1 border-r border-black text-center">
                     <div className="h-8 border-b border-black bg-gray-100 flex items-center justify-center font-bold">5</div>
                     <div className="h-32 border-b border-black flex items-center justify-center bg-white">
                        <span className="transform -rotate-90 whitespace-nowrap font-bold">MII [W]</span>
                     </div>
                     <div className="h-12 flex items-center justify-center font-bold bg-white">
                        {mii}
                     </div>
                  </div>

                  {/* Column 6: M Total */}
                  <div className="col-span-1 border-r border-black text-center bg-gray-200">
                     <div className="h-8 border-b border-black bg-gray-100 flex items-center justify-center font-bold">6</div>
                     <div className="h-32 border-b border-black flex items-center justify-center">
                        <div className="transform -rotate-90 whitespace-nowrap font-bold text-[9px]">
                           M [W] = <br/> MB+MI+MII
                        </div>
                     </div>
                     <div className="h-12 flex items-center justify-center font-bold bg-gray-300">
                        {mTotal}
                     </div>
                  </div>

                  {/* Column 7: Comments/Conclusion */}
                  <div className="col-span-4 text-left">
                     <div className="h-8 border-b border-black bg-gray-100 flex items-center justify-center font-bold">7</div>
                     <div className="h-44 p-2 text-[10px] space-y-2 overflow-hidden bg-white">
                        <div>
                           <span className="font-bold">Comentario:</span> {point.notes || measurement.observations || 'Sin observaciones.'}
                        </div>
                        <div className="border-t border-gray-200 pt-1">
                           <span className="font-bold">Conclusión:</span> {measurement.specificConclusions || 'Pendiente de análisis.'}
                        </div>
                     </div>
                  </div>
               </div>
             </div>
           );
         })
       )}
       {THERMAL_LOAD_REFERENCE_VALUES}
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
                 {type === 'lighting' 
                   ? renderLightingProtocol(items!) 
                   : type === 'noise'
                     ? renderNoiseProtocol(items!)
                     : type === 'thermal_load'
                       ? renderThermalLoadProtocol(items!)
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
            {establishment.sketchImage ? (
                <div className="flex flex-col items-center justify-center p-4 border rounded-lg bg-gray-50/30 min-h-[400px]">
                    <img src={establishment.sketchImage} alt="Croquis del Establecimiento" className="max-w-full max-h-[800px] object-contain" />
                </div>
            ) : (
                <div className="p-12 text-center text-gray-400 italic border-2 border-dashed rounded-lg">
                    No se ha adjuntado un croquis general del establecimiento.
                </div>
            )}
        </div>

        {/* Anexo 2: Instrumentos */}
        <div className="break-before-page mt-8">
            <h2 className="text-xl font-bold text-primary mb-6 uppercase tracking-wide border-b-2 border-primary pb-2">
                Anexo 2: Instrumental Utilizado y Certificados
            </h2>
            
            {!establishment.instruments || establishment.instruments.length === 0 ? (
                <div className="p-12 text-center text-gray-400 italic border-2 border-dashed rounded-lg">
                    No hay instrumentos registrados.
                </div>
            ) : (
                <div className="space-y-12">
                    {establishment.instruments.map((inst, index) => (
                        <div key={inst.id} className="break-inside-avoid">
                            <h3 className="text-lg font-bold text-gray-800 mb-4 bg-gray-100 p-2 border-l-4 border-primary">
                                {index + 1}. {inst.brand} {inst.model} (S/N: {inst.serialNumber})
                            </h3>
                            
                            <div className="grid grid-cols-2 gap-4 text-sm mb-6 px-4">
                                <div><span className="font-semibold">Tipo:</span> {inst.type === 'generic' ? 'Genérico' : MEASUREMENT_LABELS[inst.type as MeasurementType]}</div>
                                <div><span className="font-semibold">Certificado N°:</span> {inst.calibrationCertificate || '-'}</div>
                                <div><span className="font-semibold">Fecha Calibración:</span> {inst.calibrationDate || '-'}</div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4">
                                {inst.attachedDocuments?.calibrationCertificateImage && (
                                    <div className="flex flex-col gap-2">
                                        <span className="font-bold text-xs uppercase text-gray-500 border-b pb-1">Certificado de Calibración</span>
                                        <div className="border rounded-lg overflow-hidden bg-white p-2 shadow-sm">
                                            <img src={inst.attachedDocuments.calibrationCertificateImage} alt="Certificado Calibración" className="w-full h-auto object-contain max-h-[500px]" />
                                        </div>
                                    </div>
                                )}
                                {inst.attachedDocuments?.traceablePatternImage && (
                                    <div className="flex flex-col gap-2">
                                        <span className="font-bold text-xs uppercase text-gray-500 border-b pb-1">Patrón Trazable</span>
                                        <div className="border rounded-lg overflow-hidden bg-white p-2 shadow-sm">
                                            <img src={inst.attachedDocuments.traceablePatternImage} alt="Patrón Trazable" className="w-full h-auto object-contain max-h-[500px]" />
                                        </div>
                                    </div>
                                )}
                                {!inst.attachedDocuments?.calibrationCertificateImage && !inst.attachedDocuments?.traceablePatternImage && (
                                    <div className="col-span-2 text-center py-8 text-gray-400 italic text-xs">
                                        No hay imágenes de documentación adjuntas para este instrumento.
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
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
