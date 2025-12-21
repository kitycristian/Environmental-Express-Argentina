import { useState } from "react";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, FileDown, Calculator, Save } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoUrl from "@assets/logo-eea.png";
import { useToast } from "@/hooks/use-toast";
import { Client } from "@/lib/types";

interface BudgetItem {
  id: string;
  determination: string;
  method: string;
  objective: string;
  unitPrice: number;
  quantity: number;
}

export default function BudgetGenerator() {
  const clients = useStore((state) => state.clients);
  const addClient = useStore((state) => state.addClient);
  const { toast } = useToast();

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [items, setItems] = useState<BudgetItem[]>([]);
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

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        determination: "",
        method: "",
        objective: "",
        unitPrice: 0,
        quantity: 1
      }
    ]);
  };

  const updateItem = (id: string, field: keyof BudgetItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleCreateClient = () => {
    if (!newClient.name) {
      toast({ title: "Error", description: "El nombre es requerido", variant: "destructive" });
      return;
    }
    addClient(newClient);
    setIsClientModalOpen(false);
    toast({ title: "Cliente creado", description: "El cliente se ha guardado correctamente." });
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
    return items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);
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

    // Helper for centered text
    const centerText = (text: string, y: number, size = 12, style = "normal") => {
      doc.setFontSize(size);
      doc.setFont("helvetica", style);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // --- Header ---
    // Logo
    const imgProps = doc.getImageProperties(logoUrl);
    const imgWidth = 40;
    const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
    doc.addImage(logoUrl, 'PNG', margin, 10, imgWidth, imgHeight);

    // Header Texts (Right aligned or Centered next to logo)
    doc.setTextColor(0, 51, 102); // Navy Blue
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("PROPUESTA TÉCNICO COMERCIAL", pageWidth - margin, 20, { align: "right" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 100, 0); // Green
    doc.text("SERVICIO DE MEDICIONES DE HIGIENE OCUPACIONAL Y MEDIO AMBIENTE", pageWidth - margin, 28, { align: "right" });

    // Client Info Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, 45, pageWidth - (margin * 2), 35, 'F');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text(`Empresa: ${selectedClient.razonSocial || selectedClient.name}`, margin + 5, 52);
    doc.text(`Dirección: ${selectedClient.address}, ${selectedClient.city}`, margin + 5, 58);
    doc.text(`Solicitante: ${selectedClient.name}`, margin + 5, 64);
    doc.text(`Teléfono: ${selectedClient.phone || '-'}`, margin + 5, 70);
    doc.text(`Email: ${selectedClient.email || '-'}`, margin + 5, 76);

    doc.setFontSize(10);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, pageWidth - margin - 5, 52, { align: 'right' });

    let currentY = 90;

    // --- Rubro 1: Objetivos ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102);
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
    doc.setTextColor(0, 51, 102);
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
    doc.setTextColor(0, 51, 102);
    doc.text("3. RUBRO N° 3: ALCANCE DE LA PRESTACIÓN OFRECIDA", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    const scopeText = `La presente propuesta Técnico-Comercial es aplicable a las instalaciones de la empresa ${selectedClient.name}. Se realizarán las mediciones utilizando instrumental calibrado y certificado, conforme a las normativas vigentes mencionadas en el Rubro 2.`;
    const splitScope = doc.splitTextToSize(scopeText, pageWidth - (margin * 2));
    doc.text(splitScope, margin, currentY);
    currentY += (splitScope.length * 5) + 10;

    // --- Rubro 4: Tabla de Mediciones ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102);
    doc.text("4. RUBRO N° 4: PLAN DE MEDICIONES Y PROPUESTA ECONÓMICA", margin, currentY);
    currentY += 5;

    const tableBody: any[] = items.map(item => [
      item.determination,
      item.method,
      item.objective,
      `$ ${item.unitPrice.toLocaleString()}`,
      item.quantity,
      `$ ${(item.unitPrice * item.quantity).toLocaleString()}`
    ]);

    // Add Total Row
    const total = calculateTotal();
    tableBody.push([
      { content: 'TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: `$ ${total.toLocaleString()}`, styles: { fontStyle: 'bold' } }
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Determinación', 'Método/Requisito', 'Objetivo', 'P. Unit.', 'Cant.', 'P. Total']],
      body: tableBody,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [0, 51, 102], textColor: 255 },
      theme: 'grid',
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 35 },
        2: { cellWidth: 'auto' },
        3: { cellWidth: 20, halign: 'right' },
        4: { cellWidth: 15, halign: 'center' },
        5: { cellWidth: 25, halign: 'right' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 15;

    // Check for page break
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }

    // --- Rubros Finales ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102);
    doc.text("5. RUBRO N° 5: OBSERVACIONES", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("Los precios no incluyen IVA. Forma de pago: A convenir. Validez de la oferta: 15 días.", margin, currentY);
    currentY += 15;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 51, 102);
    doc.text("6. CLÁUSULA DE CONFIDENCIALIDAD", margin, currentY);
    currentY += 7;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.text("Toda la información obtenida durante el servicio será tratada con estricta confidencialidad.", margin, currentY);

    // --- Footer ---
    const pageCount = doc.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
      doc.text(`Environmental Express Argentina - Presupuesto SYSO - REV 8`, margin, pageHeight - 10);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    }

    doc.save(`Presupuesto_${selectedClient.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Generador de Presupuestos SYSO</h1>
          <p className="text-muted-foreground">Creación y exportación de propuestas técnico-comerciales.</p>
        </div>
        <Button onClick={generatePDF} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
          <FileDown className="h-4 w-4" /> Exportar PDF
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>1. Selección de Cliente</CardTitle>
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
              <Button variant="outline" className="gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle>2. Plan de Mediciones (Rubro 4)</CardTitle>
          <CardDescription>Agregue las determinaciones a incluir en el presupuesto.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
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
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Input 
                      value={item.determination} 
                      onChange={(e) => updateItem(item.id, 'determination', e.target.value)} 
                      placeholder="Ej: Iluminación"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={item.method} 
                      onChange={(e) => updateItem(item.id, 'method', e.target.value)} 
                      placeholder="Res. SRT 84/12"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      value={item.objective} 
                      onChange={(e) => updateItem(item.id, 'objective', e.target.value)} 
                      placeholder="Verificación niveles..."
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      value={item.unitPrice} 
                      onChange={(e) => updateItem(item.id, 'unitPrice', Number(e.target.value))} 
                      className="h-8 text-right"
                    />
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="number" 
                      value={item.quantity} 
                      onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))} 
                      className="h-8 text-center"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    $ {(item.unitPrice * item.quantity).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => deleteItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                 <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground h-24">
                        No hay items agregados. Comience agregando una medición.
                    </TableCell>
                 </TableRow>
              )}
            </TableBody>
          </Table>
          
          <div className="flex justify-between items-center mt-4 border-t pt-4">
             <Button onClick={handleAddItem} variant="secondary" className="gap-2">
                <Plus className="h-4 w-4" /> Agregar Item
             </Button>
             <div className="text-xl font-bold">
                Total Presupuesto: $ {calculateTotal().toLocaleString()}
             </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
         <h4 className="font-semibold flex items-center gap-2 mb-2">
            <Calculator className="h-4 w-4" /> Nota sobre la exportación
         </h4>
         <p>
            Al generar el PDF, se incluirá automáticamente el encabezado con logo, los rubros fijos (Objetivos, Marco Legal, Alcance), la tabla de mediciones calculada y las cláusulas finales de confidencialidad y validez.
         </p>
      </div>
    </div>
  );
}
