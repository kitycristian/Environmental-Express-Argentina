import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Users, FileText, Upload, Plus, Trash2, Eye, EyeOff,
  LogOut, Loader2, AlertCircle, CheckCircle2, Mail,
  Calendar, Globe,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const apiFetch = (url: string, opts: RequestInit = {}) =>
  fetch(url, { ...opts, credentials: "include", headers: { "Content-Type": "application/json", ...(opts.headers as Record<string, string> || {}) } });

// ─────────────── TIPOS ───────────────
type PortalUser = {
  id: string;
  email: string;
  nombre: string;
  activo: boolean;
  creadoEn: string;
};

type ClientReport = {
  id: string;
  clientPortalUserId: string;
  titulo: string;
  descripcion?: string;
  tipoEstudio?: string;
  fechaEstudio?: string;
  pdfNombre: string;
  notificacionEnviada: boolean;
  creadoEn: string;
};

// ─────────────── TAB USUARIOS ───────────────
function UsuariosTab() {
  const { toast } = useToast();
  const [usuarios, setUsuarios] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [lastPass, setLastPass] = useState<{ nombre: string; email: string; pass: string } | null>(null);
  const [passOpen, setPassOpen] = useState(false);

  const load = () => {
    setLoading(true);
    apiFetch("/api/padmin/users")
      .then(r => r.json())
      .then(setUsuarios)
      .catch(() => setUsuarios([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!nombre || !email) return;
    setCreating(true);
    const res = await apiFetch("/api/padmin/users", {
      method: "POST",
      body: JSON.stringify({ nombre, email }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { toast({ title: data.message || "Error", variant: "destructive" }); return; }
    setLastPass({ nombre, email, pass: data.password });
    setPassOpen(true);
    setCreateOpen(false);
    setNombre(""); setEmail("");
    load();
  };

  const handleToggle = async (id: string, activo: boolean) => {
    await apiFetch(`/api/padmin/users/${id}`, { method: "PATCH", body: JSON.stringify({ activo }) });
    load();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/padmin/users/${id}`, { method: "DELETE" });
    toast({ title: "Usuario eliminado" });
    load();
  };

  if (loading) return <div className="text-center py-16 text-gray-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""}</p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#0D2F5E] hover:bg-[#0D2F5E]/90" data-testid="button-nuevo-usuario">
              <Plus className="h-4 w-4 mr-1" /> Nuevo usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear acceso al portal</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nombre</Label>
                <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Juan García" className="mt-1" data-testid="input-nuevo-nombre" />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@empresa.com" className="mt-1" data-testid="input-nuevo-email" />
              </div>
              <p className="text-xs text-gray-500">Se generará una contraseña automáticamente.</p>
              <Button className="w-full bg-[#0D2F5E] hover:bg-[#0D2F5E]/90" onClick={handleCreate} disabled={!nombre || !email || creating} data-testid="button-confirmar-usuario">
                {creating ? "Creando…" : "Crear acceso"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal contraseña generada */}
      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-green-700"><CheckCircle2 className="h-5 w-5" />Acceso creado</DialogTitle></DialogHeader>
          {lastPass && (
            <div className="space-y-3">
              <p className="text-sm">Compartí estas credenciales con el cliente:</p>
              <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm space-y-1 border">
                <div><span className="text-gray-500">Email:</span> {lastPass.email}</div>
                <div><span className="text-gray-500">Contraseña:</span> <span className="font-bold text-[#0D2F5E]">{lastPass.pass}</span></div>
                <div><span className="text-gray-500">Portal:</span> /portal</div>
              </div>
              <p className="text-xs text-gray-500">Esta contraseña no se puede recuperar. Si se pierde, creá un nuevo acceso.</p>
              <Button className="w-full" onClick={() => setPassOpen(false)}>Entendido</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {usuarios.length === 0 ? (
        <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-3">
          <Users className="h-10 w-10 opacity-30" />
          <p className="text-sm">No hay usuarios aún.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {usuarios.map(u => (
            <Card key={u.id} className={`border ${u.activo ? "" : "opacity-60 border-dashed"}`} data-testid={`card-usuario-${u.id}`}>
              <CardContent className="p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{u.nombre}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${u.activo ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                      {u.activo ? "activo" : "inactivo"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                    <Mail className="h-3 w-3" />{u.email}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => handleToggle(u.id, !u.activo)} data-testid={`button-toggle-${u.id}`}>
                    {u.activo ? <><EyeOff className="h-3 w-3 mr-1" />Desactivar</> : <><Eye className="h-3 w-3 mr-1" />Activar</>}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200 hover:bg-red-50" data-testid={`button-delete-${u.id}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar a {u.nombre}?</AlertDialogTitle>
                        <AlertDialogDescription>Se eliminará el acceso y todos sus informes.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(u.id)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

// ─────────────── TAB INFORMES ───────────────
function InformesTab() {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [informes, setInformes] = useState<ClientReport[]>([]);
  const [usuarios, setUsuarios] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({ clientPortalUserId: "", titulo: "", descripcion: "", tipoEstudio: "", fechaEstudio: "" });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      apiFetch("/api/padmin/reports").then(r => r.json()),
      apiFetch("/api/padmin/users").then(r => r.json()),
    ]).then(([reps, usrs]) => {
      setInformes(Array.isArray(reps) ? reps : []);
      setUsuarios(Array.isArray(usrs) ? usrs : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleUpload = async () => {
    if (!pdfFile || !form.clientPortalUserId || !form.titulo) {
      toast({ title: "Completá los campos requeridos", variant: "destructive" }); return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      const res = await apiFetch("/api/padmin/reports", {
        method: "POST",
        body: JSON.stringify({ ...form, pdfData: base64, pdfNombre: pdfFile.name }),
      });
      setUploading(false);
      if (res.ok) {
        toast({ title: "✓ Informe subido" });
        setUploadOpen(false);
        setForm({ clientPortalUserId: "", titulo: "", descripcion: "", tipoEstudio: "", fechaEstudio: "" });
        setPdfFile(null);
        load();
      } else {
        toast({ title: "Error al subir informe", variant: "destructive" });
      }
    };
    reader.readAsDataURL(pdfFile);
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/padmin/reports/${id}`, { method: "DELETE" });
    toast({ title: "Informe eliminado" });
    load();
  };

  const usuariosActivos = usuarios.filter(u => u.activo);

  if (loading) return <div className="text-center py-16 text-gray-400"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{informes.length} informe{informes.length !== 1 ? "s" : ""}</p>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-[#0D2F5E] hover:bg-[#0D2F5E]/90" data-testid="button-subir-informe">
              <Upload className="h-4 w-4 mr-1" /> Subir informe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Subir informe al portal</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>Cliente *</Label>
                <Select value={form.clientPortalUserId} onValueChange={v => setForm(f => ({ ...f, clientPortalUserId: v }))}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Seleccioná un cliente" /></SelectTrigger>
                  <SelectContent>
                    {usuariosActivos.map(u => <SelectItem key={u.id} value={u.id}>{u.nombre} — {u.email}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título *</Label>
                <Input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Informe de ruido — Planta Sur" className="mt-1" data-testid="input-titulo" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tipo de estudio</Label>
                  <Input value={form.tipoEstudio} onChange={e => setForm(f => ({ ...f, tipoEstudio: e.target.value }))} placeholder="Ruido, Iluminación…" className="mt-1" />
                </div>
                <div>
                  <Label>Fecha del estudio</Label>
                  <Input type="date" value={form.fechaEstudio} onChange={e => setForm(f => ({ ...f, fechaEstudio: e.target.value }))} className="mt-1" />
                </div>
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} className="mt-1" />
              </div>
              <div>
                <Label>Archivo PDF *</Label>
                <div
                  className="mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-[#0D2F5E]/40 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {pdfFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-[#0D2F5E]" />
                      <span className="font-medium">{pdfFile.name}</span>
                      <span className="text-gray-400">({(pdfFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  ) : (
                    <div className="text-gray-400 text-sm">
                      <Upload className="h-5 w-5 mx-auto mb-1 opacity-50" />
                      Hacé clic para seleccionar el PDF
                    </div>
                  )}
                  <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={e => setPdfFile(e.target.files?.[0] || null)} />
                </div>
              </div>
              <Button className="w-full bg-[#0D2F5E] hover:bg-[#0D2F5E]/90" onClick={handleUpload} disabled={!pdfFile || !form.clientPortalUserId || !form.titulo || uploading} data-testid="button-confirmar-subir">
                {uploading ? "Subiendo…" : "Subir informe"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {informes.length === 0 ? (
        <div className="text-center py-16 text-gray-400 flex flex-col items-center gap-3">
          <FileText className="h-10 w-10 opacity-30" />
          <p className="text-sm">No hay informes subidos aún.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {informes.map(r => {
            const cliente = usuarios.find(u => u.id === r.clientPortalUserId);
            return (
              <Card key={r.id} className="border" data-testid={`card-informe-${r.id}`}>
                <CardContent className="p-3 flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-medium text-sm truncate">{r.titulo}</span>
                      {r.tipoEstudio && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">{r.tipoEstudio}</span>
                      )}
                      {r.notificacionEnviada && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />Email enviado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" />{cliente?.nombre || "-"}</span>
                      {r.fechaEstudio && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{r.fechaEstudio}</span>}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 text-red-600 border-red-200 hover:bg-red-50 shrink-0" data-testid={`button-delete-informe-${r.id}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar informe?</AlertDialogTitle>
                        <AlertDialogDescription>Se eliminará "{r.titulo}" permanentemente.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={() => handleDelete(r.id)}>Eliminar</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─────────────── PANEL PRINCIPAL ───────────────
function AdminPanel({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <header className="bg-[#0D2F5E] text-white shadow-md sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-green-400" />
            <span className="font-bold text-sm">Panel — Portal de Clientes</span>
          </div>
          <Button size="sm" variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10 h-8 text-xs" onClick={onLogout} data-testid="button-portal-admin-logout">
            <LogOut className="h-3.5 w-3.5 mr-1.5" />Salir
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <Tabs defaultValue="usuarios">
          <TabsList className="grid w-full grid-cols-2 max-w-xs mb-4">
            <TabsTrigger value="usuarios"><Users className="h-3.5 w-3.5 mr-1" />Usuarios</TabsTrigger>
            <TabsTrigger value="informes"><FileText className="h-3.5 w-3.5 mr-1" />Informes</TabsTrigger>
          </TabsList>
          <TabsContent value="usuarios"><UsuariosTab /></TabsContent>
          <TabsContent value="informes"><InformesTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─────────────── EXPORT ───────────────
export default function PortalAdmin() {
  const [, setLocation] = useLocation();
  return <AdminPanel onLogout={() => setLocation("/")} />;
}
