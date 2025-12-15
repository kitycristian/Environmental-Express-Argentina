import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Image as ImageIcon, Settings2 } from "lucide-react";
import { Instrument, MEASUREMENT_LABELS, MeasurementType } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";
import { useToast } from "@/hooks/use-toast";

export default function InstrumentsPage() {
  const instruments = useStore((state) => state.availableInstruments);
  const addInstrument = useStore((state) => state.addInstrument);
  const updateInstrumentStore = useStore((state) => state.updateInstrument);
  const deleteInstrumentStore = useStore((state) => state.deleteInstrument);
  const { toast } = useToast();

  // Local state for the form
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const handleAddInstrument = () => {
    const newInstrument: Instrument = {
      id: uuidv4(),
      type: 'generic',
      brand: '',
      model: '',
      serialNumber: '',
      calibrationCertificate: '',
      calibrationDate: '',
      attachedDocuments: {}
    };

    addInstrument(newInstrument);
    setEditingId(newInstrument.id);
  };

  const handleUpdateInstrument = (id: string, data: Partial<Instrument>) => {
    updateInstrumentStore(id, data);
  };

  const handleDeleteInstrument = (id: string) => {
    deleteInstrumentStore(id);
    if (editingId === id) setEditingId(null);
    toast({
        title: "Instrumento Eliminado",
        description: "El instrumento ha sido quitado de la lista global."
    });
  };

  const handleUpdateDocuments = (id: string, key: 'calibrationCertificateImage' | 'traceablePatternImage', value: string) => {
    const instrument = instruments.find(i => i.id === id);
    if (!instrument) return;

    const updatedInstrument = {
      ...instrument,
      attachedDocuments: {
        ...instrument.attachedDocuments,
        [key]: value
      }
    };

    handleUpdateInstrument(id, updatedInstrument);
  };

  const handleImageUpload = (id: string, key: 'calibrationCertificateImage' | 'traceablePatternImage', file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      handleUpdateDocuments(id, key, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = (id: string, key: 'calibrationCertificateImage' | 'traceablePatternImage') => {
      const instrument = instruments.find(i => i.id === id);
      if (!instrument) return;

      const updatedInstrument = {
        ...instrument,
        attachedDocuments: {
          ...instrument.attachedDocuments,
          [key]: undefined
        }
      };
      handleUpdateInstrument(id, updatedInstrument);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Instrumentos</h1>
          <p className="text-muted-foreground">Gestión de equipos, certificados y patrones trazables.</p>
        </div>
        <Button onClick={handleAddInstrument} className="gap-2">
          <Plus className="h-4 w-4" /> Agregar Instrumento
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {instruments.length === 0 ? (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-lg bg-gray-50 text-gray-400">
            <Settings2 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No hay instrumentos registrados.</p>
            <Button variant="link" onClick={handleAddInstrument}>Agregar el primero</Button>
          </div>
        ) : (
          instruments.map((instrument) => (
            <Card key={instrument.id} className="relative overflow-hidden group">
              <CardHeader className="bg-gray-50/50 border-b pb-3">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    {instrument.brand || 'Marca'} {instrument.model || 'Modelo'}
                  </CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteInstrument(instrument.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Medición</Label>
                    <Select 
                      value={instrument.type} 
                      onValueChange={(val) => handleUpdateInstrument(instrument.id, { type: val as any })}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="generic">Genérico</SelectItem>
                        {Object.entries(MEASUREMENT_LABELS).map(([key, label]) => (
                            <SelectItem key={key} value={key}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Marca</Label>
                    <Input 
                      className="h-8 text-xs" 
                      value={instrument.brand}
                      onChange={(e) => handleUpdateInstrument(instrument.id, { brand: e.target.value })}
                      placeholder="Ej. Extech"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Modelo</Label>
                    <Input 
                      className="h-8 text-xs" 
                      value={instrument.model}
                      onChange={(e) => handleUpdateInstrument(instrument.id, { model: e.target.value })}
                      placeholder="Ej. LT300"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Nro. Serie</Label>
                    <Input 
                      className="h-8 text-xs" 
                      value={instrument.serialNumber}
                      onChange={(e) => handleUpdateInstrument(instrument.id, { serialNumber: e.target.value })}
                      placeholder="S/N..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Certificado N°</Label>
                    <Input 
                      className="h-8 text-xs" 
                      value={instrument.calibrationCertificate}
                      onChange={(e) => handleUpdateInstrument(instrument.id, { calibrationCertificate: e.target.value })}
                      placeholder="ID Certificado"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha Calibración</Label>
                    <Input 
                      type="date"
                      className="h-8 text-xs" 
                      value={instrument.calibrationDate}
                      onChange={(e) => handleUpdateInstrument(instrument.id, { calibrationDate: e.target.value })}
                    />
                  </div>
                </div>

                <div className="border-t pt-3 space-y-3">
                    <Label className="text-xs font-bold text-gray-500 uppercase">Documentación Adjunta</Label>
                    
                    <div className="grid grid-cols-2 gap-4">
                        {/* Calibration Cert Image */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-medium block text-center">Certificado de Calibración</span>
                            {instrument.attachedDocuments?.calibrationCertificateImage ? (
                                <div className="relative group w-full h-32 border rounded-md overflow-hidden bg-gray-100">
                                    <img src={instrument.attachedDocuments.calibrationCertificateImage} alt="Certificado" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button variant="destructive" size="sm" onClick={() => removeImage(instrument.id, 'calibrationCertificateImage')}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-32 border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors relative cursor-pointer">
                                    <ImageIcon className="h-6 w-6" />
                                    <span className="text-[10px]">Subir Imagen</span>
                                    <Input 
                                        type="file" 
                                        accept="image/*" 
                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                        onChange={(e) => e.target.files?.[0] && handleImageUpload(instrument.id, 'calibrationCertificateImage', e.target.files[0])}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Traceable Pattern Image */}
                        <div className="space-y-2">
                            <span className="text-[10px] font-medium block text-center">Patrón Trazable</span>
                            {instrument.attachedDocuments?.traceablePatternImage ? (
                                <div className="relative group w-full h-32 border rounded-md overflow-hidden bg-gray-100">
                                    <img src={instrument.attachedDocuments.traceablePatternImage} alt="Patrón" className="w-full h-full object-contain" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button variant="destructive" size="sm" onClick={() => removeImage(instrument.id, 'traceablePatternImage')}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full h-32 border-2 border-dashed rounded-md flex flex-col items-center justify-center gap-2 text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors relative cursor-pointer">
                                    <ImageIcon className="h-6 w-6" />
                                    <span className="text-[10px]">Subir Imagen</span>
                                    <Input 
                                        type="file" 
                                        accept="image/*" 
                                        className="absolute inset-0 opacity-0 cursor-pointer" 
                                        onChange={(e) => e.target.files?.[0] && handleImageUpload(instrument.id, 'traceablePatternImage', e.target.files[0])}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}