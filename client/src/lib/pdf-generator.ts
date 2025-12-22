// @ts-ignore
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Establishment, Sector, MEASUREMENT_LABELS, MeasurementType, Measurement } from "./types";
import logoUrl from "@assets/image_1765761040646.png"; 

// Constants for layout
const MARGIN = 25; // 2.5cm
const HEADER_HEIGHT = 30; // Space for header
const FOOTER_HEIGHT = 20; // Space for footer
const COMPANY_COLOR = [0, 51, 102]; // #003366 - Navy Blue
const ACCENT_COLOR = [245, 245, 245]; // Very light gray for headers

// Helper to load static assets if not base64
const loadAsset = (url: string): Promise<string> => {
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

export const generatePDFReport = async (establishment: Establishment, sectors: Sector[], logoDataUrl?: string) => {
  // 1. Initialize Document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const contentWidth = pageWidth - (MARGIN * 2);

  // Load Logo
  const logo = logoDataUrl || await loadAsset(logoUrl).catch(() => "");

  // --- Shared Layout Functions ---

  const drawHeader = (doc: any) => {
    // Institutional Header on every page
    if (logo) {
      const logoWidth = 50;
      const logoHeight = 15; 
      // Left aligned logo
      doc.addImage(logo, "PNG", MARGIN, 10, logoWidth, logoHeight);
    }
    
    // Company Name / Title Right aligned
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
    doc.text("ENVIRONMENTAL EXPRESS ARGENTINA", pageWidth - MARGIN, 15, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("Servicios de Higiene y Seguridad Laboral", pageWidth - MARGIN, 20, { align: "right" });

    // Divider line
    doc.setDrawColor(0);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, 28, pageWidth - MARGIN, 28);
  };

  const drawFooter = (doc: any) => {
    const pageNumber = doc.internal.getCurrentPageInfo().pageNumber;
    
    doc.setDrawColor(0);
    doc.setLineWidth(0.1);
    doc.line(MARGIN, pageHeight - 15, pageWidth - MARGIN, pageHeight - 15);

    doc.setFont("times", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    
    // Legal text
    doc.text(
      "Informe generado según protocolos SRT vigentes - Ley 19.587",
      MARGIN,
      pageHeight - 10
    );

    // Page number
    doc.text(
      `Página ${pageNumber}`,
      pageWidth - MARGIN,
      pageHeight - 10,
      { align: "right" }
    );
  };

  // Helper to add a new page with header/footer setup
  const addNewPage = () => {
    doc.addPage();
    drawHeader(doc);
    drawFooter(doc);
  };

  // --- PAGE 1: COVER ---
  // Clean, professional cover
  drawHeader(doc);

  // Centered Title Block
  const coverY = 80;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
  doc.text("INFORME TÉCNICO", pageWidth / 2, coverY, { align: "center" });
  
  doc.setFontSize(16);
  doc.setTextColor(0);
  doc.text("RELEVAMIENTO DE AGENTES DE RIESGO", pageWidth / 2, coverY + 15, { align: "center" });
  
  doc.setFontSize(12);
  doc.setTextColor(80);
  doc.text("Ley 19.587 / Dec. 351/79", pageWidth / 2, coverY + 25, { align: "center" });

  // Client Data Box - Bottom of page
  const boxHeight = 60;
  const boxY = pageHeight - MARGIN - boxHeight - 20;
  
  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN, boxY, contentWidth, boxHeight);
  
  // Inner Box Content
  let textY = boxY + 15;
  const col1X = MARGIN + 10;
  const col2X = MARGIN + 60;

  doc.setFont("times", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0);

  const addRow = (label: string, value: string) => {
    doc.setFont("times", "bold");
    doc.text(label, col1X, textY);
    doc.setFont("times", "normal");
    doc.text(value || "-", col2X, textY);
    textY += 10;
  };

  addRow("Razón Social:", establishment.razonSocial || establishment.name);
  addRow("C.U.I.T.:", establishment.cuit || "-");
  addRow("Dirección:", establishment.address || "-");
  addRow("Localidad:", `${establishment.city || "-"}, ${establishment.province || "-"}`);
  addRow("Fecha de Medición:", format(new Date(), "dd/MM/yyyy"));

  drawFooter(doc);

  // --- PAGE 2: INSTRUMENTS ---
  addNewPage();
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
  doc.text("INSTRUMENTAL UTILIZADO", MARGIN, 45);

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
    startY: 55,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Marca y Modelo", "Serie", "Vencimiento Calibración"]],
    body: instrumentsBody,
    theme: 'plain',
    styles: { 
        font: "times", 
        fontSize: 10, 
        cellPadding: 3, 
        lineColor: [200, 200, 200], 
        lineWidth: { bottom: 0.1 },
        textColor: 0,
        valign: 'middle'
    },
    headStyles: { 
        fillColor: ACCENT_COLOR, 
        textColor: 0, 
        fontStyle: 'bold',
        halign: 'left'
    },
    didDrawPage: (data: any) => {
        drawHeader(doc);
        drawFooter(doc);
    }
  });

  // --- SECTIONS BY TYPE (PROTOCOLS) ---
  const measurementsByType: Partial<Record<MeasurementType, { sectorName: string; measurement: Measurement }[]>> = {};
  sectors.forEach(sector => {
    sector.measurements.forEach(m => {
      if (!measurementsByType[m.type]) measurementsByType[m.type] = [];
      measurementsByType[m.type]?.push({ sectorName: sector.name, measurement: m });
    });
  });

  for (const [type, items] of Object.entries(measurementsByType)) {
     if (!items || items.length === 0) continue;

     // Force new page for each protocol type
     addNewPage();

     doc.setFont("helvetica", "bold");
     doc.setFontSize(14);
     doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
     doc.text(`PROTOCOLO DE ${MEASUREMENT_LABELS[type as MeasurementType].toUpperCase()}`, MARGIN, 45);

     let head: any[] = [];
     let body: any[] = [];

     if (type === 'lighting') {
         head = [["Punto", "Sector", "Puesto", "Tipo", "Fuente", "Uniformidad", "Valor (Lux)", "Legal", "Estado"]];
         // Flatten points
         body = items.flatMap(item => {
             const m = item.measurement;
             if (m.points.length === 0) {
                 // Entry without points (summary or empty)
                 return [[
                     "-", item.sectorName, m.name || "-", 
                     m.config?.lightingSystemType || "-", m.config?.lightSource || "-", 
                     "-", "-", m.config?.limit || "-", "PENDIENTE"
                 ]];
             }
             
             const values = m.points.map(p => Number(p.values.lux) || 0).filter(v => v > 0);
             const eAvg = values.length > 0 ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : 0;
             const eMin = values.length > 0 ? Math.min(...values) : 0;
             const halfAvg = eAvg / 2;
             const uniformity = eMin >= halfAvg ? "CUMPLE" : "NO CUMPLE";
             const status = m.status === 'compliant' ? 'CUMPLE' : 'NO CUMPLE';

             return [[
                 { content: "1..n", styles: { halign: 'center' } },
                 item.sectorName,
                 m.name || item.sectorName,
                 m.config?.lightingSystemType === 'localized' ? 'Local' : 'General',
                 m.config?.artifactType || 'LED',
                 uniformity,
                 eAvg,
                 m.config?.limit || "-",
                 status
             ]];
         });
     } else {
        // Generic
        head = [["Sector", "Puesto", "Detalle", "Valor Medido", "Límite", "Estado"]];
        body = items.flatMap(item => {
             const m = item.measurement;
             return m.points.map(p => {
                 let val = "";
                 if (type === 'noise') val = `${p.values.dbA} dBA`;
                 else if (type === 'thermal_load') val = `${p.values.tgbh} °C`;
                 else val = Object.values(p.values).join(" ");
                 
                 const status = m.status === 'compliant' ? 'CUMPLE' : 'NO CUMPLE';

                 return [
                    item.sectorName,
                    m.name || item.sectorName,
                    p.label || "-",
                    val,
                    m.config?.limit || "-",
                    status
                 ];
             });
         });
     }

     // @ts-ignore
     autoTable(doc, {
        startY: 55,
        margin: { left: MARGIN, right: MARGIN },
        head: head,
        body: body,
        theme: 'plain',
        styles: { 
            font: "times", 
            fontSize: 10, 
            cellPadding: 4, 
            lineColor: [220, 220, 220], 
            lineWidth: { bottom: 0.1 },
            valign: 'middle',
            textColor: 0,
            overflow: 'linebreak'
        },
        headStyles: { 
            fillColor: ACCENT_COLOR, 
            textColor: 0, 
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 'auto' }, // Let autoTable handle widths but constrained by margins
            // Last column (Status) styling
            [head[0].length - 1]: { fontStyle: 'bold', halign: 'center' }
        },
        didParseCell: function(data: any) {
            if (data.section === 'body' && data.column.index === data.table.columns.length - 1) {
                 const text = data.cell.raw as string;
                 if (text === 'NO CUMPLE') {
                     data.cell.styles.textColor = [200, 0, 0];
                 } else if (text === 'CUMPLE') {
                     data.cell.styles.textColor = [0, 120, 0];
                 }
            }
        },
        didDrawPage: (data: any) => {
             drawHeader(doc);
             drawFooter(doc);
        }
     });
  }

  // --- CONCLUSIONS ---
  addNewPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
  doc.text("CONCLUSIONES Y RECOMENDACIONES", MARGIN, 45);

  let currentY = 60;
  
  // Conclusions Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(0);
  doc.text("Conclusiones Técnicas:", MARGIN, currentY);
  currentY += 8;

  // Conclusions Body (Justified)
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  const conclusionsText = establishment.conclusions || "Se procedió a realizar las mediciones según los protocolos establecidos.";
  const splitConclusions = doc.splitTextToSize(conclusionsText, contentWidth);
  doc.text(splitConclusions, MARGIN, currentY, { align: "justify", maxWidth: contentWidth, lineHeightFactor: 1.15 });
  
  currentY += (splitConclusions.length * 5) + 15;

  // Recommendations Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Recomendaciones:", MARGIN, currentY);
  currentY += 8;

  // Recommendations Body (Bullets)
  doc.setFont("times", "normal");
  doc.setFontSize(10);
  
  const rawRecommendations = establishment.recommendations || "No se registran recomendaciones específicas.";
  // Split by newlines to check for bullet structure
  const recLines = rawRecommendations.split('\n');
  
  recLines.forEach(line => {
      // Check if line starts with dash or bullet
      let cleanLine = line.trim();
      if (cleanLine.startsWith('-') || cleanLine.startsWith('•')) {
          cleanLine = cleanLine.substring(1).trim();
      }
      
      if (cleanLine.length > 0) {
        // Draw bullet
        doc.text("•", MARGIN, currentY);
        const splitLine = doc.splitTextToSize(cleanLine, contentWidth - 5);
        doc.text(splitLine, MARGIN + 5, currentY, { align: "justify", maxWidth: contentWidth - 5, lineHeightFactor: 1.15 });
        currentY += (splitLine.length * 5) + 3;
      }
  });


  // --- ANEXO 1: CROQUIS ---
  if (establishment.sketchImage) {
      addNewPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
      doc.text("ANEXO 1: CROQUIS DEL ESTABLECIMIENTO", MARGIN, 45);

      try {
          // Verify valid Base64
          if (!establishment.sketchImage.startsWith('data:image')) {
               throw new Error("Formato de imagen inválido");
          }

          const props = doc.getImageProperties(establishment.sketchImage);
          const maxWidth = contentWidth;
          const maxHeight = pageHeight - MARGIN - 60;
          
          const ratio = Math.min(maxWidth / props.width, maxHeight / props.height);
          const w = props.width * ratio;
          const h = props.height * ratio;
          
          const x = MARGIN + (maxWidth - w) / 2;
          const y = 55;

          doc.addImage(establishment.sketchImage, "PNG", x, y, w, h);
          doc.setDrawColor(0);
          doc.setLineWidth(0.2);
          doc.rect(x, y, w, h); // Border
          
      } catch (e) {
          doc.setFontSize(10);
          doc.setTextColor(200, 0, 0);
          doc.text("[La imagen del croquis no se pudo procesar]", MARGIN, 60);
      }
  }

  // --- ANEXO 3: EVIDENCE PHOTOS ---
  const photoEvidence: { sector: string; title: string; image: string }[] = [];
  
  // Collect all images
  sectors.forEach(sector => {
      sector.measurements.forEach(m => {
          if (m.attachedDocuments?.measurementProofImage) {
              photoEvidence.push({
                  sector: sector.name,
                  title: `Prueba de Medición - ${m.name || sector.name}`,
                  image: m.attachedDocuments.measurementProofImage
              });
          }
          if (m.attachedDocuments?.otherImages) {
              m.attachedDocuments.otherImages.forEach((img, idx) => {
                   photoEvidence.push({
                      sector: sector.name,
                      title: `Evidencia Adicional ${idx + 1}`,
                      image: img
                  });
              });
          }
      });
  });

  if (photoEvidence.length > 0) {
      addNewPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
      doc.text("ANEXO 3: EVIDENCIA FOTOGRÁFICA", MARGIN, 45);

      let yPos = 55;
      const maxImgHeight = 100;

      for (let i = 0; i < photoEvidence.length; i++) {
          const item = photoEvidence[i];
          
          // Check space
          if (yPos + maxImgHeight + 20 > pageHeight - MARGIN) {
              addNewPage();
              doc.setFont("helvetica", "bold");
              doc.setFontSize(14);
              doc.setTextColor(COMPANY_COLOR[0], COMPANY_COLOR[1], COMPANY_COLOR[2]);
              doc.text("ANEXO 3: EVIDENCIA FOTOGRÁFICA (Cont.)", MARGIN, 45);
              yPos = 55;
          }

          try {
              if (!item.image.startsWith('data:image')) throw new Error("Invalid format");

              const props = doc.getImageProperties(item.image);
              const ratio = Math.min(contentWidth / props.width, maxImgHeight / props.height);
              const w = props.width * ratio;
              const h = props.height * ratio;
              const x = MARGIN + (contentWidth - w) / 2;

              doc.addImage(item.image, "PNG", x, yPos, w, h);
              
              // Border
              doc.setDrawColor(0);
              doc.setLineWidth(0.2);
              doc.rect(x, yPos, w, h);

              // Caption
              yPos += h + 5;
              doc.setFont("times", "italic");
              doc.setFontSize(9);
              doc.setTextColor(0);
              doc.text(`${item.sector}: ${item.title}`, pageWidth / 2, yPos, { align: "center" });

              yPos += 15;

          } catch (e) {
              // Skip failed images but log placeholder
              doc.setFont("times", "normal");
              doc.setTextColor(200, 0, 0);
              doc.text(`[Error imagen: ${item.title}]`, MARGIN, yPos);
              yPos += 10;
          }
      }
  }

  // Save
  doc.save(`Informe_Tecnico_${establishment.name || "EEA"}.pdf`);
};
