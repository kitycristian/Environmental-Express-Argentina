import { Link, useLocation } from "wouter";
import { ClipboardList, Home, FileText, Menu, ChevronRight, Save, History, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const establishment = useStore((state) => state.establishment);
  const history = useStore((state) => state.history);
  const saveInspection = useStore((state) => state.saveInspection);
  const loadInspection = useStore((state) => state.loadInspection);
  const deleteInspection = useStore((state) => state.deleteInspection);
  
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
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

  const NavContent = () => (
    <nav className="flex flex-col gap-2 p-4 h-full">
      <div className="mb-6 px-2">
        <h2 className="text-lg font-bold tracking-tight text-primary">Environmental Express</h2>
        <p className="text-xs text-muted-foreground truncate">
          Argentina
        </p>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Historial de Inspecciones</DialogTitle>
            <DialogDescription>
              Versiones guardadas anteriormente. Cargar una versión reemplazará los datos actuales.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">No hay inspecciones guardadas.</p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {item.establishment.name || "Sin nombre"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.savedAt), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.sectors.length} sectores
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
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <div className="mt-auto pt-4 border-t">
         <Button variant="ghost" className="w-full justify-start px-3 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => {
          if(confirm('¿Borrar todos los datos actuales y empezar de cero?')) {
            useStore.getState().resetStore();
            setOpen(false);
          }
        }}>
          <Trash2 className="mr-2 h-4 w-4" />
          Nueva Inspección
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row print:block">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b bg-card sticky top-0 z-50 print:hidden">
        <div className="flex items-center gap-2">
           <div className="h-8 w-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold">
             EE
           </div>
           <span className="font-semibold text-sm truncate max-w-[200px]">
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
      <aside className="hidden md:flex w-64 flex-col border-r bg-card h-screen sticky top-0 print:hidden">
        <NavContent />
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full print:p-0 print:max-w-none">
        {children}
      </main>
    </div>
  );
}
