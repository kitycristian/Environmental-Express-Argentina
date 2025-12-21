import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ArrowLeft, Trash2, Eye, History, FileText, Search, RefreshCw, Archive } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function HistoryPage() {
  const history = useStore((state) => state.history);
  const loadInspection = useStore((state) => state.loadInspection);
  const deleteInspection = useStore((state) => state.deleteInspection);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHistory = history.filter((inspection) => {
    const searchString = searchTerm.toLowerCase();
    const estName = inspection.establishment.name?.toLowerCase() || "";
    const estAddress = inspection.establishment.address?.toLowerCase() || "";
    const date = inspection.savedAt?.toLowerCase() || "";
    return estName.includes(searchString) || estAddress.includes(searchString) || date.includes(searchString);
  });

  const handleLoad = (id: string) => {
    loadInspection(id);
    toast({
      title: "Inspección Cargada",
      description: "Se han restaurado los datos de la inspección seleccionada.",
    });
    setLocation("/");
  };

  const handleDelete = (id: string) => {
    deleteInspection(id);
    toast({
      title: "Inspección Eliminada",
      description: "El registro ha sido eliminado del historial.",
      variant: "destructive"
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Historial de Mediciones</h1>
          <p className="text-muted-foreground">
            Registro histórico de relevamientos guardados por empresa.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                placeholder="Buscar por empresa, fecha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
            />
        </div>
        <div className="text-sm text-muted-foreground">
            {filteredHistory.length} registros encontrados
        </div>
      </div>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Mediciones Guardadas
            </CardTitle>
            <CardDescription>
                Lista de todos los relevamientos almacenados localmente.
            </CardDescription>
        </CardHeader>
        <CardContent>
            {filteredHistory.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    <Archive className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p>No hay mediciones guardadas en el historial.</p>
                </div>
            ) : (
                <div className="rounded-md border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Fecha Guardado</TableHead>
                                <TableHead>Establecimiento</TableHead>
                                <TableHead>Dirección</TableHead>
                                <TableHead>Sectores</TableHead>
                                <TableHead>Responsable</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredHistory.map((inspection) => (
                                <TableRow key={inspection.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{format(new Date(inspection.savedAt), "dd/MM/yyyy", { locale: es })}</span>
                                            <span className="text-xs text-muted-foreground">{format(new Date(inspection.savedAt), "HH:mm", { locale: es })} hs</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-semibold text-primary">{inspection.establishment.name || "Sin nombre"}</span>
                                        <div className="text-xs text-muted-foreground">{inspection.establishment.cuit}</div>
                                    </TableCell>
                                    <TableCell>{inspection.establishment.address || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="gap-1">
                                            {inspection.sectors.length} Sectores
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{inspection.establishment.responsible || "-"}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                        <RefreshCw className="h-3 w-3" /> Cargar
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Cargar esta inspección?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esto reemplazará los datos actuales en el tablero con los datos de esta copia guardada. 
                                                            Asegúrese de guardar su trabajo actual antes de continuar.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleLoad(inspection.id)}>Continuar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>

                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-100">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>¿Eliminar registro?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Esta acción no se puede deshacer. Se eliminará permanentemente este registro del historial.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(inspection.id)} className="bg-red-600 hover:bg-red-700">Eliminar</AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
