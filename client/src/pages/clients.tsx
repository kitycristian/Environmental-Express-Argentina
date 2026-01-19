import { useState } from "react";
import { useStore } from "@/lib/store";
import { Client } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, Edit, UserPlus, FileUp, Building2, MapPin, Phone, Mail, FileText, Calendar, RotateCcw, Tag, X, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient, useRubros, useInspections } from "@/lib/hooks";

export default function ClientsPage() {
  const { data: clients = [] } = useClients();
  const { data: rubros = [] } = useRubros();
  const createClient = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const deleteClientMutation = useDeleteClient();
  const { data: history = [] } = useInspections();
  const loadInspectionData = useStore((state) => state.loadInspectionData);
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [selectedClientHistory, setSelectedClientHistory] = useState<Client | null>(null);
  const [importData, setImportData] = useState<string>("");
  const [importPreview, setImportPreview] = useState<any[]>([]);

  // Form state
  const [selectedRubroId, setSelectedRubroId] = useState<string>("");
  const [clientSectors, setClientSectors] = useState<string[]>([]);
  const [newSectorName, setNewSectorName] = useState("");

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
    c.cuit.includes(search)
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const clientData = {
      name: formData.get('name') as string,
      razonSocial: formData.get('razonSocial') as string,
      cuit: formData.get('cuit') as string,
      conditionIva: formData.get('conditionIva') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      province: formData.get('province') as string,
      postalCode: formData.get('postalCode') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      contactName: formData.get('contactName') as string,
      notes: formData.get('notes') as string,
      rubroId: selectedRubroId || undefined,
      sectors: clientSectors,
    };

    if (editingClient) {
      updateClientMutation.mutate({ id: editingClient.id, data: clientData });
    } else {
      createClient.mutate(clientData);
    }
    
    setIsDialogOpen(false);
    setEditingClient(null);
    setSelectedRubroId("");
    setClientSectors([]);
    setNewSectorName("");
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setSelectedRubroId(client.rubroId || "");
    setClientSectors(client.sectors || []);
    setIsDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingClient(null);
    setSelectedRubroId("");
    setClientSectors([]);
    setNewSectorName("");
    setIsDialogOpen(true);
  };

  const handleAddSector = () => {
    if (newSectorName.trim() && !clientSectors.includes(newSectorName.trim())) {
      setClientSectors([...clientSectors, newSectorName.trim()]);
      setNewSectorName("");
    }
  };

  const handleRemoveSector = (sector: string) => {
    setClientSectors(clientSectors.filter(s => s !== sector));
  };

  const handleImportRubroSectors = () => {
    const rubro = rubros.find(r => r.id === selectedRubroId);
    if (rubro && Array.isArray(rubro.sectors)) {
      const existingSectors = new Set(clientSectors);
      const newSectors = (rubro.sectors as string[]).filter(s => !existingSectors.has(s));
      setClientSectors([...clientSectors, ...newSectors]);
      toast({ title: `${newSectors.length} sectores importados del rubro` });
    }
  };

  const handleDelete = (id: string) => {
    if(confirm('¿Está seguro de eliminar este cliente? Se perderán sus datos de contacto.')) {
      deleteClientMutation.mutate(id);
    }
  };

  const handleViewHistory = (client: Client) => {
    setSelectedClientHistory(client);
    setIsHistoryDialogOpen(true);
  };

  const handleLoadInspection = (id: string) => {
    if (confirm("¿Cargar esta inspección reemplazará los datos actuales del tablero. ¿Continuar?")) {
      const inspection = history.find(h => h.id === id);
      if (inspection) {
        loadInspectionData(inspection.establishment, inspection.sectors);
        setIsHistoryDialogOpen(false);
        toast({
          title: "Inspección Cargada",
          description: "Los datos históricos han sido restaurados en el tablero.",
        });
      }
    }
  };

  const getClientHistory = (clientName: string) => {
    return history.filter(h => h.establishment.name === clientName).sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  };

  const parseCSV = (csv: string) => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(';').map(h => h.trim().toLowerCase());
    const results: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(';').map(v => v.trim());
      if (values.length >= 2) {
        const obj: any = {};
        headers.forEach((h, idx) => { obj[h] = values[idx] || ''; });
        results.push({
          name: obj['nombre'] || obj['name'] || values[0],
          razonSocial: obj['razon social'] || obj['razonsocial'] || values[1] || values[0],
          cuit: obj['cuit'] || values[2] || '',
          address: obj['direccion'] || obj['address'] || '',
          city: obj['ciudad'] || obj['city'] || '',
          province: obj['provincia'] || obj['province'] || '',
          phone: obj['telefono'] || obj['phone'] || '',
          email: obj['email'] || '',
          contactName: obj['contacto'] || obj['contactname'] || '',
        });
      }
    }
    return results;
  };

  const handleImportChange = (text: string) => {
    setImportData(text);
    setImportPreview(parseCSV(text));
  };

  const handleImportClients = () => {
    importPreview.forEach(client => {
      createClient.mutate({
        ...client,
        conditionIva: 'Responsable Inscripto',
        postalCode: '',
        notes: '',
        sectors: [],
      });
    });
    setIsImportDialogOpen(false);
    setImportData('');
    setImportPreview([]);
    toast({ title: `${importPreview.length} clientes importados correctamente` });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Gestión de Clientes (CRM)</h1>
          <p className="text-muted-foreground">Administre su base de datos de empresas y contactos.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsImportDialogOpen(true)} className="gap-2">
            <FileUp className="h-4 w-4" /> Importar
          </Button>
          <Button onClick={handleAdd} className="gap-2">
            <UserPlus className="h-4 w-4" /> Nuevo Cliente
          </Button>
        </div>
      </div>

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar Clientes desde CSV</DialogTitle>
            <DialogDescription>
              Pegue datos en formato CSV separados por punto y coma (;). Columnas: Nombre;Razon Social;CUIT;Direccion;Ciudad;Provincia;Telefono;Email;Contacto
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea 
              className="w-full h-40 p-3 text-sm border rounded-md font-mono"
              placeholder="Nombre;Razon Social;CUIT;Direccion;Ciudad;Provincia;Telefono;Email;Contacto&#10;Empresa ABC;ABC S.A.;30-12345678-9;Calle 123;Buenos Aires;Buenos Aires;11-4444-5555;info@abc.com;Juan Perez"
              value={importData}
              onChange={(e) => handleImportChange(e.target.value)}
            />
            {importPreview.length > 0 && (
              <div className="border rounded-md overflow-hidden">
                <div className="bg-muted px-3 py-2 text-sm font-medium">Vista previa ({importPreview.length} clientes)</div>
                <div className="max-h-48 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Nombre</TableHead>
                        <TableHead className="text-xs">Razón Social</TableHead>
                        <TableHead className="text-xs">CUIT</TableHead>
                        <TableHead className="text-xs">Ciudad</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importPreview.slice(0, 10).map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs py-1">{c.name}</TableCell>
                          <TableCell className="text-xs py-1">{c.razonSocial}</TableCell>
                          <TableCell className="text-xs py-1">{c.cuit}</TableCell>
                          <TableCell className="text-xs py-1">{c.city}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsImportDialogOpen(false); setImportData(''); setImportPreview([]); }}>Cancelar</Button>
            <Button onClick={handleImportClients} disabled={importPreview.length === 0}>
              Importar {importPreview.length} Clientes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex items-center gap-2 bg-card p-2 rounded-lg border shadow-sm max-w-md">
        <Search className="h-4 w-4 text-muted-foreground ml-2" />
        <Input 
          placeholder="Buscar por nombre, razón social o CUIT..." 
          className="border-0 focus-visible:ring-0" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {clients.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">No hay clientes registrados</h3>
            <p className="text-muted-foreground max-w-sm mt-2 mb-6">
              Comience agregando empresas para agilizar la carga de datos en sus inspecciones.
            </p>
            <Button onClick={handleAdd}>Agregar Primer Cliente</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <Card key={client.id} className="group hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-bold text-primary">{client.name}</CardTitle>
                    <CardDescription className="font-medium mt-1">{client.razonSocial}</CardDescription>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => handleEdit(client)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(client.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                   <span className="text-xs bg-muted px-2 py-1 rounded border font-mono text-muted-foreground">CUIT: {client.cuit}</span>
                   <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">{client.conditionIva}</span>
                   {client.rubroId && (
                       <span className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-100 flex items-center gap-1">
                           <Tag className="h-3 w-3" />
                           {rubros.find(r => r.id === client.rubroId)?.name || 'Rubro desconocido'}
                       </span>
                   )}
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-3 pt-0">
                <div className="flex items-start gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{client.address}, {client.city}, {client.province} (CP: {client.postalCode})</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>{client.phone || '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 overflow-hidden">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate" title={client.email}>{client.email || '-'}</span>
                  </div>
                </div>
                {client.contactName && (
                  <div className="text-xs bg-muted/50 p-2 rounded mt-2">
                    <span className="font-semibold text-gray-600">Contacto:</span> {client.contactName}
                  </div>
                )}
                {client.sectors && (client.sectors as string[]).length > 0 && (
                  <div className="mt-3 pt-2 border-t">
                    <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground mb-2">
                      <Layers className="h-3 w-3" /> {(client.sectors as string[]).length} Sectores
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(client.sectors as string[]).slice(0, 5).map((sector, i) => (
                        <span key={i} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                          {sector}
                        </span>
                      ))}
                      {(client.sectors as string[]).length > 5 && (
                        <span className="text-[10px] text-muted-foreground">+{(client.sectors as string[]).length - 5} más</span>
                      )}
                    </div>
                  </div>
                )}
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-4 gap-2 text-primary border-primary/20 hover:bg-primary/5"
                  onClick={() => handleViewHistory(client)}
                >
                  <FileText className="h-4 w-4" /> Ver Informes Realizados
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 py-4">
            
            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2 text-primary">Datos Fiscales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre de Fantasía</Label>
                  <Input id="name" name="name" required defaultValue={editingClient?.name} placeholder="Ej. Fábrica Central" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razonSocial">Razón Social</Label>
                  <Input id="razonSocial" name="razonSocial" required defaultValue={editingClient?.razonSocial} placeholder="Ej. Industria S.A." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuit">CUIT</Label>
                  <Input id="cuit" name="cuit" required defaultValue={editingClient?.cuit} placeholder="XX-XXXXXXXX-X" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="conditionIva">Condición IVA</Label>
                  <Select name="conditionIva" defaultValue={editingClient?.conditionIva || "Responsable Inscripto"}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Responsable Inscripto">Responsable Inscripto</SelectItem>
                      <SelectItem value="Monotributo">Monotributo</SelectItem>
                      <SelectItem value="Exento">Exento</SelectItem>
                      <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                   <Label htmlFor="rubro">Rubro / Actividad</Label>
                   <Select value={selectedRubroId} onValueChange={setSelectedRubroId}>
                     <SelectTrigger>
                        <SelectValue placeholder="Seleccione un rubro..." />
                     </SelectTrigger>
                     <SelectContent>
                        {rubros.map(r => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                        ))}
                     </SelectContent>
                   </Select>
                   <div className="flex items-center gap-2">
                     <p className="text-[10px] text-muted-foreground flex-1">
                        * Asigne un rubro para habilitar la importación rápida de sectores.
                     </p>
                     {selectedRubroId && (
                       <Button type="button" variant="outline" size="sm" className="text-xs h-7" onClick={handleImportRubroSectors}>
                         <FileUp className="h-3 w-3 mr-1" /> Importar Sectores del Rubro
                       </Button>
                     )}
                   </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2 text-primary flex items-center gap-2">
                <Layers className="h-4 w-4" /> Sectores del Establecimiento
              </h3>
              <p className="text-xs text-muted-foreground -mt-2">
                Defina los sectores/áreas de trabajo para importar rápidamente en las planillas de medición.
              </p>
              
              <div className="flex gap-2">
                <Input 
                  placeholder="Nombre del sector (ej: Oficinas, Taller, Depósito...)" 
                  value={newSectorName}
                  onChange={(e) => setNewSectorName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSector())}
                  className="flex-1"
                  data-testid="input-new-sector"
                />
                <Button type="button" variant="outline" onClick={handleAddSector} data-testid="button-add-sector">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              {clientSectors.length > 0 ? (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/50 rounded-lg border">
                  {clientSectors.map((sector, index) => (
                    <span 
                      key={index} 
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded-md text-sm"
                      data-testid={`sector-tag-${index}`}
                    >
                      {sector}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveSector(sector)}
                        className="text-red-400 hover:text-red-600 ml-1"
                        data-testid={`button-remove-sector-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic text-center py-4 bg-muted/30 rounded border border-dashed">
                  No hay sectores definidos. Agregue sectores manualmente o importe desde un rubro.
                </p>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2 text-primary">Ubicación</h3>
              <div className="space-y-2">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" name="address" required defaultValue={editingClient?.address} placeholder="Calle y Altura" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">Localidad</Label>
                  <Input id="city" name="city" required defaultValue={editingClient?.city} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Provincia</Label>
                  <Input id="province" name="province" required defaultValue={editingClient?.province} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">CP</Label>
                  <Input id="postalCode" name="postalCode" required defaultValue={editingClient?.postalCode} />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-semibold border-b pb-2 text-primary">Contacto</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Persona de Contacto</Label>
                  <Input id="contactName" name="contactName" defaultValue={editingClient?.contactName} placeholder="Nombre completo" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" name="phone" defaultValue={editingClient?.phone} placeholder="+54 9 ..." />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" defaultValue={editingClient?.email} placeholder="contacto@empresa.com" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="notes">Notas Adicionales</Label>
                  <Input id="notes" name="notes" defaultValue={editingClient?.notes} placeholder="Horarios de atención, requisitos de ingreso, etc." />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button type="submit">Guardar Cliente</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Informes de {selectedClientHistory?.name}</DialogTitle>
            <DialogDescription>
              Historial de relevamientos realizados para este cliente.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
            {selectedClientHistory && getClientHistory(selectedClientHistory.name).length === 0 ? (
              <p className="text-center text-muted-foreground py-8 italic">
                No hay informes guardados para este cliente.
              </p>
            ) : (
              selectedClientHistory && getClientHistory(selectedClientHistory.name).map((inspection) => (
                <div key={inspection.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="font-medium">
                        {format(new Date(inspection.establishment.date || inspection.savedAt), "d 'de' MMMM, yyyy", { locale: es })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground pl-6">
                      {inspection.sectors.length} sectores relevados
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-2"
                    onClick={() => handleLoadInspection(inspection.id)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> Cargar al Tablero
                  </Button>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
