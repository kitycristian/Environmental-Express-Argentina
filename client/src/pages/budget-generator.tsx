import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, FileDown, Calculator, Save, Copy } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@assets/image_1773940561975.png";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@/lib/types";
import { useClients, useCreateClient } from "@/lib/hooks";

interface BudgetItem {
  id: string;
  determination: string;
  method: string;
  objective: string;
  unitPrice: number;
  quantity: number;
}

interface BudgetSector {
  id: string;
  name: string;
  items: BudgetItem[];
}

const MEASUREMENT_TEMPLATES = [
  {
    determination: "Iluminación",
    method: "Res. SRT 84/2012",
    objective: "Verificación de niveles de iluminación en puestos de trabajo"
  },
  {
    determination: "Ruido Laboral",
    method: "Res. SRT 85/2012",
    objective: "Medición de nivel sonoro continuo equivalente"
  },
  {
    determination: "Carga Térmica",
    method: "Res. 295/2003",
    objective: "Evaluación de estrés térmico (TGBH)"
  },
  {
    determination: "Puesta a Tierra",
    method: "Res. SRT 900/2015",
    objective: "Medición de resistencia de dispersión y continuidad"
  }
];

export default function BudgetGenerator() {
  const { data: clients = [] } = useClients();
  const createClient = useCreateClient();
  const { toast } = useToast();

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [sectors, setSectors] = useState<BudgetSector[]>([{ id: crypto.randomUUID(), name: "General", items: [] }]);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  
  // New Client Form State
  const [newClient, setNewClient] = useState({
    name: "",
    razonSocial: "",
    address: "",
    phone: "",
    email: "",
    cuit: "",
    city: "",
    province: "",
    postalCode: "",
    contactName: "",
    conditionIva: "Responsable Inscripto"
  });

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleAddSector = () => {
    setSectors([...sectors, { id: crypto.randomUUID(), name: `Sector ${sectors.length + 1}`, items: [] }]);
  };

  const handleUpdateSectorName = (sectorId: string, name: string) => {
    setSectors(sectors.map(s => s.id === sectorId ? { ...s, name } : s));
  };

  const handleDeleteSector = (sectorId: string) => {
    if (sectors.length > 1) {
      setSectors(sectors.filter(s => s.id !== sectorId));
    }
  };

  const handleAddItem = (sectorId: string) => {
    setSectors(sectors.map(s => {
      if (s.id !== sectorId) return s;
      return {
        ...s,
        items: [...s.items, {
          id: crypto.randomUUID(),
          determination: "",
          method: "",
          objective: "",
          unitPrice: 0,
          quantity: 1
        }]
      };
    }));
  };

  const updateItem = (sectorId: string, itemId: string, field: keyof BudgetItem, value: any) => {
    setSectors(sectors.map(s => {
      if (s.id !== sectorId) return s;
      return {
        ...s,
        items: s.items.map(item => {
          if (item.id !== itemId) return item;
          
          // Autocomplete logic
          if (field === 'determination') {
             const template = MEASUREMENT_TEMPLATES.find(t => t.determination === value);
             if (template) {
               return { ...item, determination: value, method: template.method, objective: template.objective };
             }
          }
          return { ...item, [field]: value };
        })
      };
    }));
  };

  const deleteItem = (sectorId: string, itemId: string) => {
    setSectors(sectors.map(s => {
      if (s.id !== sectorId) return s;
      return {
        ...s,
        items: s.items.filter(i => i.id !== itemId)
      };
    }));
  };

  const handleCreateClient = () => {
    if (!newClient.name) {
      toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
      return;
    }
    createClient.mutate(newClient);
    setIsClientModalOpen(false);
    setNewClient({
      name: "",
      razonSocial: "",
      address: "",
      phone: "",
      email: "",
      cuit: "",
      city: "",
      province: "",
      postalCode: "",
      contactName: "",
      conditionIva: "Responsable Inscripto"
    });
  };

  const calculateTotal = () => {
    return sectors.reduce((acc, sector) => {
      return acc + sector.items.reduce((sAcc, item) => sAcc + (item.unitPrice * item.quantity), 0);
    }, 0);
  };

  const generatePDF = () => {
    if (!selectedClient) {
      toast({ title: "Error", description: "Seleccione un cliente primero", variant: "destructive" });
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // Colors
    const primaryColor = [0, 51, 102] as [number, number, number]; // Navy Blue
    const secondaryColor = [0, 153, 51] as [number, number, number]; // Vibrant Green

    // --- Header ---
    // Logo (Left)
    const imgProps = doc.getImageProperties(logoUrl);
    const imgWidth = 45;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    doc.addImage(logoUrl, 'PNG', margin, 10, imgWidth, imgHeight);

    // Title (Right)
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    // Multi-line title
    const titleLines = doc.splitTextToSize("PROPUESTA TÉCNICO COMERCIAL\nSERVICIO DE MEDICIONES DE SYSO", 100);
    doc.text(titleLines, pageWidth - margin, 20, { align: "right" });

    // Client Info Box
    const clientBoxY = Math.max(45, 10 + imgHeight + 5); // Ensure box is below logo
    doc.setDrawColor(...secondaryColor);
    doc.setLineWidth(0.5);
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, clientBoxY, pageWidth - (margin * 2), 35, 'FD');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Cliente:`, margin + 5, clientBoxY + 7);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedClient.razonSocial || selectedClient.name}`, margin + 25, clientBoxY + 7);

    doc.setFont("helvetica", "bold");
    doc.text(`Dirección:`, margin + 5, clientBoxY + 13);
    doc.setFont("helvetica", "normal");
    doc.text(`${selectedClient.address}, ${selectedClient.city}`, margin + 25, clientBoxY + 13);

    doc.setFont("helvetica", "bold");
    doc.text(`Contacto:`, margin + 5, clientBoxY + 19);
    doc.setFont("helvetica", "normal");
    doc.text(`${newClient.contactName || selectedClient.name}`, margin + 25, clientBoxY + 19); // Use contact name if available

    doc.setFont("helvetica", "bold");
    doc.text(`Fecha:`, pageWidth - margin - 35, clientBoxY + 7);
    doc.setFont("helvetica", "normal");
    doc.text(`${new Date().toLocaleDateString()}`, pageWidth - margin - 5, clientBoxY + 7, { align: 'right' });

    let currentY = clientBoxY + 45;

    // --- Rubro 1: Objetivos ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("1. RUBRO N° 1: OBJETIVOS", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("Cumplir con la obligación legal de la empresa de monitorear las Condiciones de Seguridad y el Medio Ambiente de trabajo de sus empleados.", margin, currentY, { maxWidth: pageWidth - (margin * 2) });
    currentY += 15;

    // --- Rubro 2: Marco Legal ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("2. RUBRO N° 2: MARCO LEGAL DE REFERENCIA", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const legalList = [
      "Ley Nacional De Higiene y Seguridad en el Trabajo Nº 19.587.",
      "Decreto 351/79- Capítulo VIII, Anexo I y Anexo III y reglamentaciones conexas.",
      "Resolución 295/2003 MTSS.",
      "Res. SRT N° 84-85/2012.",
      "Resol. SRT 886/2015.",
      "Resol. SRT 900/2015."
    ];
    legalList.forEach(item => {
      doc.text(`• ${item}`, margin + 5, currentY);
      currentY += 5;
    });
    currentY += 5;

    // --- Rubro 3: Alcance ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("3. RUBRO N° 3: ALCANCE DE LA PRESTACIÓN OFRECIDA", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const scopeText = `La presente propuesta Técnico-Comercial es aplicable a las instalaciones de la empresa ${selectedClient.name}. Se realizarán las mediciones utilizando instrumental calibrado y certificado, conforme a las normativas vigentes mencionadas en el Rubro 2.`;
    const splitScope = doc.splitTextToSize(scopeText, pageWidth - (margin * 2));
    doc.text(splitScope, margin, currentY);
    currentY += (splitScope.length * 5) + 10;

    // --- Rubro 4: Tabla de Mediciones (Agrupado por Sector) ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("4. RUBRO N° 4: PLAN DE MEDICIONES Y PROPUESTA ECONÓMICA", margin, currentY);
    currentY += 10;

    let grandTotal = 0;

    sectors.forEach((sector) => {
        // Check space
        if (currentY > pageHeight - 50) {
            doc.addPage();
            currentY = 20;
        }

        // Sector Header
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...secondaryColor); // Green for Subheaders
        doc.text(`Sector: ${sector.name}`, margin, currentY);
        currentY += 2;

        const tableBody: any[] = sector.items.map(item => [
            item.determination,
            item.method,
            item.objective,
            `$ ${item.unitPrice.toLocaleString()}`,
            item.quantity,
            `$ ${(item.unitPrice * item.quantity).toLocaleString()}`
        ]);

        const sectorTotal = sector.items.reduce((acc, i) => acc + (i.unitPrice * i.quantity), 0);
        grandTotal += sectorTotal;

        // Sector Total Row
        tableBody.push([
            { content: 'Subtotal Sector', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', textColor: [0,0,0] } },
            { content: `$ ${sectorTotal.toLocaleString()}`, styles: { fontStyle: 'bold', textColor: [0,0,0] } }
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Determinación', 'Método/Requisito', 'Objetivo', 'P. Unit.', 'Cant.', 'P. Total']],
            body: tableBody,
            styles: { fontSize: 8 },
            headStyles: { fillColor: primaryColor, textColor: 255 },
            theme: 'grid',
            columnStyles: {
                0: { cellWidth: 30 },
                1: { cellWidth: 35 },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 20, halign: 'right' },
                4: { cellWidth: 15, halign: 'center' },
                5: { cellWidth: 25, halign: 'right' }
            },
            margin: { left: margin, right: margin }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
    });

    // Grand Total
    doc.setFillColor(240, 240, 240);
    doc.rect(pageWidth - margin - 60, currentY, 60, 10, 'F');
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(`TOTAL GENERAL: $ ${grandTotal.toLocaleString()}`, pageWidth - margin - 5, currentY + 7, { align: 'right' });
    currentY += 20;

    // Check for page break for final clauses
    if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
    }

    // --- Rubros Finales ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("5. RUBRO N° 5: OBSERVACIONES", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("Los precios no incluyen IVA. Forma de pago: A convenir. Validez de la oferta: 15 días. Se entrega informe en formato digital dentro de los 10 días hábiles.", margin, currentY);
    currentY += 15;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("6. CLÁUSULA DE CONFIDENCIALIDAD", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("Toda la información obtenida durante el servicio será tratada con estricta confidencialidad según Ley Nacional 24.766.", margin, currentY);
    
    // --- Signature ---
    currentY += 40;
    doc.line(margin + 20, currentY, margin + 80, currentY); // Line
    doc.setFontSize(9);
    doc.text("Firma Profesional Matriculado", margin + 50, currentY + 5, { align: 'center' });

    // --- Footer ---
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.text(`Environmental Express Argentina - FC-4.04-01-02 REV 8`, margin, pageHeight - 10);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    }

    doc.save(`Presupuesto_${selectedClient.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#003366]">Generador de Presupuestos SYSO</h1>
          <p className="text-muted-foreground">Creación y exportación de propuestas técnico-comerciales.</p>
        </div>
        <Button onClick={generatePDF} className="gap-2 bg-[#009933] hover:bg-[#007722] text-white">
          <FileDown className="h-4 w-4" /> Exportar PDF
        </Button>
      </div>

      <Card className="border-t-4 border-t-[#003366]">
        <CardHeader>
          <CardTitle className="text-[#003366]">1. Selección de Cliente</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 space-y-2 w-full">
            <Label>Cliente</Label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map(client => (
                  <SelectItem key={client.id} value={client.id}>{client.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 border-[#009933] text-[#009933] hover:bg-[#009933] hover:text-white">
                <Plus className="h-4 w-4" /> Nuevo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Cliente</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Nombre Fantasía</Label>
                        <Input value={newClient.name} onChange={(e) => setNewClient({...newClient, name: e.target.value})} placeholder="Ej: Empresa S.A." />
                    </div>
                    <div className="space-y-2">
                        <Label>Razón Social</Label>
                        <Input value={newClient.razonSocial} onChange={(e) => setNewClient({...newClient, razonSocial: e.target.value})} placeholder="Ej: Empresa Sociedad Anónima" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Dirección</Label>
                    <Input value={newClient.address} onChange={(e) => setNewClient({...newClient, address: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Ciudad</Label>
                        <Input value={newClient.city} onChange={(e) => setNewClient({...newClient, city: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label>Teléfono</Label>
                        <Input value={newClient.phone} onChange={(e) => setNewClient({...newClient, phone: e.target.value})} />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={newClient.email} onChange={(e) => setNewClient({...newClient, email: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreateClient}>Guardar Cliente</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
             <h2 className="text-xl font-bold text-[#003366]">2. Plan de Mediciones (Rubro 4)</h2>
             <Button onClick={handleAddSector} variant="outline" className="gap-2 border-[#003366] text-[#003366]">
                <Plus className="h-4 w-4" /> Agregar Sector
             </Button>
        </div>

        {sectors.map((sector, sIndex) => (
            <Card key={sector.id} className="border-l-4 border-l-[#009933]">
                <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2 flex-1">
                            <Label>Sector:</Label>
                            <Input 
                                value={sector.name} 
                                onChange={(e) => handleUpdateSectorName(sector.id, e.target.value)} 
                                className="max-w-xs h-8 font-semibold"
                            />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteSector(sector.id)} disabled={sectors.length === 1}>
                            <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                        <TableRow className="bg-gray-50/50">
                            <TableHead className="w-[200px]">Determinación</TableHead>
                            <TableHead className="w-[200px]">Método / Requisito</TableHead>
                            <TableHead>Objetivo</TableHead>
                            <TableHead className="w-[120px]">Precio Unit.</TableHead>
                            <TableHead className="w-[80px]">Cant.</TableHead>
                            <TableHead className="w-[120px]">Total</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {sector.items.map((item) => (
                            <TableRow key={item.id}>
                            <TableCell>
                                <Input 
                                list={`datalist-determination-${sIndex}`}
                                value={item.determination} 
                                onChange={(e) => updateItem(sector.id, item.id, 'determination', e.target.value)} 
                                placeholder="Ej: Iluminación"
                                className="h-8"
                                />
                                <datalist id={`datalist-determination-${sIndex}`}>
                                    {MEASUREMENT_TEMPLATES.map(t => <option key={t.determination} value={t.determination} />)}
                                </datalist>
                            </TableCell>
                            <TableCell>
                                <Input 
                                value={item.method} 
                                onChange={(e) => updateItem(sector.id, item.id, 'method', e.target.value)} 
                                placeholder="Res. SRT 84/12"
                                className="h-8"
                                />
                            </TableCell>
                            <TableCell>
                                <Input 
                                value={item.objective} 
                                onChange={(e) => updateItem(sector.id, item.id, 'objective', e.target.value)} 
                                placeholder="Verificación niveles..."
                                className="h-8"
                                />
                            </TableCell>
                            <TableCell>
                                <Input 
                                type="number" 
                                value={item.unitPrice} 
                                onChange={(e) => updateItem(sector.id, item.id, 'unitPrice', Number(e.target.value))} 
                                className="h-8 text-right"
                                />
                            </TableCell>
                            <TableCell>
                                <Input 
                                type="number" 
                                value={item.quantity} 
                                onChange={(e) => updateItem(sector.id, item.id, 'quantity', Number(e.target.value))} 
                                className="h-8 text-center"
                                />
                            </TableCell>
                            <TableCell className="text-right font-medium">
                                $ {(item.unitPrice * item.quantity).toLocaleString()}
                            </TableCell>
                            <TableCell>
                                <Button variant="ghost" size="sm" onClick={() => deleteItem(sector.id, item.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    <div className="mt-2">
                        <Button onClick={() => handleAddItem(sector.id)} variant="ghost" size="sm" className="gap-2 text-[#003366]">
                            <Plus className="h-3 w-3" /> Agregar Item al Sector
                        </Button>
                    </div>
                </CardContent>
            </Card>
        ))}
      </div>
      
      <div className="flex justify-end bg-gray-50 p-4 rounded-lg border">
         <div className="text-2xl font-bold text-[#003366]">
            Total Presupuesto: $ {calculateTotal().toLocaleString()}
         </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
         <h4 className="font-semibold flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4" /> Nota sobre la exportación
         </h4>
         <p>
            Al generar el PDF, se incluirá automáticamente el encabezado con logo, los rubros fijos (Objetivos, Marco Legal, Alcance), la tabla de mediciones calculada agrupada por sectores y las cláusulas finales de confidencialidad y validez.
         </p>
      </div>
    </div>
  );
}
