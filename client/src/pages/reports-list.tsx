import { useStore } from "@/lib/store";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Building2, Calendar, FileText, RotateCcw, Trash2, Search, Download, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function ReportsList() {
  const history = useStore((state) => state.history);
  const loadInspection = useStore((state) => state.loadInspection);
  const deleteInspection = useStore((state) => state.deleteInspection);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const handleLoad = (id: string) => {
    if (confirm("¿Cargar esta inspección reemplazará los datos actuales del tablero. ¿Continuar?")) {
      loadInspection(id);
      toast({
        title: "Inspección Cargada",
        description: "Los datos han sido restaurados en el tablero.",
      });
      setLocation("/");
    }
  };
  
  const handleView = (id: string) => {
      loadInspection(id);
      setLocation("/report");
  };

  const handleDelete = (id: string) => {
    if (confirm("¿Está seguro de eliminar este informe del historial?")) {
      deleteInspection(id);
      toast({
        title: "Informe Eliminado",
        description: "El registro ha sido eliminado correctamente.",
      });
    }
  };

  // Group history by Company -> Year
  const filteredHistory = history.filter(item => 
    item.establishment.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.establishment.cuit.includes(searchTerm)
  );

  const groupedHistory = filteredHistory.reduce((acc, item) => {
    const company = item.establishment.name || "Sin Nombre";
    const dateObj = new Date(item.establishment.date || item.savedAt);
    const year = dateObj.getFullYear().toString();

    if (!acc[company]) acc[company] = {};
    if (!acc[company][year]) acc[company][year] = [];
    
    acc[company][year].push(item);
    return acc;
  }, {} as Record<string, Record<string, typeof history>>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Informes Realizados</h1>
          <p className="text-muted-foreground">Historial de relevamientos guardados.</p>
        </div>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar por empresa..." 
            className="pl-8" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {history.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No hay informes guardados</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Los relevamientos que guarde aparecerán aquí para su consulta posterior.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
            <CardContent className="p-0">
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(groupedHistory).map(([company, years]) => (
                  <AccordionItem key={company} value={company} className="px-4 border-b last:border-0">
                    <AccordionTrigger className="hover:no-underline py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full text-primary">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                            <span className="font-semibold block text-base">{company}</span>
                            <span className="text-xs text-muted-foreground font-normal">
                                {Object.values(years).flat().length} informes totales
                            </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-4 space-y-4 pb-4">
                        {Object.entries(years).sort((a, b) => Number(b[0]) - Number(a[0])).map(([year, items]) => (
                          <div key={year} className="border-l-2 border-muted pl-4">
                            <h4 className="text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
                              <Calendar className="h-4 w-4" /> {year}
                            </h4>
                            <div className="grid grid-cols-1 gap-3">
                              {items.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).map((item) => (
                                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg bg-card hover:bg-muted/30 transition-colors gap-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-base">
                                        Relevamiento del {format(new Date(item.establishment.date || item.savedAt), "d 'de' MMMM", { locale: es })}
                                        </p>
                                        {item.establishment.responsible && (
                                            <Badge variant="outline" className="text-[10px] font-normal">
                                                {item.establishment.responsible}
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                      <span>{item.sectors.length} sectores medidos</span>
                                      <span>•</span>
                                      <span>Guardado el {format(new Date(item.savedAt), "dd/MM/yyyy HH:mm")}</span>
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button variant="outline" size="sm" className="gap-2" onClick={() => handleView(item.id)}>
                                      <Eye className="h-4 w-4" /> Ver Informe
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-2" onClick={() => handleLoad(item.id)}>
                                      <RotateCcw className="h-4 w-4" /> Editar
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDelete(item.id)}>
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
        </Card>
      )}
    </div>
  );
}
