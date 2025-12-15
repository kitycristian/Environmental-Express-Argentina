import { Link, useLocation } from "wouter";
import { ClipboardList, Home, FileText, Menu, ChevronRight, Save, History, Trash2, RotateCcw, PlusCircle, Building2, Calendar, Users, FileStack, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/image_1765761040646.png";
import { Badge } from "@/components/ui/badge";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const establishment = useStore((state) => state.establishment);
  const saveInspection = useStore((state) => state.saveInspection);
  const resetStore = useStore((state) => state.resetStore);
  const { user, logout } = useAuth();
  
  const [open, setOpen] = useState(false);
  const [newInspectionOpen, setNewInspectionOpen] = useState(false);
  const { toast } = useToast();

  const handleLogout = () => {
    logout();
    setLocation("/login");
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
    setLocation("/");
    toast({
      title: "Nueva Inspección",
      description: "Se ha limpiado el tablero para comenzar.",
    });
  };

  const NavContent = () => (
    <nav className="flex flex-col gap-2 p-4 h-full">
      <div className="mb-6 px-2 flex flex-col items-start gap-3">
        <img src={logoUrl} alt="Environmental Express Argentina" className="h-16 w-auto object-contain" />
        <span className="font-bold text-sm text-primary">Environmental Express Argentina</span>
      </div>

      {user && (
        <div className="mb-6 px-2 py-3 bg-gray-50 rounded-lg border border-gray-100 flex items-center gap-3">
          <div className="bg-primary/10 p-2 rounded-full">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-xs truncate">{user.name}</span>
            <span className="text-[10px] text-gray-500 capitalize">{user.role}</span>
          </div>
        </div>
      )}
      
      <div onClick={() => setNewInspectionOpen(true)} className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted cursor-pointer text-primary`}>
          <PlusCircle className="h-4 w-4" />
          Nueva Inspección
      </div>
      
      {user?.role === 'admin' && (
        <>
          <Link href="/reports">
            <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${location === '/reports' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'} cursor-pointer`} onClick={() => setOpen(false)}>
              <FileStack className="h-4 w-4" />
              Informes
            </div>
          </Link>

          <Link href="/clients">
            <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${location === '/clients' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'} cursor-pointer`} onClick={() => setOpen(false)}>
              <Users className="h-4 w-4" />
              Clientes (CRM)
            </div>
          </Link>
        </>
      )}

      <div className="mt-8 px-2 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
        Navegación
      </div>
      
      <Link href="/">
        <div className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted ${location === '/' ? 'bg-primary/10 text-primary' : 'text-muted-foreground'} cursor-pointer`} onClick={() => setOpen(false)}>
          <Home className="h-4 w-4" />
          Tablero Activo
        </div>
      </Link>

      <div className="mt-auto pt-4 border-t border-gray-100">
        <div onClick={handleLogout} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 cursor-pointer">
          <LogOut className="h-4 w-4" />
          Cerrar Sesión
        </div>
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

