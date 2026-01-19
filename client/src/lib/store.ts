import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Establishment, Sector, Measurement, MeasurementPoint, MeasurementType } from './types';
import { v4 as uuidv4 } from 'uuid';

interface AppState {
  establishment: Establishment;
  sectors: Sector[];
  
  // Actions
  updateEstablishment: (data: Partial<Establishment>) => void;
  
  addSector: (sector: Omit<Sector, 'id' | 'measurements'>) => void;
  updateSector: (id: string, data: Partial<Sector>) => void;
  deleteSector: (id: string) => void;
  
  addMeasurement: (sectorId: string, type: MeasurementType) => void;
  deleteMeasurement: (sectorId: string, measurementId: string) => void;
  updateMeasurement: (sectorId: string, measurementId: string, data: Partial<Measurement>) => void;
  
  addPoint: (sectorId: string, measurementId: string, pointData?: Partial<MeasurementPoint>) => void;
  updatePoint: (sectorId: string, measurementId: string, pointId: string, data: Partial<MeasurementPoint>) => void;
  deletePoint: (sectorId: string, measurementId: string, pointId: string) => void;
  
  addSectorWithMeasurement: (sectorData: Omit<Sector, 'id' | 'measurements'>, type: MeasurementType) => void;
  
  loadInspectionData: (establishment: Establishment, sectors: Sector[]) => void;
  resetStore: () => void;
}

const initialEstablishment: Establishment = {
  id: 'default',
  name: '',
  razonSocial: '',
  cuit: '',
  address: '',
  date: new Date().toISOString().split('T')[0],
  responsible: '',
};

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      establishment: initialEstablishment,
      sectors: [],

      updateEstablishment: (data) => 
        set((state) => ({ establishment: { ...state.establishment, ...data } })),

      addSector: (sectorData) => 
        set((state) => ({
          sectors: [
            ...state.sectors,
            { ...sectorData, id: uuidv4(), measurements: [] }
          ]
        })),

      updateSector: (id, data) =>
        set((state) => ({
          sectors: state.sectors.map((s) => 
            s.id === id ? { ...s, ...data } : s
          )
        })),

      deleteSector: (id) =>
        set((state) => ({
          sectors: state.sectors.filter((s) => s.id !== id)
        })),

      addMeasurement: (sectorId, type) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: [
                ...s.measurements,
                {
                  id: uuidv4(),
                  type,
                  sectorId,
                  status: 'pending',
                  points: [],
                  observations: ''
                }
              ]
            };
          })
        })),

      deleteMeasurement: (sectorId, measurementId) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.filter((m) => m.id !== measurementId)
            };
          })
        })),

      updateMeasurement: (sectorId, measurementId, data) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.map((m) => 
                m.id === measurementId ? { ...m, ...data } : m
              )
            };
          })
        })),

      addPoint: (sectorId, measurementId, pointData) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.map((m) => {
                if (m.id !== measurementId) return m;
                return {
                  ...m,
                  points: [
                    ...m.points,
                    {
                      id: uuidv4(),
                      label: `Punto ${m.points.length + 1}`,
                      values: {},
                      ...pointData
                    }
                  ]
                };
              })
            };
          })
        })),

      updatePoint: (sectorId, measurementId, pointId, data) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.map((m) => {
                if (m.id !== measurementId) return m;
                return {
                  ...m,
                  points: m.points.map((p) => 
                    p.id === pointId ? { ...p, ...data } : p
                  )
                };
              })
            };
          })
        })),

      deletePoint: (sectorId, measurementId, pointId) =>
        set((state) => ({
          sectors: state.sectors.map((s) => {
            if (s.id !== sectorId) return s;
            return {
              ...s,
              measurements: s.measurements.map((m) => {
                if (m.id !== measurementId) return m;
                return {
                  ...m,
                  points: m.points.filter((p) => p.id !== pointId)
                };
              })
            };
          })
        })),

      addSectorWithMeasurement: (sectorData, type) => 
        set((state) => {
          const newSectorId = uuidv4();
          const newSector: Sector = {
            ...sectorData,
            id: newSectorId,
            measurements: [
              {
                id: uuidv4(),
                type,
                sectorId: newSectorId,
                status: 'pending',
                points: [],
                observations: ''
              }
            ]
          };
          return {
            sectors: [...state.sectors, newSector]
          };
        }),

      loadInspectionData: (establishment, sectors) =>
        set(() => ({
          establishment: JSON.parse(JSON.stringify(establishment)),
          sectors: JSON.parse(JSON.stringify(sectors))
        })),

      resetStore: () => set({ establishment: initialEstablishment, sectors: [] }),
    }),
    {
      name: 'syh-relevamiento-working-state-v3',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
