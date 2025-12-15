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

export interface Establishment {
  id: string;
  name: string;
  razonSocial: string;
  cuit: string;
  address: string;
  date: string;
  responsible: string;
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
    limit?: number;
    reference?: string;
  };
}
