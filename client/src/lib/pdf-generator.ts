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
      doc.addImage(logo, "PNG", 10, 10, 40, 15);
    }
    
    // Header Table (Right Side)
    // @ts-ignore
    autoTable(doc, {
      startY: 10,
      margin: { left: 100 },
      head: [["Razón Social", "CUIT", "Fecha", "Informe N°"]],
      body: [[
        establishment.razonSocial || establishment.name,
        establishment.cuit || "-",
        format(new Date(), "dd/MM/yyyy"),
        `INF-${format(new Date(), "yyyyMMdd")}-001`
      ]],
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold' },
    });
  };

  const addFooter = (doc: any) => {
    const pageHeight = doc.internal.pageSize.height || 297;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      "Documento técnico generado según protocolos vigentes de la SRT - Environmental Express Argentina",
      doc.internal.pageSize.width / 2,
      pageHeight - 10,
      { align: "center" }
    );
    
    // Page Number
    const pageStr = `Página ${doc.internal.getCurrentPageInfo().pageNumber}`;
    doc.text(pageStr, doc.internal.pageSize.width - 20, pageHeight - 10);
  };

  // Override addPage to include header/footer automatically? 
  // Easier to just call it manually or use autoTable hooks, but manual is safer for custom layouts.
  
  // --- PAGE 1: COVER ---
  addHeader(doc);
  
  doc.setFontSize(22);
  doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
  doc.text("INFORME TÉCNICO", 105, 60, { align: "center" });
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text("Relevamiento de Agentes de Riesgo", 105, 70, { align: "center" });
  doc.setFontSize(10);
  doc.text("LEY 19.587 / DEC. 351/79", 105, 76, { align: "center" });

  // Client Data Table
  // @ts-ignore
  autoTable(doc, {
    startY: 90,
    head: [[{ content: "DATOS DEL ESTABLECIMIENTO", colSpan: 2, styles: { fillColor: COMPANY_COLOR, textColor: 255, halign: 'center' } }]],
    body: [
      [{ content: "Razón Social:", styles: { fontStyle: 'bold' } }, establishment.razonSocial || establishment.name],
      [{ content: "Dirección:", styles: { fontStyle: 'bold' } }, establishment.address || "-"],
      [{ content: "Localidad:", styles: { fontStyle: 'bold' } }, `${establishment.city || "-"}, ${establishment.province || "-"}`],
      [{ content: "C.P.:", styles: { fontStyle: 'bold' } }, establishment.postalCode || "-"],
      [{ content: "Responsable:", styles: { fontStyle: 'bold' } }, establishment.responsible || "-"],
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
    columnStyles: { 0: { cellWidth: 50 } }
  });

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
    // @ts-ignore
    startY: doc.lastAutoTable.finalY + 20,
    head: [[{ content: "INSTRUMENTAL UTILIZADO", colSpan: 3, styles: { fillColor: ACCENT_COLOR, textColor: 255, halign: 'center' } }]],
    body: [
      [{ content: "Marca y Modelo", styles: { fontStyle: 'bold' } }, { content: "Serie", styles: { fontStyle: 'bold' } }, { content: "Calibración", styles: { fontStyle: 'bold' } }],
      ...instrumentsBody
    ],
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1 },
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
     doc.setFontSize(14);
     doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
     doc.text(`PROTOCOLO DE ${MEASUREMENT_LABELS[type as MeasurementType].toUpperCase()}`, 10, 35);
     
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
                 { content: "1", rowSpan: 1 }, // Simplification: assuming 1 row per measurement for summary, or listing points?
                 // Let's list points if detailed, or summary if summary. The user asked for "Tabla de Valores de Iluminación"
                 // usually summary per "Sector/Puesto" is better unless detailed points are required in main table.
                 // Let's do summary per measurement.
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
         // Let's map points for detail as per previous HTML table
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
        startY: 40,
        head: head,
        body: body,
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center' },
        headStyles: { fillColor: COMPANY_COLOR, textColor: 255, fontStyle: 'bold' },
        columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 25 },
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
  doc.setFontSize(14);
  doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
  doc.text("CONCLUSIONES Y RECOMENDACIONES", 10, 35);
  
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  
  let currentY = 45;
  
  const textOptions = { maxWidth: 180, align: 'justify' };
  
  doc.setFont(undefined, 'bold');
  doc.text("Conclusiones Técnicas:", 10, currentY);
  currentY += 5;
  doc.setFont(undefined, 'normal');
  
  // Auto-generate detailed conclusions text if not provided
  const conclusionsText = establishment.conclusions || "Se procedió a realizar las mediciones según los protocolos establecidos.";
  const splitConclusions = doc.splitTextToSize(conclusionsText, 180);
  doc.text(splitConclusions, 10, currentY);
  currentY += (splitConclusions.length * 5) + 10;

  doc.setFont(undefined, 'bold');
  doc.text("Recomendaciones:", 10, currentY);
  currentY += 5;
  doc.setFont(undefined, 'normal');
  
  const recommendationsText = establishment.recommendations || "No se registran recomendaciones específicas.";
  const splitRecommendations = doc.splitTextToSize(recommendationsText, 180);
  doc.text(splitRecommendations, 10, currentY);
  
  addFooter(doc);

  // --- ANEXO 1: CROQUIS ---
  if (establishment.sketchImage) {
      doc.addPage();
      addHeader(doc);
      doc.setFontSize(14);
      doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
      doc.text("ANEXO 1: CROQUIS DEL ESTABLECIMIENTO", 10, 35);
      
      try {
        // Fit image
        const imgProps = doc.getImageProperties(establishment.sketchImage);
        const pageWidth = doc.internal.pageSize.width - 20;
        const pageHeight = doc.internal.pageSize.height - 60;
        const ratio = Math.min(pageWidth / imgProps.width, pageHeight / imgProps.height);
        const w = imgProps.width * ratio;
        const h = imgProps.height * ratio;
        
        doc.addImage(establishment.sketchImage, "PNG", 10, 45, w, h);
      } catch (e) {
        doc.setFontSize(10);
        doc.setTextColor(200, 0, 0);
        doc.text("Error al cargar la imagen del croquis.", 10, 50);
      }
      
      addFooter(doc);
  }

  // --- ANEXO 3: FOTOGRAFÍAS (Nueva sección solicitada) ---
  // Recopilar todas las imágenes adjuntas a mediciones
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
      doc.setFontSize(14);
      doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
      doc.text("ANEXO 3: EVIDENCIA FOTOGRÁFICA", 10, 35);

      let yPos = 45;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 10;
      const maxImgHeight = 110; // Max height for 2 photos per page approx
      
      photoEvidence.forEach((item, index) => {
          // Check if we need a new page (every 2 photos, or if space runs out)
          if (yPos + maxImgHeight > doc.internal.pageSize.height - 20) {
              addFooter(doc);
              doc.addPage();
              addHeader(doc);
              doc.setFontSize(14);
              doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
              doc.text("ANEXO 3: EVIDENCIA FOTOGRÁFICA (Cont.)", 10, 35);
              yPos = 45;
          }

          doc.setFontSize(10);
          doc.setTextColor(0, 0, 0);
          doc.setFont(undefined, 'bold');
          doc.text(`${item.sector}: ${item.title}`, margin, yPos);
          yPos += 5;

          try {
              // Convert base64 to image explicitly if needed, but addImage supports it.
              // jsPDF usually needs format hint if it can't detect it.
              // We'll pass format 'PNG' or 'JPEG' if we can guess, but let's try a safer addImage first.
              
              // const imgProps = doc.getImageProperties(item.image); 
              // getImageProperties can fail if format is not supported synchronously.
              
              const availableWidth = pageWidth - (margin * 2);
              const maxH = maxImgHeight;
              
              // We'll try to add the image directly. If we need dimensions, we'll assume a standard ratio or handle async loading
              // But since we already have base64, we can create an Image element to get dimensions if getImageProperties fails.
              // However, since we are in async function, we can await an image loader.
              
              const img = new Image();
              img.src = item.image;
              
              // Note: This waiting is synchronous for the loop inside async function? No, we need to promisify getting dimensions if doc.getImageProperties fails.
              // But doc.getImageProperties is synchronous for Data URLs usually.
              // The error suggests the string might be missing prefix or have issues.
              
              // Check if image string has data prefix
              if (!item.image.startsWith('data:image/')) {
                  throw new Error("Invalid image format");
              }
              
              const props = doc.getImageProperties(item.image);
              const ratio = Math.min(availableWidth / props.width, maxH / props.height);
              const w = props.width * ratio;
              const h = props.height * ratio;
              
              const xPos = margin + (availableWidth - w) / 2;
              doc.addImage(item.image, "PNG", xPos, yPos, w, h);
              yPos += h + 15;
          } catch (e) {
              // Fallback: try adding as JPEG if PNG failed, or generic
              try {
                  // Sometimes properties fail but adding works? Unlikely.
                  // Try to just add it with fixed width if props failed
                  // doc.addImage(item.image, xPos, yPos, 100, 100); 
                  doc.setTextColor(200, 0, 0);
                  doc.text("[Error: Formato de imagen no soportado]", margin, yPos);
                  yPos += 20;
              } catch (e2) {
                  doc.setTextColor(200, 0, 0);
                  doc.text("[Error al procesar imagen]", margin, yPos);
                  yPos += 20;
              }
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
