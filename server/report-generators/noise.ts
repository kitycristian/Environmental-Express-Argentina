import {
  Paragraph, Table, TableRow,
  WidthType, AlignmentType,
} from "docx";
import {
  CONT_W, NAVY, run, cell, hdr, cumpleCell,
  pageBreakPara, protocolHeader, spaceBlock,
} from "./helpers.js";

export function buildNoiseSection(establishment: any, noiseProtocol: any): any[] {
  if (!noiseProtocol?.rows?.some((r: any) => r.sector || r.valorMedido)) return [];
  const rows = noiseProtocol.rows;
  const comp = noiseProtocol.company || {};
  const items: any[] = [pageBreakPara()];

  items.push(new Paragraph({
    children: [run("ESTUDIO DE RUIDO LABORAL SEGÚN RESOL. SRT Nº 85/2012", { size: 13, bold: true, color: NAVY })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
  }));

  // ── Encabezado + Datos para la medición (sonómetro y dosímetro)
  items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Datos para la medición")] }),
      new TableRow({ children: [cell(
        `(7) Sonómetro: ${comp.instrumento1 || "-"} · Modelo: ${comp.instrumento1Modelo || comp.instrumento1 || "-"} · N° Serie: ${comp.instrumento1Serie || "-"} · N° Cert.: ${comp.instrumento1Cert || "-"}`
      )] }),
      new TableRow({ children: [cell(
        `(7) Dosímetro: ${comp.instrumento2 || "-"} · Modelo: ${comp.instrumento2Modelo || comp.instrumento2 || "-"} · N° Serie: ${comp.instrumento2Serie || "-"} · N° Cert.: ${comp.instrumento2Cert || "-"}`
      )] }),
      new TableRow({ children: [cell(
        `(8) Fecha calibración Sonómetro: ${comp.instrumento1FechaCal || "-"}    Fecha calibración Dosímetro: ${comp.instrumento2FechaCal || "-"}`
      )] }),
      new TableRow({ children: [cell(
        `(9) Fecha medición: ${comp.fechaMedicion || "-"}    (10) Hora inicio: ${comp.horaInicio || "-"}    (11) Hora fin: ${comp.horaFin || "-"}`
      )] }),
      new TableRow({ children: [cell(
        `(12) Jornada laboral: ${comp.jornadaLaboral || "-"} hs    Turnos: ${comp.turnos || "-"}`
      )] }),
      new TableRow({ children: [cell(
        `(13) Condiciones normales / habituales: ${comp.condicionesNormales || "-"}`
      )] }),
      new TableRow({ children: [cell(
        `(14) Condiciones al momento de la medición: ${comp.condicionesMedicion || "-"}`
      )] }),
      new TableRow({ children: [hdr("Documentación que se adjuntará")] }),
      new TableRow({ children: [cell("(15) Copia del certificado de calibración del equipo.\n(16) Plano o croquis del establecimiento con los puntos de medición.")] }),
    ],
  }));

  // ── Tabla principal de datos de medición
  items.push(pageBreakPara());
  items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [500, 1100, 1300, 750, 750, 900, 800, 800, 800, 700, 860],
    rows: [
      new TableRow({ children: [
        hdr("(23) Pto",          { align: AlignmentType.CENTER }),
        hdr("(24) Sector"),
        hdr("(25) Puesto"),
        hdr("(26) Te (hs)",      { align: AlignmentType.CENTER }),
        hdr("(27) T. Integ.",    { align: AlignmentType.CENTER }),
        hdr("(28) Tipo Ruido",   { align: AlignmentType.CENTER }),
        hdr("(29) LC pico dBC",  { align: AlignmentType.CENTER }),
        hdr("(30) LAeq,Te dBA",  { align: AlignmentType.CENTER }),
        hdr("(31) Σ Ci/Ti",      { align: AlignmentType.CENTER }),
        hdr("(32) Dosis %",      { align: AlignmentType.CENTER }),
        hdr("(33) Cumple",       { align: AlignmentType.CENTER }),
      ]}),
      ...rows.map((r: any, i: number) => new TableRow({ children: [
        cell(String(i + 1).padStart(2, "0"), { align: AlignmentType.CENTER }),
        cell(r.sector || ""),
        cell(r.puestoTrabajo || ""),
        cell(r.tiempoExposicion || "",  { align: AlignmentType.CENTER }),
        cell(r.tiempoIntegracion || "", { align: AlignmentType.CENTER }),
        cell(r.tipoRuido || "",         { align: AlignmentType.CENTER }),
        cell(r.tipoRuido === "Impulso" ? r.valorMedido || "" : "N/A", { align: AlignmentType.CENTER }),
        cell(r.tipoRuido !== "Impulso" ? r.valorMedido || "" : "N/A", { align: AlignmentType.CENTER }),
        cell(r.fraccion || "",          { align: AlignmentType.CENTER }),
        cell(r.dosisRuido || "-",       { align: AlignmentType.CENTER }),
        cumpleCell(r.cumple),
      ]})),
    ],
  }));

  // ── Tabla de cálculos de fracciones Ci/Ti por punto
  const rowsConFraccion = rows.filter((r: any) => r.fraccion || r.tiempoExposicion);
  if (rowsConFraccion.length > 0) {
    items.push(pageBreakPara());
    items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", establishment));
    items.push(new Table({
      width: { size: CONT_W, type: WidthType.DXA },
      columnWidths: [CONT_W],
      rows: [new TableRow({ children: [hdr("Cálculo de fracciones Ci/Ti por punto de medición")] })],
    }));
    items.push(new Table({
      width: { size: CONT_W, type: WidthType.DXA },
      columnWidths: [700, 2100, 1500, 1200, 1200, 1200, 1500],
      rows: [
        new TableRow({ children: [
          hdr("Pto",            { align: AlignmentType.CENTER }),
          hdr("Puesto"),
          hdr("LAeq dBA",       { align: AlignmentType.CENTER }),
          hdr("Te (hs)",        { align: AlignmentType.CENTER }),
          hdr("TLV (hs)",       { align: AlignmentType.CENTER }),
          hdr("Ci/Ti",          { align: AlignmentType.CENTER }),
          hdr("Dosis acum. %",  { align: AlignmentType.CENTER }),
        ]}),
        ...rowsConFraccion.map((r: any, i: number) => new TableRow({ children: [
          cell(String(i + 1).padStart(2, "0"), { align: AlignmentType.CENTER }),
          cell(r.puestoTrabajo || r.sector || ""),
          cell(r.tipoRuido !== "Impulso" ? r.valorMedido || "-" : "N/A", { align: AlignmentType.CENTER }),
          cell(r.tiempoExposicion || "-", { align: AlignmentType.CENTER }),
          cell(r.tiempoPermitido || "-",  { align: AlignmentType.CENTER }),
          cell(r.fraccion || "-",         { align: AlignmentType.CENTER }),
          cell(r.dosisRuido ? `${r.dosisRuido}%` : "-", { align: AlignmentType.CENTER }),
        ]})),
      ],
    }));
  }

  // ── Valores de referencia
  items.push(pageBreakPara());
  items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Valores de Referencia — Resol. MTEySS N° 295/2003, Anexo V")] }),
      new TableRow({ children: [cell(
        "VALORES LÍMITE PARA EL RUIDO (criterio 85 dBA / 8 hs, índice 3 dB):\n" +
        "  24 hs → 80 dBA   |  16 hs → 82 dBA   |   8 hs → 85 dBA   |   4 hs → 88 dBA\n" +
        "   2 hs → 91 dBA   |   1 hs → 94 dBA   |  30 min → 97 dBA  |  15 min → 100 dBA\n" +
        " 7,5 min → 103 dBA | 3,75 min → 106 dBA\n\n" +
        "No debe haber exposiciones al ruido por encima de un nivel pico C ponderado de 140 dBC.\n\n" +
        "El nivel se mide con sonómetro intergrador (decibelímetro) o dosímetro, Clase o Tipo 2, según IRAM 4074 e IEC 804.\n\n" +
        "MÉTODO DE CÁLCULO:\n" +
        "  Dosis = Σ (Ci / Ti) × 100%\n" +
        "  donde Ci = tiempo real de exposición al nivel i; Ti = tiempo máximo permitido para ese nivel.\n" +
        "  Cumple si Dosis ≤ 100% y LAeq,Te ≤ límite para Te."
      )] }),
    ],
  }));

  // ── Análisis de datos / Conclusiones
  items.push(pageBreakPara());
  items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Análisis de los Datos y Mejoras a Realizar")] }),
      new TableRow({ children: [hdr("(41) Conclusiones")] }),
      new TableRow({ children: [cell(noiseProtocol.conclusiones || "(Sin conclusiones cargadas)")] }),
      new TableRow({ children: [hdr("(42) Recomendaciones para adecuar el nivel de ruido a la legislación vigente")] }),
      new TableRow({ children: [cell(
        "EN LA FUENTE:\n" +
        "• Mantenimiento preventivo de equipos y maquinarias generadoras de ruido.\n" +
        "• Sustitución de equipos ruidosos por equipos más silenciosos.\n" +
        "• Reducción de la velocidad de operación de máquinas donde sea posible.\n\n" +
        "MEDIANTE BARRERAS / ENCERRAMIENTO:\n" +
        "• Encapsulamiento de fuentes de ruido intenso.\n" +
        "• Instalación de paneles fonoabsorbentes en áreas críticas.\n" +
        "• Tratamiento acústico de paredes, techos y pisos.\n\n" +
        "EN EL TRABAJADOR:\n" +
        "• Uso obligatorio de protección auditiva (tipo copa NRR≥25 dB) en zonas con riesgo.\n" +
        "• Rotación de puestos para reducir tiempo de exposición individual.\n" +
        "• Capacitación en conservación auditiva y uso correcto de EPP.\n" +
        "• Audiometrías anuales para el personal expuesto.\n" +
        (noiseProtocol.recomendaciones ? `\nRECOMENDACIONES ESPECÍFICAS:\n${noiseProtocol.recomendaciones}` : "")
      )] }),
    ],
  }));

  // ── Constancia fotográfica + Meteorológica
  items.push(...spaceBlock("PROTOCOLO DE MEDICIÓN DE RUIDO EN EL AMBIENTE LABORAL", establishment));

  // ── Instructivo
  items.push(pageBreakPara());
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("INSTRUCTIVO PARA COMPLETAR EL PROTOCOLO DE MEDICIÓN DE RUIDO", { align: AlignmentType.CENTER })] }),
      new TableRow({ children: [cell(
        "1) Identificación del establecimiento (razón social completa).\n" +
        "2) Domicilio real del establecimiento donde se realiza la medición.\n" +
        "3) Localidad del establecimiento.\n" +
        "4) Provincia en la cual se encuentra radicado.\n" +
        "5) Código Postal del establecimiento.\n" +
        "6) C.U.I.T. de la empresa o institución.\n" +
        "7) Marca, modelo y número de serie del instrumento. Las mediciones se efectuarán con sonómetro\n" +
        "   integrador (decibelímetro) o dosímetro, Clase o Tipo 2, según IRAM 4074 e IEC 804.\n" +
        "8) Fecha de la última calibración realizada en laboratorio al instrumento empleado.\n" +
        "9) Fecha de la medición.\n" +
        "10) Hora de inicio de la primera medición.\n" +
        "11) Hora de finalización de la última medición.\n" +
        "12) Duración de la jornada laboral (en horas) y descripción de los turnos.\n" +
        "13) Condiciones normales y/o habituales de los puestos de trabajo.\n" +
        "14) Condiciones de trabajo al momento de efectuar la medición.\n" +
        "15) Adjuntar copia del certificado de calibración del equipo.\n" +
        "16) Adjuntar plano o croquis del establecimiento con los puntos de medición numerados.\n" +
        "23) Punto de medición (coincide con el del croquis).\n" +
        "24) Sector de la empresa donde se realiza la medición.\n" +
        "25) Puesto de trabajo o puesto tipo.\n" +
        "26) Tiempo de exposición del trabajador al ruido (en horas).\n" +
        "27) Tiempo de integración o de medición.\n" +
        "28) Tipo de ruido: continuo, intermitente o de impulso/impacto.\n" +
        "29) Nivel pico ponderado C (LCpico en dBC) para ruido de impulso o impacto.\n" +
        "30) Nivel de presión acústica LAeq,Te en dBA.\n" +
        "31) Suma de fracciones Ci/Ti.\n" +
        "32) Dosis de ruido en porcentaje (índice 3 dB, criterio 85 dBA/8h).\n" +
        "33) Indica si cumple con el nivel máximo permitido (SI / NO).\n" +
        "34) Información adicional de importancia."
      )] }),
    ],
  }));

  return items;
}
