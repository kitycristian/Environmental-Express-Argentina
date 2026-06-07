import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Establishment, Sector } from "./types";

export const generatePDFReport = async (
  establishment: Establishment,
  sectors: Sector[],
  logoDataUrl?: string,
  action: 'download' | 'preview' = 'download'
) => {
  const prevTitle = document.title;
  document.title = `Informe_Tecnico_${establishment.name || "EEA"}`;
  window.print();
  document.title = prevTitle;
};
