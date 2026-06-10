import { Link, useLocation } from "wouter";
import { Home, FileText, Menu, PlusCircle, LogOut, User, Settings, Wrench, Users, FileStack, History, CheckCircle2, Globe } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect, useCallback } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import logoUrl from "@assets/image_1773940561975.png";
import { format } from "date-fns";
import { es } from "date-fns/locale";

function useBudgetBadge(isAdmin: boolean) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/budget-requests", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setCount((data as any[]).filter((r: any) => r.estado === "nuevo").length);
      } catch { /* ignorar */ }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 60000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  return count;
}

function EEALogo({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="37" fill="#0D2F5E" stroke="#22c55e" strokeWidth="3" />
      <ellipse cx="40" cy="40" rx="16" ry="37" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" fill="none" />
      <ellipse cx="40" cy="40" rx="28" ry="37" stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none" />
      <line x1="3" y1="40" x2="77" y2="40" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
      <line x1="3" y1="26" x2="77" y2="26" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
      <line x1="3" y1="54" x2="77" y2="54" stroke="rgba(255,255,255,0.1)" strokeWidth="0.8" />
      <text x="40" y="46" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="19" letterSpacing="1">EEA</text>
      <circle cx="61" cy="61" r="11" fill="#22c55e" />
      <path d="M56 61 L60 65 L67 57" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function EEALogoSmall({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="37" fill="#0D2F5E" stroke="#22c55e" strokeWidth="3" />
      <text x="40" y="46" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontWeight="bold" fontSize="19" letterSpacing="1">EEA</text>
      <circle cx="61" cy="61" r="11" fill="#22c55e" />
      <path d="M56 61 L60 65 L67 57" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function SaveIndicator() {
  const isDirty = useStore((s) => s.isDirty);
  const lastSavedAt = useStore((s) => s.lastSavedAt);
  const saveInspection = useStore((s) => s.saveInspection);
  const { toast } = useToast();

  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => { saveInspection(); }, 45000);
    return () => clearTimeout(timer);
  }, [isDirty, saveInspection]);

  const handleManualSave = useCallback(() => {
    saveInspection();
    toast({ title: "✓ Guardado", description: "Datos guardados en el historial." });
  }, [saveInspection, toast]);

  if (isDirty) {
    return (
      <button onClick={handleManualSave} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 transition-colors font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
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

function NavSection({ label }: { label: string }) {
  return (
    <div className="px-2 pt-4 pb-1">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30 select-none">{label}</span>
    </div>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const establishment = useStore((state) => state.establishment);
  const { user, logout } = useAuth();
  const { isOnline } = useOnlineStatus();
  const [open, setOpen] = useState(false);
  const budgetBadge = useBudgetBadge(user?.role === "admin");

  const handleLogout = async () => { await logout(); setLocation("/login"); };

  const closeMenu = () => setOpen(false);

  const NavContent = () => (
    <nav className="eea-sidebar flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-5 pb-4 border-b border-white/10 flex items-center gap-3">
        <EEALogo size={52} />
        <div>
          <div className="text-white font-bold text-[13px] leading-tight">Environmental</div>
          <div className="text-white font-bold text-[13px] leading-tight">Express Argentina</div>
          <div className="text-white/40 text-[10px] mt-0.5">Sistema de S&H</div>
        </div>
      </div>

      {/* User pill */}
      {user && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-xl bg-white/8 border border-white/10 flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[hsl(144,60%,38%)] to-[hsl(144,60%,28%)] flex items-center justify-center flex-shrink-0">
            <User className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="overflow-hidden">
            <div className="text-white text-[12px] font-semibold truncate leading-tight">{user.username}</div>
            <div className="text-white/40 text-[10px] capitalize">{user.role === 'admin' ? 'Administrador' : 'Operador'}</div>
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-0.5">

        <NavSection label="Principal" />

        <NavItem href="/" icon={<Home className="h-4 w-4" />} label="Inicio" location={location} onClick={closeMenu} />
        <NavItem href="/clients" icon={<PlusCircle className="h-4 w-4" />} label="Nueva Inspección" location={location} onClick={closeMenu} />

        <NavItem href="/history" icon={<History className="h-4 w-4" />} label="Historial" location={location} onClick={closeMenu} />

        <NavSection label="Gestión" />

        {user?.role === 'admin' && (
          <NavItem href="/clients" icon={<Users className="h-4 w-4" />} label="Clientes" location={location} onClick={closeMenu} />
        )}

        <NavItem href="/instruments" icon={<Wrench className="h-4 w-4" />} label="Instrumentos" location={location} onClick={closeMenu} />

        {user?.role === 'admin' && (
          <>
            <NavItem href="/reports" icon={<FileStack className="h-4 w-4" />} label="Informes" location={location} onClick={closeMenu} />
            <NavItem href="/client-portal" icon={<Globe className="h-4 w-4" />} label="Portal Clientes" location={location} onClick={closeMenu} />
            <NavItem href="/portal-admin" icon={<Globe className="h-4 w-4 opacity-70" />} label="Admin Portal" location={location} onClick={closeMenu} />
            <Link href="/budget-generator">
              <div className={`eea-nav-item relative ${location === "/budget-generator" ? "active" : ""}`} onClick={closeMenu}>
                <FileText className="h-4 w-4" />
                <span>Presupuestos</span>
                {budgetBadge > 0 && (
                  <span className="ml-auto min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {budgetBadge}
                  </span>
                )}
              </div>
            </Link>
          </>
        )}

        {user?.role === 'admin' && (
          <>
            <NavSection label="Sistema" />
            <NavItem href="/settings" icon={<Settings className="h-4 w-4" />} label="Configuración" location={location} onClick={closeMenu} />
          </>
        )}
      </div>

      {/* Footer logout */}
      <div className="p-3 border-t border-white/10">
        <div className="eea-nav-item text-red-400 hover:text-red-300 hover:bg-red-500/15" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          <span>Cerrar Sesión</span>
        </div>
      </div>

    </nav>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row print:block">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-50 print:hidden shadow-sm eea-mobile-header">
        <div className="flex items-center gap-2.5">
          <EEALogoSmall size={32} />
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
      <aside className="hidden md:flex w-[240px] flex-col h-screen sticky top-0 print:hidden z-20 shadow-xl">
        <NavContent />
      </aside>

      {/* Save indicator desktop */}
      <div className="hidden md:block fixed top-4 right-5 z-40 print:hidden">
        <SaveIndicator />
      </div>

      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-800 text-amber-50 py-2 px-4 text-center text-sm font-medium print:hidden">
          Sin conexión — los datos se guardan localmente y se sincronizan al reconectarse
        </div>
      )}

      {/* Main Content */}
      <main className={`flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full print:p-0 print:max-w-none animate-fade-in${!isOnline ? ' mt-10' : ''}`}>
        {children}
      </main>
    </div>
  );
}
