import { Measurement } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { Settings2 } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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

  return (
    <Accordion type="single" collapsible className="w-full mb-4 border rounded-md bg-white">
      <AccordionItem value="details" className="border-none">
        <AccordionTrigger className="px-4 py-2 hover:bg-gray-50 text-sm font-semibold text-gray-700">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            Detalles Técnicos e Instrumento
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-2">
          <div className="grid gap-4">
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
