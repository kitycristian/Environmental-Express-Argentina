import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Edit, Save, Users, Settings, Wrench, Building2, UserPlus, Key, Shield } from "lucide-react";
import { Instrument, Rubro } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

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

function UsersSettings() {
    // Mock Users Data for Prototype
    const [users, setUsers] = useState([
        { id: 1, name: "Admin Principal", email: "admin@syh.com", role: "Administrador", active: true },
        { id: 2, name: "Técnico Campo", email: "tecnico@syh.com", role: "Técnico", active: true },
        { id: 3, name: "Auditor Externo", email: "auditor@cliente.com", role: "Invitado", active: false },
    ]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Gestión de Usuarios</CardTitle>
                    <CardDescription>Control de acceso y perfiles del sistema.</CardDescription>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                    <UserPlus className="h-4 w-4" /> Nuevo Usuario
                </Button>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nombre</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Rol / Perfil</TableHead>
                            <TableHead>Estado</TableHead>
                            <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={user.role === 'Administrador' ? 'border-primary text-primary' : ''}>
                                        {user.role}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className={`flex items-center gap-2 ${user.active ? 'text-green-600' : 'text-gray-400'}`}>
                                        <div className={`h-2 w-2 rounded-full ${user.active ? 'bg-green-600' : 'bg-gray-400'}`} />
                                        <span className="text-xs font-medium">{user.active ? 'Activo' : 'Inactivo'}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon">
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
                                        <Key className="h-4 w-4" />
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
                        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nombre Completo</Label>
                            <Input placeholder="Ej. Juan Pérez" />
                        </div>
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input type="email" placeholder="usuario@empresa.com" />
                        </div>
                        <div className="space-y-2">
                            <Label>Contraseña</Label>
                            <Input type="password" placeholder="******" />
                        </div>
                        <div className="space-y-2">
                            <Label>Perfil</Label>
                            <select className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                                <option>Técnico</option>
                                <option>Administrador</option>
                                <option>Invitado</option>
                            </select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={() => setIsDialogOpen(false)}>Crear Usuario</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}

function RubrosSettings() {
    const rubros = useStore((state) => state.rubros);
    const addRubro = useStore((state) => state.addRubro);
    const updateRubro = useStore((state) => state.updateRubro);
    const deleteRubro = useStore((state) => state.deleteRubro);
    
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
            updateRubro(editingRubro.id, { name: newName, sectors: sectorsList });
        } else {
            addRubro({ name: newName, sectors: sectorsList });
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
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => { if(confirm('¿Eliminar rubro?')) deleteRubro(rubro.id); }}>
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
    const instruments = useStore((state) => state.availableInstruments);
    const addInstrument = useStore((state) => state.addInstrument);
    const updateInstrument = useStore((state) => state.updateInstrument);
    const deleteInstrument = useStore((state) => state.deleteInstrument);

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
            updateInstrument(editingId, data);
        } else {
            addInstrument({ ...data, id: crypto.randomUUID(), attachedDocuments: {} });
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
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => { if(confirm('¿Eliminar instrumento?')) deleteInstrument(inst.id); }}>
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
    return (
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
    )
}