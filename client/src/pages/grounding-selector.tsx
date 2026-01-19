import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileSpreadsheet, Zap, Cable } from "lucide-react";

const measurementTypes = [
  {
    id: 'protocol',
    title: 'Protocolo de Medición PAT',
    description: 'Puesta a tierra y conductividad de las masas',
    icon: Zap,
    route: '/grounding/protocol'
  },
  {
    id: 'continuity',
    title: 'Ensayos de Continuidad',
    description: 'Ensayos de Continuidad y Dispositivo de Corte Automático',
    icon: FileSpreadsheet,
    route: '/grounding/continuity'
  },
  {
    id: 'electrical',
    title: 'Continuidad Eléctrica PAT',
    description: 'Ensayos de Continuidad Eléctrica del Conductor de PAT',
    icon: Cable,
    route: '/grounding/electrical'
  }
];

export default function GroundingSelector() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/">
            <Button variant="outline" size="sm" data-testid="btn-back">
              <ArrowLeft className="h-4 w-4 mr-2" /> Volver
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-800" data-testid="heading-grounding">Puesta a Tierra - Seleccionar Tipo de Medición</h1>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {measurementTypes.map((type) => (
            <Link key={type.id} href={type.route}>
              <Card className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary" data-testid={`card-${type.id}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <type.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-base">{type.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{type.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
