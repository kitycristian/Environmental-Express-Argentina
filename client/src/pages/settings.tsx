import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit, Save, Users, Settings, Wrench, Building2, UserPlus, Key, Shield, PenTool, Upload, X, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { Instrument, Rubro } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useRubros, useCreateRubro, useUpdateRubro, useDeleteRubro, useInstruments, useCreateInstrument, useUpdateInstrument, useDeleteInstrument } from "@/lib/hooks";

export default function SettingsPage() {
  const { toast } = useToast();
  
  return (
    <div className="space-y-6 animate-in fade-in-50 pb-20">
       <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-primary">Configuración del Sistema</h1>
          <p className="text-muted-foreground">Administre usuarios, perfiles, rubros e instrumentos de medición.</p>
       </div>

       <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
             <TabsTrigger value="users">Usuarios</TabsTrigger>
             <TabsTrigger value="rubros">Rubros</TabsTrigger>
             <TabsTrigger value="instruments">Instrumentos</TabsTrigger>
             <TabsTrigger value="general">General</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
              <UsersSettings />
          </TabsContent>

          <TabsContent value="rubros">
              <RubrosSettings />
          </TabsContent>

          <TabsContent value="instruments">
              <InstrumentsSettings />
          </TabsContent>

          <TabsContent value="general">
             <GeneralSettings />
          </TabsContent>
       </Tabs>
    </div>
  );
}

type ApiUser = { id: string; username: string; role: string; name: string; createdAt: string };

function UsersSettings() {
    const { toast } = useToast();
    const qc = useQueryClient();

    const { data: users = [], isLoading } = useQuery<ApiUser[]>({
        queryKey: ["/api/users"],
        queryFn: () => fetch("/api/users", { credentials: "include" }).then(r => r.json()),
    });

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: "", username: "", password: "", role: "operator" });

    const createUser = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(form),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ message: "Error al crear usuario" }));
                throw new Error(err.message || "Error al crear usuario");
            }
            return res.json();
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["/api/users"] });
            toast({ title: "Usuario creado correctamente" });
            setIsDialogOpen(false);
            setForm({ name: "", username: "", password: "", role: "operator" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const deleteUser = useMutation({
        mutationFn: (id: string) =>
            fetch(`/api/users/${id}`, { method: "DELETE", credentials: "include" }).then(async r => {
                if (!r.ok) {
                    const err = await r.json().catch(() => ({ message: "Error al eliminar" }));
                    throw new Error(err.message || "Error al eliminar");
                }
            }),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["/api/users"] });
            toast({ title: "Usuario eliminado" });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.username.trim() || !form.password.trim()) {
            toast({ title: "Completá usuario y contraseña", variant: "destructive" });
            return;
        }
        createUser.mutate();
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Gestión de Usuarios</CardTitle>
                    <CardDescription>Control de acceso y perfiles del sistema.</CardDescription>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2" data-testid="button-nuevo-usuario">
                    <UserPlus className="h-4 w-4" /> Nuevo Usuario
                </Button>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Cargando usuarios...
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Usuario</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((user) => (
                                <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell className="font-mono text-sm">{user.username}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant="outline"
                                            className={user.role === "admin" ? "border-primary text-primary" : ""}
                                        >
                                            {user.role === "admin" ? "Administrador" : "Operador"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-muted-foreground hover:text-destructive"
                                            data-testid={`button-delete-user-${user.id}`}
                                            disabled={deleteUser.isPending}
                                            onClick={() => {
                                                if (confirm(`¿Eliminar al usuario "${user.username}"?`)) {
                                                    deleteUser.mutate(user.id);
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {users.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                        No hay usuarios registrados.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="u-name">Nombre completo</Label>
                            <Input
                                id="u-name"
                                placeholder="Ej. Juan Pérez"
                                value={form.name}
                                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                                data-testid="input-user-name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="u-username">Usuario</Label>
                            <Input
                                id="u-username"
                                placeholder="juanperez"
                                value={form.username}
                                onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))}
                                data-testid="input-user-username"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="u-password">Contraseña</Label>
                            <Input
                                id="u-password"
                                type="password"
                                placeholder="Mínimo 6 caracteres"
                                value={form.password}
                                onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                                data-testid="input-user-password"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="u-role">Rol</Label>
                            <select
                                id="u-role"
                                value={form.role}
                                onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))}
                                data-testid="select-user-role"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                                <option value="admin">Administrador</option>
                                <option value="operator">Operador</option>
                            </select>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={createUser.isPending} data-testid="button-submit-usuario">
                                {createUser.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Crear Usuario
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function RubrosSettings() {
    const { data: rubros = [] } = useRubros();
    const createRubro = useCreateRubro();
    const updateRubroMutation = useUpdateRubro();
    const deleteRubroMutation = useDeleteRubro();
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRubro, setEditingRubro] = useState<Rubro | null>(null);
    const [newName, setNewName] = useState("");
    const [newSectors, setNewSectors] = useState("");

    const handleEdit = (rubro: Rubro) => {
        setEditingRubro(rubro);
        setNewName(rubro.name);
        setNewSectors(rubro.sectors.join('\n'));
        setIsDialogOpen(true);
    };

    const handleNew = () => {
        setEditingRubro(null);
        setNewName("");
        setNewSectors("");
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        const sectorsList = newSectors.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        
        if (editingRubro) {
            updateRubroMutation.mutate({ id: editingRubro.id, data: { name: newName, sectors: sectorsList } });
        } else {
            createRubro.mutate({ name: newName, sectors: sectorsList });
        }
        setIsDialogOpen(false);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Rubros y Sectores</CardTitle>
                    <CardDescription>Defina plantillas de sectores por tipo de actividad.</CardDescription>
                </div>
                <Button onClick={handleNew} className="gap-2">
                    <Plus className="h-4 w-4" /> Nuevo Rubro
                </Button>
            </CardHeader>
            <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                    {rubros.map((rubro) => (
                        <div key={rubro.id} className="border rounded-lg p-4 space-y-3 relative group hover:bg-muted/30 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    <h3 className="font-semibold">{rubro.name}</h3>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(rubro)}>
                                        <Edit className="h-3 w-3" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { if(confirm('¿Eliminar rubro?')) deleteRubroMutation.mutate(rubro.id); }}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground bg-muted p-2 rounded max-h-[100px] overflow-y-auto">
                                <ul className="list-disc list-inside space-y-1">
                                    {rubro.sectors.slice(0, 5).map((sector, i) => (
                                        <li key={i}>{sector}</li>
                                    ))}
                                    {rubro.sectors.length > 5 && (
                                        <li className="list-none text-primary italic pt-1">
                                            + {rubro.sectors.length - 5} sectores más...
                                        </li>
                                    )}
                                </ul>
                            </div>
                            <p className="text-xs text-muted-foreground text-right">
                                {rubro.sectors.length} sectores configurados
                            </p>
                        </div>
                    ))}
                </div>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingRubro ? 'Editar Rubro' : 'Nuevo Rubro'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre del Rubro</Label>
                            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ej. Metalúrgica" />
                        </div>
                        <div className="space-y-2">
                            <Label>Sectores Sugeridos (Uno por línea)</Label>
                            <Textarea 
                                value={newSectors} 
                                onChange={(e) => setNewSectors(e.target.value)} 
                                className="h-[200px]"
                                placeholder="Recepción&#10;Producción&#10;Depósito&#10;..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave}>Guardar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function InstrumentsSettings() {
    const { data: instruments = [] } = useInstruments();
    const createInstrument = useCreateInstrument();
    const updateInstrumentMutation = useUpdateInstrument();
    const deleteInstrumentMutation = useDeleteInstrument();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            brand: formData.get('brand') as string,
            model: formData.get('model') as string,
            serialNumber: formData.get('serialNumber') as string,
            type: formData.get('type') as any,
            calibrationCertificate: formData.get('calibrationCertificate') as string,
            calibrationDate: formData.get('calibrationDate') as string,
        };

        if (editingId) {
            updateInstrumentMutation.mutate({ id: editingId, data });
        } else {
            createInstrument.mutate({ ...data, attachedDocuments: {} });
        }
        setIsDialogOpen(false);
        setEditingId(null);
    };

    const handleEdit = (inst: Instrument) => {
        setEditingId(inst.id);
        setIsDialogOpen(true);
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Instrumentos de Medición</CardTitle>
                    <CardDescription>Gestione su flota de instrumentos y certificados de calibración.</CardDescription>
                </div>
                <Button onClick={() => { setEditingId(null); setIsDialogOpen(true); }} className="gap-2">
                    <Plus className="h-4 w-4" /> Nuevo Instrumento
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Marca / Modelo</TableHead>
                            <TableHead>Serie</TableHead>
                            <TableHead>Certificado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {instruments.map((inst) => (
                            <TableRow key={inst.id}>
                                <TableCell className="capitalize">{inst.type.replace('_', ' ')}</TableCell>
                                <TableCell className="font-medium">{inst.brand} {inst.model}</TableCell>
                                <TableCell className="font-mono text-xs">{inst.serialNumber}</TableCell>
                                <TableCell>
                                    {inst.calibrationCertificate ? (
                                        <Badge variant="secondary" className="font-mono text-xs">
                                            {inst.calibrationCertificate}
                                        </Badge>
                                    ) : <span className="text-muted-foreground">-</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(inst)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => { if(confirm('¿Eliminar instrumento?')) deleteInstrumentMutation.mutate(inst.id); }}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'Editar Instrumento' : 'Nuevo Instrumento'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        {(() => {
                            const inst = instruments.find(i => i.id === editingId);
                            return (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Tipo</Label>
                                            <select name="type" defaultValue={inst?.type || 'generic'} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
                                                <option value="lighting">Iluminación</option>
                                                <option value="noise">Ruido</option>
                                                <option value="thermal_load">Carga Térmica</option>
                                                <option value="generic">Genérico</option>
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Marca</Label>
                                            <Input name="brand" defaultValue={inst?.brand} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Modelo</Label>
                                            <Input name="model" defaultValue={inst?.model} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>N° Serie</Label>
                                            <Input name="serialNumber" defaultValue={inst?.serialNumber} required />
                                        </div>
                                    </div>
                                    <div className="space-y-2 pt-2 border-t">
                                        <Label>Certificado Calibración</Label>
                                        <Input name="calibrationCertificate" defaultValue={inst?.calibrationCertificate} placeholder="N° Certificado" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Fecha Calibración</Label>
                                        <Input type="date" name="calibrationDate" defaultValue={inst?.calibrationDate} />
                                    </div>
                                    <DialogFooter className="mt-4">
                                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                                        <Button type="submit">Guardar</Button>
                                    </DialogFooter>
                                </>
                            );
                        })()}
                    </form>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function GeneralSettings() {
    const { toast } = useToast();
    const digitalSignature = useStore((state) => state.digitalSignature);
    const setDigitalSignature = useStore((state) => state.setDigitalSignature);
    const signatoryName = useStore((state) => state.signatoryName);
    const setSignatoryName = useStore((state) => state.setSignatoryName);
    const signatoryTitle = useStore((state) => state.signatoryTitle);
    const setSignatoryTitle = useStore((state) => state.setSignatoryTitle);
    const signatoryRegistration = useStore((state) => state.signatoryRegistration);
    const setSignatoryRegistration = useStore((state) => state.setSignatoryRegistration);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500000) {
                toast({ title: "Error", description: "La imagen no debe superar 500KB", variant: "destructive" });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setDigitalSignature(reader.result as string);
                toast({ title: "Firma cargada correctamente" });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleRemoveSignature = () => {
        setDigitalSignature(null);
        toast({ title: "Firma eliminada" });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <PenTool className="h-5 w-5" /> Firma Digital
                    </CardTitle>
                    <CardDescription>Configure su firma para incluirla en informes y presupuestos.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nombre del Firmante</Label>
                                <Input 
                                    placeholder="Ing. Juan Pérez" 
                                    value={signatoryName || ''} 
                                    onChange={(e) => setSignatoryName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Título / Cargo</Label>
                                <Input 
                                    placeholder="Lic. en Higiene y Seguridad" 
                                    value={signatoryTitle || ''} 
                                    onChange={(e) => setSignatoryTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Matrícula / Registro</Label>
                                <Input 
                                    placeholder="Mat. Prov. N° 12345" 
                                    value={signatoryRegistration || ''} 
                                    onChange={(e) => setSignatoryRegistration(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-4">
                            <Label>Imagen de Firma (PNG/JPG, máx 500KB)</Label>
                            {digitalSignature ? (
                                <div className="relative border rounded-lg p-4 bg-white">
                                    <img 
                                        src={digitalSignature} 
                                        alt="Firma Digital" 
                                        className="max-h-32 mx-auto"
                                    />
                                    <Button 
                                        variant="destructive" 
                                        size="icon" 
                                        className="absolute top-2 right-2 h-6 w-6"
                                        onClick={handleRemoveSignature}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                    <span className="text-sm text-muted-foreground">Clic para subir imagen</span>
                                    <input 
                                        type="file" 
                                        accept="image/png,image/jpeg" 
                                        className="hidden" 
                                        onChange={handleFileUpload}
                                    />
                                </label>
                            )}
                            {digitalSignature && (
                                <p className="text-xs text-green-600 flex items-center gap-1">
                                    <Shield className="h-3 w-3" /> Firma configurada correctamente
                                </p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Configuración General</CardTitle>
                    <CardDescription>Opciones globales de la aplicación.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="text-base">Modo Oscuro</Label>
                            <p className="text-sm text-muted-foreground">Cambiar apariencia de la interfaz</p>
                        </div>
                        <Button variant="outline" disabled>Próximamente</Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label className="text-base">Backup Automático</Label>
                            <p className="text-sm text-muted-foreground">Realizar copias de seguridad diarias</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <span className="text-xs text-green-600 font-medium">Activado</span>
                             <Shield className="h-4 w-4 text-green-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}