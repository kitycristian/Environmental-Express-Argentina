import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, LogOut, Printer, X, Calendar, Tag, AlertCircle, Loader2 } from "lucide-react";

type PortalUser = {
  id: string;
  nombre: string;
  email: string;
  activo: boolean;
};

type Report = {
  id: string;
  titulo: string;
  descripcion?: string;
  tipoEstudio?: string;
  fechaEstudio?: string;
  pdfNombre: string;
  creadoEn: string;
};

function EEALogo({ size = 64 }: { size?: number }) {
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

// ── PANTALLA DE LOGIN ──
function LoginScreen({ onLogin }: { onLogin: (user: PortalUser) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/portal/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Credenciales inválidas");
        return;
      }
      // Obtener datos completos del usuario
      const meRes = await fetch("/api/portal/me", { credentials: "include" });
      if (meRes.ok) {
        const me = await meRes.json();
        onLogin(me);
      }
    } catch {
      setError("Error de conexión. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo + Branding */}
        <div className="flex flex-col items-center mb-8">
          <EEALogo size={72} />
          <h1 className="mt-4 text-2xl font-bold text-[#0D2F5E]">Portal de Informes</h1>
          <p className="text-sm text-gray-500 mt-1">Environmental Express Argentina</p>
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-[#0D2F5E]">Ingresar</CardTitle>
            <CardDescription>Usá las credenciales que te envió EEA</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="portal-email">Email</Label>
                <Input
                  id="portal-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  required
                  autoComplete="email"
                  className="mt-1"
                  data-testid="input-portal-email"
                />
              </div>
              <div>
                <Label htmlFor="portal-password">Contraseña</Label>
                <Input
                  id="portal-password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  required
                  autoComplete="current-password"
                  className="mt-1"
                  data-testid="input-portal-password"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700" data-testid="alert-portal-error">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-[#0D2F5E] hover:bg-[#0D2F5E]/90"
                disabled={loading}
                data-testid="button-portal-login"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Ingresando…</>
                ) : "Ingresar"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          ¿Problemas para ingresar? Contactá a{" "}
          <a href="mailto:contacto@envexar.com" className="underline hover:text-gray-600">
            contacto@envexar.com
          </a>
        </p>
      </div>
    </div>
  );
}

// ── MODAL DE PDF ──
function PdfModal({ report, onClose }: { report: Report; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/95" data-testid="modal-pdf">
      {/* Barra superior del modal */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0D2F5E] shrink-0">
        <div className="flex items-center gap-2 text-white min-w-0">
          <FileText className="h-4 w-4 shrink-0 text-green-400" />
          <span className="font-medium truncate text-sm">{report.titulo}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <Button
            size="sm"
            variant="secondary"
            className="h-8 text-xs bg-white/10 text-white hover:bg-white/20 border-0"
            onClick={handlePrint}
            data-testid="button-imprimir-pdf"
          >
            <Printer className="h-3.5 w-3.5 mr-1.5" />
            Imprimir
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-white hover:bg-white/20"
            onClick={onClose}
            data-testid="button-cerrar-pdf"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* iframe con el PDF */}
      <iframe
        ref={iframeRef}
        src={`/api/portal/me/reports/${report.id}/download`}
        className="flex-1 w-full bg-white"
        title={report.titulo}
        data-testid="iframe-pdf"
      />
    </div>
  );
}

// ── PANTALLA DE INFORMES ──
function ReportsScreen({ user, onLogout }: { user: PortalUser; onLogout: () => void }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  useEffect(() => {
    fetch("/api/portal/me/reports", { credentials: "include" })
      .then(r => r.json())
      .then(data => { setReports(Array.isArray(data) ? data : []); })
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = async () => {
    await fetch("/api/portal/logout", { method: "POST", credentials: "include" });
    onLogout();
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      // Si es YYYY-MM-DD, lo formateamos como DD/MM/YYYY
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        const [y, m, d] = dateStr.split("-");
        return `${d}/${m}/${y}`;
      }
      return dateStr;
    } catch { return dateStr; }
  };

  return (
    <>
      <div className="min-h-screen bg-[#f0f4f8]">
        {/* Header */}
        <header className="bg-[#0D2F5E] text-white shadow-md sticky top-0 z-10">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <EEALogo size={38} />
              <div>
                <h1 className="font-bold text-base leading-tight">Mis Informes</h1>
                <p className="text-white/60 text-xs">{user.nombre}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-white/80 hover:text-white hover:bg-white/10 h-8 text-xs"
              onClick={handleLogout}
              data-testid="button-portal-logout"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Cerrar sesión
            </Button>
          </div>
        </header>

        {/* Contenido */}
        <main className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="text-sm">Cargando informes…</span>
            </div>
          ) : reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <FileText className="h-12 w-12 text-gray-300" />
              <p className="text-gray-500 text-sm max-w-xs">
                Aún no tenés informes disponibles. Te notificaremos cuando EEA suba un nuevo informe.
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-1">
                {reports.length} informe{reports.length !== 1 ? "s" : ""} disponible{reports.length !== 1 ? "s" : ""}
              </p>
              {reports.map(r => (
                <Card
                  key={r.id}
                  className="border-0 shadow-sm hover:shadow-md transition-shadow"
                  data-testid={`card-informe-portal-${r.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {r.tipoEstudio && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-[#0D2F5E]/10 text-[#0D2F5E] border border-[#0D2F5E]/20">
                              <Tag className="h-2.5 w-2.5" />
                              {r.tipoEstudio}
                            </span>
                          )}
                          {r.fechaEstudio && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                              <Calendar className="h-2.5 w-2.5" />
                              {formatDate(r.fechaEstudio)}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-800 leading-snug">{r.titulo}</h3>
                        {r.descripcion && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{r.descripcion}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 bg-[#0D2F5E] hover:bg-[#0D2F5E]/90 h-9 text-xs"
                        onClick={() => setSelectedReport(r)}
                        data-testid={`button-ver-informe-${r.id}`}
                      >
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        Ver e imprimir
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="text-center py-8 text-xs text-gray-400">
          Environmental Express Argentina · contacto@envexar.com
        </footer>
      </div>

      {/* Modal PDF */}
      {selectedReport && (
        <PdfModal report={selectedReport} onClose={() => setSelectedReport(null)} />
      )}
    </>
  );
}

// ── PÁGINA PRINCIPAL ──
export default function Portal() {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    fetch("/api/portal/me", { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.id) setUser(data); })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0D2F5E]" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={setUser} />;
  }

  return <ReportsScreen user={user} onLogout={() => setUser(null)} />;
}
