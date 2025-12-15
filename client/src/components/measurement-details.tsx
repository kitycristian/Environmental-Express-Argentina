import { Measurement } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStore } from "@/lib/store";
import { Settings2, FileText, Paperclip, Image as ImageIcon, Trash2, Database } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface MeasurementDetailsProps {
  measurement: Measurement;
  sectorId: string;
}

export function MeasurementDetails({ measurement, sectorId }: MeasurementDetailsProps) {
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const availableInstruments = useStore((state) => state.availableInstruments);

  const handleSelectInstrument = (instrumentId: string) => {
    const instrument = availableInstruments.find(i => i.id === instrumentId);
    if (!instrument) return;

    // Auto-fill details from selected instrument
    updateMeasurement(sectorId, measurement.id, {
      details: {
        ...measurement.details,
        brand: instrument.brand,
        model: instrument.model,
        serialNumber: instrument.serialNumber,
        calibrationDate: instrument.calibrationDate,
      },
      // Also copy attached documents if they exist and aren't already set?
      // Or maybe just let the user attach them manually to the measurement if needed.
      // For now, let's copy the calibration certificate image if available on the instrument
      attachedDocuments: {
        ...measurement.attachedDocuments,
        calibrationCertificateImage: instrument.attachedDocuments?.calibrationCertificateImage || measurement.attachedDocuments?.calibrationCertificateImage
      }
    });
  };

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

  const handleImageUpload = (key: 'calibrationCertificateImage' | 'sketchImage' | 'otherImages' | 'measurementProofImage', file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      if (key === 'otherImages') {
          const currentImages = measurement.attachedDocuments?.otherImages || [];
          updateMeasurement(sectorId, measurement.id, {
            attachedDocuments: {
                ...measurement.attachedDocuments,
                otherImages: [...currentImages, base64String]
            }
          });
      } else {
          updateMeasurement(sectorId, measurement.id, {
            attachedDocuments: {
                ...measurement.attachedDocuments,
                [key]: base64String
            }
          });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (key: 'calibrationCertificateImage' | 'sketchImage' | 'otherImages' | 'measurementProofImage', index?: number) => {
      if (key === 'otherImages' && typeof index === 'number') {
          const currentImages = measurement.attachedDocuments?.otherImages || [];
          const newImages = [...currentImages];
          newImages.splice(index, 1);
          updateMeasurement(sectorId, measurement.id, {
            attachedDocuments: {
                ...measurement.attachedDocuments,
                otherImages: newImages
            }
          });
      } else {
        updateMeasurement(sectorId, measurement.id, {
            attachedDocuments: {
                ...measurement.attachedDocuments,
                [key]: undefined
            }
          });
      }
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
            {/* Documentation & Conclusions Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-b pb-6">
               <div className="space-y-3">
                 <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                   <Paperclip className="h-3 w-3" /> Documentación Adjunta
                 </h4>
                 <div className="bg-gray-50 p-3 rounded-md space-y-4">
                   
                   {/* Calibration Certificate */}
                   <div className="space-y-2 border-b border-gray-200 pb-2">
                     <div className="flex items-center space-x-2">
                       <Checkbox 
                         id="doc-cert" 
                         checked={measurement.attachedDocuments?.calibrationCertificate || false}
                         onCheckedChange={(checked) => updateDocuments('calibrationCertificate', checked === true)}
                       />
                       <label htmlFor="doc-cert" className="text-sm font-medium leading-none">
                         Certificado de Calibración
                       </label>
                     </div>
                     {measurement.attachedDocuments?.calibrationCertificate && (
                       <div className="pl-6">
                         {measurement.attachedDocuments?.calibrationCertificateImage ? (
                            <div className="relative group w-24 h-24 border rounded overflow-hidden">
                                <img src={measurement.attachedDocuments.calibrationCertificateImage} alt="Certificado" className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => removeImage('calibrationCertificateImage')}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                         ) : (
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="file" 
                                    accept="image/*" 
                                    className="h-8 text-xs w-full cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) handleImageUpload('calibrationCertificateImage', e.target.files[0]);
                                    }}
                                />
                            </div>
                         )}
                       </div>
                     )}
                   </div>

                   {/* Sketch / Plan */}
                   <div className="space-y-2 border-b border-gray-200 pb-2">
                     <div className="flex items-center space-x-2">
                       <Checkbox 
                         id="doc-sketch" 
                         checked={measurement.attachedDocuments?.sketch || false}
                         onCheckedChange={(checked) => updateDocuments('sketch', checked === true)}
                       />
                       <label htmlFor="doc-sketch" className="text-sm font-medium leading-none">
                         Croquis / Plano
                       </label>
                     </div>
                     {measurement.attachedDocuments?.sketch && (
                       <div className="pl-6">
                         {measurement.attachedDocuments?.sketchImage ? (
                            <div className="relative group w-24 h-24 border rounded overflow-hidden">
                                <img src={measurement.attachedDocuments.sketchImage} alt="Croquis" className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => removeImage('sketchImage')}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                         ) : (
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="file" 
                                    accept="image/*" 
                                    className="h-8 text-xs w-full cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) handleImageUpload('sketchImage', e.target.files[0]);
                                    }}
                                />
                            </div>
                         )}
                       </div>
                     )}
                   </div>

                   {/* Measurement Proof */}
                   <div className="space-y-2 border-b border-gray-200 pb-2">
                     <div className="flex items-center space-x-2">
                       <Checkbox 
                         id="doc-proof" 
                         checked={measurement.attachedDocuments?.measurementProof || false}
                         onCheckedChange={(checked) => updateDocuments('measurementProof', checked === true)}
                       />
                       <label htmlFor="doc-proof" className="text-sm font-medium leading-none">
                         Imagen de Prueba de Medición
                       </label>
                     </div>
                     {measurement.attachedDocuments?.measurementProof && (
                       <div className="pl-6">
                         {measurement.attachedDocuments?.measurementProofImage ? (
                            <div className="relative group w-24 h-24 border rounded overflow-hidden">
                                <img src={measurement.attachedDocuments.measurementProofImage} alt="Prueba Medición" className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => removeImage('measurementProofImage')}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </button>
                            </div>
                         ) : (
                            <div className="flex items-center gap-2">
                                <Input 
                                    type="file" 
                                    accept="image/*" 
                                    className="h-8 text-xs w-full cursor-pointer"
                                    onChange={(e) => {
                                        if (e.target.files?.[0]) handleImageUpload('measurementProofImage', e.target.files[0]);
                                    }}
                                />
                            </div>
                         )}
                       </div>
                     )}
                   </div>

                   {/* Other Documents */}
                   <div className="space-y-2 pt-1">
                     <Label className="text-xs text-muted-foreground">Otros Documentos / Imágenes</Label>
                     <Input 
                       className="h-7 text-xs bg-white mb-2" 
                       placeholder="Descripción (Ej. Fotos, Planillas...)"
                       value={measurement.attachedDocuments?.other || ''}
                       onChange={(e) => updateDocuments('other', e.target.value)}
                     />
                     <div className="grid grid-cols-3 gap-2">
                        {measurement.attachedDocuments?.otherImages?.map((img, idx) => (
                            <div key={idx} className="relative group w-full h-16 border rounded overflow-hidden bg-white">
                                <img src={img} alt={`Other ${idx}`} className="w-full h-full object-cover" />
                                <button 
                                    onClick={() => removeImage('otherImages', idx)}
                                    className="absolute top-1 right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="h-2 w-2" />
                                </button>
                            </div>
                        ))}
                        <div className="relative w-full h-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center bg-gray-50 hover:bg-gray-100 cursor-pointer">
                            <ImageIcon className="h-4 w-4 text-gray-400" />
                            <Input 
                                type="file" 
                                accept="image/*" 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={(e) => {
                                    if (e.target.files?.[0]) handleImageUpload('otherImages', e.target.files[0]);
                                    e.target.value = ''; // Reset input
                                }}
                            />
                        </div>
                     </div>
                   </div>

                 </div>
               </div>

               <div className="space-y-3">
                 <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2">
                   <FileText className="h-3 w-3" /> Conclusión Específica
                 </h4>
                 <Textarea 
                   className="min-h-[80px] text-xs resize-none bg-yellow-50/50 border-yellow-200 focus-visible:ring-yellow-500/50"
                   placeholder="Escriba aquí la conclusión técnica específica..."
                   value={measurement.specificConclusions || ''}
                   onChange={(e) => updateMeasurement(sectorId, measurement.id, { specificConclusions: e.target.value })}
                 />

                 <h4 className="text-xs font-bold uppercase text-gray-500 flex items-center gap-2 pt-2 border-t border-dashed">
                   <FileText className="h-3 w-3" /> Análisis de datos y mejoras
                 </h4>
                 <Textarea 
                   className="min-h-[80px] text-xs resize-none bg-green-50/50 border-green-200 focus-visible:ring-green-500/50"
                   placeholder="Detalle el análisis de los datos obtenidos y las mejoras sugeridas..."
                   value={measurement.analysisAndImprovements || ''}
                   onChange={(e) => updateMeasurement(sectorId, measurement.id, { analysisAndImprovements: e.target.value })}
                 />
               </div>
            </div>

            {/* Instrument Info */}
            <div className="space-y-3 border-b pb-4">
              <div className="flex items-center justify-between">
                 <h4 className="text-xs font-bold uppercase text-gray-500">Datos del Instrumento</h4>
                 {availableInstruments.length > 0 && (
                   <div className="flex items-center gap-2">
                     <Database className="h-3 w-3 text-blue-500" />
                     <Select onValueChange={handleSelectInstrument}>
                        <SelectTrigger className="h-7 text-xs w-[200px] border-blue-200 bg-blue-50">
                            <SelectValue placeholder="Cargar desde Base de Datos" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableInstruments.map(inst => (
                                <SelectItem key={inst.id} value={inst.id}>
                                    {inst.brand} {inst.model} ({inst.serialNumber})
                                </SelectItem>
                            ))}
                        </SelectContent>
                     </Select>
                   </div>
                 )}
              </div>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                {(measurement.type === 'noise' || measurement.type === 'thermal_load') && (
                  <div className="space-y-1">
                    <Label className="text-xs">Duración</Label>
                    <Input 
                      value={measurement.details?.duration || ''} 
                      onChange={(e) => updateDetails('duration', e.target.value)}
                      className="h-8 text-xs"
                      placeholder="Ej. 15 min"
                    />
                  </div>
                )}
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
