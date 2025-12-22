// @ts-ignore
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Establishment, Sector, MEASUREMENT_LABELS, MeasurementType, Measurement } from "./types";
import logoUrl from "@assets/image_1765761040646.png"; // We'll handle this import differently or pass it

// Utility to load image
const loadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = url;
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = reject;
  });
};

const COMPANY_COLOR = [0, 51, 102]; // #003366
const ACCENT_COLOR = [0, 153, 51]; // #009933
const GRAY_COLOR = [240, 240, 240]; // Light gray for headers

export const generatePDFReport = async (establishment: Establishment, sectors: Sector[], logoDataUrl?: string) => {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const logo = logoDataUrl || await loadImage(logoUrl).catch(() => "");
  
  let pageCount = 0;

  // --- Helper Functions ---

  const addHeader = (doc: any) => {
    // Logo
    if (logo) {
      const pageWidth = doc.internal.pageSize.width;
      const logoWidth = 60; // Bigger logo
      const logoHeight = 22.5; 
      const x = (pageWidth - logoWidth) / 2; // Centered
      doc.addImage(logo, "PNG", x, 10, logoWidth, logoHeight);
    }
  };

  const addFooter = (doc: any) => {
    const pageHeight = doc.internal.pageSize.height || 297;
    doc.setFontSize(8);
    doc.setFont("times", "normal");
    doc.setTextColor(100);
    doc.text(
      "Documento técnico generado según protocolos vigentes de la SRT - Environmental Express Argentina",
      doc.internal.pageSize.width / 2,
      pageHeight - 10,
      { align: "center" }
    );
    
    // Page Number
    const pageStr = `Página ${doc.internal.getCurrentPageInfo().pageNumber}`;
    doc.text(pageStr, doc.internal.pageSize.width - 25, pageHeight - 10);
  };

  // Override addPage to include header/footer automatically? 
  // Easier to just call it manually or use autoTable hooks, but manual is safer for custom layouts.
  
  // --- PAGE 1: COVER ---
  addHeader(doc);
  
  const pageWidth = doc.internal.pageSize.width;
  
  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
  doc.text("INFORME TÉCNICO", pageWidth / 2, 80, { align: "center" });
  
  doc.setFontSize(18);
  doc.setTextColor(0, 0, 0);
  doc.text("RELEVAMIENTO DE AGENTES DE RIESGO", pageWidth / 2, 95, { align: "center" });
  
  doc.setFontSize(12);
  doc.text("LEY 19.587 / DEC. 351/79", pageWidth / 2, 105, { align: "center" });

  // Data Box at bottom
  const boxY = 200;
  const boxHeight = 50;
  const boxWidth = 160;
  const boxX = (pageWidth - boxWidth) / 2;
  
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(boxX, boxY, boxWidth, boxHeight); // Outer box
  
  // Inner text
  doc.setFontSize(11);
  doc.setFont("times", "normal");
  
  const textMargin = 10;
  let textY = boxY + 12;
  
  doc.setFont("times", "bold");
  doc.text("Razón Social:", boxX + textMargin, textY);
  doc.setFont("times", "normal");
  doc.text(establishment.razonSocial || establishment.name, boxX + 50, textY);
  
  textY += 10;
  doc.setFont("times", "bold");
  doc.text("CUIT:", boxX + textMargin, textY);
  doc.setFont("times", "normal");
  doc.text(establishment.cuit || "-", boxX + 50, textY);
  
  textY += 10;
  doc.setFont("times", "bold");
  doc.text("Dirección:", boxX + textMargin, textY);
  doc.setFont("times", "normal");
  doc.text(establishment.address || "-", boxX + 50, textY);
  
  textY += 10;
  doc.setFont("times", "bold");
  doc.text("Fecha:", boxX + textMargin, textY);
  doc.setFont("times", "normal");
  doc.text(format(new Date(), "dd/MM/yyyy"), boxX + 50, textY);

  addFooter(doc);

  // --- PAGE 2: INSTRUMENTS ---
  doc.addPage();
  addHeader(doc);
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
  doc.text("INSTRUMENTAL UTILIZADO", 25, 45);

  // Instruments Table
  const instrumentsBody = (establishment.instruments || []).map(inst => [
    `${inst.brand} ${inst.model}`,
    inst.serialNumber,
    inst.calibrationDate || "-"
  ]);

  if (instrumentsBody.length === 0) {
      instrumentsBody.push(["No se declararon instrumentos", "-", "-"]);
  }

  // @ts-ignore
  autoTable(doc, {
    startY: 50,
    margin: { left: 25, right: 25 },
    head: [["Marca y Modelo", "Serie", "Calibración"]],
    body: instrumentsBody,
    theme: 'plain',
    styles: { 
        fontSize: 10, 
        cellPadding: 3, 
        lineColor: [0, 0, 0], 
        lineWidth: { bottom: 0.1, top: 0, left: 0, right: 0 },
        font: "helvetica",
        textColor: 0
    },
    headStyles: { 
        fillColor: [240, 240, 240], 
        textColor: 0, 
        fontStyle: 'bold',
        lineWidth: { bottom: 0.1, top: 0.1 } 
    },
    columnStyles: {
        0: { halign: 'left' },
        1: { halign: 'center' },
        2: { halign: 'center' }
    }
  });

  addFooter(doc);


  // --- SECTIONS BY TYPE ---
  // We iterate types to group protocols
  const measurementsByType: Partial<Record<MeasurementType, { sectorName: string; measurement: Measurement }[]>> = {};
  sectors.forEach(sector => {
    sector.measurements.forEach(m => {
      if (!measurementsByType[m.type]) measurementsByType[m.type] = [];
      measurementsByType[m.type]?.push({ sectorName: sector.name, measurement: m });
    });
  });

  for (const [type, items] of Object.entries(measurementsByType)) {
     if (!items || items.length === 0) continue;

     doc.addPage();
     addHeader(doc);
     
     // Section Title
     doc.setFont("helvetica", "bold");
     doc.setFontSize(14);
     doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
     doc.text(`PROTOCOLO DE ${MEASUREMENT_LABELS[type as MeasurementType].toUpperCase()}`, 25, 45);
     
     // Build specific table columns based on type
     let head: any[] = [];
     let body: any[] = [];
     
     if (type === 'lighting') {
         head = [["Punto", "Sector", "Puesto", "Tipo", "Fuente", "Uniformidad", "Valor (Lux)", "Legal", "Estado"]];
         body = items.flatMap(item => {
             const m = item.measurement;
             // Calculate values
             const values = m.points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
             const eAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
             const eMin = values.length > 0 ? Math.min(...values) : 0;
             const halfAvg = eAvg / 2;
             const uniformity = eMin >= halfAvg ? "CUMPLE" : "NO CUMPLE";
             const status = m.status === 'compliant' ? 'CUMPLE' : 'NO CUMPLE';
             
             return [[
                 { content: "1", rowSpan: 1 }, 
                 item.sectorName,
                 m.name || item.sectorName,
                 m.config?.lightingSystemType || "General",
                 m.config?.lightSource || "LED",
                 uniformity,
                 eAvg,
                 m.config?.limit || "-",
                 status
             ]];
         });
         
         // If points are needed, we map points instead.
         body = items.flatMap((item, idx) => {
             const m = item.measurement;
             const values = m.points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
             const eAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
             const eMin = values.length > 0 ? Math.min(...values) : 0;
             const halfAvg = eAvg / 2;
             const uniformityText = `${eMin} ${eMin >= halfAvg ? '≥' : '<'} ${Math.round(halfAvg)}`;
             const status = m.status === 'compliant' ? 'CUMPLE' : 'NO CUMPLE';

             return [[
                 (idx + 1).toString(),
                 item.sectorName,
                 m.name || item.sectorName,
                 m.config?.lightingSystemType === 'localized' ? 'Localizada' : 'General',
                 m.config?.artifactType || 'LED',
                 uniformityText,
                 eAvg,
                 m.config?.limit || "-",
                 status
             ]];
         });
     } else {
         // Generic table for other types
         head = [["Sector", "Punto", "Detalle", "Valor Medido", "Límite", "Estado"]];
         body = items.flatMap(item => {
             return item.measurement.points.map(p => {
                 let val = "";
                 if (type === 'noise') val = `${p.values.dbA} dBA`;
                 else if (type === 'thermal_load') val = `${p.values.tgbh} °C`;
                 else val = Object.values(p.values).join(" ");
                 
                 const status = item.measurement.status === 'compliant' ? 'CUMPLE' : 'NO CUMPLE';

                 return [
                    item.sectorName,
                    p.label,
                    p.notes || "-",
                    val,
                    item.measurement.config?.limit || "-",
                    status
                 ];
             });
         });
     }

     // @ts-ignore
     autoTable(doc, {
        startY: 50,
        margin: { left: 25, right: 25 }, // 2.5cm margins
        head: head,
        body: body,
        theme: 'plain',
        styles: { 
            fontSize: 9, 
            cellPadding: 3, 
            lineColor: [0, 0, 0], 
            lineWidth: { bottom: 0.1, top: 0, left: 0, right: 0 },
            halign: 'center',
            font: "helvetica",
            textColor: 0
        },
        headStyles: { 
            fillColor: [240, 240, 240], 
            textColor: 0, 
            fontStyle: 'bold',
            lineWidth: { bottom: 0.1, top: 0.1 } 
        },
        columnStyles: {
            0: { cellWidth: 15 },
            1: { cellWidth: 30, halign: 'left' },
            // Adjust others automatically
        },
        didParseCell: function(data: any) {
            // Conditional formatting for status
            if (data.section === 'body' && (data.column.index === data.table.columns.length - 1)) {
                 if (data.cell.raw === 'NO CUMPLE') {
                     data.cell.styles.textColor = [200, 0, 0];
                     data.cell.styles.fontStyle = 'bold';
                 } else {
                     data.cell.styles.textColor = [0, 100, 0];
                 }
            }
        }
     });
     
     addFooter(doc);
  }

  // --- CONCLUSIONS ---
  doc.addPage();
  addHeader(doc);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
  doc.text("CONCLUSIONES Y RECOMENDACIONES", 25, 45);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  let currentY = 55;
  const margin = 25;
  
  doc.setFont("times", "bold");
  doc.text("Conclusiones Técnicas:", margin, currentY);
  currentY += 6;
  doc.setFont("times", "normal");
  
  // Auto-generate detailed conclusions text if not provided
  const conclusionsText = establishment.conclusions || "Se procedió a realizar las mediciones según los protocolos establecidos.";
  const splitConclusions = doc.splitTextToSize(conclusionsText, 160); // Width 160mm (A4 210 - 25*2)
  doc.text(splitConclusions, margin, currentY);
  currentY += (splitConclusions.length * 5) + 10;

  doc.setFont("times", "bold");
  doc.text("Recomendaciones:", margin, currentY);
  currentY += 6;
  doc.setFont("times", "normal");
  
  const recommendationsText = establishment.recommendations || "No se registran recomendaciones específicas.";
  const splitRecommendations = doc.splitTextToSize(recommendationsText, 160);
  doc.text(splitRecommendations, margin, currentY);
  
  addFooter(doc);

  // --- ANEXO 1: CROQUIS ---
  if (establishment.sketchImage) {
      doc.addPage();
      addHeader(doc);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
      doc.text("ANEXO 1: CROQUIS DEL ESTABLECIMIENTO", 25, 45);
      
      try {
        // Fit image
        const imgProps = doc.getImageProperties(establishment.sketchImage);
        const pageWidth = doc.internal.pageSize.width - 50; // 25mm margin each side
        const pageHeight = doc.internal.pageSize.height - 80;
        const ratio = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);
        const w = imgProps.width * ratio;
        const h = imgProps.height * ratio;
        
        doc.addImage(establishment.sketchImage, "PNG", 25, 55, w, h);
        
        // Border for sketch
        doc.setDrawColor(0);
        doc.setLineWidth(0.2);
        doc.rect(25, 55, w, h);
        
      } catch (e) {
        doc.setFontSize(10);
        doc.setTextColor(200, 0, 0);
        doc.text("Error al cargar la imagen del croquis.", 25, 60);
      }
      
      addFooter(doc);
  }

  // --- ANEXO 3: FOTOGRAFÍAS ---
  const photoEvidence: { sector: string; title: string; image: string }[] = [];
  
  sectors.forEach(sector => {
      sector.measurements.forEach(m => {
          if (m.attachedDocuments?.measurementProofImage) {
              photoEvidence.push({
                  sector: sector.name,
                  title: `Prueba de Medición - ${m.name || sector.name} (${MEASUREMENT_LABELS[m.type]})`,
                  image: m.attachedDocuments.measurementProofImage
              });
          }
          if (m.attachedDocuments?.otherImages) {
              m.attachedDocuments.otherImages.forEach((img, idx) => {
                   photoEvidence.push({
                      sector: sector.name,
                      title: `Evidencia Adicional ${idx + 1} - ${m.name || sector.name}`,
                      image: img
                  });
              });
          }
      });
  });

  if (photoEvidence.length > 0) {
      doc.addPage();
      addHeader(doc);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
      doc.text("ANEXO 3: EVIDENCIA FOTOGRÁFICA", 25, 45);

      let yPos = 55;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 25;
      const availableWidth = pageWidth - (margin * 2);
      const maxImgHeight = 100; 
      
      photoEvidence.forEach((item, index) => {
          if (yPos + maxImgHeight + 10 > doc.internal.pageSize.height - 30) {
              addFooter(doc);
              doc.addPage();
              addHeader(doc);
              doc.setFont("helvetica", "bold");
              doc.setFontSize(14);
              doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
              doc.text("ANEXO 3: EVIDENCIA FOTOGRÁFICA (Cont.)", 25, 45);
              yPos = 55;
          }

          try {
              // Image logic
              let w = 100;
              let h = 75; 
              
              if (item.image.startsWith('data:image/')) {
                  const props = doc.getImageProperties(item.image);
                  const ratio = Math.min(availableWidth / props.width, maxImgHeight / props.height);
                  w = props.width * ratio;
                  h = props.height * ratio;
              }

              const xPos = margin + (availableWidth - w) / 2;
              
              doc.addImage(item.image, "PNG", xPos, yPos, w, h);
              
              // Border
              doc.setDrawColor(0);
              doc.setLineWidth(0.2);
              doc.rect(xPos, yPos, w, h);
              
              // Caption
              yPos += h + 5;
              doc.setFontSize(9);
              doc.setFont("times", "italic");
              doc.setTextColor(0, 0, 0);
              doc.text(`${item.sector}: ${item.title}`, xPos, yPos, { maxWidth: w });
              
              yPos += 15; // Space for next photo
          } catch (e) {
              doc.setTextColor(200, 0, 0);
              doc.text("[Error al procesar imagen]", margin, yPos);
              yPos += 20;
          }
      });
      
      addFooter(doc);
  }

  // --- ANEXO 2: INSTRUMENTOS (Certificados) ---
  // If we had images for certificates, we would loop them here.
  // For now, placeholder or check if any have attached images.
  // Assuming no certificate images in current mock data structure, skipping loop.
  
  // Save
  doc.save(`Informe_Tecnico_${establishment.name || "EEA"}.pdf`);
};
