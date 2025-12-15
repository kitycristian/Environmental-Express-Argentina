export interface Client {
  id: string;
  name: string; // Nombre de fantasía
  razonSocial: string;
  cuit: string;
  conditionIva: string; // Responsable Inscripto, Monotributo, etc.
  address: string;
  city: string;
  province: string;
  postalCode: string;
  phone: string;
  email: string;
  contactName: string; // Persona de contacto
  notes?: string;
  createdAt: string;
}

export type MeasurementType = 
  | 'lighting'
  | 'noise'
  | 'thermal_load'
  | 'cold_stress'
  | 'particulate_matter'
  | 'chemical_agents';

export const MEASUREMENT_LABELS: Record<MeasurementType, string> = {
  lighting: 'Iluminación',
  noise: 'Ruido',
  thermal_load: 'Carga Térmica',
  cold_stress: 'Estrés por Frío',
  particulate_matter: 'Material Particulado',
  chemical_agents: 'Agentes Químicos',
};

export interface Instrument {
  id: string;
  type: MeasurementType | 'generic';
  brand: string;
  model: string;
  serialNumber: string;
  calibrationCertificate: string;
  calibrationDate: string;
}

export interface AtmosphericConditions {
  temperature?: string;
  humidity?: string;
  pressure?: string;
  windSpeed?: string;
}

export interface Establishment {
  id: string;
  name: string;
  razonSocial: string;
  cuit: string;
  address: string;
  city?: string;
  province?: string;
  postalCode?: string;
  date: string;
  startTime?: string;
  endTime?: string;
  responsible: string;
  conditions?: AtmosphericConditions;
  instruments?: Instrument[];
  conclusions?: string;
  recommendations?: string;
}

export interface Sector {
  id: string;
  name: string;
  description?: string;
  dimensions?: string;
  activity?: string;
  workersCount?: number;
  measurements: Measurement[];
}

export interface MeasurementPoint {
  id: string;
  label: string; // e.g., "Punto 1"
  values: Record<string, string | number>; // Flexible for different types (lux, db, temp, etc.)
  notes?: string;
}

export interface Measurement {
  id: string;
  type: MeasurementType;
  sectorId: string;
  status: 'pending' | 'compliant' | 'non_compliant';
  points: MeasurementPoint[];
  observations?: string;
  
  // Specific fields for different types (shared structure for simplicity)
  config?: {
    method?: string;
    limit?: number; // Valor Legal (Lux)
    reference?: string;
    
    // Lighting specific
    width?: number;
    length?: number;
    height?: number; // Altura de montaje
    workPlaneHeight?: number; // Altura plano de trabajo
    lightingType?: 'artificial' | 'natural' | 'mixed';
    lightSource?: string; // LED, Fluorescente, etc.
  };

  // Detailed Metadata (New Request)
  details?: {
    // Instrument Info
    brand?: string;
    model?: string;
    serialNumber?: string;
    calibrationDate?: string; // Fecha del certificado de calibración

    // Measurement Info
    measurementDate?: string;
    startTime?: string;
    endTime?: string;

    // Work Conditions
    workShifts?: string; // Horarios/turnos habituales
    normalConditions?: string; // Descripción condiciones normales
    currentConditions?: string; // Descripción condiciones al momento
  };
}

export interface Inspection {
  id: string;
  savedAt: string;
  establishment: Establishment;
  sectors: Sector[];
}
