import { useState } from "react";
import { useStore } from "@/lib/store";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Instrument, MEASUREMENT_LABELS, MeasurementType } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { v4 as uuidv4 } from 'uuid';

export function ReportConfigDialog() {
  const establishment = useStore((state) => state.establishment);
  const updateEstablishment = useStore((state) => state.updateEstablishment);
  const [open, setOpen] = useState(false);

  // Local state for editing to avoid constant store updates
  const [data, setData] = useState(establishment);

  const handleSave = () => {
    updateEstablishment(data);
    setOpen(false);
  };

  const addInstrument = () => {
    const newInstrument: Instrument = {
      id: uuidv4(),
      type: 'generic',
      brand: '',
      model: '',
      serialNumber: '',
      calibrationCertificate: '',
      calibrationDate: ''
    };
    setData({
      ...data,
      instruments: [...(data.instruments || []), newInstrument]
    });
  };

  const removeInstrument = (id: string) => {
    setData({
      ...data,
      instruments: (data.instruments || []).filter(i => i.id !== id)
    });
  };

  const updateInstrument = (id: string, field: keyof Instrument, value: any) => {
    setData({
      ...data,
      instruments: (data.instruments || []).map(i => i.id === id ? { ...i, [field]: value } : i)
    });
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if(val) setData(establishment);
      setOpen(val);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" /> Configurar Informe
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configuración de Informe Legal</DialogTitle>
          <DialogDescription>
            Ingrese los datos adicionales requeridos para el protocolo oficial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* General Data */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">Datos del Establecimiento</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Localidad</Label>
                <Input value={data.city || ''} onChange={(e) => setData({...data, city: e.target.value})} placeholder="Ej. La Rioja" />
              </div>
              <div className="space-y-2">
                <Label>Provincia</Label>
                <Input value={data.province || ''} onChange={(e) => setData({...data, province: e.target.value})} placeholder="Ej. La Rioja" />
              </div>
              <div className="space-y-2">
                <Label>Código Postal</Label>
                <Input value={data.postalCode || ''} onChange={(e) => setData({...data, postalCode: e.target.value})} placeholder="Ej. 5300" />
              </div>
               <div className="space-y-2">
                <Label>Responsable / Firma</Label>
                <Input value={data.responsible || ''} onChange={(e) => setData({...data, responsible: e.target.value})} placeholder="Nombre del profesional" />
              </div>
            </div>
          </div>

          {/* Time and Conditions */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold border-b pb-2">Condiciones de Medición</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Hora Inicio</Label>
                <Input type="time" value={data.startTime || ''} onChange={(e) => setData({...data, startTime: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Hora Fin</Label>
                <Input type="time" value={data.endTime || ''} onChange={(e) => setData({...data, endTime: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Temperatura (°C)</Label>
                <Input value={data.conditions?.temperature || ''} onChange={(e) => setData({...data, conditions: {...data.conditions, temperature: e.target.value}})} />
              </div>
              <div className="space-y-2">
                <Label>Humedad (%)</Label>
                <Input value={data.conditions?.humidity || ''} onChange={(e) => setData({...data, conditions: {...data.conditions, humidity: e.target.value}})} />
              </div>
              <div className="space-y-2">
                <Label>Presión (mmHg)</Label>
                <Input value={data.conditions?.pressure || ''} onChange={(e) => setData({...data, conditions: {...data.conditions, pressure: e.target.value}})} />
              </div>
              <div className="space-y-2">
                 <Label>Viento (km/h)</Label>
                <Input value={data.conditions?.windSpeed || ''} onChange={(e) => setData({...data, conditions: {...data.conditions, windSpeed: e.target.value}})} />
              </div>
            </div>
          </div>

          {/* Instruments */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="text-sm font-semibold">Instrumentos Utilizados</h3>
              <Button size="sm" variant="outline" onClick={addInstrument}><Plus className="h-4 w-4 mr-2"/> Agregar Equipo</Button>
            </div>
            
            {(!data.instruments || data.instruments.length === 0) && (
              <p className="text-sm text-muted-foreground italic text-center py-4">No hay instrumentos registrados.</p>
            )}

            {data.instruments?.map((inst, idx) => (
              <Card key={inst.id} className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => removeInstrument(inst.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <CardContent className="p-4 grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                     <Label className="text-xs">Uso / Tipo</Label>
                     <Select value={inst.type} onValueChange={(val) => updateInstrument(inst.id, 'type', val)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="generic">General</SelectItem>
                          {Object.entries(MEASUREMENT_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                     </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Marca</Label>
                    <Input className="h-8" value={inst.brand} onChange={(e) => updateInstrument(inst.id, 'brand', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Modelo</Label>
                    <Input className="h-8" value={inst.model} onChange={(e) => updateInstrument(inst.id, 'model', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">N° Serie</Label>
                    <Input className="h-8" value={inst.serialNumber} onChange={(e) => updateInstrument(inst.id, 'serialNumber', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Cert. Calibración</Label>
                    <Input className="h-8" value={inst.calibrationCertificate} onChange={(e) => updateInstrument(inst.id, 'calibrationCertificate', e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Fecha Calibración</Label>
                    <Input className="h-8" type="date" value={inst.calibrationDate} onChange={(e) => updateInstrument(inst.id, 'calibrationDate', e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Guardar Configuración</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
