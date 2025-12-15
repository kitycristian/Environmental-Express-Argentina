import { Link, useLocation } from "wouter";
import { ClipboardList, Home, FileText, Menu, ChevronRight, Save, History, Trash2, RotateCcw, PlusCircle, Building2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/image_1765761040646.png";
import { Badge } from "@/components/ui/badge";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const establishment = useStore((state) => state.establishment);
  const sectors = useStore((state) => state.sectors);
  const history = useStore((state) => state.history);
  const saveInspection = useStore((state) => state.saveInspection);
  const loadInspection = useStore((state) => state.loadInspection);
  const deleteInspection = useStore((state) => state.deleteInspection);
  const resetStore = useStore((state) => state.resetStore);
  
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [newInspectionOpen, setNewInspectionOpen] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    saveInspection();
    toast({
      title: "Inspección Guardada",
      description: "Se ha guardado una copia en el historial local.",
    });
  };

  const handleLoad = (id: string) => {
    if (confirm("¿Cargar esta inspección reemplazará los datos actuales. ¿Continuar?")) {
      loadInspection(id);
      setHistoryOpen(false);
      toast({
        title: "Inspección Cargada",
        description: "Los datos históricos han sido restaurados.",
      });
    }
  };

  const handleNewInspection = (saveFirst: boolean) => {
    if (saveFirst) {
      saveInspection();
      toast({
        title: "Inspección Guardada",
        description: "La inspección anterior se guardó en el historial.",
      });
    }
    resetStore();
    setNewInspectionOpen(false);
    setOpen(false);
    toast({
      title: "Nueva Inspección",
      description: "Se ha limpiado el tablero para comenzar.",
    });
  };

  // Group history by Company -> Year
  const groupedHistory = history.reduce((acc, item) => {
    const company = item.establishment.name || "Sin Nombre";
    const dateObj = new Date(item.establishment.date || item.savedAt);
    const year = dateObj.getFullYear().toString();

    if (!acc[company]) acc[company] = {};
    if (!acc[company][year]) acc[company][year] = [];
    
    acc[company][year].push(item);
    return acc;
  }, {} as Record<string, Record<string, typeof history>>);

  const NavContent = () => (
    <nav className="flex flex-col gap-2 p-4 h-full">
      <div className="mb-6 px-2 flex flex-col items-start gap-3">
        <img src={logoUrl} alt="Environmental Express Argentina" className="h-16 w-auto object-contain" />
        <span className="font-bold text-sm text-primary">Environmental Express Argentina</span>
      </div>
      
      <Link href="/">
        <a className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${location === '/' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`} onClick={() => setOpen(false)}>
          <Home className="h-4 w-4" />
          Tablero
        </a>
      </Link>
      
      <Link href="/report">
        <a className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${location === '/report' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'}`} onClick={() => setOpen(false)}>
          <FileText className="h-4 w-4" />
          Reporte Final
        </a>
      </Link>

      <div className="mt-8 px-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
        Gestión
      </div>

      <Button variant="ghost" className="justify-start px-3 text-muted-foreground hover:text-primary" onClick={handleSave}>
        <Save className="mr-2 h-4 w-4" />
        Guardar Estado Actual
      </Button>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="justify-start px-3 text-muted-foreground hover:text-primary">
            <History className="mr-2 h-4 w-4" />
            Historial ({history.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Historial de Inspecciones</DialogTitle>
            <DialogDescription>
              Organizado por Empresa y Año.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[400px] pr-4">
            {history.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">No hay inspecciones guardadas.</p>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {Object.entries(groupedHistory).map(([company, years]) => (
                  <AccordionItem key={company} value={company}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{company}</span>
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {Object.values(years).flat().length}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pl-4 space-y-2">
                        {Object.entries(years).sort((a, b) => Number(b[0]) - Number(a[0])).map(([year, items]) => (
                          <div key={year} className="border-l-2 border-muted pl-4 py-2">
                            <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {year}
                            </h4>
                            <div className="space-y-2">
                              {items.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()).map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-muted/50 transition-colors">
                                  <div className="space-y-1">
                                    <p className="font-medium text-sm">
                                      {format(new Date(item.establishment.date || item.savedAt), "d 'de' MMMM", { locale: es })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.sectors.length} sectores relevados
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleLoad(item.id)} title="Cargar">
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => deleteInspection(item.id)} title="Eliminar">
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
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="mt-auto pt-4 border-t">
         <Button 
            variant="ghost" 
            className="w-full justify-start px-3 text-primary hover:text-primary hover:bg-primary/10 font-medium" 
            onClick={() => setNewInspectionOpen(true)}
         >
          <PlusCircle className="mr-2 h-4 w-4" />
          Nueva Inspección
        </Button>
      </div>

      <AlertDialog open={newInspectionOpen} onOpenChange={setNewInspectionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Comenzar Nueva Inspección?</AlertDialogTitle>
            <AlertDialogDescription>
              Se limpiarán los datos actuales del tablero. Puedes guardar la inspección actual en el historial antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleNewInspection(false)} className="text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10">
              No guardar y limpiar
            </Button>
            <Button onClick={() => handleNewInspection(true)}>
              Guardar y Limpiar
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row print:block">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-50 print:hidden shadow-sm">
        <div className="flex items-center gap-2">
           <img src={logoUrl} alt="EE Logo" className="h-8 w-auto" />
           <span className="font-semibold text-sm truncate max-w-[200px] text-primary">
             {establishment.name || "Nueva Inspección"}
           </span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card h-screen sticky top-0 print:hidden shadow-sm z-20">
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full print:p-0 print:max-w-none">
        {children}
      </main>
    </div>
  );
}
