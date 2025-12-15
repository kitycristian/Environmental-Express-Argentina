import { useState } from "react";
import { Measurement, MeasurementType, MeasurementPoint } from "@/lib/types";
import { useStore } from "@/lib/store";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus, Calculator, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Configuration for fields per measurement type
const FIELD_CONFIG: Record<MeasurementType, { key: string; label: string; type: string; options?: string[] }[]> = {
  lighting: [
    { key: 'lux', label: 'Lux (lx)', type: 'number' },
    { key: 'height', label: 'Altura (m)', type: 'number' }
  ],
  noise: [
    { key: 'db', label: 'Nivel (dBA)', type: 'number' },
    { key: 'type', label: 'Tipo', type: 'select', options: ['Continuo', 'Impacto', 'Pico'] }
  ],
  thermal_load: [
    { key: 'tbs', label: 'TBS (°C)', type: 'number' },
    { key: 'tbh', label: 'TBH (°C)', type: 'number' },
    { key: 'tg', label: 'TG (°C)', type: 'number' }
  ],
  cold_stress: [
    { key: 'temp', label: 'Temp (°C)', type: 'number' },
    { key: 'wind', label: 'Viento (km/h)', type: 'number' }
  ],
  particulate_matter: [
    { key: 'concentration', label: 'mg/m3', type: 'number' },
    { key: 'type', label: 'Tipo', type: 'select', options: ['PM10', 'PM2.5', 'Total'] }
  ],
  chemical_agents: [
    { key: 'substance', label: 'Sustancia', type: 'text' },
    { key: 'concentration', label: 'ppm / mg/m3', type: 'number' }
  ]
};

// Helper to calculate averages or results
const calculateResult = (type: MeasurementType, points: MeasurementPoint[]) => {
  if (points.length === 0) return "Sin datos";
  
  if (type === 'lighting') {
    const sum = points.reduce((acc, p) => acc + (Number(p.values.lux) || 0), 0);
    const avg = Math.round(sum / points.length);
    return `Promedio: ${avg} Lux`;
  }
  
  if (type === 'noise') {
    // Logarithmic average for noise is complex, using simple max for safety or simple avg for prototype
    const max = Math.max(...points.map(p => Number(p.values.db) || 0));
    return `Máximo: ${max} dBA`;
  }
  
  if (type === 'thermal_load') {
     // Simplistic WBGT calculation for prototype (Indoor: 0.7 TBH + 0.3 TG)
     const lastPoint = points[points.length - 1];
     if (lastPoint) {
       const tbh = Number(lastPoint.values.tbh) || 0;
       const tg = Number(lastPoint.values.tg) || 0;
       const wbgt = (0.7 * tbh) + (0.3 * tg);
       return `TGBH (Est.): ${wbgt.toFixed(1)} °C`;
     }
  }

  return `${points.length} puntos medidos`;
};

export function MeasurementEditor({ measurement }: { measurement: Measurement }) {
  const addPoint = useStore((state) => state.addPoint);
  const updatePoint = useStore((state) => state.updatePoint);
  const deletePoint = useStore((state) => state.deletePoint);
  const updateMeasurement = useStore((state) => state.updateMeasurement);
  const deleteMeasurement = useStore((state) => state.deleteMeasurement);

  const fields = FIELD_CONFIG[measurement.type];

  return (
    <Card className="border shadow-sm">
      <CardHeader className="py-3 px-4 bg-muted/20 border-b flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
           <CardTitle className="text-base font-semibold text-primary/80">
             {measurement.type.replace('_', ' ').toUpperCase()}
           </CardTitle>
           <div className="text-xs font-mono bg-background px-2 py-0.5 rounded border text-muted-foreground">
             {calculateResult(measurement.type, measurement.points)}
           </div>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={measurement.status} 
            onValueChange={(val: any) => updateMeasurement(measurement.sectorId, measurement.id, { status: val })}
          >
            <SelectTrigger className={`h-8 w-[140px] ${measurement.status === 'compliant' ? 'text-green-600 border-green-200 bg-green-50' : measurement.status === 'non_compliant' ? 'text-red-600 border-red-200 bg-red-50' : ''}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendiente</SelectItem>
              <SelectItem value="compliant">Cumple Norma</SelectItem>
              <SelectItem value="non_compliant">No Cumple</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => {
              if(confirm('¿Eliminar esta medición?')) deleteMeasurement(measurement.sectorId, measurement.id);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[100px]">Punto</TableHead>
                {fields.map(f => (
                  <TableHead key={f.key}>{f.label}</TableHead>
                ))}
                <TableHead>Observación</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {measurement.points.map((point) => (
                <TableRow key={point.id}>
                  <TableCell className="font-medium text-xs text-muted-foreground">
                    {point.label}
                  </TableCell>
                  {fields.map(f => (
                    <TableCell key={f.key}>
                      {f.type === 'select' ? (
                        <Select 
                          value={String(point.values[f.key] || '')} 
                          onValueChange={(val) => updatePoint(measurement.sectorId, measurement.id, point.id, { values: { ...point.values, [f.key]: val } })}
                        >
                          <SelectTrigger className="h-8 w-full min-w-[100px]">
                            <SelectValue placeholder="-" />
                          </SelectTrigger>
                          <SelectContent>
                            {f.options?.map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input 
                          type={f.type} 
                          className="h-8 min-w-[80px]" 
                          placeholder="-"
                          value={point.values[f.key] || ''}
                          onChange={(e) => updatePoint(measurement.sectorId, measurement.id, point.id, { values: { ...point.values, [f.key]: e.target.value } })}
                        />
                      )}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Input 
                       className="h-8 min-w-[150px]" 
                       placeholder="Notas..." 
                       value={point.notes || ''}
                       onChange={(e) => updatePoint(measurement.sectorId, measurement.id, point.id, { notes: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-muted-foreground/50 hover:text-destructive"
                      onClick={() => deletePoint(measurement.sectorId, measurement.id, point.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="p-4 bg-muted/10 border-t flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => addPoint(measurement.sectorId, measurement.id)}>
            <Plus className="mr-2 h-4 w-4" /> Agregar Punto
          </Button>
          
          <div className="w-full md:w-1/2">
             <Label className="text-xs text-muted-foreground mb-1 block">Observaciones Generales</Label>
             <Textarea 
               className="h-20 text-sm resize-none" 
               placeholder="Comentarios generales sobre esta medición..."
               value={measurement.observations || ''}
               onChange={(e) => updateMeasurement(measurement.sectorId, measurement.id, { observations: e.target.value })}
             />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
