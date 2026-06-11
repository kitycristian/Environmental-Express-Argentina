import {
  Paragraph, Table, TableRow,
  WidthType, AlignmentType,
} from "docx";
import {
  CONT_W, NAVY, run, cell, hdr, cumpleCell,
  pageBreakPara, protocolHeader, spaceBlock,
} from "./helpers.js";

export function buildColdSection(establishment: any, coldProtocol: any): any[] {
  if (!coldProtocol?.rows?.some((r: any) => r.sector || r.tbs)) return [];
  const rows = coldProtocol.rows;
  const comp = coldProtocol.company || {};
  const items: any[] = [pageBreakPara()];

  items.push(new Paragraph({
    children: [run("ESTUDIO DE ESTRÉS POR FRÍO SEGÚN RESOL. MTEySS Nº 295/2003", { size: 13, bold: true, color: NAVY })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
  }));

  // ── Encabezado + Datos para la medición
  items.push(protocolHeader("PROTOCOLO DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Datos para la medición")] }),
      new TableRow({ children: [cell(`Instrumento: ${comp.instrumento1 || "-"} Modelo: ${comp.instrumento1 || "-"} N° Serie: ${comp.instrumento1Serie || "-"} N° Certificado: ${comp.instrumento1Cert || "-"}`)] }),
      new TableRow({ children: [cell(`Fecha de calibración: ${comp.instrumento1FechaCal || "-"}    Fecha de medición: ${comp.fechaMedicion || "-"}    Hora inicio: ${comp.horaInicio || "-"}    Hora fin: ${comp.horaFin || "-"}`)] }),
      new TableRow({ children: [cell(`Horarios/turnos: ${comp.turnos || "-"}    Condiciones atmosféricas: ${comp.condicionesAtm || "-"}`)] }),
      new TableRow({ children: [hdr("Documentación que se adjuntará")] }),
      new TableRow({ children: [cell("• Certificado de calibración\n• Croquis del establecimiento con puntos de medición")] }),
    ],
  }));

  // ── Tabla de datos de medición
  items.push(pageBreakPara());
  items.push(protocolHeader("INFORME DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [460, 1200, 1200, 700, 700, 700, 750, 750, 900, 700, 700, 700, 700],
    rows: [
      new TableRow({ children: [
        hdr("Pto",                   { align: AlignmentType.CENTER }),
        hdr("Sector"),
        hdr("Puesto de Trabajo"),
        hdr("Rango T° (°C)",         { align: AlignmentType.CENTER }),
        hdr("Ciclos/turno",          { align: AlignmentType.CENTER }),
        hdr("Dur. ciclo (min)",      { align: AlignmentType.CENTER }),
        hdr("T. neto exp. (min)",    { align: AlignmentType.CENTER }),
        hdr("T. integr. (min)",      { align: AlignmentType.CENTER }),
        hdr("Carac. exposición",     { align: AlignmentType.CENTER }),
        hdr("TBS (°C)",              { align: AlignmentType.CENTER }),
        hdr("Veloc. (m/s)",          { align: AlignmentType.CENTER }),
        hdr("TEE (°C)",              { align: AlignmentType.CENTER }),
        hdr("Exp. > 4h",             { align: AlignmentType.CENTER }),
      ]}),
      ...rows.map((r: any, i: number) => new TableRow({ children: [
        cell(String(i + 1).padStart(2, "0"), { align: AlignmentType.CENTER }),
        cell(r.sector || ""),
        cell(r.puestoTrabajo || ""),
        cell(r.rangoTemp || "",              { align: AlignmentType.CENTER }),
        cell(r.ciclosExposicion || "",       { align: AlignmentType.CENTER }),
        cell(r.duracionCiclo || "",          { align: AlignmentType.CENTER }),
        cell(r.tiempoNetoExposicion || "",   { align: AlignmentType.CENTER }),
        cell(r.tiempoIntegracion || "",      { align: AlignmentType.CENTER }),
        cell(r.caracteristicasExposicion || "", { align: AlignmentType.CENTER }),
        cell(r.tbs || "",                    { align: AlignmentType.CENTER }),
        cell(r.velocidadViento || "",        { align: AlignmentType.CENTER }),
        cell(r.tee || "",                    { align: AlignmentType.CENTER, bold: true }),
        cumpleCell(r.exposicionMas4h === "SI" || r.exposicionMas4h === true ? "SI" : r.exposicionMas4h === "NO" || r.exposicionMas4h === false ? "NO" : r.exposicionMas4h || "-"),
      ]})),
    ],
  }));

  // ── Observaciones constructivas
  if (coldProtocol.observaciones) {
    items.push(pageBreakPara());
    items.push(protocolHeader("INFORME DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", establishment));
    items.push(new Table({
      width: { size: CONT_W, type: WidthType.DXA },
      columnWidths: [CONT_W],
      rows: [
        new TableRow({ children: [hdr("Observaciones — Características constructivas de los sectores")] }),
        new TableRow({ children: [cell(coldProtocol.observaciones)] }),
      ],
    }));
  }

  // ── Valores de referencia
  items.push(pageBreakPara());
  items.push(protocolHeader("INFORME DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Valores de Referencia — MTEySS Resol. 295/2003, Anexo de estrés por frío")] }),
      new TableRow({ children: [cell(
        "TABLA 2 — TEMPERATURA EQUIVALENTE DE ENFRIAMIENTO (TEE):\n" +
        "La TEE combina la temperatura de bulbo seco (TBS) y la velocidad del viento para estimar el efecto\n" +
        "refrigerante sobre el cuerpo humano.\n\n" +
        "Rangos de peligro según TEE:\n" +
        "  TEE > 0°C                → SIN PELIGRO\n" +
        "  TEE entre 0 y -10°C     → POCO PELIGROSO — sensación de frío\n" +
        "  TEE entre -10 y -25°C   → PELIGROSO — riesgo de congelamiento expuesto\n" +
        "  TEE entre -25 y -50°C   → MUY PELIGROSO — peligro de congelamiento en 1 min\n" +
        "  TEE entre -50 y -75°C   → EXTREMADAMENTE PELIGROSO — peligro en 30 segundos\n" +
        "  TEE < -75°C              → PELIGRO MÁXIMO — congelamiento en segundos\n\n" +
        "TABLA 3 — TLVs de temperatura para trabajo sedentario y ligero:\n" +
        "  TBS ≥ 16°C              → No se requieren guantes\n" +
        "  TBS entre 4°C y 16°C   → Guantes recomendados para trabajo ligero\n" +
        "  TBS < 4°C               → Guantes obligatorios\n" +
        "  TBS < -18°C             → Ropa aislante completa obligatoria\n\n" +
        "TABLA 1 — Síntomas de hipotermia:\n" +
        "  Escalofríos intensos → Temperatura corporal 35–36°C\n" +
        "  Confusión / torpeza  → Temperatura corporal 33–35°C\n" +
        "  Inconsciencia        → Temperatura corporal < 30°C"
      )] }),
    ],
  }));

  // ── Conclusiones y Recomendaciones
  items.push(pageBreakPara());
  items.push(protocolHeader("INFORME DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", establishment));
  items.push(new Table({
    width: { size: CONT_W, type: WidthType.DXA },
    columnWidths: [CONT_W],
    rows: [
      new TableRow({ children: [hdr("Análisis de los Datos")] }),
      new TableRow({ children: [hdr("Conclusiones")] }),
      new TableRow({ children: [cell(coldProtocol.conclusiones || "(Sin conclusiones cargadas)")] }),
      new TableRow({ children: [hdr("Recomendaciones para Prevenir el Estrés por Frío")] }),
      new TableRow({ children: [cell(
        "• Proveer ropa aislante seca adecuada para mantener la temperatura corporal por encima de 36°C.\n" +
        "• A temperaturas ≤ 2°C, cambiar a vestimenta seca si hay humedad.\n" +
        "• Usar manoplas aislantes; evitar piel expuesta al ambiente frío.\n" +
        "• Para trabajo sedentario con TBS < 16°C o trabajo ligero con TBS < 4°C: usar guantes.\n" +
        "• En cámaras frigoríficas, mantener velocidad del aire ≤ 1 m/s en el puesto de trabajo.\n" +
        "• Medir y registrar TBS cada 4 horas cuando TBS < −1°C.\n" +
        "• Para TBS ≤ −12°C: implementar sistema de parejas y controlar ritmo de trabajo.\n" +
        "• Capacitar al personal en síntomas de hipotermia y protocolos de emergencia.\n" +
        (coldProtocol.recomendaciones ? `\nRECOMENDACIONES ESPECÍFICAS:\n${coldProtocol.recomendaciones}` : "")
      )] }),
    ],
  }));

  // ── Constancia fotográfica + Meteorológica
  items.push(...spaceBlock("INFORME DE MEDICIÓN DE ESTRÉS POR FRÍO EN EL AMBIENTE LABORAL", establishment));

  return items;
}
