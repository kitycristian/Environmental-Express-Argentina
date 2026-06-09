import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Users, Upload, Trash2, Plus, Mail, FileText, Eye, EyeOff,
  CheckCircle2, XCircle, Calendar, Globe,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type PortalUser = {
  id: string;
  clientId?: string;
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
  clienteNombre?: string;
};

// ── TAB 1: Usuarios del portal ──
function UsuariosTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [lastCreatedPass, setLastCreatedPass] = useState<{ nombre: string; email: string; pass: string } | null>(null);
  const [passOpen, setPassOpen] = useState(false);

  const { data: usuarios = [], isLoading } = useQuery<PortalUser[]>({
    queryKey: ["/api/portal/users"],
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/portal/users", data),
    onSuccess: async (res: any) => {
      const json = await res.json();
      setLastCreatedPass({ nombre, email, pass: json.password });
      setPassOpen(true);
      setCreateOpen(false);
      setNombre(""); setEmail("");
      queryClient.invalidateQueries({ queryKey: ["/api/portal/users"] });
    },
    onError: () => toast({ title: "Error al crear usuario", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, activo }: { id: string; activo: boolean }) =>
      apiRequest("PATCH", `/api/portal/users/${id}`, { activo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/portal/users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/portal/users/${id}`),
    onSuccess: () => {
      toast({ title: "Usuario eliminado" });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/users"] });
    },
  });

  if (isLoading) return <div className="text-center py-16 text-muted-foreground">Cargando…</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""} del portal</p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-crear-usuario-portal">
              <Plus className="h-4 w-4 mr-1" /> Nuevo usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Crear acceso al portal</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nombre del cliente</Label>
                <Input
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Juan García"
                  data-testid="input-nombre-portal"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="cliente@empresa.com"
                  data-testid="input-email-portal"
                />
              </div>
              <p className="text-xs text-muted-foreground">Se generará una contraseña automáticamente.</p>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate({ nombre, email })}
                disabled={!nombre || !email || createMutation.isPending}
                data-testid="button-confirmar-crear-portal"
              >
                {createMutation.isPending ? "Creando…" : "Crear acceso"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal con contraseña generada */}
      <Dialog open={passOpen} onOpenChange={setPassOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2 text-green-700"><CheckCircle2 className="h-5 w-5" /> Acceso creado</DialogTitle></DialogHeader>
          {lastCreatedPass && (
            <div className="space-y-3">
              <p className="text-sm">Compartí estas credenciales con el cliente:</p>
              <div className="bg-muted rounded-lg p-4 font-mono text-sm space-y-1">
                <div><span className="text-muted-foreground">Email:</span> {lastCreatedPass.email}</div>
                <div><span className="text-muted-foreground">Contraseña:</span> <span className="font-bold text-primary">{lastCreatedPass.pass}</span></div>
                <div><span className="text-muted-foreground">Portal:</span> envexar.com/portal</div>
              </div>
              <p className="text-xs text-muted-foreground">Guardá esta contraseña — no se podrá recuperar. Si se pierde, deberás crear un nuevo acceso.</p>
              <Button className="w-full" onClick={() => setPassOpen(false)}>Entendido</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {usuarios.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
            <Users className="h-10 w-10 opacity-30" />
            <p>Aún no hay usuarios del portal.<br />Creá uno para que el cliente pueda ver sus informes.</p>
          </div>
        ) : usuarios.map(u => (
          <Card key={u.id} className={`border ${u.activo ? "border-border" : "border-dashed opacity-60"}`} data-testid={`card-portal-user-${u.id}`}>
            <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold">{u.nombre}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${u.activo ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}>
                    {u.activo ? "activo" : "inactivo"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  <span>{u.email}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Creado {u.creadoEn ? format(new Date(u.creadoEn), "d MMM yyyy", { locale: es }) : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => toggleMutation.mutate({ id: u.id, activo: !u.activo })}
                  data-testid={`button-toggle-portal-${u.id}`}
                >
                  {u.activo ? <><EyeOff className="h-3 w-3 mr-1" />Desactivar</> : <><Eye className="h-3 w-3 mr-1" />Activar</>}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-8 text-destructive border-destructive/30 hover:bg-destructive/8" data-testid={`button-delete-portal-${u.id}`}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar acceso?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Se eliminarán también todos los informes de <strong>{u.nombre}</strong>. Esta acción no se puede deshacer.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive hover:bg-destructive/90"
                        onClick={() => deleteMutation.mutate(u.id)}
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}

// ── TAB 2: Informes subidos ──
function InformesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({
    clientPortalUserId: "",
    titulo: "",
    descripcion: "",
    tipoEstudio: "",
    fechaEstudio: "",
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: informes = [], isLoading } = useQuery<ClientReport[]>({
    queryKey: ["/api/portal/reports"],
  });

  const { data: usuarios = [] } = useQuery<PortalUser[]>({
    queryKey: ["/api/portal/users"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/portal/reports/${id}`),
    onSuccess: () => {
      toast({ title: "Informe eliminado" });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/reports"] });
    },
  });

  const handleUpload = async () => {
    if (!pdfFile || !form.clientPortalUserId || !form.titulo) {
      toast({ title: "Completá los campos requeridos", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(",")[1];
        const resp = await apiRequest("POST", "/api/portal/reports", {
          ...form,
          pdfData: base64,
          pdfNombre: pdfFile.name,
        });
        if (resp.ok) {
          toast({ title: "✓ Informe subido" });
          setUploadOpen(false);
          setForm({ clientPortalUserId: "", titulo: "", descripcion: "", tipoEstudio: "", fechaEstudio: "" });
          setPdfFile(null);
          queryClient.invalidateQueries({ queryKey: ["/api/portal/reports"] });
        } else {
          toast({ title: "Error al subir informe", variant: "destructive" });
        }
        setUploading(false);
      };
      reader.readAsDataURL(pdfFile);
    } catch {
      toast({ title: "Error al subir informe", variant: "destructive" });
      setUploading(false);
    }
  };

  const usuariosActivos = (usuarios as PortalUser[]).filter(u => u.activo);

  if (isLoading) return <div className="text-center py-16 text-muted-foreground">Cargando…</div>;

  return (
    <>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-muted-foreground">{informes.length} informe{informes.length !== 1 ? "s" : ""} subido{informes.length !== 1 ? "s" : ""}</p>
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-subir-informe">
              <Upload className="h-4 w-4 mr-1" /> Subir informe
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Subir informe al portal</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <Label>Cliente *</Label>
                <Select value={form.clientPortalUserId} onValueChange={v => setForm(f => ({ ...f, clientPortalUserId: v }))}>
                  <SelectTrigger data-testid="select-cliente-informe">
                    <SelectValue placeholder="Seleccioná un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {usuariosActivos.map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.nombre} — {u.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Título *</Label>
                <Input
                  value={form.titulo}
                  onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                  placeholder="Ej: Informe de ruido — Planta Sur"
                  data-testid="input-titulo-informe"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label>Tipo de estudio</Label>
                  <Input
                    value={form.tipoEstudio}
                    onChange={e => setForm(f => ({ ...f, tipoEstudio: e.target.value }))}
                    placeholder="Ruido, Iluminación…"
                  />
                </div>
                <div>
                  <Label>Fecha del estudio</Label>
                  <Input
                    type="date"
                    value={form.fechaEstudio}
                    onChange={e => setForm(f => ({ ...f, fechaEstudio: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={form.descripcion}
                  onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  placeholder="Notas adicionales…"
                />
              </div>
              <div>
                <Label>Archivo PDF *</Label>
                <div
                  className="mt-1 border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileRef.current?.click()}
                  data-testid="dropzone-pdf"
                >
                  {pdfFile ? (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium">{pdfFile.name}</span>
                      <span className="text-muted-foreground">({(pdfFile.size / 1024).toFixed(0)} KB)</span>
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm">
                      <Upload className="h-6 w-6 mx-auto mb-1 opacity-40" />
                      Hacé clic para seleccionar el PDF
                    </div>
                  )}
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={e => setPdfFile(e.target.files?.[0] || null)}
                    data-testid="input-file-pdf"
                  />
                </div>
              </div>
              <Button
                className="w-full"
                onClick={handleUpload}
                disabled={!pdfFile || !form.clientPortalUserId || !form.titulo || uploading}
                data-testid="button-confirmar-subir"
              >
                {uploading ? "Subiendo…" : "Subir informe"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {informes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground flex flex-col items-center gap-3">
          <FileText className="h-10 w-10 opacity-30" />
          <p>Aún no subiste informes al portal.<br />Subí el PDF de un estudio para que el cliente lo descargue.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {informes.map(r => {
            const cliente = (usuarios as PortalUser[]).find(u => u.id === r.clientPortalUserId);
            return (
              <Card key={r.id} className="border border-border" data-testid={`card-informe-${r.id}`}>
                <CardContent className="p-4 flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold truncate">{r.titulo}</span>
                      {r.tipoEstudio && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                          {r.tipoEstudio}
                        </span>
                      )}
                      {r.notificacionEnviada && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium flex items-center gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" /> Email enviado
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {cliente?.nombre || r.clientPortalUserId}
                      </span>
                      {r.fechaEstudio && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {r.fechaEstudio}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {r.pdfNombre}
                      </span>
                    </div>
                    {r.descripcion && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{r.descripcion}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Subido {r.creadoEn ? format(new Date(r.creadoEn), "d MMM yyyy HH:mm", { locale: es }) : ""}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8 text-destructive border-destructive/30 hover:bg-destructive/8" data-testid={`button-delete-informe-${r.id}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar informe?</AlertDialogTitle>
                        <AlertDialogDescription>Se eliminará permanentemente "{r.titulo}".</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive hover:bg-destructive/90"
                          onClick={() => deleteMutation.mutate(r.id)}
                        >
                          Eliminar
                        </AlertDialogAction>
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

// ── PÁGINA PRINCIPAL ──
export default function ClientPortal() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          Portal de Clientes
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestioná los accesos y los informes disponibles para tus clientes en el portal.
        </p>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList className="grid w-full grid-cols-2 max-w-sm">
          <TabsTrigger value="usuarios" data-testid="tab-portal-usuarios">
            <Users className="h-3.5 w-3.5 mr-1" />
            Usuarios
          </TabsTrigger>
          <TabsTrigger value="informes" data-testid="tab-portal-informes">
            <FileText className="h-3.5 w-3.5 mr-1" />
            Informes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <UsuariosTab />
        </TabsContent>

        <TabsContent value="informes" className="mt-4">
          <InformesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
