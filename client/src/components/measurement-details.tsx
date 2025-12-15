import { Measurement } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { Settings2, FileText, Paperclip } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";

interface MeasurementDetailsProps {
  measurement: Measurement;
  sectorId: string;
}

export function MeasurementDetails({ measurement, sectorId }: MeasurementDetailsProps) {
  const updateMeasurement = useStore((state) => state.updateMeasurement);

  const updateDetails = (key: string, value: string) => {
    updateMeasurement(sectorId, measurement.id, {
      details: {
        ...measurement.details,
        [key]: value
      }
    });
  };

  const updateDocuments = (key: string, value: boolean | string) => {
    updateMeasurement(sectorId, measurement.id, {
      attachedDocuments: {
        ...measurement.attachedDocuments,
        [key]: value
      }
    });
  };

  return (
    <Accordion type="single" collapsible className="w-full mb-4 border rounded-md bg-white">
      <AccordionItem value="details" className="border-none">
        <AccordionTrigger className="px-4 py-2 hover:bg-gray-50 text-sm font-semibold text-gray-700">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Detalles Técnicos, Documentación y Conclusiones
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-2">
          <div className="grid gap-6">
            {/* Documentation & Conclusions Section (New) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-6">
               <div className="space-y-3">
                 <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                   <Paperclip className="h-3 w-3" /> Documentación Adjunta
                 </h4>
                 <div className="bg-gray-50 p-3 rounded-md space-y-3">
                   <div className="flex items-center space-x-2">
                     <Checkbox 
                       id="doc-cert" 
                       checked={measurement.attachedDocuments?.calibrationCertificate || false}
                       onCheckedChange={(checked) => updateDocuments('calibrationCertificate', checked === true)}
                     />
                     <label
                       htmlFor="doc-cert"
                       className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                     >
                       Certificado de Calibración
                     </label>
                   </div>
                   <div className="flex items-center space-x-2">
                     <Checkbox 
                       id="doc-sketch" 
                       checked={measurement.attachedDocuments?.sketch || false}
                       onCheckedChange={(checked) => updateDocuments('sketch', checked === true)}
                     />
                     <label
                       htmlFor="doc-sketch"
                       className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                     >
                       Croquis / Plano
                     </label>
                   </div>
                   <div className="space-y-1 pt-2">
                     <Label className="text-xs text-muted-foreground">Otros Documentos</Label>
                     <Input 
                       className="h-7 text-xs bg-white" 
                       placeholder="Ej. Fotos, Planillas anexas..."
                       value={measurement.attachedDocuments?.other || ''}
                       onChange={(e) => updateDocuments('other', e.target.value)}
                     />
                   </div>
                 </div>
               </div>

               <div className="space-y-3">
                 <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                   <FileText className="h-3 w-3" /> Conclusión Específica
                 </h4>
                 <Textarea 
                   className="min-h-[120px] text-xs resize-none bg-yellow-50/50 border-yellow-200 focus-visible:ring-yellow-500/50"
                   placeholder="Escriba aquí la conclusión técnica específica para esta medición que aparecerá en el informe..."
                   value={measurement.specificConclusions || ''}
                   onChange={(e) => updateMeasurement(sectorId, measurement.id, { specificConclusions: e.target.value })}
                 />
               </div>
            </div>

            {/* Instrument Info */}
            <div className="space-y-3 border-b pb-4">
              <h4 className="text-xs font-bold uppercase text-gray-500">Datos del Instrumento</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Marca</Label>
                  <Input 
                    value={measurement.details?.brand || ''} 
                    onChange={(e) => updateDetails('brand', e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Ej. Extech"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Modelo</Label>
                  <Input 
                    value={measurement.details?.model || ''} 
                    onChange={(e) => updateDetails('model', e.target.value)}
                    className="h-8 text-xs"
                    placeholder="Ej. LT300"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Número de Serie</Label>
                  <Input 
                    value={measurement.details?.serialNumber || ''} 
                    onChange={(e) => updateDetails('serialNumber', e.target.value)}
                    className="h-8 text-xs"
                    placeholder="S/N 123456"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fecha Calibración</Label>
                  <Input 
                    type="date"
                    value={measurement.details?.calibrationDate || ''} 
                    onChange={(e) => updateDetails('calibrationDate', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Time & Date */}
            <div className="space-y-3 border-b pb-4">
              <h4 className="text-xs font-bold uppercase text-gray-500">Fecha y Hora de Medición</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Fecha</Label>
                  <Input 
                    type="date"
                    value={measurement.details?.measurementDate || ''} 
                    onChange={(e) => updateDetails('measurementDate', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hora Inicio</Label>
                  <Input 
                    type="time"
                    value={measurement.details?.startTime || ''} 
                    onChange={(e) => updateDetails('startTime', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Hora Fin</Label>
                  <Input 
                    type="time"
                    value={measurement.details?.endTime || ''} 
                    onChange={(e) => updateDetails('endTime', e.target.value)}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Conditions */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase text-gray-500">Condiciones de Trabajo</h4>
              
              <div className="space-y-1">
                <Label className="text-xs">Horarios/Turnos Habituales</Label>
                <Input 
                  value={measurement.details?.workShifts || ''} 
                  onChange={(e) => updateDetails('workShifts', e.target.value)}
                  className="h-8 text-xs"
                  placeholder="Ej. 2 Turnos de Trabajo. 6:00 AM-23:30 PM"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Condiciones Normales/Habituales</Label>
                <Textarea 
                  value={measurement.details?.normalConditions || ''} 
                  onChange={(e) => updateDetails('normalConditions', e.target.value)}
                  className="min-h-[60px] text-xs resize-none"
                  placeholder="Descripción de las condiciones habituales de operación..."
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Condiciones al Momento de Medición</Label>
                <Textarea 
                  value={measurement.details?.currentConditions || ''} 
                  onChange={(e) => updateDetails('currentConditions', e.target.value)}
                  className="min-h-[60px] text-xs resize-none"
                  placeholder="Descripción de las condiciones operativas durante la medición..."
                />
              </div>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
