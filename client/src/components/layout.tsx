import { Link, useLocation } from "wouter";
import { Home, FileText, Menu, PlusCircle, LogOut, User, Settings, Wrench, Users, FileStack, History, Cloud, CloudOff, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useCreateInspection } from "@/lib/hooks";
import logoUrl from "@assets/image_1773940561975.png";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function SaveIndicator() {
  const isDirty = useStore((s) => s.isDirty);
  const lastSavedAt = useStore((s) => s.lastSavedAt);
  const saveInspection = useStore((s) => s.saveInspection);
  const createInspection = useCreateInspection();
  const { toast } = useToast();

  // Auto-save every 45 seconds if dirty
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      saveInspection();
    }, 45000);
    return () => clearTimeout(timer);
  }, [isDirty, saveInspection]);

  const handleManualSave = useCallback(() => {
    saveInspection();
    toast({ title: "✓ Guardado", description: "Datos guardados en el historial." });
  }, [saveInspection, toast]);

  if (isDirty) {
    return (
      <button onClick={handleManualSave} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors font-medium">
        <span className="save-dot w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
        Sin guardar — clic para guardar
      </button>
    );
  }

  if (lastSavedAt) {
    return (
      <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md text-green-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Guardado {format(new Date(lastSavedAt), "HH:mm", { locale: es })}</span>
      </div>
    );
  }

  return null;
}

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  location: string;
  onClick?: () => void;
}

function NavItem({ href, icon, label, location, onClick }: NavItemProps) {
  const isActive = location === href;
  return (
    <Link href={href}>
      <div className={`eea-nav-item ${isActive ? 'active' : ''}`} onClick={onClick}>
        {icon}
        <span>{label}</span>
      </div>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const establishment = useStore((state) => state.establishment);
  const saveInspection = useStore((state) => state.saveInspection);
  const resetStore = useStore((state) => state.resetStore);
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [newInspectionOpen, setNewInspectionOpen] = useState(false);
  const { toast } = useToast();

  const handleLogout = async () => { await logout(); setLocation("/login"); };

  const handleNewInspection = (saveFirst: boolean) => {
    if (saveFirst) {
      saveInspection();
      toast({ title: "Inspección guardada en el historial." });
    }
    resetStore();
    setNewInspectionOpen(false);
    setOpen(false);
    setLocation("/");
    toast({ title: "Nueva inspección lista." });
  };

  const closeMenu = () => setOpen(false);

  const NavContent = () => (
    <nav className="eea-sidebar flex flex-col h-full">
      {/* Logo */}
      <div className="p-5 pb-4 border-b border-white/10">
        <img src={logoUrl} alt="Environmental Express Argentina" className="h-20 w-auto object-contain mx-auto" />
      </div>

      {/* User pill */}
      {user && (
        <div className="mx-4 mt-4 px-3 py-2.5 rounded-xl bg-white/8 border border-white/12 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[hsl(144,60%,38%)] to-[hsl(144,60%,28%)] flex items-center justify-center flex-shrink-0">
            <User className="h-4 w-4 text-white" />
          </div>
          <div className="overflow-hidden">
            <div className="text-white text-[13px] font-semibold truncate leading-tight">{user.username}</div>
            <div className="text-white/50 text-[10px] capitalize">{user.role}</div>
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        <div
          className="eea-nav-item text-[hsl(144,75%,72%)] hover:text-[hsl(144,80%,80%)]"
          onClick={() => { setNewInspectionOpen(true); }}
        >
          <PlusCircle className="h-4 w-4" />
          <span>Nueva Inspección</span>
        </div>

        {user?.role === 'admin' && (
          <>
            <NavItem href="/reports" icon={<FileStack className="h-4 w-4" />} label="Informes" location={location} onClick={closeMenu} />
            <NavItem href="/budget-generator" icon={<FileText className="h-4 w-4" />} label="Presupuestos" location={location} onClick={closeMenu} />
            <NavItem href="/clients" icon={<Users className="h-4 w-4" />} label="Clientes (CRM)" location={location} onClick={closeMenu} />
          </>
        )}

        <div className="eea-nav-section pt-3">Navegación</div>

        <NavItem href="/" icon={<Home className="h-4 w-4" />} label="Tablero Activo" location={location} onClick={closeMenu} />
        <NavItem href="/instruments" icon={<Wrench className="h-4 w-4" />} label="Instrumentos" location={location} onClick={closeMenu} />
        <NavItem href="/history" icon={<History className="h-4 w-4" />} label="Historial" location={location} onClick={closeMenu} />

        {user?.role === 'admin' && (
          <NavItem href="/settings" icon={<Settings className="h-4 w-4" />} label="Configuración" location={location} onClick={closeMenu} />
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/10">
        <div className="eea-nav-item text-red-400 hover:text-red-300 hover:bg-red-500/15" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span>Cerrar Sesión</span>
        </div>
      </div>

      <AlertDialog open={newInspectionOpen} onOpenChange={setNewInspectionOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Comenzar Nueva Inspección?</AlertDialogTitle>
            <AlertDialogDescription>
              Se limpiarán los datos actuales. Podés guardar en el historial antes de continuar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <Button variant="outline" onClick={() => handleNewInspection(false)} className="text-destructive border-destructive/30 hover:bg-destructive/8">
              No guardar
            </Button>
            <Button onClick={() => handleNewInspection(true)}>Guardar y limpiar</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row print:block">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-50 print:hidden shadow-sm eea-mobile-header">
        <div className="flex items-center gap-2.5">
          <img src={logoUrl} alt="EEA" className="h-8 w-auto" />
          <span className="font-semibold text-sm truncate max-w-[180px] text-primary">
            {establishment.name || "Nueva Inspección"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <SaveIndicator />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Menu className="h-4.5 w-4.5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[260px] border-0">
              <NavContent />
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-[232px] flex-col h-screen sticky top-0 print:hidden z-20 shadow-xl">
        <NavContent />
      </aside>

      {/* Save indicator desktop — top right */}
      <div className="hidden md:block fixed top-4 right-5 z-40 print:hidden">
        <SaveIndicator />
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full print:p-0 print:max-w-none animate-fade-in">
        {children}
      </main>
    </div>
  );
}
